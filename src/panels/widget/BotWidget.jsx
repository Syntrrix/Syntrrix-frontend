import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Box, Button, CircularProgress, IconButton, Paper, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import html2canvas from 'html2canvas';
import TaxInvoiceCaptureMarkup from '../../components/TaxInvoiceCaptureMarkup';
import LiveChatAttachment from '../../components/LiveChatAttachment';
import { fetchPublishedBot, uploadBotMedia } from '../../api/bots';
import { buildMediaAcceptString, detectAttachmentType, validateMediaFile } from '../../utils/mediaUpload';
import {
  createPublicLiveChatSession,
  fetchPublicLiveChatMessages,
  sendPublicLiveChatMessage,
  syncPublicLiveChatTranscript,
} from '../../api/liveChat';
import { publicExecuteDataHubOp } from '../../api/dataHub';
import { fetchPublicBotProducts } from '../../api/catalogue';

const LIVE_CHAT_TOKEN_STORAGE_PREFIX = 'seller_live_chat_public_token';
const LIVE_CHAT_SIGNATURE_STORAGE_PREFIX = 'seller_live_chat_customer_signature';

const normalizePhone = (value) => (value || '').toString().replace(/\D/g, '');
const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();
const normalizeName = (value) => (value || '').toString().trim().toLowerCase();

const makeCustomerSignature = ({ full_name, mobile_number, email }) => {
  return `${normalizeName(full_name)}|${normalizePhone(mobile_number)}|${normalizeEmail(email)}`;
};

/** Resolve a variable from collected answers (case-insensitive keys; supports name/phone aliases). */
function getCollectedValue(bag, rawKey) {
  if (bag == null || rawKey == null) return undefined;
  const k = String(rawKey).trim();
  if (!k) return undefined;
  if (Object.prototype.hasOwnProperty.call(bag, k)) {
    return bag[k];
  }
  const lower = k.toLowerCase();
  for (const bk of Object.keys(bag)) {
    if (bk.toLowerCase() === lower) {
      return bag[bk];
    }
  }
  if (lower === 'name' || lower === 'full_name') {
    if (bag.name !== undefined) return bag.name;
    if (bag.full_name !== undefined) return bag.full_name;
  }
  if (lower === 'phone' || lower === 'mobile' || lower === 'mobile_number' || lower === 'contact_number') {
    if (bag.phone !== undefined) return bag.phone;
    if (bag.mobile !== undefined) return bag.mobile;
    if (bag.mobile_number !== undefined) return bag.mobile_number;
    if (bag.contact_number !== undefined) return bag.contact_number;
  }
  if (lower === 'address' || lower === 'customer_address' || lower === 'full_address' || lower === 'shipping_address') {
    for (const alt of ['address', 'Address', 'customer_address', 'full_address', 'shipping_address', 'location']) {
      if (bag[alt] !== undefined && bag[alt] !== null && String(bag[alt]).trim() !== '') return bag[alt];
    }
  }
  if (lower === 'order_no' || lower === 'orderno' || lower === 'order_number') {
    for (const alt of ['order_no', 'orderNo', 'OrderNo', 'order_number', 'Order no.', 'Order no', 'order no', 'custom_input', 'custom_input_1', 'customInput']) {
      if (bag[alt] !== undefined && bag[alt] !== null && String(bag[alt]).trim() !== '') return bag[alt];
    }
    // Last resort: pick any collected value that looks like an order reference.
    const orderLike = Object.values(bag).find((v) => {
      const s = String(v ?? '').trim();
      return /^ORD[-_]/i.test(s) || /\bORD[-_][A-Z0-9-]+\b/i.test(s);
    });
    if (orderLike !== undefined) return orderLike;
  }
  return undefined;
}

/** Normalize schema column labels vs JSON keys: "Order no." ↔ order_no ↔ "Order No" */
function normalizeDataHubColumnKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Read a Data Hub row cell; column labels from the bot builder may differ in case/spacing/punctuation from JSON keys. */
function dataHubRowGet(row, columnKey) {
  if (row == null || typeof row !== 'object' || columnKey == null) return undefined;
  const k = String(columnKey).trim();
  if (!k) return undefined;
  const want = normalizeDataHubColumnKey(k);
  if (want === 'status') {
    const directStatus =
      row.status ?? row.Status ?? row.STATUS ?? row.order_status ?? row.orderStatus ?? row['Order Status'];
    if (directStatus !== undefined && directStatus !== null && String(directStatus).trim() !== '') return directStatus;
    if (Array.isArray(row.cart_items) && row.cart_items.length > 0) return 'Pending';
  }
  if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  if (!want) return undefined;
  const lower = k.toLowerCase();
  for (const rk of Object.keys(row)) {
    if (String(rk).trim().toLowerCase() === lower) return row[rk];
    if (normalizeDataHubColumnKey(rk) === want) return row[rk];
  }
  return undefined;
}

/** Public order reference for catalogue checkout (matches backend `generate_public_order_no` format). */
function generateCheckoutOrderNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let suffix = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    suffix = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  } else {
    suffix = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  }
  return `ORD-${y}${m}${day}-${suffix}`;
}

function getNextNodeId(edges, sourceId, label = null, sourceHandle = null) {
  const out = (edges || []).filter((e) => e.source === sourceId);
  if (sourceHandle != null && String(sourceHandle).length) {
    const sh = String(sourceHandle);
    const byHandle = out.find((e) => String(e.sourceHandle || '') === sh);
    if (byHandle) return byHandle.target;
  }
  if (label) {
    // Find edge with matching label (for yes/no branching)
    const labeled = out.find((e) => {
      const edgeLabel = (e.label || '').toLowerCase();
      return edgeLabel === label.toLowerCase() || (label === 'yes' && edgeLabel === '') || (label === 'yes' && !out.find((e2) => e2.label && e2.label.toLowerCase() === 'no'));
    });
    if (labeled) return labeled.target;
    // If no labeled edge found and looking for "no", check if there's a second edge
    if (label === 'no' && out.length > 1) {
      const noEdge = out.find((e) => (e.label || '').toLowerCase() === 'no') || out[1];
      return noEdge.target;
    }
  }
  // Prefer default branch (no sourceHandle) when no explicit label/handle is requested.
  const plain = out.find((e) => !String(e.sourceHandle || '').trim());
  if (plain) return plain.target;
  return out.length > 0 ? out[0].target : null;
}

function getInitialNodeId(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (list.length === 0) return null;
  const startNode = list.find((n) => n.id === 'start');
  if (startNode) return 'start';
  return list[0]?.id || null;
}

