import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Badge,
  Card,
  Typography,
  Stepper,
  Step,
  StepButton,
  StepLabel,
  Button,
  Paper,
  TextField,
  Stack,
  Divider,
  Alert,
  IconButton,
  MenuItem,
  Select,
  Chip,
  Switch,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReactFlow, {
  Handle,
  Position,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Swal from 'sweetalert2';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { createBot, fetchBots, publishBot, updateBot, uploadBotBuilderMedia } from '../../../api/bots';
import { getApiOrigin } from '../../../api/client';

import { fetchDataHubTables } from '../../../api/dataHub';
import { fetchSellerProducts } from '../../../api/products';
import { fetchStockOutBatches } from '../../../api/batches';
import { fetchTeamManagers, fetchTeamMembers } from '../../../api/teamManagement';
import SendIcon from '@mui/icons-material/Send';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import html2canvas from 'html2canvas';
import TaxInvoiceCaptureMarkup from '../../../components/TaxInvoiceCaptureMarkup';
import LiveChatAttachment from '../../../components/LiveChatAttachment';
import {
  buildMediaAcceptString,
  DEFAULT_MEDIA_FORMAT_TYPES,
  detectAttachmentType,
  validateMediaFile,
} from '../../../utils/mediaUpload';

function getNextNodeId(edges, sourceId, label = null, sourceHandle = null) {
  const out = (edges || []).filter((e) => e.source === sourceId);
  if (sourceHandle != null && String(sourceHandle).length) {
    const sh = String(sourceHandle);
    const byHandle = out.find((e) => String(e.sourceHandle || '') === sh);
    if (byHandle) return byHandle.target;
  }
  if (label) {
    // Match by edge label if present; otherwise fall back to first/second edge order.
    const labeled = out.find((e) => {
      const edgeLabel = (e.label || '').toLowerCase();
      return (
        edgeLabel === label.toLowerCase() ||
        (label === 'yes' && edgeLabel === '') ||
        (label === 'yes' &&
          !out.find((e2) => e2.label && e2.label.toLowerCase() === 'no'))
      );
    });
    if (labeled) return labeled.target;

    if (label === 'no' && out.length > 1) {
      const noEdge = out.find((e) => (e.label || '').toLowerCase() === 'no') || out[1];
      return noEdge.target;
    }
  }
  return out.length > 0 ? out[0].target : null;
}

function getInitialNodeId(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  if (list.length === 0) return null;
  const startNode = list.find((n) => n.id === 'start');
  if (startNode) return 'start';
  return list[0]?.id || null;
}

function generatePreviewOrderNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `ORD-${y}${m}${day}-${suffix}`;
}

/** Catalogue "Add Image" uses readAsDataURL — multi‑MB JSON → nginx 413 on PUT. Shrink for API only. */
function compressDataUrlAsJpeg(dataUrl, maxSide = 640, quality = 0.82) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, tw, th);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out.length && out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Deep clone flow and compress catalogue product images before createBot/updateBot. */
async function buildFlowPayloadForApiSave(nodes, edges) {
  const serialNodes = JSON.parse(JSON.stringify(Array.isArray(nodes) ? nodes : []));
  const serialEdges = JSON.parse(JSON.stringify(Array.isArray(edges) ? edges : []));

  for (const node of serialNodes) {
    if (node?.data?.kind !== 'catalogue' || !Array.isArray(node.data.products)) continue;
    node.data.products = await Promise.all(
      node.data.products.map(async (p) => {
        if (!p || typeof p.image !== 'string' || !p.image.startsWith('data:image')) return p;
        const image = await compressDataUrlAsJpeg(p.image);
        return { ...p, image };
      }),
    );
  }
  return { nodes: serialNodes, edges: serialEdges };
}

function getPreviewCollectedValue(bag, rawKey) {
  if (bag == null || rawKey == null) return undefined;
  const k = String(rawKey).trim();
  if (!k) return undefined;
  if (Object.prototype.hasOwnProperty.call(bag, k)) return bag[k];
  const lower = k.toLowerCase();
  for (const bk of Object.keys(bag)) {
    if (bk.toLowerCase() === lower) return bag[bk];
  }
  if (lower === 'name' || lower === 'full_name') {
    if (bag.name !== undefined) return bag.name;
    if (bag.full_name !== undefined) return bag.full_name;
  }
  if (lower === 'phone' || lower === 'mobile' || lower === 'mobile_number' || lower === 'contact_number') {
    if (bag.phone !== undefined) return bag.phone;
    if (bag.mobile !== undefined) return bag.mobile;
    if (bag.mobile_number !== undefined) return bag.mobile_number;
  }
  if (lower === 'email') {
    if (bag.email !== undefined) return bag.email;
  }
  return undefined;
}

function BotFlowPreview({ nodes, edges, design, sellerInvoice }) {
  const primaryColor = design.primaryColor || '#0ea5e9';
  const headerTitle = design.chatHeaderTitle || 'Chat with us';
  const botName = design.chatbotName || 'Bot';
  const chatBackground = design.chatBackground || '#ffffff';
  const fontFamily = design.fontFamily || 'Inter';
  const bubbleStyle = design.bubbleStyle || 'rounded';
  const bubbleRadius = bubbleStyle === 'pill' ? 999 : bubbleStyle === 'sharp' ? 8 : 16;

  const nodesById = useMemo(() => {
    const map = {};
    (nodes || []).forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  const [messages, setMessages] = useState([{ type: 'bot', text: 'Welcome 👋' }]);
  const [currentNodeId, setCurrentNodeId] = useState(() => getInitialNodeId(nodes));
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [collected, setCollected] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [input, setInput] = useState('');
  const [mediaUploadError, setMediaUploadError] = useState('');
  const mediaFileInputRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const [cataloguePickQty, setCataloguePickQty] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutNodeId, setCheckoutNodeId] = useState(null);
  const invoiceCaptureRef = useRef(null);
  const [invoiceCapturePayload, setInvoiceCapturePayload] = useState(null);

  const renderWithVars = useCallback((text) => {
    const raw = (text || '').toString();
    const normalized = raw.replace(/\uFF03/g, '@');
    return normalized.replace(/@\s*([a-zA-Z0-9_]+)/g, (_, key) => {
      const k = String(key || '').trim();
      if (!k) return '';
      if (Object.prototype.hasOwnProperty.call(collected || {}, k) && collected[k] != null) {
        return String(collected[k]);
      }
      const lower = k.toLowerCase();
      for (const ck of Object.keys(collected || {})) {
        if (ck.toLowerCase() === lower && collected[ck] != null) {
          return String(collected[ck]);
        }
      }
      return `@${key}`;
    });
  }, [collected]);

  const reset = () => {
    setMessages([{ type: 'bot', text: 'Welcome 👋' }]);
    setInput('');
    setCurrentNodeId(getInitialNodeId(nodes));
    setWaitingForInput(false);
    setCollected({});
    setSubmitted(false);
    setCataloguePickQty({});
    setCartItems([]);
    setCartOpen(false);
    setCheckoutNodeId(null);
    setInvoiceCapturePayload(null);
  };

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, waitingForInput, submitted, cartOpen, cartItems]);

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
            text: `Thank you! Your order number is ${payload.orderNo}. (Preview — not saved.)`,
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
        const safeName = `invoice-preview-${String(payload.orderNo).replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            kind: 'invoice',
            text: `Thank you! Your order number is ${payload.orderNo}. (Preview — not saved.) Download your online invoice below.`,
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
              text: `Thank you! Your order number is ${payload.orderNo}. (Preview — not saved.)`,
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
    if (!nodesById || submitted) return;

    const node = nodesById[currentNodeId];
    if (!node) return;

    // Start node: auto-advance
    if (node.id === 'start') {
      const nextId = getNextNodeId(edges, node.id);
      if (nextId) setCurrentNodeId(nextId);
      return;
    }

    const kind = node.data?.kind;

    if (kind === 'message') {
      const text = renderWithVars(node.data?.text || node.data?.label || '...');
      setMessages((prev) => [...prev, { type: 'bot', text }]);
      setWaitingForInput(false);
      const nextId = getNextNodeId(edges, node.id);
      if (nextId) {
        // Small delay to make the preview feel like a bot
        setTimeout(() => setCurrentNodeId(nextId), 250);
      } else {
        setSubmitted(true);
      }
      return;
    }

    if (kind === 'yes_no') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Do you want to continue the chat?');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput('yes_no');
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
      setMessages((prev) => {
        const next = [...prev, { type: 'bot', text: prompt }];
        items.forEach((item) => {
          const fileUrl = (item?.file_url || '').toString().trim();
          const filePath = (item?.file_path || '').toString().trim();
          if (!fileUrl && !filePath) return;
          next.push({
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
          next.push({ type: 'bot', text: 'No files added yet (preview).' });
        }
        return next;
      });
      setWaitingForInput('media_download');
      return;
    }

    if (kind === 'data_hub') {
      setWaitingForInput(false);
      const timer = setTimeout(() => {
        const hubNode = node;
        const operation = (hubNode?.data?.operation || 'INSERT').toString().trim().toUpperCase();
        let branch = 'success';

        if (operation === 'SEARCH') {
          const resolveVar = (value, bag) => {
            const v = (value || '').toString().trim();
            if (!v) return '';
            if (v.startsWith('@')) {
              const key = v.slice(1).trim();
              const resolved = getPreviewCollectedValue(bag, key);
              return resolved != null ? String(resolved) : '';
            }
            return v;
          };
          const bag = { ...(collected || {}) };
          const rawFilters = Array.isArray(hubNode?.data?.filters) ? hubNode.data.filters : [];
          const filters = rawFilters
            .map((f) => ({
              column: (f?.column || '').toString().trim(),
              operator: (f?.operator || 'IS').toString().trim().toUpperCase(),
              value: resolveVar(f?.value, bag),
            }))
            .filter((f) => f.column);
          const simFound = filters.length > 0 && filters.every((f) => String(f.value || '').trim() !== '');
          branch = simFound ? 'success' : 'fallback';
          if (simFound) {
            const fakeRow = {};
            filters.forEach((f) => {
              fakeRow[f.column] = f.value;
            });
            const rmaps = Array.isArray(hubNode?.data?.response_mappings) ? hubNode.data.response_mappings : [];
            rmaps.forEach((rm) => {
              const col = (rm?.column || '').toString().trim();
              if (col && fakeRow[col] === undefined) fakeRow[col] = `(preview ${col})`;
            });
            setCollected((prev) => {
              const next = { ...(prev || {}) };
              rmaps.forEach((rm) => {
                const col = (rm?.column || '').toString().trim();
                let vname = (rm?.variable || '').toString().trim();
                if (!col || !vname) return;
                if (vname.startsWith('@')) vname = vname.slice(1);
                next[vname] = fakeRow[col] ?? '';
              });
              return next;
            });
          }
        }

        const nextId = getNextNodeId(edges, hubNode.id, branch);
        if (nextId) setCurrentNodeId(nextId);
        else setSubmitted(true);
      }, 320);
      return () => clearTimeout(timer);
    }

    if (kind === 'catalogue') {
      const prompt = renderWithVars(node.data?.prompt || node.data?.label || 'Here are our products:');
      setMessages((prev) => [...prev, { type: 'bot', text: prompt }]);
      setWaitingForInput('catalogue');
      setCheckoutNodeId(node.id);
      return;
    }

    if (kind === 'agent_assign') {
      const note = node.data?.auto_sequence
        ? 'Agent assign: sequence mode enabled'
        : 'Agent assign: random mode enabled';
      setMessages((prev) => [...prev, { type: 'bot', text: note }]);
      setWaitingForInput(false);
      const nextId = getNextNodeId(edges, node.id);
      if (nextId) setTimeout(() => setCurrentNodeId(nextId), 120);
      else setSubmitted(true);
      return;
    }

    // Unknown node kind: try to advance
    const nextId = getNextNodeId(edges, node.id);
    if (nextId) setCurrentNodeId(nextId);
  }, [currentNodeId, nodesById, edges, submitted, renderWithVars]);

  const handleYesNoChoice = (choice) => {
    if (waitingForInput !== 'yes_no') return;

    const choiceText = choice === 'yes' ? 'Yes' : 'No';
    setMessages((prev) => [...prev, { type: 'user', text: choiceText }]);
    setWaitingForInput(false);

    const node = nodesById[currentNodeId];
    const kind = node?.data?.kind;

    let nextCollected = collected;
    if (kind === 'yes_no') {
      const rawVar = (node?.data?.variable || 'yes_no').toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || 'yes_no';
      nextCollected = { ...(collected || {}), [varKey]: choice };
      setCollected(nextCollected);
    }

    const nextId = getNextNodeId(edges, currentNodeId, choice);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Chat ended.' }]);
      setSubmitted(true);
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
      setCollected((prev) => ({ ...(prev || {}), [varKey]: labelText }));
    }

    const nextId = getNextNodeId(edges, currentNodeId, null, optionId);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Chat ended.' }]);
      setSubmitted(true);
    }
  };

  const addToCartPreview = (item) => {
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

  const updateCartQtyPreview = (productId, batchId, delta) => {
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

  const cartCountPreview = cartItems.reduce((a, b) => a + (Number(b.qty) || 0), 0);

  const handleProceedCheckoutPreview = () => {
    const preferredNode = nodesById[checkoutNodeId] || nodesById[currentNodeId];
    const node = preferredNode;
    if (!node || node.data?.kind !== 'catalogue') return;

    const bag = { ...collected };
    const name = getPreviewCollectedValue(bag, 'name') || '';
    const phone = getPreviewCollectedValue(bag, 'phone') || '';
    const email = getPreviewCollectedValue(bag, 'email') || '';
    const address = getPreviewCollectedValue(bag, 'address') || '';

    const total = cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
    const orderNo = generatePreviewOrderNo();

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
      status: 'PREVIEW',
      order_no: orderNo,
    };

    const mappings = Array.isArray(node.data?.mappings) ? node.data.mappings : [];
    mappings.forEach((m) => {
      const col = (m?.column || '').toString().trim();
      let variable = (m?.variable || '').toString().trim();
      if (!col || !variable) return;
      if (variable.startsWith('@')) variable = variable.slice(1);
      const v = getPreviewCollectedValue(bag, variable);
      if (v !== undefined) {
        row[col] = v;
      }
    });

    const rawVar = (node?.data?.variable || '@cart_items').toString().trim();
    const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || 'cart_items';
    setCollected((prev) => ({ ...(prev || {}), [varKey]: row.cart_items, order_no: orderNo }));

    const si = sellerInvoice || {};
    const headerBusiness = (si.business_name || '').trim() || botName;
    const linesForInvoice = cartItems.map((it, i) => ({
      sr: i + 1,
      item: String(it.name || ''),
      qty: Number(it.qty) || 0,
      rate: Number(it.price) || 0,
      gstPct: Number(it.gst) || 0,
      amount: (Number(it.price) || 0) * (Number(it.qty) || 0),
    }));
    setInvoiceCapturePayload({
      businessName: headerBusiness,
      phone: (si.phone || '').trim(),
      email: (si.email || '').trim(),
      orderNo,
      invoiceDateIso: new Date().toISOString(),
      customerName: String(name || '').trim() || 'Customer',
      customerPhone: String(phone || '').trim(),
      lines: linesForInvoice,
      total,
    });

    setCartOpen(false);
    setCartItems([]);
    setWaitingForInput(false);
    const sourceForNext = checkoutNodeId || currentNodeId;
    const nextId = getNextNodeId(edges, sourceForNext);
    if (nextId) setCurrentNodeId(nextId);
    else setSubmitted(true);
  };

  const handleCatalogueOptionPickPreview = (optionId, optionLabel) => {
    if (waitingForInput !== 'catalogue') return;
    const labelText = (optionLabel || '').trim() || 'Option';
    setMessages((prev) => [...prev, { type: 'user', text: labelText }]);
    setWaitingForInput(false);
    const nextId = getNextNodeId(edges, currentNodeId, null, optionId);
    if (nextId) setCurrentNodeId(nextId);
    else setSubmitted(true);
  };

  const handleMediaDownloadContinuePreview = () => {
    if (waitingForInput !== 'media_download') return;
    setWaitingForInput(false);
    const nextId = getNextNodeId(edges, currentNodeId);
    if (nextId) setCurrentNodeId(nextId);
    else {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Thanks! Your details have been submitted.' }]);
      setSubmitted(true);
    }
  };

  const handlePreviewMediaFileSelect = (event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = '';
    if (!file || waitingForInput !== 'media_upload') return;

    const node = nodesById[currentNodeId];
    const validationError = validateMediaFile(file, node?.data?.format_types, {
      errorMessage: node?.data?.error_message,
      maxVideoSizeMb: node?.data?.max_video_size_mb || 10,
    });
    if (validationError) {
      setMediaUploadError(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const attachmentType = detectAttachmentType(file.type, file.name);
    const userMessage = {
      type: 'user',
      text: `Uploaded: ${file.name}`,
      file_url: objectUrl,
      file_name: file.name,
      mime_type: file.type,
      attachment_type: attachmentType,
    };
    setMessages((prev) => [...prev, userMessage]);
    setMediaUploadError('');
    setWaitingForInput(false);

    const kind = node?.data?.kind;
    if (kind) {
      const rawVar = (node?.data?.variable || kind).toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || kind;
      setCollected((prev) => ({
        ...(prev || {}),
        [varKey]: objectUrl,
        [`${varKey}_file_name`]: file.name,
      }));
    }

    const nextId = getNextNodeId(edges, currentNodeId);
    if (nextId) setCurrentNodeId(nextId);
    else {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Thanks! Your details have been submitted.' }]);
      setSubmitted(true);
    }
  };

  const handleSend = () => {
    if (!waitingForInput || waitingForInput === 'yes_no' || waitingForInput === 'multiple_choice' || waitingForInput === 'catalogue' || waitingForInput === 'media_upload' || waitingForInput === 'media_download') return;
    const value = input.trim();
    if (!value) return;

    const node = nodesById[currentNodeId];
    const kind = node?.data?.kind;

    setMessages((prev) => [...prev, { type: 'user', text: value }]);
    setInput('');
    setWaitingForInput(false);

    if (kind) {
      const rawVar = (node?.data?.variable || kind).toString().trim();
      const varKey = (rawVar.startsWith('@') ? rawVar.slice(1) : rawVar) || kind;
      setCollected((prev) => ({ ...(prev || {}), [varKey]: value }));
    }

    const nextId = getNextNodeId(edges, currentNodeId);
    if (nextId) {
      setCurrentNodeId(nextId);
    } else {
      setMessages((prev) => [...prev, { type: 'bot', text: 'Thanks! Your details have been submitted.' }]);
      setSubmitted(true);
    }
  };

  return (
    <Paper
      sx={{
        height: '100%',
        minHeight: 0,
        backgroundColor: chatBackground,
        borderRadius: 2,
        border: '1px solid rgba(148,163,184,0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily,
      }}
      elevation={0}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: primaryColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {headerTitle}
          </Typography>
          <Typography variant="caption">{botName}</Typography>
        </Box>
        <IconButton
          onClick={() => setCartOpen((v) => !v)}
          sx={{ color: '#fff', flexShrink: 0 }}
          disabled={cartCountPreview === 0}
          title="Cart (preview only)"
          size="small"
        >
          <Badge color="error" badgeContent={cartCountPreview} overlap="circular" invisible={cartCountPreview === 0}>
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </Box>

      <Box
        ref={messagesScrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          p: 2,
          color: '#0f172a',
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
                borderRadius: bubbleRadius,
                backgroundColor: m.type === 'user' ? primaryColor : '#f1f5f9',
                color: m.type === 'user' ? '#fff' : '#0f172a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 14,
              }}
            >
              {m.kind === 'invoice' && m.imageUrl ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ fontSize: 14, lineHeight: 1.45, color: '#0f172a' }}>{m.text}</Typography>
                  <Box
                    component="img"
                    src={m.imageUrl}
                    alt="Online invoice preview"
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      borderRadius: `${Math.min(bubbleRadius, 12)}px`,
                      border: '1px solid rgba(148,163,184,0.35)',
                    }}
                  />
                  <Button
                    component="a"
                    href={m.imageUrl}
                    download={m.fileName || 'invoice-preview.png'}
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
                <LiveChatAttachment message={m} textColor={m.type === 'user' ? '#fff' : '#0f172a'} primaryColor={primaryColor} />
              ) : (
                m.text
              )}
            </Box>
          </Box>
        ))}
        {waitingForInput === 'media_upload' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ maxWidth: '92%', width: '100%' }}>
              <input
                ref={mediaFileInputRef}
                type="file"
                accept={buildMediaAcceptString(nodesById[currentNodeId]?.data?.format_types)}
                style={{ display: 'none' }}
                onChange={handlePreviewMediaFileSelect}
              />
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => mediaFileInputRef.current?.click()}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  backgroundColor: primaryColor,
                  '&:hover': { backgroundColor: primaryColor, filter: 'brightness(0.92)' },
                }}
              >
                Choose file to upload
              </Button>
              {mediaUploadError ? (
                <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
                  {mediaUploadError}
                </Alert>
              ) : null}
            </Box>
          </Box>
        ) : null}
        {waitingForInput === 'media_download' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleMediaDownloadContinuePreview}
              sx={{
                backgroundColor: primaryColor,
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
              }}
            >
              Continue
            </Button>
          </Box>
        ) : null}
        {waitingForInput === 'multiple_choice' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
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
                      py: 0.5,
                      px: 1.25,
                      minWidth: 'auto',
                      borderRadius: 2,
                      borderColor: `${primaryColor}99`,
                      color: '#0f172a',
                      backgroundColor: 'rgba(241,245,249,0.95)',
                      '&:hover': {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor}18`,
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
        {waitingForInput === 'catalogue' && !submitted ? (
          <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'flex-start' }}>
            <Box sx={{ maxWidth: '100%', width: '100%' }}>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', mb: 1 }}>
                Preview only — cart is not saved.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 6 } }}>
                {(nodesById[currentNodeId]?.data?.products || []).map((p, idx) => {
                  const pid = p.product_id;
                  const configuredQty = Number(p?.qty ?? 0);
                  const availableQty = configuredQty > 0 ? configuredQty : 99;
                  const name =
                    (p.description || '').toString().trim().slice(0, 42) || `Product ${idx + 1}`;
                  const price = Number(p.price || 0);
                  const qtyKey = `${String(pid || idx)}::${String(p.batch_id || '')}`;
                  const rawPickQty = Number(cataloguePickQty[qtyKey] || 1);
                  const pickQty = Math.max(1, Math.min(availableQty, rawPickQty));
                  const canAdd = Boolean(pid) && availableQty > 0;
                  return (
                    <Box
                      key={`${pid || idx}-${qtyKey}`}
                      sx={{
                        minWidth: 200,
                        maxWidth: 200,
                        backgroundColor: '#f8fafc',
                        borderRadius: 2,
                        border: '1px solid rgba(148,163,184,0.35)',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ height: 96, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.image ? (
                          <img alt="" src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography sx={{ color: '#94a3b8', fontSize: 11 }}>No image</Typography>
                        )}
                      </Box>
                      <Box sx={{ p: 1.25 }}>
                        <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: 12, lineHeight: 1.25 }}>{name}</Typography>
                        <Typography sx={{ color: primaryColor, fontWeight: 800, mt: 0.75, fontSize: 13 }}>₹{price || 0}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, gap: 0.5 }}>
                          <Typography sx={{ color: '#64748b', fontSize: 11 }}>Max: {availableQty}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() =>
                                setCataloguePickQty((prev) => ({
                                  ...prev,
                                  [qtyKey]: Math.max(1, (Number(prev[qtyKey] || 1) - 1)),
                                }))
                              }
                              sx={{ minWidth: 26, width: 26, height: 26, p: 0, fontSize: 12 }}
                            >
                              −
                            </Button>
                            <Typography sx={{ width: 16, textAlign: 'center', fontWeight: 700, fontSize: 12 }}>{pickQty}</Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={pickQty >= availableQty}
                              onClick={() =>
                                setCataloguePickQty((prev) => ({
                                  ...prev,
                                  [qtyKey]: Math.min(availableQty, (Number(prev[qtyKey] || 1) + 1)),
                                }))
                              }
                              sx={{ minWidth: 26, width: 26, height: 26, p: 0, fontSize: 12 }}
                            >
                              +
                            </Button>
                          </Box>
                        </Box>
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          disabled={!canAdd}
                          onClick={() =>
                            addToCartPreview({
                              product_id: pid,
                              batch_id: p.batch_id || '',
                              batch_name: (p.batch_name || '').toString().trim(),
                              name: (p.description || '').toString().trim().slice(0, 80) || `Product ${idx + 1}`,
                              price,
                              qty: pickQty,
                              description: p.description || '',
                              image: p.image || '',
                              gst:
                                p.gst !== undefined && p.gst !== null && String(p.gst).trim() !== ''
                                  ? Number(p.gst)
                                  : 0,
                            })
                          }
                          sx={{ mt: 1, textTransform: 'none', backgroundColor: primaryColor, fontWeight: 700, fontSize: 11 }}
                        >
                          {p.button_text || 'Add to Cart'}
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              {(nodesById[currentNodeId]?.data?.options || []).length ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                  {(nodesById[currentNodeId]?.data?.options || []).map((opt) => (
                    <Button
                      key={opt.id}
                      variant="outlined"
                      size="small"
                      onClick={() => handleCatalogueOptionPickPreview(opt.id, opt.label)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: 11,
                        borderColor: `${primaryColor}99`,
                        color: '#0f172a',
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
            sx={{
              mt: 0.5,
              mb: 1.25,
              border: '1px solid rgba(148,163,184,0.35)',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
            }}
          >
            <Box sx={{ px: 1.25, py: 1, borderBottom: '1px solid rgba(148,163,184,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: 13 }}>Cart (preview)</Typography>
              <Button size="small" onClick={() => setCartOpen(false)} sx={{ textTransform: 'none', fontSize: 12 }}>
                Close
              </Button>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {cartItems.length === 0 ? (
                <Typography sx={{ color: '#64748b', py: 0.5, fontSize: 13 }}>Cart is empty.</Typography>
              ) : (
                <>
                  {cartItems.map((it) => (
                    <Box
                      key={`${it.product_id || ''}::${it.batch_id || ''}`}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        border: '1px solid rgba(148,163,184,0.28)',
                        borderRadius: 1.5,
                        p: 1,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{it.name}</Typography>
                        <Typography sx={{ color: '#64748b', fontSize: 11 }}>
                          ₹{Number(it.price) || 0} × {it.qty}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Button variant="outlined" size="small" onClick={() => updateCartQtyPreview(it.product_id, it.batch_id, -1)} sx={{ minWidth: 28, p: 0 }}>
                          −
                        </Button>
                        <Typography sx={{ width: 16, textAlign: 'center', fontSize: 12 }}>{it.qty}</Typography>
                        <Button variant="outlined" size="small" onClick={() => updateCartQtyPreview(it.product_id, it.batch_id, 1)} sx={{ minWidth: 28, p: 0 }}>
                          +
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Total</Typography>
                    <Typography sx={{ color: primaryColor, fontWeight: 800 }}>
                      ₹
                      {cartItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleProceedCheckoutPreview}
                    sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: primaryColor, fontSize: 13 }}
                  >
                    Proceed to checkout
                  </Button>
                </>
              )}
            </Box>
          </Box>
        ) : null}
      </Box>

      {waitingForInput === 'multiple_choice' || waitingForInput === 'catalogue' || waitingForInput === 'media_upload' || waitingForInput === 'media_download' ? null : (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(148,163,184,0.2)' }}>
          {waitingForInput === 'yes_no' ? (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => handleYesNoChoice('yes')}
              sx={{
                backgroundColor: '#10b981',
                color: '#fff',
                px: 4,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#059669' },
              }}
            >
              YES
            </Button>
            <Button
              variant="contained"
              onClick={() => handleYesNoChoice('no')}
              sx={{
                backgroundColor: '#ef4444',
                color: '#fff',
                px: 4,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#dc2626' },
              }}
            >
              No
            </Button>
          </Box>
        ) : waitingForInput ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              fullWidth
              size="small"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  e.preventDefault();
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
              disabled={!input.trim()}
              sx={{ backgroundColor: primaryColor, minWidth: 44, px: 1.5 }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        ) : null}
        </Box>
      )}

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

const STEPS = ['Create Bot', 'Design', 'Publish'];

function getNodeTheme(kind) {
  const k = (kind || '').toString();
  if (k === 'message') return { accent: '#22c1ff', bg: '#0b2035', title: '#60d9ff', body: '#9cc8e8' };
  if (k === 'yes_no' || k === 'multiple_choice') return { accent: '#d946ef', bg: '#251231', title: '#f472b6', body: '#e9b3d9' };
  if (k === 'media_upload') return { accent: '#38bdf8', bg: '#10243a', title: '#7dd3fc', body: '#bae6fd' };
  if (k === 'media_download') return { accent: '#2dd4bf', bg: '#0f2a28', title: '#5eead4', body: '#99f6e4' };
  if (k === 'name' || k === 'phone' || k === 'email' || k === 'address' || k === 'custom_input' || k === 'data_storage_requirement') {
    return { accent: '#8b5cf6', bg: '#1b1737', title: '#a78bfa', body: '#c8bff3' };
  }
  if (k === 'data_hub') return { accent: '#06b6d4', bg: '#112d3a', title: '#67e8f9', body: '#b7ecf4' };
  if (k === 'catalogue') return { accent: '#f59e0b', bg: '#2d1f0b', title: '#fbbf24', body: '#fde68a' };
  if (k === 'agent_assign') return { accent: '#34d399', bg: '#0f2a22', title: '#6ee7b7', body: '#a7f3d0' };
  return { accent: '#22c1ff', bg: '#0b2035', title: '#60d9ff', body: '#9cc8e8' };
}

function StandardBotNode({ id, data, selected }) {
  const kind = (data?.kind || '').toString();
  const isStart = id === 'start';
  const titleMap = {
    message: 'Message',
    name: 'Name',
    phone: 'Contact Number',
    email: 'Email',
    address: 'Address',
    data_storage_requirement: 'Data Storage Requirement',
    custom_input: 'Custom Input',
    media_upload: 'Media Upload',
    media_download: 'Media Download',
    yes_no: 'Yes/No Choice',
    agent_assign: 'Agent Assign',
  };
  const title = titleMap[kind] || 'Component';
  const subtitle = kind === 'message' ? (data?.text || '').toString() : (data?.prompt || '').toString();
  const theme = getNodeTheme(kind);
  const handleStyle = { width: 10, height: 10, border: '2px solid #fff' };
  return (
    <Box
      sx={{
        width: 250,
        border: selected ? `1px solid ${theme.accent}` : '1px solid rgba(96,165,250,0.28)',
        borderRadius: 1.5,
        backgroundColor: theme.bg,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: selected ? `0 0 0 1px ${theme.accent}66, 0 8px 24px rgba(2,6,23,0.40)` : '0 8px 24px rgba(2,6,23,0.35)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#22c1ff', top: -6, ...handleStyle }} />
      <Box sx={{ px: 1.25, py: 0.7, borderBottom: '1px solid rgba(148,163,184,0.18)' }}>
        <Typography sx={{ fontSize: 11, color: '#8fb3d0', fontWeight: 700 }}>
          ID: {String(data?.idHint || id || '').slice(-6).toUpperCase()}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: theme.title, lineHeight: 1.2 }}>{title}</Typography>
            <Typography sx={{ fontSize: 11, color: theme.body, mt: 0.25, lineHeight: 1.3 }}>
              {subtitle || '...'}
            </Typography>
          </Box>
          {!isStart ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              <IconButton
                size="small"
                sx={{ p: 0.25, color: '#64748b' }}
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onCopy?.();
                }}
                title="Copy"
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ p: 0.25, color: '#64748b' }}
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onDelete?.();
                }}
                title="Delete"
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ) : null}
        </Box>
      </Box>
      {kind === 'yes_no' ? (
        <>
          <Box sx={{ px: 1.25, py: 0.65, backgroundColor: 'rgba(34,193,255,0.18)', borderBottom: '1px solid rgba(34,193,255,0.24)', position: 'relative' }}>
            <Typography sx={{ fontSize: 12, color: theme.body, fontWeight: 700 }}>Yes</Typography>
            <Handle type="source" id="yes" position={Position.Right} style={{ background: '#22c1ff', right: -7, ...handleStyle }} />
          </Box>
          <Box sx={{ px: 1.25, py: 0.65, backgroundColor: 'rgba(34,193,255,0.12)', position: 'relative' }}>
            <Typography sx={{ fontSize: 12, color: theme.body, fontWeight: 700 }}>No</Typography>
            <Handle type="source" id="no" position={Position.Right} style={{ background: '#22c1ff', right: -7, ...handleStyle }} />
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ px: 1.25, py: 0.65, backgroundColor: 'rgba(15,23,42,0.18)', position: 'relative' }}>
            <Typography sx={{ fontSize: 11, color: theme.body, fontWeight: 700 }}>{title}</Typography>
          </Box>
          <Handle type="source" position={Position.Bottom} style={{ background: '#22c1ff', bottom: -6, ...handleStyle }} />
        </>
      )}
    </Box>
  );
}