function BotWidget() {
  const [params] = useSearchParams();
  const botId = params.get('bot_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bot, setBot] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [collected, setCollected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  const collectedRef = useRef({});
  const messagesRef = useRef([]);
  const submitIfCompleteRef = useRef(async () => {});
  const lastAgentAssignNodeIdRef = useRef(null);

  const [liveChatSession, setLiveChatSession] = useState(null);
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState('');
  const mediaFileInputRef = useRef(null);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [liveChatError, setLiveChatError] = useState('');
  const botMessagesEndRef = useRef(null);
  const liveChatEndRef = useRef(null);

  const [publicProducts, setPublicProducts] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]); // [{product_id, name, price, qty, description, image}]
  const [cataloguePickQty, setCataloguePickQty] = useState({}); // key -> selected qty before add
  const [checkoutNodeId, setCheckoutNodeId] = useState(null); // remember last catalogue node for final checkout
  const catalogueStripRef = useRef(null);
  const [catalogueOverflowing, setCatalogueOverflowing] = useState(false);
  const [catalogueCanLeft, setCatalogueCanLeft] = useState(false);
  const [catalogueCanRight, setCatalogueCanRight] = useState(false);
  const invoiceCaptureRef = useRef(null);
  const [invoiceCapturePayload, setInvoiceCapturePayload] = useState(null);
  const cartSummaryRef = useRef(null);

  const scrollCatalogueBy = (dir) => {
    const el = catalogueStripRef.current;
    if (!el) return;
    // 240 card width + 12px gap (gap: 1.5)
    const step = 252;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = catalogueStripRef.current;
    if (!el) {
      setCatalogueOverflowing(false);
      setCatalogueCanLeft(false);
      setCatalogueCanRight(false);
      return;
    }

    const update = () => {
      // small tolerance for fractional pixels
      const overflowing = el.scrollWidth > el.clientWidth + 2;
      setCatalogueOverflowing(overflowing);
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setCatalogueCanLeft(overflowing && left);
      setCatalogueCanRight(overflowing && right);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [waitingForInput, submitted, publicProducts.length, checkoutNodeId, currentNodeId]);

  const design = bot?.design || {};
  const primaryColor = design.primaryColor || '#0ea5e9';
  const headerTitle = design.chatHeaderTitle || 'Chat with us';
  const botName = design.chatbotName || 'Bot';
  const fontFamily = design.fontFamily || 'Inter';
  const bubbleStyle = design.bubbleStyle || 'rounded';
  const bubbleRadius = bubbleStyle === 'pill' ? 999 : bubbleStyle === 'sharp' ? 8 : 16;
  const cardRadius = bubbleStyle === 'pill' ? 20 : bubbleStyle === 'sharp' ? 6 : 12;

  const flow = bot?.flow || {};
  const nodesById = useMemo(() => {
    const map = {};
    (flow.nodes || []).forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [flow.nodes]);

  useEffect(() => {
    collectedRef.current = collected || {};
  }, [collected]);

  useEffect(() => {
    messagesRef.current = messages || [];
  }, [messages]);

  const buildFlowTranscript = useCallback((sourceMessages) => {
    return (sourceMessages || []).map((m) => {
      const row = { type: m.type, text: m.text };
      if (m.file_url) {
        row.file_url = m.file_url;
        row.file_name = m.file_name;
        row.mime_type = m.mime_type;
        row.attachment_type = m.attachment_type;
        if (m.file_path) row.file_path = m.file_path;
      }
      return row;
    });
  }, []);

  const persistLiveChatTranscript = useCallback(
    async (token, sourceMessages) => {
      if (!token) return;
      const flowTranscript = buildFlowTranscript(sourceMessages);
      if (!flowTranscript.length) return;
      await syncPublicLiveChatTranscript(token, flowTranscript);
    },
    [buildFlowTranscript],
  );

  const renderWithVars = useCallback((text) => {
    const raw = (text || '').toString();
    const bag = collectedRef.current || {};
    // Normalize fullwidth @ (U+FF03) / word processor variants so @name always resolves
    const normalized = raw.replace(/\uFF03/g, '@');
    return normalized.replace(/@\s*([a-zA-Z0-9_]+)/g, (_, key) => {
      const v = getCollectedValue(bag, key);
      if (v !== undefined && v !== null) return String(v);
      return `@${key}`;
    });
  }, []);

  const submitIfComplete = async (nextNodeId, collectedSnapshot, messagesSnapshot) => {
    if (!botId) return;
    if (submitted) return;
    if (submittingRef.current) return;

    // only submit when there is no next node (end of flow)
    if (nextNodeId) return;

    const transcriptMessages = messagesSnapshot || messagesRef.current || messages || [];
    const flowTranscript = buildFlowTranscript(transcriptMessages);

    const snapshot = collectedSnapshot || collected || {};
    const pick = (...keys) => {
      for (const k of keys) {
        const v = snapshot?.[k];
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return '';
    };
    const full_name = pick('name', 'full_name');
    const mobile_number = pick('phone', 'mobile_number', 'contact_number');
    const email = pick('email');
    const address = getCollectedValue(snapshot, 'address') || '';

    submittingRef.current = true;
    try {
      // Create/reuse visitor live chat session (no Customer DB insert)
      const signature = makeCustomerSignature({ full_name, mobile_number, email });
      const tokenKey = `${LIVE_CHAT_TOKEN_STORAGE_PREFIX}_${botId}`;
      const sigKey = `${LIVE_CHAT_SIGNATURE_STORAGE_PREFIX}_${botId}`;
      const storedToken = localStorage.getItem(tokenKey);
      const storedSignature = localStorage.getItem(sigKey);
      if (storedToken && storedSignature && storedSignature === signature) {
        await persistLiveChatTranscript(storedToken, transcriptMessages);
        setLiveChatSession((prev) => prev || { public_token: storedToken });
      } else {
        const sessionResp = await createPublicLiveChatSession(botId, {
          full_name,
          mobile_number,
          email,
          flow_messages: flowTranscript,
          last_agent_assign_node_id: lastAgentAssignNodeIdRef.current || '',
          extra: {
            address,
            // Keep a list-style key as well for downstream JSON consumers expecting plural naming.
            addresses_json: address ? [address] : [],
            data_storage_requirement: snapshot.data_storage_requirement || '',
            custom_input: snapshot.custom_input || '',
            last_agent_assign_node_id: lastAgentAssignNodeIdRef.current || '',
          },
        });
        const session = sessionResp?.data || null;
        if (session?.public_token) {
          setLiveChatSession(session);
          localStorage.setItem(tokenKey, session.public_token);
          localStorage.setItem(sigKey, signature);
        }
      }

      setSubmitted(true);
      setMessages((prev) => [...prev, { type: 'bot', text: 'Thanks! Your details have been submitted.' }]);
    } catch (e) {
      // Non-blocking: show a message but keep the chat usable
      setMessages((prev) => [...prev, { type: 'bot', text: e.message || 'Failed to submit details.' }]);
    } finally {
      submittingRef.current = false;
    }
  };

  submitIfCompleteRef.current = submitIfComplete;

  useEffect(() => {
    const load = async () => {
      if (!botId) {
        setError('bot_id is required');
        setLoading(false);
        return;
      }
      const tokenKey = `${LIVE_CHAT_TOKEN_STORAGE_PREFIX}_${botId}`;
      const storedToken = localStorage.getItem(tokenKey);
      if (storedToken) {
        setLiveChatSession((prev) => prev || { public_token: storedToken });
      }

      try {
        const resp = await fetchPublishedBot(botId);
        if (!resp?.success) throw new Error(resp?.message || 'Failed to load bot');
        setBot(resp.data);
        try {
          const pr = await fetchPublicBotProducts(botId);
          if (pr?.success && Array.isArray(pr.data)) setPublicProducts(pr.data);
          else setPublicProducts([]);
        } catch {
          setPublicProducts([]);
        }
        setMessages([
          { type: 'bot', text: 'Welcome 👋' },
        ]);
        setCurrentNodeId(getInitialNodeId(resp?.data?.flow?.nodes));
        setCollected({});
        setCartItems([]);
        setCataloguePickQty({});
        setCartOpen(false);
        setCheckoutNodeId(null);
        setSubmitted(false);
        // keep restored token if available
        setLiveChatOpen(false);
        setLiveChatMessages([]);
        setLiveChatInput('');
        setLiveChatError('');
        submittingRef.current = false;
      } catch (e) {
        setError(e.message || 'Failed to load bot');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [botId]);

  useEffect(() => {
    if (!botId) return;
    if (waitingForInput !== 'catalogue') return;
    const t = setInterval(async () => {
      try {
        const pr = await fetchPublicBotProducts(botId);
        if (pr?.success && Array.isArray(pr.data)) {
          setPublicProducts(pr.data);
        }
      } catch {
        // keep last good state
      }
    }, 5000);
    return () => clearInterval(t);
  }, [botId, waitingForInput]);

  useEffect(() => {
    if (!invoiceCapturePayload) return;
    let cancelled = false;
    const payload = invoiceCapturePayload;
    (async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled) return;
      const el = invoiceCaptureRef.current;
      if (!el) {
        setInvoiceCapturePayload(null);
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            text: `Thank you! Your order number is ${payload.orderNo}.`,
          },
        ]);
        return;
      }
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        });
        if (cancelled) return;
        const dataUrl = canvas.toDataURL('image/png');
        const safeName = `invoice-${String(payload.orderNo).replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            kind: 'invoice',
            text: `Thank you! Your order number is ${payload.orderNo}. Download your online invoice below.`,
            imageUrl: dataUrl,
            fileName: safeName,
          },
        ]);
      } catch {
        if (!cancelled) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'bot',
              text: `Thank you! Your order number is ${payload.orderNo}.`,
            },
          ]);
        }
      } finally {
        if (!cancelled) setInvoiceCapturePayload(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceCapturePayload]);

  useEffect(() => {
    if (!bot || loading || error) return;

    if (!currentNodeId) {
      setWaitingForInput(false);
      return;
    }
    const node = nodesById[currentNodeId];
    if (!node) {
      // if missing, stop
      setWaitingForInput(false);
      return;
    }

    // Start node: just advance
    if (node.id === 'start') {
      const nextId = getNextNodeId(flow.edges, node.id);
      if (nextId) setCurrentNodeId(nextId);
      return;
    }

    const kind = node.data?.kind;
    if (kind === 'message') {
      const text = renderWithVars(node.data?.text || node.data?.label || '...');
      setMessages((prev) => [...prev, { type: 'bot', text }]);
      setWaitingForInput(false);
      const nextId = getNextNodeId(flow.edges, node.id);
      if (nextId) {
        setTimeout(() => setCurrentNodeId(nextId), 250);
      } else {
        // Flow ended on a message node
        setWaitingForInput(false);
        void submitIfCompleteRef.current(null, collectedRef.current);
      }
      return;
    }

    if (kind === 'yes_no') {
      const prompt = node.data?.prompt || node.data?.label || 'Do you want to continue?';
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput('yes_no'); // Special state for buttons
      return;
    }

    if (kind === 'multiple_choice') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Choose one:');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput('multiple_choice');
      return;
    }

    if (kind === 'name' || kind === 'phone' || kind === 'email' || kind === 'address' || kind === 'data_storage_requirement' || kind === 'custom_input') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Please enter a value');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput(true);
      return;
    }

    if (kind === 'media_upload') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Please upload your file.');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setMediaUploadError('');
      setWaitingForInput('media_upload');
      return;
    }

    if (kind === 'media_download') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Download your files below:');
      const items = Array.isArray(node.data?.media_items) ? node.data.media_items : [];
      const nextMessages = [...(messagesRef.current || []), { type: 'bot', text: prompt }];
      items.forEach((item) => {
        const fileUrl = (item?.file_url || '').toString().trim();
        const filePath = (item?.file_path || '').toString().trim();
        if (!fileUrl && !filePath) return;
        nextMessages.push({
          type: 'bot',
          text: (item?.label || item?.file_name || 'Download file').toString(),
          file_url: fileUrl,
          file_path: filePath,
          file_name: item?.file_name || 'download',
          mime_type: item?.mime_type || '',
          attachment_type: item?.attachment_type || '',
        });
      });
      if (!items.length) {
        nextMessages.push({ type: 'bot', text: 'No files available to download yet.' });
      }
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setWaitingForInput(false);
      const nextId = getNextNodeId(flow.edges, node.id);
      if (nextId) {
        setTimeout(() => setCurrentNodeId(nextId), 400);
      } else {
        setTimeout(() => void submitIfCompleteRef.current(null, collectedRef.current, nextMessages), 400);
      }
      return;
    }

    if (kind === 'data_hub') {
      let cancelled = false;
      const resolveVar = (value, bag) => {
        const v = (value || '').toString().trim();
        if (!v) return '';
        if (v.startsWith('@')) {
          const key = v.slice(1).trim();
          const resolved = getCollectedValue(bag, key);
          return resolved != null ? String(resolved) : '';
        }
        return v;
      };

      (async () => {
        let opOk = true;
        try {
          const bag = { ...(collectedRef.current || {}) };
          const operation = (node.data?.operation || 'INSERT').toString().trim().toUpperCase();
          const tableId = (node.data?.table_id || '').toString().trim();
          const mappings = Array.isArray(node.data?.mappings) ? node.data.mappings : [];
          const rowIdVar = (node.data?.row_id_var || '').toString().trim();

          if (botId && tableId) {
            if (operation === 'INSERT') {
              const row = {};
              mappings.forEach((m) => {
                const col = (m?.column || '').toString().trim();
                if (!col) return;
                row[col] = resolveVar(m?.variable, bag);
              });
              const resp = await publicExecuteDataHubOp({ botId, tableId, operation: 'INSERT', row });
              if (!resp?.success) opOk = false;
            } else if (operation === 'UPDATE') {
              const patch = {};
              mappings.forEach((m) => {
                const col = (m?.column || '').toString().trim();
                if (!col) return;
                patch[col] = resolveVar(m?.variable, bag);
              });
              const rowId = resolveVar(rowIdVar, bag);
              if (!rowId) {
                opOk = false;
              } else {
                const resp = await publicExecuteDataHubOp({ botId, tableId, operation: 'UPDATE', rowId, patch });
                if (!resp?.success) opOk = false;
              }
            } else if (operation === 'DELETE') {
              const rowId = resolveVar(rowIdVar, bag);
              if (!rowId) {
                opOk = false;
              } else {
                const resp = await publicExecuteDataHubOp({ botId, tableId, operation: 'DELETE', rowId });
                if (!resp?.success) opOk = false;
              }
            } else if (operation === 'SEARCH') {
              const rawFilters = Array.isArray(node.data?.filters) ? node.data.filters : [];
              const filters = rawFilters
                .map((f) => ({
                  column: (f?.column || '').toString().trim(),
                  operator: (f?.operator || 'IS').toString().trim(),
                  value: resolveVar(f?.value, bag),
                }))
                .filter((f) => f.column);
              if (!filters.length) {
                opOk = false;
              } else {
                const resp = await publicExecuteDataHubOp({ botId, tableId, operation: 'SEARCH', filters });
                const row = resp?.data;
                const found = Boolean(resp?.success && row && typeof row === 'object');
                if (found) {
                  const rmaps = Array.isArray(node.data?.response_mappings) ? node.data.response_mappings : [];
                  const patches = {};
                  // Copy raw row keys into collected vars using normalized aliases,
                  // so message nodes can reference common Data Hub columns directly.
                  Object.entries(row).forEach(([rk, rv]) => {
                    if (rv === undefined || rv === null || String(rv).trim() === '') return;
                    const normKey = normalizeDataHubColumnKey(rk);
                    if (!normKey) return;
                    if (patches[normKey] === undefined) patches[normKey] = rv;
                    const compactKey = normKey.replace(/_/g, '');
                    if (compactKey && patches[compactKey] === undefined) patches[compactKey] = rv;
                  });
                  rmaps.forEach((rm) => {
                    const col = (rm?.column || '').toString().trim();
                    let vname = (rm?.variable || '').toString().trim();
                    if (!col || !vname) return;
                    if (vname.startsWith('@')) vname = vname.slice(1);
                    const cell = dataHubRowGet(row, col);
                    patches[vname] = cell !== undefined && cell !== null ? cell : '';
                  });
                  // Always expose standard order/status variables if present in the row,
                  // so messages using @order_no and @status work reliably.
                  const orderCell =
                    dataHubRowGet(row, 'order_no') ??
                    dataHubRowGet(row, 'Order no') ??
                    dataHubRowGet(row, 'Order No') ??
                    dataHubRowGet(row, 'Order number');
                  if (orderCell !== undefined && orderCell !== null && String(orderCell).trim() !== '') {
                    if (patches.order_no === undefined || String(patches.order_no).trim() === '') patches.order_no = orderCell;
                    if (patches.orderno === undefined || String(patches.orderno).trim() === '') patches.orderno = orderCell;
                  }
                  const statusCell = dataHubRowGet(row, 'status') ?? dataHubRowGet(row, 'Status');
                  if (statusCell !== undefined && statusCell !== null && String(statusCell).trim() !== '') {
                    if (patches.status === undefined || String(patches.status).trim() === '') patches.status = statusCell;
                  }
                  const nextBag = { ...bag, ...patches };
                  collectedRef.current = nextBag;
                  setCollected(nextBag);
                } else {
                  opOk = false;
                }
              }
            }
          } else {
            opOk = false;
          }
        } catch {
          // silent - do not break chat flow
          opOk = false;
        } finally {
          if (cancelled) return;
          const nextId = getNextNodeId(flow.edges, node.id, opOk ? 'success' : 'fallback');
          if (nextId) {
            setCurrentNodeId(nextId);
          } else {
            setWaitingForInput(false);
            void submitIfCompleteRef.current(null, collectedRef.current);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (kind === 'catalogue') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Here are our products:');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput('catalogue');
      setCheckoutNodeId(node.id);
      return;
    }

    if (kind === 'agent_assign') {
      lastAgentAssignNodeIdRef.current = node.id;
      const note = node.data?.auto_sequence
        ? 'You are being assigned to our support team.'
        : 'You are being assigned to an available support agent.';
      setMessages((prev) => [...prev, { type: 'bot', text: note }]);
      setWaitingForInput(false);
      const nextId = getNextNodeId(flow.edges, node.id);
      if (nextId) {
        setTimeout(() => setCurrentNodeId(nextId), 120);
      } else {
        void submitIfCompleteRef.current(null, collectedRef.current);
      }
      return;
    }
  }, [bot, loading, error, currentNodeId, nodesById, flow.edges, renderWithVars]);

  const loadLiveChatMessages = async () => {
    if (!liveChatSession?.public_token) return;
    try {
      const resp = await fetchPublicLiveChatMessages(liveChatSession.public_token, 100);
      if (resp?.success && Array.isArray(resp.data)) {
        setLiveChatMessages(resp.data);
      }
    } catch (e) {
      setLiveChatError(e.message || 'Failed to load live chat messages.');
    }
  };

  useEffect(() => {
    if (!liveChatOpen) return;
    setLiveChatError('');
    void loadLiveChatMessages();
    const t = setInterval(() => {
      void loadLiveChatMessages();
    }, 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveChatOpen, liveChatSession?.public_token]);

  useEffect(() => {
    if (botMessagesEndRef.current) {
      botMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, submitted, liveChatOpen, waitingForInput]);

  useEffect(() => {
    if (!liveChatOpen) return;
    if (liveChatEndRef.current) {
      liveChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveChatOpen, liveChatMessages.length]);

  useEffect(() => {
    if (!cartOpen || !cartSummaryRef.current) return;
    requestAnimationFrame(() => {
      cartSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [cartOpen]);

  const handleSendLiveChatMessage = async () => {
    if (!liveChatSession?.public_token) return;
    const text = liveChatInput.trim();
    if (!text) return;
    setLiveChatInput('');
    setLiveChatError('');
    try {
      await sendPublicLiveChatMessage(liveChatSession.public_token, text);
      await loadLiveChatMessages();
    } catch (e) {
      setLiveChatError(e.message || 'Failed to send message.');
    }
  };

  const handleYesNoChoice = (choice) => {
    if (waitingForInput !== 'yes_no') return;
    const choiceText = choice === 'yes' ? 'Yes' : 'No';
    setMessages((prev) => [...prev, { type: 'user', text: choiceText }]);
    setWaitingForInput(false);

    const node = nodesById[currentNodeId];
    const kind = node?.data?.kind;
    if (kind === 'yes_no') {
      const rawVar = (node?.data?.variable || 'yes_no').toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || 'yes_no';
      setCollected((prev) => {
        const next = { ...(prev || {}), [varKey]: choice };
        collectedRef.current = next;
        return next;
      });
    }

    const nextId = getNextNodeId(flow.edges, currentNodeId, choice);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      // No edge found for this choice - end chat
      if (choice === 'no') {
        setMessages((prev) => [...prev, { type: 'bot', text: 'Thank you for your time. Chat ended.' }]);
        setWaitingForInput(false);
      } else {
        // Yes but no edge - end flow
        void submitIfCompleteRef.current(null, collectedRef.current);
      }
    }
  };

  const handleMultipleChoicePick = (optionId, optionLabel) => {
    if (waitingForInput !== 'multiple_choice') return;
    const labelText = (optionLabel || '').trim() || 'Option';
    setMessages((prev) => [...prev, { type: 'user', text: labelText }]);
    setWaitingForInput(false);

    const node = nodesById[currentNodeId];
    if (node?.data?.kind === 'multiple_choice') {
      const rawVar = (node?.data?.variable || 'choice').toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || 'choice';
      setCollected((prev) => {
        const next = { ...(prev || {}), [varKey]: labelText };
        collectedRef.current = next;
        return next;
      });
    }

    const nextId = getNextNodeId(flow.edges, currentNodeId, null, optionId);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      void submitIfCompleteRef.current(null, collectedRef.current);
    }
  };

  const addToCart = (item) => {
    setCartItems((prev) => {
      const pid = String(item.product_id || '');
      const bid = String(item.batch_id || '');
      const key = `${pid}::${bid}`;
      const existing = prev.find((x) => `${String(x.product_id || '')}::${String(x.batch_id || '')}` === key);
      if (existing) {
        return prev.map((x) =>
          `${String(x.product_id || '')}::${String(x.batch_id || '')}` === key
            ? { ...x, qty: Math.min(99, (x.qty || 1) + (item.qty || 1)) }
            : x,
        );
      }
      return prev.concat({ ...item, qty: item.qty || 1 });
    });
  };

  const updateCartQty = (productId, batchId, delta) => {
    setCartItems((prev) =>
      prev
        .map((x) =>
          String(x.product_id || '') === String(productId || '') && String(x.batch_id || '') === String(batchId || '')
            ? { ...x, qty: (x.qty || 1) + delta }
            : x,
        )
        .filter((x) => (x.qty || 0) > 0),
    );
  };

  const cartCount = cartItems.reduce((a, b) => a + (Number(b.qty) || 0), 0);

  const handleProceedCheckout = async () => {
    const preferredNode = nodesById[checkoutNodeId] || nodesById[currentNodeId];
    const node = preferredNode;
    if (!node || node.data?.kind !== 'catalogue') return;
    const tableId = (node.data?.table_id || '').toString().trim();
    if (!botId || !tableId) return;

    const bag = collectedRef.current || {};
    const name = getCollectedValue(bag, 'name') || '';
    const phone = getCollectedValue(bag, 'phone') || '';
    const email = getCollectedValue(bag, 'email') || '';
    const address = getCollectedValue(bag, 'address') || '';

    const total = cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const orderNo = generateCheckoutOrderNo();

    // Base row with standard fields
    const row = {
      customer_name: String(name || ''),
      customer_phone: String(phone || ''),
      customer_email: String(email || ''),
      customer_address: String(address || ''),
      cart_items: cartItems.map((it) => ({
        product_id: it.product_id,
        product_name: it.name,
        price: it.price,
        qty: it.qty,
        description: it.description || '',
        image: it.image || '',
        batch_id: it.batch_id || '',
        batch_name: it.batch_name || '',
        gst: it.gst != null ? it.gst : '',
      })),
      total_amount: total,
      status: 'PENDING',
      order_no: orderNo,
    };

    // Apply catalogue record mappings (like Database Hub)
    const mappings = Array.isArray(node.data?.mappings) ? node.data.mappings : [];
    mappings.forEach((m) => {
      const col = (m?.column || '').toString().trim();
      let variable = (m?.variable || '').toString().trim();
      if (!col || !variable) return;
      if (variable.startsWith('@')) variable = variable.slice(1);
      const v = getCollectedValue(bag, variable);
      if (v !== undefined) {
        row[col] = v;
      }
    });

    const seller = bot?.seller || {};
    const linesForInvoice = cartItems.map((it, i) => ({
      sr: i + 1,
      item: String(it.name || ''),
      qty: Number(it.qty) || 0,
      rate: Number(it.price) || 0,
      gstPct: Number(it.gst) || 0,
      amount: (Number(it.price) || 0) * (Number(it.qty) || 0),
    }));

    try {
      await publicExecuteDataHubOp({ botId, tableId, operation: 'INSERT', row });
      const rawVar = (node?.data?.variable || '@cart_items').toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || 'cart_items';
      setCollected((prev) => {
        const next = { ...(prev || {}), [varKey]: row.cart_items, order_no: orderNo };
        collectedRef.current = next;
        return next;
      });
      setInvoiceCapturePayload({
        businessName: (seller.business_name || '').trim() || botName,
        phone: (seller.phone || '').trim(),
        email: (seller.email || '').trim(),
        orderNo,
        invoiceDateIso: new Date().toISOString(),
        customerName: String(name || '').trim() || 'Customer',
        customerPhone: String(phone || '').trim(),
        lines: linesForInvoice,
        total,
      });
    } catch {
      // non-blocking
    }

    setCartOpen(false);
    setCartItems([]);
    setWaitingForInput(false);
    const sourceForNext = checkoutNodeId || currentNodeId;
    const nextId = getNextNodeId(flow.edges, sourceForNext);
    if (nextId) setCurrentNodeId(nextId);
    else void submitIfCompleteRef.current(null, collectedRef.current);
  };

  const handleCatalogueOptionPick = (optionId, optionLabel) => {
    if (waitingForInput !== 'catalogue') return;
    const labelText = (optionLabel || '').trim() || 'Option';
    setMessages((prev) => [...prev, { type: 'user', text: labelText }]);
    setWaitingForInput(false);
    const nextId = getNextNodeId(flow.edges, currentNodeId, null, optionId);
    if (nextId) setCurrentNodeId(nextId);
    else void submitIfCompleteRef.current(null, collectedRef.current);
  };

  const advanceAfterMediaUpload = (uploadPayload, nextMessages) => {
    const node = nodesById[currentNodeId];
    const kind = node?.data?.kind;
    if (kind) {
      const rawVar = (node?.data?.variable || kind).toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || kind;
      setCollected((prev) => {
        const next = {
          ...(prev || {}),
          [varKey]: uploadPayload?.file_url || '',
          [`${varKey}_file_name`]: uploadPayload?.file_name || '',
          [`${varKey}_mime_type`]: uploadPayload?.mime_type || '',
        };
        collectedRef.current = next;
        return next;
      });
    }
    setWaitingForInput(false);
    setMediaUploadError('');
    const nextId = getNextNodeId(flow.edges, currentNodeId);
    if (nextId) setCurrentNodeId(nextId);
    else void submitIfCompleteRef.current(null, collectedRef.current, nextMessages);
  };

  const handleMediaFileSelect = async (event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = '';
    if (!file || waitingForInput !== 'media_upload') return;

    const node = nodesById[currentNodeId];
    const formatTypes = node?.data?.format_types;
    const validationError = validateMediaFile(file, formatTypes, {
      errorMessage: node?.data?.error_message,
      maxVideoSizeMb: node?.data?.max_video_size_mb || 10,
    });
    if (validationError) {
      setMediaUploadError(validationError);
      return;
    }

    setMediaUploading(true);
    setMediaUploadError('');
    try {
      const resp = await uploadBotMedia(botId, file);
      const payload = resp?.data || {};
      const attachmentType = payload.attachment_type || detectAttachmentType(file.type, file.name);
      const userMessage = {
        type: 'user',
        text: `Uploaded: ${payload.file_name || file.name}`,
        file_url: payload.file_url,
        file_path: payload.file_path || payload.path || '',
        file_name: payload.file_name || file.name,
        mime_type: payload.mime_type || file.type,
        attachment_type: attachmentType,
      };
      const nextMessages = [...(messagesRef.current || []), userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      advanceAfterMediaUpload(payload, nextMessages);
    } catch (e) {
      setMediaUploadError(e?.message || node?.data?.error_message || 'File upload failed.');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleSend = () => {
    if (!waitingForInput || waitingForInput === 'yes_no' || waitingForInput === 'multiple_choice' || waitingForInput === 'media_upload') return;
    const value = input.trim();
    if (!value) return;
    const nextMessages = [...(messagesRef.current || []), { type: 'user', text: value }];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInput('');
    setWaitingForInput(false);

    const node = nodesById[currentNodeId];
    const kind = node?.data?.kind;
    if (kind) {
      const rawVar = (node?.data?.variable || kind).toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || kind;
      setCollected((prev) => {
        const next = { ...(prev || {}), [varKey]: value };
        collectedRef.current = next;
        return next;
      });
    }

    const nextId = getNextNodeId(flow.edges, currentNodeId);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      // End of flow after input
      void submitIfCompleteRef.current(null, collectedRef.current, nextMessages);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, fontFamily: 'sans-serif' }}>
        <Typography variant="body2">Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100vh',
        width: '100vw',
        borderRadius: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        fontFamily: `"${fontFamily}", system-ui, sans-serif`,
      }}
    >
      <Box sx={{ p: 2, backgroundColor: primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {headerTitle}
          </Typography>
          <Typography variant="caption">{botName}</Typography>
        </Box>
        <IconButton onClick={() => setCartOpen((prev) => !prev)} sx={{ color: '#fff' }} disabled={cartCount === 0}>
          <Badge color="error" badgeContent={cartCount} overlap="circular">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: submitted && liveChatOpen ? 0.4 : 1,
          minHeight: 0,
          p: 2,
          overflowY: 'auto',
          color: '#e5e7eb',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {messages.map((m, idx) => (
          <Box
            key={idx}
            sx={{
              mb: 1.25,
              display: 'flex',
              justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Box
              sx={{
                maxWidth: m.kind === 'invoice' ? '92%' : '85%',
                px: 1.5,
                py: 1,
                borderRadius: `${bubbleRadius}px`,
                backgroundColor: m.type === 'user' ? primaryColor : '#1e293b',
                color: '#fff',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 14,
              }}
            >
              {m.kind === 'invoice' && m.imageUrl ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ color: '#e5e7eb', fontSize: 14, lineHeight: 1.45 }}>{m.text}</Typography>
                  <Box
                    component="img"
                    src={m.imageUrl}
                    alt="Online invoice"
                    sx={{ maxWidth: '100%', height: 'auto', borderRadius: `${Math.min(bubbleRadius, 12)}px`, border: '1px solid rgba(148,163,184,0.25)' }}
                  />
                  <Button
                    component="a"
                    href={m.imageUrl}
                    download={m.fileName || 'invoice.png'}
                    variant="contained"
                    size="small"
                    sx={{
                      alignSelf: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 800,
                      backgroundColor: primaryColor,
                      '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
                    }}
                  >
                    Download online invoice (PNG)
                  </Button>
                </Box>
              ) : m.file_url ? (
                <LiveChatAttachment message={m} textColor="#fff" primaryColor={primaryColor} />
              ) : (
                m.text
              )}
            </Box>
          </Box>
        ))}
        {waitingForInput === 'multiple_choice' && !submitted ? (
          <Box
            sx={{
              mb: 1.25,
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <Box sx={{ maxWidth: '85%' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                {(nodesById[currentNodeId]?.data?.options || []).map((opt) => (
                  <Button
                    key={opt.id}
                    variant="outlined"
                    size="small"
                    onClick={() => handleMultipleChoicePick(opt.id, opt.label)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                      lineHeight: 1.2,
                      py: 0.5,
                      px: 1.25,
                      minWidth: 'auto',
                      borderRadius: `${cardRadius}px`,
                      borderColor: `${primaryColor}99`,
                      color: '#fff',
                      backgroundColor: 'rgba(30,41,59,0.95)',
                      boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.15)',
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor}33`,
                      },
                    }}
                  >
                    {(opt.label || '').trim() || 'Option'}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        ) : null}
        {waitingForInput === 'yes_no' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ maxWidth: '85%' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleYesNoChoice('yes')}
                  sx={{
                    backgroundColor: '#10b981',
                    color: '#fff',
                    px: 2,
                    py: 0.75,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    '&:hover': { backgroundColor: '#059669' },
                  }}
                >
                  Yes
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleYesNoChoice('no')}
                  sx={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    px: 2,
                    py: 0.75,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    '&:hover': { backgroundColor: '#dc2626' },
                  }}
                >
                  No
                </Button>
              </Box>
            </Box>
          </Box>
        ) : null}
        {waitingForInput === 'media_upload' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ maxWidth: '92%', width: '100%' }}>
              <input
                ref={mediaFileInputRef}
                type="file"
                accept={buildMediaAcceptString(nodesById[currentNodeId]?.data?.format_types)}
                style={{ display: 'none' }}
                onChange={(e) => void handleMediaFileSelect(e)}
              />
              <Button
                variant="contained"
                startIcon={mediaUploading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CloudUploadIcon />}
                disabled={mediaUploading}
                onClick={() => mediaFileInputRef.current?.click()}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: primaryColor,
                  '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
                }}
              >
                {mediaUploading ? 'Uploading...' : 'Choose file to upload'}
              </Button>
              {mediaUploadError ? (
                <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
                  {mediaUploadError}
                </Alert>
              ) : null}
            </Box>
          </Box>
        ) : null}
        {waitingForInput === 'catalogue' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ maxWidth: '100%' }}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  ref={catalogueStripRef}
                  sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 8 } }}
                >
                {(nodesById[currentNodeId]?.data?.products || []).map((p, idx) => {
                  const pid = p.product_id;
                  const prod = publicProducts.find((x) => String(x.product_id) === String(pid)) || null;
                  const name = prod?.product_name || `Product ${idx + 1}`;
                  const price = Number(p.price || prod?.selling_price || 0);
                  const selectedBatch = (prod?.batches || []).find((b) => String(b.batch_id) === String(p.batch_id));
                  const configuredBatchQty = Number(p?.qty ?? 0);
                  const liveBatchQty = Number(selectedBatch?.available_quantity ?? 0);
                  // Prefer live selected-batch qty, then configured qty, then product total qty.
                  const availableQty = liveBatchQty > 0 ? liveBatchQty : configuredBatchQty > 0 ? configuredBatchQty : Number(prod?.available_quantity || 0);
                  const qtyKey = `${String(pid || idx)}::${String(p.batch_id || '')}`;
                  const rawPickQty = Number(cataloguePickQty[qtyKey] || 1);
                  const pickQty = Math.max(1, Math.min(availableQty > 0 ? availableQty : 1, rawPickQty));
                  return (
                    <Box
                      key={`${pid || idx}`}
                      sx={{
                        minWidth: 240,
                        maxWidth: 240,
                        backgroundColor: '#1e293b',
                        borderRadius: `${cardRadius}px`,
                        border: '1px solid rgba(148,163,184,0.18)',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ height: 120, backgroundColor: '#0b1624', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.image ? (
                          <img alt={name} src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>No image</Typography>
                        )}
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 13 }}>{name}</Typography>
                        <Typography sx={{ color: '#9ca3af', fontSize: 12, mt: 0.5, minHeight: 34 }}>
                          {(p.description || prod?.description || '').toString().slice(0, 60)}
                        </Typography>
                        <Typography sx={{ color: primaryColor, fontWeight: 900, fontSize: 12, mt: 0.75 }}>₹{price || 0}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.25, gap: 1 }}>
                          <Typography sx={{ color: '#94a3b8', fontSize: 12 }}>Available: {availableQty}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() =>
                                setCataloguePickQty((prev) => ({
                                  ...prev,
                                  [qtyKey]: Math.max(1, (Number(prev[qtyKey] || 1) - 1)),
                                }))
                              }
                              sx={{ minWidth: 28, width: 28, height: 28, p: 0, color: '#e5e7eb', borderColor: 'rgba(148,163,184,0.35)' }}
                            >
                              -
                            </Button>
                            <Typography sx={{ width: 18, textAlign: 'center', color: '#e5e7eb', fontWeight: 700, fontSize: 13 }}>
                              {pickQty}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={availableQty <= 0 || pickQty >= availableQty}
                              onClick={() =>
                                setCataloguePickQty((prev) => ({
                                  ...prev,
                                  [qtyKey]: Math.min(availableQty, (Number(prev[qtyKey] || 1) + 1)),
                                }))
                              }
                              sx={{ minWidth: 28, width: 28, height: 28, p: 0, color: '#e5e7eb', borderColor: 'rgba(148,163,184,0.35)' }}
                            >
                              +
                            </Button>
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          fullWidth
                          variant="contained"
                          disabled={!pid || availableQty <= 0}
                          onClick={() =>
                            addToCart({
                              product_id: pid,
                              batch_id: p.batch_id || '',
                              batch_name: selectedBatch?.batch_name || '',
                              name,
                              price,
                              qty: pickQty,
                              description: p.description || prod?.description || '',
                              image: p.image || '',
                              gst:
                                prod?.gst !== undefined && prod?.gst !== null && String(prod.gst).trim() !== ''
                                  ? Number(prod.gst)
                                  : 0,
                            })
                          }
                          sx={{
                            mt: 1.25,
                            textTransform: 'none',
                            backgroundColor: primaryColor,
                            fontWeight: 800,
                            fontSize: 12,
                            py: 0.5,
                            fontFamily: `"${fontFamily}", system-ui, sans-serif`,
                            '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
                            '&.Mui-disabled': { backgroundColor: 'rgba(148,163,184,0.35)' },
                          }}
                        >
                          {p.button_text || 'Add to Cart'}
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
                </Box>

                {catalogueOverflowing ? (
                  <>
                    {catalogueCanLeft ? (
                      <IconButton
                        onClick={() => scrollCatalogueBy(-1)}
                        sx={{
                          position: 'absolute',
                          left: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 32,
                          height: 32,
                          backgroundColor: 'rgba(15, 23, 42, 0.78)',
                          color: '#e5e7eb',
                          boxShadow: '0 10px 18px rgba(0,0,0,0.35)',
                          border: '1px solid rgba(148,163,184,0.22)',
                          backdropFilter: 'blur(6px)',
                          '&:hover': { backgroundColor: 'rgba(15, 23, 42, 0.92)' },
                        }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {catalogueCanRight ? (
                      <IconButton
                        onClick={() => scrollCatalogueBy(1)}
                        sx={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 32,
                          height: 32,
                          backgroundColor: 'rgba(15, 23, 42, 0.78)',
                          color: '#e5e7eb',
                          boxShadow: '0 10px 18px rgba(0,0,0,0.35)',
                          border: '1px solid rgba(148,163,184,0.22)',
                          backdropFilter: 'blur(6px)',
                          '&:hover': { backgroundColor: 'rgba(15, 23, 42, 0.92)' },
                        }}
                      >
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </>
                ) : null}
              </Box>
              {(nodesById[currentNodeId]?.data?.options || []).length ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                  {(nodesById[currentNodeId]?.data?.options || []).map((opt) => (
                    <Button
                      key={opt.id}
                      variant="outlined"
                      size="small"
                      onClick={() => handleCatalogueOptionPick(opt.id, opt.label)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: 12,
                        py: 0.45,
                        px: 1.2,
                        borderRadius: `${cardRadius}px`,
                        borderColor: `${primaryColor}99`,
                        color: '#fff',
                        backgroundColor: 'rgba(30,41,59,0.95)',
                        '&:hover': { borderColor: primaryColor, backgroundColor: `${primaryColor}33` },
                      }}
                    >
                      {(opt.label || '').trim() || 'Option'}
                    </Button>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : null}
        {cartOpen ? (
          <Box
            ref={cartSummaryRef}
            sx={{
              mt: 1,
              mb: 1.25,
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: `${cardRadius}px`,
              overflow: 'hidden',
              backgroundColor: '#0f172a',
            }}
          >
            <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#e5e7eb', fontWeight: 900, fontSize: 14 }}>Cart Summary</Typography>
              <Button size="small" onClick={() => setCartOpen(false)} sx={{ textTransform: 'none', color: '#93c5fd' }}>
                Close
              </Button>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {cartItems.length === 0 ? (
                <Typography sx={{ color: '#9ca3af', py: 1 }}>Cart is empty.</Typography>
              ) : (
                <>
                  {cartItems.map((it) => (
                    <Box
                      key={`${it.product_id || ''}::${it.batch_id || ''}`}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(148,163,184,0.18)',
                        borderRadius: `${cardRadius}px`,
                        p: 1.25,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{it.name}</Typography>
                        <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>
                          ₹{Number(it.price) || 0} × {it.qty}
                        </Typography>
                        {it.batch_id ? (
                          <Typography sx={{ color: '#64748b', fontSize: 11 }}>Batch: {it.batch_id}</Typography>
                        ) : null}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={() => updateCartQty(it.product_id, it.batch_id, -1)}
                          sx={{ minWidth: 36, px: 0, color: '#e5e7eb', borderColor: 'rgba(148,163,184,0.35)' }}
                        >
                          −
                        </Button>
                        <Typography sx={{ width: 18, textAlign: 'center' }}>{it.qty}</Typography>
                        <Button
                          variant="outlined"
                          onClick={() => updateCartQty(it.product_id, it.batch_id, +1)}
                          sx={{ minWidth: 36, px: 0, color: '#e5e7eb', borderColor: 'rgba(148,163,184,0.35)' }}
                        >
                          +
                        </Button>
                      </Box>
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography sx={{ color: '#cbd5e1', fontWeight: 800 }}>Total:</Typography>
                    <Typography sx={{ color: primaryColor, fontWeight: 900 }}>
                      ₹{cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => void handleProceedCheckout()}
                    sx={{
                      mt: 0.5,
                      textTransform: 'none',
                      fontWeight: 900,
                      backgroundColor: primaryColor,
                      fontFamily: `"${fontFamily}", system-ui, sans-serif`,
                      '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
                    }}
                  >
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </Box>
          </Box>
        ) : null}
        <Box ref={botMessagesEndRef} />
      </Box>

      {submitted && liveChatSession ? (
        liveChatOpen ? (
          <Box
            sx={{
              flex: 0.6,
              borderTop: '1px solid rgba(148,163,184,0.2)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              p: 0,
              backgroundColor: '#0f172a',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>
                Live Chat with Admin
              </Typography>
              {liveChatError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {liveChatError}
                </Alert>
              ) : null}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {liveChatMessages.length === 0 ? (
                <Typography sx={{ color: '#9ca3af', textAlign: 'center', mt: 3 }}>
                  No messages yet. Say hi!
                </Typography>
              ) : (
                liveChatMessages.map((m) => (
                  <Box
                    key={m.message_id}
                    sx={{
                      display: 'flex',
                      justifyContent: m.sender_type === 'customer' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '85%',
                        padding: 1.25,
                        borderRadius: `${bubbleRadius}px`,
                        backgroundColor: m.sender_type === 'customer' ? primaryColor : '#1e293b',
                        color: '#fff',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.file_url ? (
                        <LiveChatAttachment message={m} textColor="#fff" primaryColor={primaryColor} />
                      ) : (
                        m.message
                      )}
                    </Box>
                  </Box>
                ))
              )}
              <div ref={liveChatEndRef} />
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={liveChatInput}
                  onChange={(e) => setLiveChatInput(e.target.value)}
                  placeholder="Type your message..."
                  fullWidth
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && liveChatInput.trim()) {
                      e.preventDefault();
                      void handleSendLiveChatMessage();
                    }
                  }}
                  InputProps={{
                    sx: { backgroundColor: '#0b1624', color: '#e5e7eb' },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => void handleSendLiveChatMessage()}
                  disabled={!liveChatInput.trim()}
                  sx={{ backgroundColor: primaryColor, minWidth: 44, px: 1.5 }}
                >
                  <SendIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
            <Button
              variant="contained"
              onClick={() => setLiveChatOpen(true)}
              sx={{
                backgroundColor: primaryColor,
                textTransform: 'none',
                fontWeight: 700,
                width: '100%',
                py: 1.5,
              }}
            >
              Chat with Seller
            </Button>
          </Box>
        )
      ) : waitingForInput === 'multiple_choice' || waitingForInput === 'yes_no' || waitingForInput === 'catalogue' || waitingForInput === 'media_upload' ? null : (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={waitingForInput ? 'Type your response...' : 'Waiting...'}
              fullWidth
              disabled={!waitingForInput}
              size="small"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && waitingForInput && input.trim()) {
                  handleSend();
                }
              }}
              InputProps={{
                sx: { backgroundColor: '#0b1624', color: '#e5e7eb' },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!waitingForInput || !input.trim()}
              sx={{ backgroundColor: primaryColor, minWidth: 44, px: 1.5 }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
      )}

      {/* Off-screen invoice DOM for html2canvas (checkout success). */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          left: -12000,
          top: 0,
          zIndex: -5,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <Box ref={invoiceCaptureRef}>
          {invoiceCapturePayload ? (
            <TaxInvoiceCaptureMarkup
              businessName={invoiceCapturePayload.businessName}
              phone={invoiceCapturePayload.phone}
              email={invoiceCapturePayload.email}
              orderNo={invoiceCapturePayload.orderNo}
              invoiceDateIso={invoiceCapturePayload.invoiceDateIso}
              customerName={invoiceCapturePayload.customerName}
              customerPhone={invoiceCapturePayload.customerPhone}
              lines={invoiceCapturePayload.lines}
              total={invoiceCapturePayload.total}
            />
          ) : null}
        </Box>
      </Box>
    </Paper>
  );
}

export default BotWidget;