function MultipleChoiceNode({ data }) {
  const options = Array.isArray(data?.options) && data.options.length ? data.options : [{ id: 'opt_1', label: 'Option 1' }];
  const q = (data?.prompt || data?.label || '').toString().trim();
  return (
    <Box
      sx={{
        width: 268,
        border: '1px solid rgba(217,70,239,0.45)',
        borderRadius: 1.5,
        backgroundColor: '#251231',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(2,6,23,0.40)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#22c1ff', top: -6 }} />

      <Box sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid rgba(217,70,239,0.28)' }}>
        <Typography sx={{ fontSize: 11, color: '#e9b3d9', fontWeight: 700 }}>
          ID: {String(data?.idHint || '').replace(/^multiple_choice-/, '').slice(-5).toUpperCase() || '2F784'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, justifyContent: 'space-between' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#f472b6', lineHeight: 1.2 }}>Options</Typography>
            <Typography sx={{ fontSize: 11, color: '#e9b3d9', mt: 0.35, lineHeight: 1.3 }}>
              {q || 'What is your choice?'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
            <IconButton
              size="small"
              sx={{ p: 0.25, color: '#64748b' }}
              onClick={(e) => {
                e.stopPropagation();
                data?.onCopy?.();
              }}
              title="Copy"
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ p: 0.25, color: '#64748b' }}
              onClick={(e) => {
                e.stopPropagation();
                data?.onDelete?.();
              }}
              title="Delete"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <MoreVertIcon sx={{ fontSize: 14, color: '#64748b' }} />
          </Box>
        </Box>
      </Box>

      {options.map((opt) => (
        <Box
          key={opt.id}
          sx={{
            px: 1.25,
            py: 0.7,
            backgroundColor: 'rgba(217,70,239,0.12)',
            borderBottom: '1px solid rgba(217,70,239,0.20)',
            position: 'relative',
            pr: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 12, color: '#f3d2e8', fontWeight: 700, pr: 0.5, lineHeight: 1.35 }}>
            {(opt.label || '').trim() || 'Option'}
          </Typography>
          <Handle
            type="source"
            id={String(opt.id)}
            position={Position.Right}
            style={{ background: '#22c1ff', width: 10, height: 10, border: '2px solid #fff', right: -6, top: '50%', transform: 'translateY(-50%)' }}
          />
        </Box>
      ))}
    </Box>
  );
}

function DataHubNode({ data }) {
  const op = (data?.operation || 'INSERT').toUpperCase();
  return (
    <Box
      sx={{
        width: 250,
        border: '1px solid rgba(6,182,212,0.45)',
        borderRadius: 1.5,
        backgroundColor: '#112d3a',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(2,6,23,0.40)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#22c1ff', top: -6 }} />

      <Box sx={{ px: 1.25, py: 0.7, borderBottom: '1px solid rgba(6,182,212,0.24)' }}>
        <Typography sx={{ fontSize: 11, color: '#b7ecf4', fontWeight: 700 }}>
          ID: {String(data?.idHint || '').replace('data_hub-', '').slice(-5).toUpperCase() || 'C6825'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#67e8f9' }}>Database Hub</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              sx={{ p: 0.25, color: '#64748b' }}
              onClick={(e) => {
                e.stopPropagation();
                data?.onCopy?.();
              }}
              title="Copy"
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ p: 0.25, color: '#64748b' }}
              onClick={(e) => {
                e.stopPropagation();
                data?.onDelete?.();
              }}
              title="Delete"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <MoreVertIcon sx={{ fontSize: 14, color: '#64748b' }} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 11, color: '#b7ecf4', mt: 0.25 }}>{op}</Typography>
      </Box>

      <Box sx={{ px: 1.25, py: 0.65, backgroundColor: 'rgba(6,182,212,0.22)', borderBottom: '1px solid rgba(6,182,212,0.24)', position: 'relative' }}>
        <Typography sx={{ fontSize: 12, color: '#b7ecf4', fontWeight: 700 }}>Success</Typography>
        <Handle type="source" id="success" position={Position.Right} style={{ background: '#22c1ff', right: -7 }} />
      </Box>
      <Box sx={{ px: 1.25, py: 0.65, backgroundColor: 'rgba(6,182,212,0.16)', position: 'relative' }}>
        <Typography sx={{ fontSize: 12, color: '#b7ecf4', fontWeight: 700 }}>Fallback</Typography>
        <Handle type="source" id="fallback" position={Position.Right} style={{ background: '#22c1ff', right: -7 }} />
      </Box>
    </Box>
  );
}

function CatalogueNode({ data }) {
  const options =
    Array.isArray(data?.options) && data.options.length
      ? data.options
      : [
          { id: 'opt_1', label: 'Option 1' },
          { id: 'opt_2', label: 'Option 2' },
        ];
  return (
    <Box
      sx={{
        width: 280,
        border: '1px solid rgba(14,165,233,0.42)',
        borderRadius: 1.5,
        backgroundColor: '#10253a',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(2,6,23,0.40)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#22c1ff', top: -6 }} />
      <Box sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid rgba(14,165,233,0.24)' }}>
        <Typography sx={{ fontSize: 11, color: '#b7ecf4', fontWeight: 700 }}>
          ID: {String(data?.idHint || '').replace('catalogue-', '').slice(-5).toUpperCase() || 'CAT01'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#67e8f9' }}>Catalogue</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" sx={{ p: 0.25, color: '#64748b' }} onClick={(e) => { e.stopPropagation(); data?.onCopy?.(); }} title="Copy">
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.25, color: '#64748b' }} onClick={(e) => { e.stopPropagation(); data?.onDelete?.(); }} title="Delete">
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {options.map((opt) => (
        <Box
          key={opt.id}
          sx={{
            px: 1.25,
            py: 0.7,
            backgroundColor: 'rgba(14,165,233,0.1)',
            borderBottom: '1px solid rgba(14,165,233,0.18)',
            position: 'relative',
            pr: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 12, color: '#dbeafe', fontWeight: 700, pr: 0.5, lineHeight: 1.35 }}>
            {(opt.label || '').trim() || 'Option'}
          </Typography>
          <Handle
            type="source"
            id={String(opt.id)}
            position={Position.Right}
            style={{ background: '#22c1ff', width: 10, height: 10, border: '2px solid #fff', right: -6, top: '50%', transform: 'translateY(-50%)' }}
          />
        </Box>
      ))}
      <Handle type="source" position={Position.Bottom} style={{ background: '#22c1ff', bottom: -6 }} />
    </Box>
  );
}

const DEFAULT_FLOW = {
  nodes: [
    {
      id: 'start',
      type: 'input',
      position: { x: 100, y: 80 },
      data: { label: 'Start (Bot Start)' },
    },
    {
      id: 'msg-1',
      type: 'default',
      position: { x: 100, y: 200 },
      data: { label: 'Message: Welcome', kind: 'message', text: 'Welcome' },
    },
    {
      id: 'name-1',
      type: 'default',
      position: { x: 100, y: 320 },
      data: { label: 'Name: Please share your good name', kind: 'name', prompt: 'Please share your good name.' },
    },
    {
      id: 'custom-1',
      type: 'default',
      position: { x: 100, y: 440 },
      data: { label: 'Custom Input: Share your feedback', kind: 'custom_input', prompt: 'Share your feedback' },
    },
    {
      id: 'msg-2',
      type: 'default',
      position: { x: 100, y: 560 },
      data: { label: 'Message: End', kind: 'message', text: 'End' },
    },
  ],
  edges: [
    { id: 'e-start-msg1', source: 'start', target: 'msg-1' },
    { id: 'e-msg1-name1', source: 'msg-1', target: 'name-1' },
    { id: 'e-name1-custom1', source: 'name-1', target: 'custom-1' },
    { id: 'e-custom1-msg2', source: 'custom-1', target: 'msg-2' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const EMPTY_FLOW = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

const COMPONENTS = [
  { type: 'message', title: 'Message', subtitle: 'Send a message', defaultData: { kind: 'message', text: 'Welcome' } },
  { type: 'name', title: 'Name', subtitle: 'Ask for the name', defaultData: { kind: 'name', prompt: 'Please share your good name.', variable: '@name' } },
  {
    type: 'phone',
    title: 'Contact Number',
    subtitle: 'Ask for contact / WhatsApp number',
    defaultData: { kind: 'phone', prompt: 'Please share your contact number.', variable: '@phone' },
  },
  {
    type: 'email',
    title: 'Email',
    subtitle: 'Ask for email address',
    defaultData: { kind: 'email', prompt: 'Please share your email address.', variable: '@email' },
  },
  {
    type: 'address',
    title: 'Address',
    subtitle: 'Ask for customer address',
    defaultData: { kind: 'address', prompt: 'Please share your address.', variable: '@address' },
  },
  {
    type: 'data_storage_requirement',
    title: 'Data Storage Requirement',
    subtitle: 'Ask where/how to store data',
    defaultData: { kind: 'data_storage_requirement', prompt: 'Please share your data storage requirement.', variable: '@data_storage_requirement' },
  },
  { type: 'custom_input', title: 'Custom Input', subtitle: 'Ask custom input', defaultData: { kind: 'custom_input', prompt: 'Share your feedback', variable: '@custom_input' } },
  {
    type: 'media_upload',
    title: 'Media Upload',
    subtitle: 'Ask user to upload photo, video or PDF',
    defaultData: {
      kind: 'media_upload',
      prompt: 'Please upload your skin photo....',
      variable: '@uploaded_media',
      format_types: { ...DEFAULT_MEDIA_FORMAT_TYPES },
      error_message: 'File type is not allowed or file is too large.',
      max_video_size_mb: 10,
    },
  },
  {
    type: 'media_download',
    title: 'Media Download',
    subtitle: 'Share image, video or PDF for end user to download',
    defaultData: {
      kind: 'media_download',
      prompt: 'Please download the files below.',
      media_items: [],
    },
  },
  {
    type: 'yes_no',
    title: 'Yes/No Choice',
    subtitle: 'Ask a yes/no question with branching',
    defaultData: { kind: 'yes_no', prompt: 'Do you want to continue the chat?', variable: '@yes_no' },
  },
  {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    subtitle: 'Question with buttons — branch per option',
    defaultData: {
      kind: 'multiple_choice',
      prompt: 'Which city do you belong to?',
      variable: '@city',
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' },
        { id: 'opt_3', label: 'Option 3' },
      ],
    },
  },
  {
    type: 'data_hub',
    title: 'Database Hub',
    subtitle: 'Insert, search, or update Data Hub rows',
    defaultData: {
      kind: 'data_hub',
      operation: 'INSERT',
      table_id: '',
      mappings: [{ column: '', variable: '@name' }],
      row_id_var: '',
      filters: [{ column: '', operator: 'IS', value: '' }],
      response_mappings: [{ column: '', variable: '' }],
    },
  },
  {
    type: 'agent_assign',
    title: 'Agent Assign',
    subtitle: 'Assign chat to team manager and agent',
    defaultData: {
      kind: 'agent_assign',
      auto_sequence: true,
      team_manager_user_id: '',
      agent_user_id: '',
    },
  },
  {
    type: 'catalogue',
    title: 'Catalogue',
    subtitle: 'Show products + cart + checkout',
    defaultData: {
      kind: 'catalogue',
      operation: 'INSERT',
      table_id: '',
      variable: '@cart_items',
      mappings: [{ column: '', variable: '@name' }],
      options: [
        { id: 'opt_1', label: 'Option 1' },
        { id: 'opt_2', label: 'Option 2' },
      ],
      products: [
        {
          product_id: '',
          batch_id: '',
          batch_name: '',
          gst: '',
          image: '',
          description: '',
          price: '',
          qty: 0,
          button_text: 'Add to Cart',
        },
      ],
    },
  },
];

function FlowBuilder({ nodes, setNodes, edges, setEdges, loadingSuppliers, onSave, design, setDesign, botId }) {
  const wrapperRef = useRef(null);
  const idRef = useRef(1000);

  // Synchronize idRef with existing nodes to prevent ID collisions during editing
  useEffect(() => {
    if (Array.isArray(nodes) && nodes.length > 0) {
      let maxIdNum = 1000;
      nodes.forEach((n) => {
        if (n?.id) {
          const parts = n.id.split('-');
          const lastPart = parts[parts.length - 1];
          const num = parseInt(lastPart, 10);
          if (!isNaN(num) && num > maxIdNum) {
            maxIdNum = num;
          }
        }
      });
      idRef.current = maxIdNum + 1;
    }
  }, [nodes]);

  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showComponents, setShowComponents] = useState(true);
  const [showData, setShowData] = useState(true);
  const [builderMediaUploading, setBuilderMediaUploading] = useState(false);
  const [dataHubTables, setDataHubTables] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [productBatchesByProduct, setProductBatchesByProduct] = useState({});
  const [teamManagers, setTeamManagers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const getProductAvailableQty = useCallback((prod) => {
    if (!prod || typeof prod !== 'object') return 0;
    const batches = Array.isArray(prod.batches) ? prod.batches : [];
    const batchQty = batches.reduce((sum, b) => {
      const q = Number(b?.available_quantity ?? 0);
      return sum + (Number.isFinite(q) ? q : 0);
    }, 0);
    if (batchQty > 0) return batchQty;
    const stock = Number(prod.available_stock ?? prod.available_quantity ?? 0);
    return Number.isFinite(stock) ? Math.max(stock, 0) : 0;
  }, []);

  const loadBatchesForProduct = useCallback(async (productId) => {
    const pid = String(productId || '').trim();
    if (!pid) return [];
    if (Array.isArray(productBatchesByProduct[pid])) return productBatchesByProduct[pid];
    try {
      // Use Stock Out batches API because it represents stocked-in batches with available qty.
      // Then keep only batches that have expiry date as requested.
      const resp = await fetchStockOutBatches(pid);
      const raw = resp?.success && Array.isArray(resp?.data) ? resp.data : [];
      const list = raw.filter((b) => {
        const hasExpiry = Boolean(b?.expiry_date);
        const qty = Number(b?.available_quantity ?? 0);
        return hasExpiry && qty > 0;
      });
      setProductBatchesByProduct((prev) => ({ ...prev, [pid]: list }));
      return list;
    } catch {
      setProductBatchesByProduct((prev) => ({ ...prev, [pid]: [] }));
      return [];
    }
  }, [productBatchesByProduct]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null),
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    if (selectedNode?.data?.kind !== 'catalogue') return;
    const products = Array.isArray(selectedNode?.data?.products) ? selectedNode.data.products : [];
    products.forEach((p) => {
      if (p?.product_id) {
        void loadBatchesForProduct(p.product_id);
      }
    });
  }, [selectedNode, loadBatchesForProduct]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const resp = await fetchDataHubTables();
        if (resp?.success && Array.isArray(resp.data)) setDataHubTables(resp.data);
        else setDataHubTables([]);
      } catch {
        setDataHubTables([]);
      }
    };
    void loadTables();
  }, []);

  useEffect(() => {
    const loadSellerProducts = async () => {
      try {
        const resp = await fetchSellerProducts();
        if (resp?.success && Array.isArray(resp.data)) setSellerProducts(resp.data);
        else setSellerProducts([]);
      } catch {
        setSellerProducts([]);
      }
    };
    void loadSellerProducts();
  }, []);

  useEffect(() => {
    const loadTeamOptions = async () => {
      try {
        const [managersResp, membersResp] = await Promise.all([fetchTeamManagers(), fetchTeamMembers()]);
        setTeamManagers(Array.isArray(managersResp?.data) ? managersResp.data : []);
        setTeamMembers(Array.isArray(membersResp?.data) ? membersResp.data : []);
      } catch {
        setTeamManagers([]);
        setTeamMembers([]);
      }
    };
    void loadTeamOptions();
  }, []);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [setNodes]);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [setEdges]);
  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const sourceKind = sourceNode?.data?.kind;
      const patch = { ...connection };
      if (sourceKind === 'yes_no') {
        patch.label = connection.sourceHandle === 'no' ? 'no' : 'yes';
      } else if (sourceKind === 'data_hub') {
        patch.label = connection.sourceHandle === 'fallback' ? 'fallback' : 'success';
      }
      // multiple_choice: do not set label — option routing uses edge.sourceHandle only (hidden on canvas)
      setEdges((eds) => addEdge(patch, eds));
    },
    [setEdges, nodes],
  );

  const onDragStart = (event, componentType) => {
    event.dataTransfer.setData('application/agrobot-node', componentType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const deleteNodeById = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    },
    [setNodes, setEdges],
  );

  const copyNodeById = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      let nextId = null;
      setNodes((nds) => {
        const source = nds.find((n) => n.id === nodeId);
        if (!source) return nds;
        const base = (source?.data?.kind || source?.type || 'node').toString();
        nextId = `${base}-${idRef.current++}`;
        const copyData = { ...(source.data || {}), idHint: nextId };
        const clone = {
          ...source,
          id: nextId,
          position: {
            x: (source?.position?.x || 0) + 40,
            y: (source?.position?.y || 0) + 40,
          },
          selected: false,
          data: copyData,
        };
        return nds.concat(clone);
      });
      if (nextId) setSelectedNodeId(nextId);
    },
    [setNodes],
  );

  const addNodeByType = (type) => {
    if (!type) return;
    const def = COMPONENTS.find((c) => c.type === type);
    if (!def) return;
    const verticalGap = 120;
    const DEFAULT_POSITION = { x: 100, y: 80 };

    // Place new node below selected/last node, but do not auto-connect.
    const selected = selectedNodeId && nodes.some((n) => n.id === selectedNodeId) ? selectedNodeId : null;
    const sourceId = selected ? selected : nodes.length ? nodes[nodes.length - 1].id : null;
    const baseNode = sourceId ? nodes.find((n) => n.id === sourceId) : null;
    const baseX = baseNode?.position?.x ?? DEFAULT_POSITION.x;
    const baseY = baseNode?.position?.y ?? DEFAULT_POSITION.y;

    const position = { x: baseX, y: baseY + verticalGap };

    const id = `${type}-${idRef.current++}`;
    const data = { ...def.defaultData };
    const label =
      type === 'message'
        ? `Message: ${data.text || ''}`.trim()
        : type === 'yes_no'
          ? `Yes/No: ${(data.prompt || '').trim()}`.trim()
          : type === 'multiple_choice'
            ? `Multiple Choice: ${(data.prompt || '').trim()}`.trim()
          : type === 'data_hub'
            ? `Database Hub: ${(data.operation || 'INSERT').trim()}`
          : type === 'agent_assign'
            ? `Agent Assign: ${data.auto_sequence ? 'Sequence' : 'Random'}`
          : `${def.title}: ${(data.prompt || '').trim()}`.trim();

    const newNode = {
      id,
      type:
        type === 'data_hub'
          ? 'data_hub'
          : type === 'multiple_choice'
            ? 'multiple_choice'
            : type === 'catalogue'
              ? 'catalogue'
              : 'standard',
      position,
      data: { ...data, idHint: id, label },
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  };

  const onDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/agrobot-node');
    addNodeByType(type);
  };

  const filteredComponents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COMPONENTS;
    return COMPONENTS.filter((c) => (c.title + ' ' + c.subtitle).toLowerCase().includes(q));
  }, [search]);

  const updateSelectedNodeData = (patch) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const nextData = { ...(n.data || {}), ...patch };
        // Keep label in sync
        const kind = nextData.kind;
        let label = nextData.label || '';
        if (kind === 'message') label = `Message: ${nextData.text || ''}`.trim();
        if (kind === 'name') label = `Name: ${nextData.prompt || ''}`.trim();
        if (kind === 'phone') label = `Phone: ${nextData.prompt || ''}`.trim();
        if (kind === 'email') label = `Email: ${nextData.prompt || ''}`.trim();
        if (kind === 'address') label = `Address: ${nextData.prompt || ''}`.trim();
        if (kind === 'data_storage_requirement') label = `Data Storage Requirement: ${nextData.prompt || ''}`.trim();
        if (kind === 'custom_input') label = `Custom Input: ${nextData.prompt || ''}`.trim();
        if (kind === 'media_upload') label = `Media Upload: ${nextData.prompt || ''}`.trim();
        if (kind === 'media_download') label = `Media Download: ${nextData.prompt || ''}`.trim();
        if (kind === 'yes_no') label = `Yes/No: ${nextData.prompt || ''}`.trim();
        if (kind === 'multiple_choice') label = `Multiple Choice: ${nextData.prompt || ''}`.trim();
        if (kind === 'data_hub') label = `Database Hub: ${(nextData.operation || 'INSERT').trim()}`;
        if (kind === 'agent_assign') label = `Agent Assign: ${nextData.auto_sequence ? 'Sequence' : 'Random'}`;
        if (kind === 'catalogue') label = `Catalogue: ${(nextData.operation || 'INSERT').trim()}`;
        return { ...n, data: { ...nextData, label } };
      }),
    );
  };

  const selectedTable = useMemo(() => {
    const tid = selectedNode?.data?.table_id;
    if (!tid) return null;
    return dataHubTables.find((t) => String(t.table_id) === String(tid)) || null;
  }, [dataHubTables, selectedNode?.data?.table_id]);

  const selectedTableColumns = useMemo(() => {
    const cols = selectedTable?.columns;
    return Array.isArray(cols) ? cols : [];
  }, [selectedTable]);

  const availableVariables = useMemo(() => {
    const all = [];
    nodes.forEach((n) => {
      if (n?.data?.kind !== 'data_hub') return;
      const mappings = Array.isArray(n?.data?.mappings) ? n.data.mappings : [];
      mappings.forEach((m) => all.push((m?.variable || '').toString().trim()));
    });
    return all
      .map((m) => (m || '').toString().trim())
      .filter(Boolean)
      .map((v) => (v.startsWith('@') ? v : `@${v}`));
  }, [nodes]);

  const canvasNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        type: n.type === 'default' ? 'standard' : n.type,
        data: {
          ...(n.data || {}),
          onCopy: () => copyNodeById(n.id),
          onDelete: () => deleteNodeById(n.id),
        },
      })),
    [nodes, copyNodeById, deleteNodeById],
  );

  const nodeTypes = useMemo(
    () => ({ standard: StandardBotNode, data_hub: DataHubNode, multiple_choice: MultipleChoiceNode, catalogue: CatalogueNode }),
    [],
  );

  const sidePanelScrollSx = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr 320px' }, gap: 2, alignItems: 'stretch' }}>
      {/* Left palette */}
      <Paper
        sx={{
          p: 2,
          backgroundColor: '#081528',
          border: '1px solid rgba(96,165,250,0.22)',
          height: { xs: 'min(70vh, 620px)', md: 620 },
          maxHeight: { xs: 'min(70vh, 620px)', md: 620 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: '#e5e7eb' }}>
            Create Bot
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
            Drag components onto the canvas and connect them visually.
          </Typography>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Component"
            size="small"
            fullWidth
            InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
          />
          <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', my: 2 }} />
        </Box>
        <Box sx={sidePanelScrollSx}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setShowData((v) => !v)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
        >
          <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 13 }}>Data</Typography>
          <Typography sx={{ color: '#9ca3af', fontWeight: 800, fontSize: 12 }}>{showData ? '−' : '+'}</Typography>
        </Box>
        {showData ? (
          <Stack spacing={1.25}>
            {filteredComponents
              .filter((c) => c.type === 'data_hub')
              .map((c) => (
                <Paper
                  key={c.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, c.type)}
                  onClick={() => addNodeByType(c.type)}
                  sx={{
                    p: 1.5,
                    cursor: 'grab',
                    backgroundColor: '#0b2035',
                    border: '1px solid rgba(96,165,250,0.25)',
                    color: '#e5e7eb',
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Typography fontWeight={700} sx={{ fontSize: 14 }}>
                    {c.title}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>{c.subtitle}</Typography>
                </Paper>
              ))}
          </Stack>
        ) : null}

        <Box
          role="button"
          tabIndex={0}
          onClick={() => setShowComponents((v) => !v)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 1, mt: 2 }}
        >
          <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 13 }}>Components</Typography>
          <Typography sx={{ color: '#9ca3af', fontWeight: 800, fontSize: 12 }}>{showComponents ? '−' : '+'}</Typography>
        </Box>
        {showComponents ? (
          <Stack spacing={1.25} sx={{ mb: 2 }}>
            {filteredComponents
              .filter((c) => c.type !== 'data_hub')
              .map((c) => (
                <Paper
                  key={c.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, c.type)}
                  onClick={() => addNodeByType(c.type)}
                  sx={{
                    p: 1.5,
                    cursor: 'grab',
                    backgroundColor: '#0b2035',
                    border: '1px solid rgba(96,165,250,0.25)',
                    color: '#e5e7eb',
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Typography fontWeight={700} sx={{ fontSize: 14 }}>
                    {c.title}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>{c.subtitle}</Typography>
                </Paper>
              ))}
          </Stack>
        ) : null}
        </Box>
        <Box sx={{ flexShrink: 0, pt: 0 }}>
          <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', my: 2 }} />
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={() => {
                setNodes(DEFAULT_FLOW.nodes);
                setEdges(DEFAULT_FLOW.edges);
                setSelectedNodeId(null);
              }}
              sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
            >
              Reset to Example Flow
            </Button>
            <Button variant="contained" onClick={onSave} sx={{ textTransform: 'none', backgroundColor: '#0ea5e9' }}>
              Save & Continue
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Canvas */}
      <Paper ref={wrapperRef} sx={{ height: 620, backgroundColor: '#071426', border: '1px solid rgba(96,165,250,0.18)' }} onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={canvasNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView={false}
          nodeTypes={nodeTypes}
          style={{ background: '#071426' }}
        >
          <MiniMap />
          <Controls />
          <Background color="rgba(148,163,184,0.26)" gap={24} size={1.5} />
        </ReactFlow>
      </Paper>

      {/* Properties */}
      <Paper
        sx={{
          p: 2,
          backgroundColor: '#081528',
          border: '1px solid rgba(96,165,250,0.22)',
          height: { xs: 'min(70vh, 620px)', md: 620 },
          maxHeight: { xs: 'min(70vh, 620px)', md: 620 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, flexShrink: 0, color: '#e5e7eb' }}>
          Properties
        </Typography>
        <Box sx={sidePanelScrollSx}>
        {!selectedNode ? (
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Select a node to edit its content.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Node ID"
              value={selectedNode.id}
              size="small"
              disabled
              InputLabelProps={{ sx: { color: '#9ca3af' } }}
              InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
            />
            {selectedNode?.data?.kind === 'message' ? (
              <TextField
                label="Message Text"
                value={selectedNode.data?.text || ''}
                onChange={(e) => updateSelectedNodeData({ text: e.target.value })}
                size="small"
                fullWidth
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
              />
            ) : selectedNode?.data?.kind === 'multiple_choice' ? (
              <>
                <TextField
                  label="Question"
                  value={selectedNode.data?.prompt || ''}
                  onChange={(e) => updateSelectedNodeData({ prompt: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                  helperText="Drag from each option’s blue dot on the canvas to the next step."
                  FormHelperTextProps={{ sx: { color: '#9ca3af', fontSize: '0.75rem' } }}
                />
                <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 12 }}>Options</Typography>
                {(Array.isArray(selectedNode.data?.options) ? selectedNode.data.options : []).map((opt, idx) => (
                  <Stack key={opt.id} direction="row" spacing={0.75} alignItems="flex-start">
                    <TextField
                      label={`Option ${idx + 1}`}
                      value={opt.label || ''}
                      onChange={(e) => {
                        const options = [...(selectedNode.data?.options || [])];
                        options[idx] = { ...opt, label: e.target.value.slice(0, 100) };
                        updateSelectedNodeData({ options });
                      }}
                      size="small"
                      fullWidth
                      inputProps={{ maxLength: 100 }}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                      helperText={`ID: ${opt.id} · max 100 chars`}
                      FormHelperTextProps={{ sx: { color: '#6b7280', fontSize: '0.7rem' } }}
                    />
                    <IconButton
                      size="small"
                      aria-label="Remove option"
                      onClick={() => {
                        const options = (selectedNode.data?.options || []).filter((_, i) => i !== idx);
                        updateSelectedNodeData({
                          options:
                            options.length > 0
                              ? options
                              : [{ id: `opt_${Date.now()}`, label: 'Option 1' }],
                        });
                      }}
                      sx={{ color: '#9ca3af', mt: 0.5 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    const prev = selectedNode.data?.options || [];
                    const next = [
                      ...prev,
                      { id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: `Option ${prev.length + 1}` },
                    ];
                    updateSelectedNodeData({ options: next });
                  }}
                  sx={{ textTransform: 'none', backgroundColor: '#334155', color: '#f8fafc', fontWeight: 700, py: 1 }}
                >
                  + ADD OPTION
                </Button>
                <TextField
                  label="Save answer in variable"
                  value={selectedNode.data?.variable || '@city'}
                  onChange={(e) => updateSelectedNodeData({ variable: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="@city"
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                />
              </>
            ) : selectedNode?.data?.kind === 'media_upload' ? (
              <>
                <TextField
                  label="Prompt"
                  value={selectedNode.data?.prompt || ''}
                  onChange={(e) => updateSelectedNodeData({ prompt: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                />
                <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 12 }}>Format type</Typography>
                {[
                  { key: 'image', label: 'Image' },
                  { key: 'video', label: 'Video' },
                  { key: 'pdf', label: 'Pdf' },
                ].map((fmt) => (
                  <FormControlLabel
                    key={fmt.key}
                    sx={{ m: 0, color: '#e5e7eb' }}
                    control={
                      <Checkbox
                        checked={Boolean(selectedNode.data?.format_types?.[fmt.key])}
                        onChange={(e) =>
                          updateSelectedNodeData({
                            format_types: {
                              ...(selectedNode.data?.format_types || DEFAULT_MEDIA_FORMAT_TYPES),
                              [fmt.key]: e.target.checked,
                            },
                          })
                        }
                        sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#38bdf8' } }}
                      />
                    }
                    label={fmt.label}
                  />
                ))}
                <TextField
                  label="File Upload Error Message"
                  value={selectedNode.data?.error_message || ''}
                  onChange={(e) => updateSelectedNodeData({ error_message: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="File type is not allowed or file is too large."
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                />
                <TextField
                  label="Save answer in variable"
                  value={selectedNode.data?.variable || '@uploaded_media'}
                  onChange={(e) => updateSelectedNodeData({ variable: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="@uploaded_media"
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                />
              </>
            ) : selectedNode?.data?.kind === 'media_download' ? (
              <>
                <TextField
                  label="Prompt"
                  value={selectedNode.data?.prompt || ''}
                  onChange={(e) => updateSelectedNodeData({ prompt: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                  helperText="Shown to end user before the downloadable files."
                  FormHelperTextProps={{ sx: { color: '#9ca3af', fontSize: '0.75rem' } }}
                />
                <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 12 }}>
                  Media files (image / video / PDF)
                </Typography>
                {!botId ? (
                  <Alert severity="info" sx={{ fontSize: 12 }}>
                    Save the bot once, then add image, video or PDF files here.
                  </Alert>
                ) : null}
                {(Array.isArray(selectedNode.data?.media_items) ? selectedNode.data.media_items : []).map((item, idx) => (
                  <Paper
                    key={item.id || idx}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      backgroundColor: 'rgba(2,6,23,0.28)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700, wordBreak: 'break-word' }}>
                          {item.file_name || 'File'}
                        </Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' }}>
                          {(item.attachment_type || 'file').toString()}
                        </Typography>
                        {item.file_url && (item.attachment_type === 'image' || (item.mime_type || '').startsWith('image/')) ? (
                          <Box
                            component="img"
                            src={item.file_url}
                            alt={item.file_name || 'preview'}
                            sx={{ mt: 1, maxWidth: '100%', maxHeight: 120, borderRadius: 1, border: '1px solid rgba(148,163,184,0.2)' }}
                          />
                        ) : null}
                      </Box>
                      <IconButton
                        size="small"
                        aria-label="Remove file"
                        onClick={() => {
                          const next = (selectedNode.data?.media_items || []).filter((_, i) => i !== idx);
                          updateSelectedNodeData({ media_items: next });
                        }}
                        sx={{ color: '#fda4af' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
                <Button
                  component="label"
                  variant="contained"
                  disabled={!botId || builderMediaUploading}
                  startIcon={builderMediaUploading ? null : <CloudUploadIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    py: 1,
                  }}
                >
                  {builderMediaUploading ? 'Uploading...' : '+ Add image, video or PDF'}
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,application/pdf"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file || !botId) return;
                      const validationError = validateMediaFile(file, DEFAULT_MEDIA_FORMAT_TYPES, {
                        maxVideoSizeMb: 10,
                      });
                      if (validationError) {
                        void Swal.fire({ icon: 'error', title: 'Upload failed', text: validationError });
                        return;
                      }
                      setBuilderMediaUploading(true);
                      try {
                        const resp = await uploadBotBuilderMedia(botId, file);
                        const payload = resp?.data || {};
                        const item = {
                          id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                          file_name: payload.file_name || file.name,
                          file_url: payload.file_url || '',
                          file_path: payload.file_path || payload.path || '',
                          mime_type: payload.mime_type || file.type,
                          attachment_type: payload.attachment_type || detectAttachmentType(file.type, file.name),
                        };
                        updateSelectedNodeData({
                          media_items: [...(selectedNode.data?.media_items || []), item],
                        });
                      } catch (err) {
                        void Swal.fire({
                          icon: 'error',
                          title: 'Upload failed',
                          text: err?.message || 'Could not upload file.',
                        });
                      } finally {
                        setBuilderMediaUploading(false);
                      }
                    }}
                  />
                </Button>
                <Typography sx={{ color: '#64748b', fontSize: 11 }}>
                  Video max 10 MB. Image/PDF max 15 MB.
                </Typography>
              </>
            ) : selectedNode?.data?.kind === 'agent_assign' ? (
              <>
                <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 12 }}>
                  Assignment Mode
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.45, mb: 0.75 }}>
                  1) Pick the team manager (team). 2) Turn <strong style={{ color: '#e5e7eb' }}>Sequence assign</strong> on to
                  rotate through that team&apos;s agents in order, or off to assign randomly among the agents listed below.
                  3) Optionally pick one agent — only that agent will receive chats.
                </Typography>

                <TextField
                  select
                  label="Select Team"
                  value={selectedNode.data?.team_manager_user_id || ''}
                  onChange={(e) =>
                    updateSelectedNodeData({
                      team_manager_user_id: e.target.value,
                      agent_user_id: '',
                    })
                  }
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                  helperText="Team managers under this seller. Choose a team before assigning agents."
                  FormHelperTextProps={{ sx: { color: '#9ca3af', fontSize: '0.75rem' } }}
                >
                  <MenuItem value="">All Teams (not recommended)</MenuItem>
                  {teamManagers.map((tm) => (
                    <MenuItem key={tm.id} value={tm.id}>
                      {(tm.manager_name || tm.team_name || '').toString()}
                    </MenuItem>
                  ))}
                </TextField>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(148,163,184,0.3)',
                    borderRadius: 1.5,
                    px: 1.25,
                    py: 1,
                    backgroundColor: '#0f2339',
                  }}
                >
                  <FormControlLabel
                    sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                    control={
                      <Switch
                        checked={Boolean(selectedNode.data?.auto_sequence)}
                        onChange={(e) =>
                          updateSelectedNodeData({ auto_sequence: Boolean(e.target.checked) })
                        }
                        color="primary"
                      />
                    }
                    label={
                      <Typography sx={{ color: '#e5e7eb', fontSize: 13 }}>
                        Sequence assign
                      </Typography>
                    }
                    labelPlacement="start"
                  />
                </Box>
                <Typography sx={{ color: '#64748b', fontSize: 10.5, mt: -0.5, mb: 0.5 }}>
                  On = round‑robin in listed order; off = random pick each time (same agent list).
                </Typography>

                <TextField
                  select
                  label="Select Agent"
                  value={selectedNode.data?.agent_user_id || ''}
                  onChange={(e) => updateSelectedNodeData({ agent_user_id: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                  helperText={
                    selectedNode.data?.team_manager_user_id
                      ? 'Leave empty to auto-assign among this team\'s agents. Pick one agent to pin all chats to that user.'
                      : 'Select a team above to filter agents.'
                  }
                  FormHelperTextProps={{ sx: { color: '#9ca3af', fontSize: '0.75rem' } }}
                >
                  <MenuItem value="">All Agents (under selected team)</MenuItem>
                  {teamMembers
                    .filter((item) => item.member_type === 'agent')
                    .filter((item) => {
                      const teamId = selectedNode.data?.team_manager_user_id;
                      return !teamId || String(item.assigned_team_manager?.id || '') === String(teamId);
                    })
                    .slice()
                    .sort((a, b) =>
                      String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || ''))
                    )
                    .map((agent) => (
                      <MenuItem key={agent.team_member_id} value={agent.user_id || ''}>
                        {agent.full_name || agent.email || 'Agent'}
                      </MenuItem>
                    ))}
                </TextField>
              </>
            ) : selectedNode && selectedNode.data?.kind !== 'data_hub' ? (
              <TextField
                label={selectedNode.data?.kind === 'yes_no' ? 'Question' : 'Prompt'}
                value={selectedNode.data?.prompt || ''}
                onChange={(e) => updateSelectedNodeData({ prompt: e.target.value })}
                size="small"
                fullWidth
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                helperText={selectedNode.data?.kind === 'yes_no' ? 'Connect "Yes" edge to continue flow, "No" edge to end chat' : ''}
                FormHelperTextProps={{ sx: { color: '#9ca3af', fontSize: '0.75rem' } }}
              />
            ) : null}

            {selectedNode && ['name', 'phone', 'email', 'address', 'data_storage_requirement', 'custom_input', 'yes_no'].includes(selectedNode.data?.kind) ? (
              <TextField
                label="Save answer in variable"
                value={selectedNode.data?.variable || `@${selectedNode.data?.kind}`}
                onChange={(e) => updateSelectedNodeData({ variable: e.target.value })}
                size="small"
                fullWidth
                placeholder="@name"
                InputLabelProps={{ sx: { color: '#9ca3af' } }}
                InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
              />
            ) : null}

            {selectedNode?.data?.kind === 'data_hub' ? (
              <>
                <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)' }} />
                <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12 }}>
                  Operation 1
                </Typography>
                {(() => {
                  const hubOp = (selectedNode.data?.operation || 'INSERT').toString().trim().toUpperCase();
                  const hubOpChoices = ['INSERT', 'SEARCH', 'UPDATE'];
                  if (hubOp === 'DELETE') hubOpChoices.push('DELETE');
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1 }}>
                      <TextField
                        select
                        label="Operations"
                        value={hubOp === 'DELETE' ? 'DELETE' : hubOpChoices.includes(hubOp) ? hubOp : 'INSERT'}
                        onChange={(e) => {
                          const v = e.target.value;
                          const patch = { operation: v };
                          if (v === 'SEARCH') {
                            const f = selectedNode.data?.filters;
                            const r = selectedNode.data?.response_mappings;
                            patch.filters = Array.isArray(f) && f.length ? f : [{ column: '', operator: 'IS', value: '' }];
                            patch.response_mappings = Array.isArray(r) && r.length ? r : [{ column: '', variable: '' }];
                          }
                          updateSelectedNodeData(patch);
                        }}
                        size="small"
                        sx={{ flex: '1 1 120px', minWidth: 120 }}
                        fullWidth
                        InputLabelProps={{ sx: { color: '#9ca3af' } }}
                        InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                      >
                        {hubOpChoices.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </TextField>
                      {hubOp === 'SEARCH' ? (
                        <Chip
                          label="IN"
                          size="small"
                          sx={{
                            height: 40,
                            alignSelf: 'center',
                            fontWeight: 800,
                            fontSize: 11,
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            color: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.35)',
                          }}
                        />
                      ) : null}
                      <TextField
                        select
                        label="Select Table"
                        value={selectedNode.data?.table_id || ''}
                        onChange={(e) => updateSelectedNodeData({ table_id: e.target.value })}
                        size="small"
                        sx={{ flex: '1 1 140px', minWidth: 140 }}
                        fullWidth
                        InputLabelProps={{ sx: { color: '#9ca3af' } }}
                        InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                      >
                        <MenuItem value="">Select Table</MenuItem>
                        {dataHubTables.map((t) => (
                          <MenuItem key={t.table_id} value={t.table_id}>
                            {t.table_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  );
                })()}

                {['UPDATE', 'DELETE'].includes((selectedNode.data?.operation || 'INSERT').toString().trim().toUpperCase()) ? (
                  <TextField
                    label="Row ID variable (for UPDATE/DELETE)"
                    value={selectedNode.data?.row_id_var || ''}
                    onChange={(e) => updateSelectedNodeData({ row_id_var: e.target.value })}
                    size="small"
                    fullWidth
                    placeholder="@row_id"
                    InputLabelProps={{ sx: { color: '#9ca3af' } }}
                    InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                  />
                ) : null}

                {(selectedNode.data?.operation || 'INSERT').toString().trim().toUpperCase() === 'SEARCH' ? (
                  <>
                    <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', my: 0.5 }} />
                    <Button
                      variant="outlined"
                      onClick={() =>
                        updateSelectedNodeData({
                          filters: [...(selectedNode.data?.filters || []), { column: '', operator: 'IS', value: '' }],
                        })
                      }
                      sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb', alignSelf: 'flex-start' }}
                    >
                      + ADD FILTER
                    </Button>
                    {(selectedNode.data?.filters || [{ column: '', operator: 'IS', value: '' }]).map((f, fidx) => (
                      <Box key={fidx} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr minmax(88px,auto) auto' },
                            gap: 1,
                            alignItems: 'center',
                          }}
                        >
                          <Select
                            size="small"
                            value={f.column || ''}
                            onChange={(e) =>
                              updateSelectedNodeData({
                                filters: (selectedNode.data?.filters || []).map((ff, ii) =>
                                  ii === fidx ? { ...ff, column: e.target.value } : ff,
                                ),
                              })
                            }
                            sx={{ backgroundColor: '#0f2339', color: '#e5e7eb' }}
                            displayEmpty
                          >
                            <MenuItem value="">Column</MenuItem>
                            {selectedTableColumns.map((c) => (
                              <MenuItem key={c.name} value={c.name}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <Select
                            size="small"
                            value={f.operator || 'IS'}
                            onChange={(e) =>
                              updateSelectedNodeData({
                                filters: (selectedNode.data?.filters || []).map((ff, ii) =>
                                  ii === fidx ? { ...ff, operator: e.target.value } : ff,
                                ),
                              })
                            }
                            sx={{ backgroundColor: '#0f2339', color: '#e5e7eb' }}
                          >
                            {['IS', 'IS_NOT', 'CONTAINS'].map((op) => (
                              <MenuItem key={op} value={op}>
                                {op === 'IS_NOT' ? 'IS NOT' : op}
                              </MenuItem>
                            ))}
                          </Select>
                          {(selectedNode.data?.filters || []).length > 1 ? (
                            <IconButton
                              size="small"
                              sx={{ color: '#94a3b8' }}
                              onClick={() =>
                                updateSelectedNodeData({
                                  filters: (selectedNode.data?.filters || []).filter((_, ii) => ii !== fidx),
                                })
                              }
                              aria-label="Remove filter"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          ) : (
                            <Box sx={{ width: 40 }} />
                          )}
                        </Box>
                        <TextField
                          size="small"
                          label="Variable"
                          value={f.value || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              filters: (selectedNode.data?.filters || []).map((ff, ii) =>
                                ii === fidx ? { ...ff, value: e.target.value } : ff,
                              ),
                            })
                          }
                          placeholder="@name"
                          fullWidth
                          InputLabelProps={{ sx: { color: '#9ca3af' } }}
                          InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                        />
                      </Box>
                    ))}

                    <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12, mt: 1 }}>
                      Response Mapping
                    </Typography>
                    {(selectedNode.data?.response_mappings || [{ column: '', variable: '' }]).map((rm, ridx) => (
                      <Box key={ridx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, alignItems: 'center' }}>
                        <Select
                          size="small"
                          value={rm.column || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              response_mappings: (selectedNode.data?.response_mappings || []).map((mm, ii) =>
                                ii === ridx ? { ...mm, column: e.target.value } : mm,
                              ),
                            })
                          }
                          sx={{ backgroundColor: '#0f2339', color: '#e5e7eb' }}
                          displayEmpty
                        >
                          <MenuItem value="">Column</MenuItem>
                          {selectedTableColumns.map((c) => (
                            <MenuItem key={c.name} value={c.name}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                        <TextField
                          size="small"
                          label="Variable"
                          value={rm.variable || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              response_mappings: (selectedNode.data?.response_mappings || []).map((mm, ii) =>
                                ii === ridx ? { ...mm, variable: e.target.value } : mm,
                              ),
                            })
                          }
                          placeholder="@phone"
                          InputLabelProps={{ sx: { color: '#9ca3af' } }}
                          InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                        />
                        <IconButton
                          size="small"
                          sx={{ color: '#94a3b8' }}
                          onClick={() => {
                            const list = selectedNode.data?.response_mappings || [];
                            if (list.length <= 1) {
                              updateSelectedNodeData({ response_mappings: [{ column: '', variable: '' }] });
                            } else {
                              updateSelectedNodeData({
                                response_mappings: list.filter((_, ii) => ii !== ridx),
                              });
                            }
                          }}
                          aria-label="Remove mapping"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      variant="outlined"
                      onClick={() =>
                        updateSelectedNodeData({
                          response_mappings: [...(selectedNode.data?.response_mappings || []), { column: '', variable: '' }],
                        })
                      }
                      sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
                    >
                      + Add mapping
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12 }}>
                      Record Mapping
                    </Typography>
                    {(selectedNode.data?.mappings || [{ column: '', variable: '' }]).map((m, idx) => (
                      <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Select
                          size="small"
                          value={m.column || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              mappings: (selectedNode.data?.mappings || []).map((mm, ii) =>
                                ii === idx ? { ...mm, column: e.target.value } : mm,
                              ),
                            })
                          }
                          sx={{ backgroundColor: '#0f2339', color: '#e5e7eb' }}
                          displayEmpty
                        >
                          <MenuItem value="">Column</MenuItem>
                          {selectedTableColumns.map((c) => (
                            <MenuItem key={c.name} value={c.name}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                        <TextField
                          size="small"
                          value={m.variable || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              mappings: (selectedNode.data?.mappings || []).map((mm, ii) =>
                                ii === idx ? { ...mm, variable: e.target.value } : mm,
                              ),
                            })
                          }
                          placeholder="@name"
                          InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                        />
                      </Box>
                    ))}
                    <Button
                      variant="outlined"
                      onClick={() => updateSelectedNodeData({ mappings: [...(selectedNode.data?.mappings || []), { column: '', variable: '' }] })}
                      sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
                    >
                      + Add Record
                    </Button>
                  </>
                )}
              </>
            ) : selectedNode?.data?.kind === 'catalogue' ? (
              <>
                <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)' }} />
                <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12 }}>Catalogue</Typography>

                <TextField
                  select
                  label="Operation"
                  value={selectedNode.data?.operation || 'INSERT'}
                  onChange={(e) => updateSelectedNodeData({ operation: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                >
                  {['INSERT', 'UPDATE', 'DELETE'].map((op) => (
                    <MenuItem key={op} value={op}>
                      {op}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Select Table (Data Hub)"
                  value={selectedNode.data?.table_id || ''}
                  onChange={(e) => updateSelectedNodeData({ table_id: e.target.value })}
                  size="small"
                  fullWidth
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                >
                  <MenuItem value="">Select Table</MenuItem>
                  {dataHubTables.map((t) => (
                    <MenuItem key={t.table_id} value={t.table_id}>
                      {t.table_name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Save cart items in variable"
                  value={selectedNode.data?.variable || '@cart_items'}
                  onChange={(e) => updateSelectedNodeData({ variable: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="@cart_items"
                  InputLabelProps={{ sx: { color: '#9ca3af' } }}
                  InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                />

                <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12, mt: 1 }}>
                  Record Mapping
                </Typography>
                {((selectedNode.data?.mappings || [{ column: '', variable: '' }])).map((m, idx) => (
                  <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Select
                      size="small"
                      value={m.column || ''}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          mappings: (selectedNode.data?.mappings || []).map((mm, ii) =>
                            ii === idx ? { ...mm, column: e.target.value } : mm,
                          ),
                        })
                      }
                      sx={{ backgroundColor: '#0f2339', color: '#e5e7eb' }}
                      displayEmpty
                    >
                      <MenuItem value="">Column</MenuItem>
                      {selectedTableColumns.map((c) => (
                        <MenuItem key={c.name} value={c.name}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <TextField
                      size="small"
                      value={m.variable || ''}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          mappings: (selectedNode.data?.mappings || []).map((mm, ii) =>
                            ii === idx ? { ...mm, variable: e.target.value } : mm,
                          ),
                        })
                      }
                      placeholder="@name"
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    />
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  onClick={() =>
                    updateSelectedNodeData({
                      mappings: [...(selectedNode.data?.mappings || []), { column: '', variable: '' }],
                    })
                  }
                  sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb', mb: 1 }}
                >
                  + Add Record
                </Button>

                <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12, mt: 0.5 }}>
                  Options
                </Typography>
                {((selectedNode.data?.options || [{ id: 'opt_1', label: 'Option 1' }, { id: 'opt_2', label: 'Option 2' }])).map((opt, idx) => (
                  <Box key={opt.id || idx} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      value={opt.label || ''}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          options: (selectedNode.data?.options || []).map((oo, ii) =>
                            ii === idx ? { ...oo, label: e.target.value } : oo,
                          ),
                        })
                      }
                      placeholder="Option label"
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    />
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        const next = (selectedNode.data?.options || []).filter((_, i) => i !== idx);
                        updateSelectedNodeData({
                          options: next.length ? next : [{ id: 'opt_1', label: 'Option 1' }, { id: 'opt_2', label: 'Option 2' }],
                        });
                      }}
                      sx={{ textTransform: 'none', color: '#fda4af' }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  onClick={() =>
                    updateSelectedNodeData({
                      options: [...(selectedNode.data?.options || []), { id: `opt_${Date.now()}`, label: `Option ${(selectedNode.data?.options || []).length + 1}` }],
                    })
                  }
                  sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb', mb: 1 }}
                >
                  + Add Option
                </Button>

                <Typography sx={{ color: '#e5e7eb', fontWeight: 800, fontSize: 12 }}>Products (max 10)</Typography>
                {(selectedNode.data?.products || []).map((p, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      backgroundColor: 'rgba(2,6,23,0.28)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
                      >
                        Add Image
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const imageUrl = typeof reader.result === 'string' ? reader.result : '';
                              const next = [...(selectedNode.data?.products || [])];
                              next[idx] = { ...p, image: imageUrl };
                              updateSelectedNodeData({ products: next });
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </Button>
                      {p.image ? (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            const next = [...(selectedNode.data?.products || [])];
                            next[idx] = { ...p, image: '' };
                            updateSelectedNodeData({ products: next });
                          }}
                          sx={{ textTransform: 'none', color: '#fda4af' }}
                        >
                          Remove Image
                        </Button>
                      ) : null}
                    </Box>

                    {p.image ? (
                      <Box
                        sx={{
                          mt: 1,
                          height: 120,
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          border: '1px solid rgba(148,163,184,0.18)',
                          backgroundColor: '#0b1624',
                        }}
                      >
                        <img src={p.image} alt={`product-${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    ) : null}

                    <TextField
                      select
                      label={`Select product ${idx + 1}`}
                      value={p.product_id || ''}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const prod = sellerProducts.find((sp) => String(sp.product_id) === String(pid));
                        const next = [...(selectedNode.data?.products || [])];
                        next[idx] = {
                          ...p,
                          product_id: pid,
                          batch_id: '',
                          batch_name: '',
                          price: prod?.sale_price || prod?.selling_price || p.price || '',
                          gst: prod?.gst != null && prod?.gst !== '' ? String(prod.gst) : '',
                          // Qty should reflect selected batch quantity only.
                          qty: 0,
                        };
                        updateSelectedNodeData({ products: next });
                        void loadBatchesForProduct(pid);
                      }}
                      size="small"
                      fullWidth
                      sx={{ mt: 1 }}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    >
                      <MenuItem value="">Select product</MenuItem>
                      {sellerProducts.map((sp) => (
                        <MenuItem key={sp.product_id} value={sp.product_id}>
                          {sp.product_name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      label="Select Batch"
                      value={p.batch_id || ''}
                      onChange={(e) => {
                        const bid = e.target.value;
                        const batches = Array.isArray(productBatchesByProduct[String(p.product_id || '')])
                          ? productBatchesByProduct[String(p.product_id || '')]
                          : [];
                        const chosen = batches.find((b) => String(b.batch_id) === String(bid));
                        const next = [...(selectedNode.data?.products || [])];
                        next[idx] = {
                          ...p,
                          batch_id: bid,
                          batch_name: (chosen?.batch_name || '').toString(),
                          qty: Number(chosen?.available_quantity ?? p.qty ?? 0),
                          price: chosen?.selling_price != null ? chosen.selling_price : p.price,
                        };
                        updateSelectedNodeData({ products: next });
                      }}
                      size="small"
                      fullWidth
                      sx={{ mt: 1 }}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    >
                      <MenuItem value="">Select batch</MenuItem>
                      {(productBatchesByProduct[String(p.product_id || '')] || []).map((b) => (
                        <MenuItem key={b.batch_id} value={b.batch_id}>
                          {b.batch_name || `Batch ${b.batch_id}`} (Qty: {Number(b.available_quantity || 0)})
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Description"
                      value={p.description || ''}
                      onChange={(e) => {
                        const next = [...(selectedNode.data?.products || [])];
                        next[idx] = { ...p, description: e.target.value };
                        updateSelectedNodeData({ products: next });
                      }}
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      sx={{ mt: 1 }}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
                      <TextField
                        label="Selling Price"
                        value={p.price || ''}
                        onChange={(e) => {
                          const next = [...(selectedNode.data?.products || [])];
                          next[idx] = { ...p, price: e.target.value };
                          updateSelectedNodeData({ products: next });
                        }}
                        size="small"
                        InputLabelProps={{ sx: { color: '#9ca3af' } }}
                        InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                      />
                      <TextField
                        label="Qty (Available)"
                        value={p.qty ?? 0}
                        size="small"
                        InputProps={{
                          readOnly: true,
                          sx: { backgroundColor: '#0f2339', color: '#e5e7eb' },
                        }}
                        helperText="Auto fetched from Product List available stock"
                        InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      />
                    </Box>

                    <TextField
                      label="Add to cart button text"
                      value={p.button_text || 'Add to Cart'}
                      onChange={(e) => {
                        const next = [...(selectedNode.data?.products || [])];
                        next[idx] = { ...p, button_text: e.target.value };
                        updateSelectedNodeData({ products: next });
                      }}
                      size="small"
                      fullWidth
                      sx={{ mt: 1 }}
                      InputLabelProps={{ sx: { color: '#9ca3af' } }}
                      InputProps={{ sx: { backgroundColor: '#0f2339', color: '#e5e7eb' } }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const next = (selectedNode.data?.products || []).filter((_, i) => i !== idx);
                          updateSelectedNodeData({
                            products:
                              next.length > 0
                                ? next
                                : [
                                    {
                                      product_id: '',
                                      batch_id: '',
                                      batch_name: '',
                                      gst: '',
                                      image: '',
                                      description: '',
                                      price: '',
                                      qty: 0,
                                      button_text: 'Add to Cart',
                                    },
                                  ],
                          });
                        }}
                        sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Paper>
                ))}

                <Button
                  variant="outlined"
                  onClick={() => {
                    const prev = selectedNode.data?.products || [];
                    if (prev.length >= 10) return;
                    updateSelectedNodeData({
                      products: prev.concat({
                        product_id: '',
                        batch_id: '',
                        batch_name: '',
                        gst: '',
                        image: '',
                        description: '',
                        price: '',
                        qty: 0,
                        button_text: 'Add to Cart',
                      }),
                    });
                  }}
                  sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
                >
                  + Add Product
                </Button>
              </>
            ) : null}
          </Stack>
        )}
        </Box>
      </Paper>
    </Box>
  );
}

function WhatsAppAutomation() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editBotId = (searchParams.get('bot_id') || '').trim();
  const statePrefillBotName = (location?.state?.prefillBotName || '').toString().trim();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [botId, setBotId] = useState(null);
  const [draftBotName, setDraftBotName] = useState('');
  const hydratedEditRef = useRef(false);

  // Build step state
  const [nodes, setNodes] = useState(EMPTY_FLOW.nodes);
  const [edges, setEdges] = useState(EMPTY_FLOW.edges);

  // Design step state
  const [design, setDesign] = useState({
    chatHeaderTitle: 'Chat with us',
    chatbotName: 'Agro Bot',
    primaryColor: '#0ea5e9',
    chatBackground: '#ffffff',
    fontFamily: 'Inter',
    bubbleStyle: 'rounded',
    dataHubConfig: {
      operation: 'INSERT',
      table_id: '',
      mappings: [{ column: '', variable: '@name' }],
      row_id_var: '',
      filters: [{ column: '', operator: 'IS', value: '' }],
      response_mappings: [{ column: '', variable: '' }],
    },
    position: 'bottom-right',
  });

  // Publish state
  const script = useMemo(() => {
    if (!botId) return '';
    const base = getApiOrigin();
    return `<script>
(function (w, d) {
  var s = d.createElement('script');
  s.async = true;
  s.src = '${base}/api/bots/widget.js?bot_id=${botId}';
  d.head.appendChild(s);
})(window, document);
</script>`;
  }, [botId]);

  useEffect(() => {
    setError('');
  }, [activeStep]);

  useEffect(() => {
    if (statePrefillBotName) {
      setDraftBotName(statePrefillBotName);
    }
  }, [statePrefillBotName]);

  useEffect(() => {
    if (hydratedEditRef.current) return;

    const stateBot = location?.state?.bot;
    if (stateBot?.bot_id) {
      hydratedEditRef.current = true;
      setBotId(stateBot.bot_id);
      setDraftBotName((stateBot?.name || '').toString().trim());
      setNodes(Array.isArray(stateBot?.flow?.nodes) ? stateBot.flow.nodes : EMPTY_FLOW.nodes);
      setEdges(Array.isArray(stateBot?.flow?.edges) ? stateBot.flow.edges : EMPTY_FLOW.edges);
      setDesign((prev) => ({ ...prev, ...(stateBot.design || {}) }));
      setActiveStep(0);
      return;
    }

    if (!editBotId) return;

    hydratedEditRef.current = true;
    const loadBotForEdit = async () => {
      try {
        const resp = await fetchBots(editBotId);
        const bots = resp?.success && Array.isArray(resp?.data) ? resp.data : [];
        const found = bots.find((b) => String(b.bot_id) === String(editBotId));
        if (!found) return;
        setBotId(found.bot_id);
        setDraftBotName((found?.name || '').toString().trim());
        setNodes(Array.isArray(found?.flow?.nodes) ? found.flow.nodes : EMPTY_FLOW.nodes);
        setEdges(Array.isArray(found?.flow?.edges) ? found.flow.edges : EMPTY_FLOW.edges);
        setDesign((prev) => ({ ...prev, ...(found.design || {}) }));
        setActiveStep(0);
      } catch {
        // keep create mode if edit preload fails
      }
    };
    void loadBotForEdit();
  }, [location?.state, editBotId]);

  const onNodesChange = (changes) => setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes) => setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = (connection) => setEdges((eds) => addEdge(connection, eds));

  const validateFlow = () => {
    if (nodes.length === 0) return 'Please drag and drop at least one component onto the canvas.';
    return '';
  };

  const handleSaveBuild = async () => {
    const validationError = validateFlow();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError('');
      const resolvedName = (draftBotName || '').trim() || `Bot - ${user?.full_name || 'Seller'}`;
      // Split name+flow vs design into separate requests so each body stays smaller.
      // Production nginx often uses a low client_max_body_size (→ 413); combined payloads fail first.
      // Catalogue "Add Image" embeds base64 in flow — compress before upload to avoid 413.
      const flowForApi = await buildFlowPayloadForApiSave(nodes, edges);
      const flowPayload = { name: resolvedName, flow: flowForApi };
      const hasMeaningfulDesign =
        design &&
        typeof design === 'object' &&
        Object.keys(design).some((k) => {
          const v = design[k];
          if (v == null) return false;
          if (typeof v === 'string') return v.trim().length > 0;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return Object.keys(v).length > 0;
          return true;
        });

      if (!botId) {
        const resp = await createBot(flowPayload);
        if (!resp?.success) throw new Error(resp?.message || 'Failed to create bot');
        const newId = resp.data?.bot_id;
        setBotId(newId);
        if (hasMeaningfulDesign && newId) {
          const dResp = await updateBot(newId, { design });
          if (!dResp?.success) throw new Error(dResp?.message || 'Flow saved but design failed to save.');
        }
      } else {
        const resp = await updateBot(botId, flowPayload);
        if (!resp?.success) throw new Error(resp?.message || 'Failed to update bot');
        if (hasMeaningfulDesign) {
          const dResp = await updateBot(botId, { design });
          if (!dResp?.success) throw new Error(dResp?.message || 'Flow saved but design failed to save.');
        }
      }

      await Swal.fire({
        icon: 'success',
        title: 'Saved',
        text: 'Bot flow saved successfully.',
        timer: 1500,
        showConfirmButton: false,
      });

      setActiveStep(1);
    } catch (e) {
      setError(e.message || 'Failed to save bot.');
    }
  };

  const handleSaveDesign = async () => {
    if (!botId) {
      setError('Please save the bot flow first.');
      return;
    }
    try {
      const resp = await updateBot(botId, { design });
      if (!resp?.success) throw new Error(resp?.message || 'Failed to save design');
      await Swal.fire({
        icon: 'success',
        title: 'Saved',
        text: 'Design saved successfully.',
        timer: 1200,
        showConfirmButton: false,
      });
      setActiveStep(2);
    } catch (e) {
      setError(e.message || 'Failed to save design.');
    }
  };

  const handlePublish = async () => {
    if (!botId) {
      setError('Please save the bot first.');
      return;
    }
    try {
      const resp = await publishBot(botId);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to publish bot');
      await Swal.fire({
        icon: 'success',
        title: 'Published',
        text: 'Bot published successfully.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      setError(e.message || 'Failed to publish.');
    }
  };

  const goToStep = (idx) => {
    if (idx === 0) {
      setActiveStep(0);
      return;
    }
    if (!botId) {
      setError('Please save the bot flow first.');
      setActiveStep(0);
      return;
    }
    setActiveStep(idx);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: '#020617', minHeight: '100vh', color: '#e5e7eb' }}>
      <Card
        sx={{
          backgroundColor: '#0f172a',
          borderRadius: 2,
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 20px 45px rgba(15,23,42,0.85)',
          p: { xs: 2, md: 3 },
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#e5e7eb' }}>
          My Chatbot
        </Typography>

        <Stepper
          nonLinear
          activeStep={activeStep}
          sx={{
            mb: 3,
            '& .MuiStepLabel-label': { color: 'rgba(229,231,235,0.8)', fontWeight: 700 },
            '& .MuiStepLabel-label.Mui-active': { color: '#ffffff', fontWeight: 900 },
            '& .MuiStepLabel-label.Mui-completed': { color: '#ffffff', fontWeight: 800 },
            '& .MuiStepIcon-root': { color: 'rgba(148,163,184,0.35)' },
            '& .MuiStepIcon-root.Mui-active': { color: '#38bdf8' },
            '& .MuiStepIcon-root.Mui-completed': { color: '#22c55e' },
            '& .MuiStepConnector-line': { borderColor: 'rgba(148,163,184,0.25)' },
          }}
        >
          {STEPS.map((label, idx) => (
            <Step key={label}>
              <StepButton onClick={() => goToStep(idx)} sx={{ textTransform: 'none' }}>
                <StepLabel>{label}</StepLabel>
              </StepButton>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <ReactFlowProvider>
            <FlowBuilder
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              onSave={handleSaveBuild}
              design={design}
              setDesign={setDesign}
              botId={botId}
            />
          </ReactFlowProvider>
        )}

        {activeStep === 1 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'stretch' }}>
            <Paper sx={{ p: 2, backgroundColor: '#0b1624', border: '1px solid rgba(148,163,184,0.15)' }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, color: '#e5e7eb' }}>
                Bot Appearance
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                Customize how your chatbot looks on your website.
              </Typography>

              <Stack spacing={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Bot Name</Typography>
                  <TextField
                    value={design.chatbotName}
                    onChange={(e) => setDesign((p) => ({ ...p, chatbotName: e.target.value }))}
                    fullWidth
                    placeholder="Assistant"
                    InputProps={{ sx: { color: '#e5e7eb', backgroundColor: 'rgba(2,6,23,0.35)' } }}
                  />
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Primary Color</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    {['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'].map((c) => (
                      <Box
                        key={c}
                        role="button"
                        onClick={() => setDesign((p) => ({ ...p, primaryColor: c }))}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          backgroundColor: c,
                          border: design.primaryColor === c ? '2px solid #e5e7eb' : '2px solid rgba(255,255,255,0.10)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.75,
                        backgroundColor: design.primaryColor,
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    />
                    <TextField
                      value={design.primaryColor}
                      onChange={(e) => setDesign((p) => ({ ...p, primaryColor: e.target.value }))}
                      fullWidth
                      InputProps={{ sx: { color: '#e5e7eb', backgroundColor: 'rgba(2,6,23,0.35)' } }}
                    />
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Chat Background</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.75,
                        backgroundColor: design.chatBackground || '#ffffff',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    />
                    <TextField
                      value={design.chatBackground || '#ffffff'}
                      onChange={(e) => setDesign((p) => ({ ...p, chatBackground: e.target.value }))}
                      fullWidth
                      InputProps={{ sx: { color: '#e5e7eb', backgroundColor: 'rgba(2,6,23,0.35)' } }}
                    />
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Font</Typography>
                  <TextField
                    select
                    value={design.fontFamily || 'Inter'}
                    onChange={(e) => setDesign((p) => ({ ...p, fontFamily: e.target.value }))}
                    fullWidth
                    InputProps={{ sx: { color: '#e5e7eb', backgroundColor: 'rgba(2,6,23,0.35)' } }}
                  >
                    {['Inter', 'Roboto', 'Poppins', 'Montserrat'].map((f) => (
                      <MenuItem key={f} value={f}>
                        {f}
                      </MenuItem>
                    ))}
                  </TextField>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Bubble Style</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {[
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'sharp', label: 'Sharp' },
                      { id: 'pill', label: 'Pill' },
                    ].map((opt) => (
                      <Button
                        key={opt.id}
                        onClick={() => setDesign((p) => ({ ...p, bubbleStyle: opt.id }))}
                        variant={design.bubbleStyle === opt.id ? 'contained' : 'outlined'}
                        sx={{
                          textTransform: 'none',
                          borderColor: 'rgba(148,163,184,0.25)',
                          color: design.bubbleStyle === opt.id ? '#0b1624' : '#e5e7eb',
                          backgroundColor: design.bubbleStyle === opt.id ? 'rgba(56,189,248,0.9)' : 'transparent',
                          '&:hover': {
                            backgroundColor: design.bubbleStyle === opt.id ? 'rgba(56,189,248,0.9)' : 'rgba(148,163,184,0.08)',
                          },
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.35) 100%)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 800, mb: 1 }}>Chat Header Title</Typography>
                  <TextField
                    value={design.chatHeaderTitle}
                    onChange={(e) => setDesign((p) => ({ ...p, chatHeaderTitle: e.target.value }))}
                    fullWidth
                    InputProps={{ sx: { color: '#e5e7eb', backgroundColor: 'rgba(2,6,23,0.35)' } }}
                  />
                </Paper>
              </Stack>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => setActiveStep(0)} sx={{ textTransform: 'none', color: '#9ca3af' }}>
                  Back
                </Button>
                <Button variant="contained" onClick={handleSaveDesign} sx={{ textTransform: 'none', backgroundColor: '#0ea5e9' }}>
                  Save & Continue
                </Button>
              </Box>
            </Paper>

            <Paper
              sx={{
                p: 2,
                backgroundColor: '#0b1624',
                border: '1px solid rgba(148,163,184,0.15)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#e5e7eb' }}>
                Preview (Live Flow)
              </Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <BotFlowPreview
                  nodes={nodes}
                  edges={edges}
                  design={design}
                  sellerInvoice={{
                    business_name: ((user?.company_name || '').trim() || user?.full_name || '').trim(),
                    phone: (user?.phone || '').trim(),
                    email: (user?.email || '').trim(),
                  }}
                />
              </Box>
            </Paper>
          </Box>
        )}

        {activeStep === 2 && (
          <Paper sx={{ p: 2, backgroundColor: '#0b1624', border: '1px solid rgba(148,163,184,0.15)' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Publish
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              Click Publish to generate an embeddable script for any HTML page.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button onClick={() => setActiveStep(1)} sx={{ textTransform: 'none', color: '#9ca3af' }}>
                Back
              </Button>
              <Button variant="contained" onClick={handlePublish} sx={{ textTransform: 'none', backgroundColor: '#0ea5e9' }}>
                Publish Bot
              </Button>
            </Box>

            <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)', mb: 2 }} />

            <Typography variant="subtitle2" sx={{ color: '#e5e7eb', mb: 1 }}>
              Embed Script
            </Typography>
            <TextField
              value={script}
              fullWidth
              multiline
              minRows={6}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12, color: '#e5e7eb', backgroundColor: '#0f2339' } }}
            />
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(script);
                    await Swal.fire({
                      icon: 'success',
                      title: 'Copied',
                      timer: 900,
                      showConfirmButton: false,
                    });
                  } catch {
                    // ignore
                  }
                }}
                sx={{ color: '#9ca3af' }}
                title="Copy"
              >
                <ContentCopyIcon />
              </IconButton>
            </Box>
          </Paper>
        )}
      </Card>
    </Box>
  );
}

export default WhatsAppAutomation;


