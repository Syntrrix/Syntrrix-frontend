import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Divider, Stack, TextField, Typography, Paper } from '@mui/material';
import { getApiOrigin } from '../../../api/client';


function extractScriptInnerHtml(raw) {
  const match = raw.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return match ? match[1].trim() : raw.trim();
}

function BotTester() {
  const defaultScript = useMemo(() => {
    const base = getApiOrigin();
    return `<script>
(function (w, d) {
  var s = d.createElement('script');
  s.async = true;
  s.src = '${base}/api/bots/widget.js?bot_id=1';
  d.head.appendChild(s);
})(window, document);
</script>`;
  }, []);

  const [scriptInput, setScriptInput] = useState(defaultScript);
  const [runKey, setRunKey] = useState(0);

  // Auto-run on first load so the widget appears without extra clicks
  useEffect(() => {
    setRunKey(1);
  }, []);

  const iframeSrcDoc = useMemo(() => {
    const js = extractScriptInnerHtml(scriptInput);
    // Render a minimal HTML page, then execute the user's JS to inject the widget
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bot Preview</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; }
      .hint { padding: 12px 14px; color: #334155; font-size: 13px; }
      code { background: #e2e8f0; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="hint">
      Preview sandbox. The widget should appear at bottom-right if the script loads.<br/>
      Tip: ensure your backend is running and bot is published. Example: <code>/api/bots/widget.js?bot_id=1</code>
    </div>
    <script>
${js}
    </script>
  </body>
</html>`;
  }, [scriptInput]);

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
        <Typography variant="h5" fontWeight={700} sx={{ color: '#e5e7eb' }}>
          Bot (Test Widget Script)
        </Typography>
        <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1 }}>
          This page is a testing layout. The script is auto-run on load so the widget should appear automatically.
        </Typography>

        <Divider sx={{ my: 2, borderColor: 'rgba(148, 163, 184, 0.15)' }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '420px 1fr' }, gap: 2 }}>
          {/* Left: Script editor */}
          <Paper
            sx={{
              p: 2,
              backgroundColor: '#0b1624',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#e5e7eb', mb: 1 }}>
              Script
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
              The script below is injected into the preview automatically. Edit it and click “Reload Preview”.
            </Typography>
            <TextField
              label="Embed Script"
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              multiline
              minRows={10}
              fullWidth
              InputLabelProps={{ sx: { color: '#9ca3af' } }}
              InputProps={{
                sx: {
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#e5e7eb',
                  backgroundColor: '#0f2339',
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setScriptInput(defaultScript);
                  setRunKey((k) => k + 1);
                }}
                sx={{ textTransform: 'none', borderColor: 'rgba(148,163,184,0.25)', color: '#e5e7eb' }}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={() => setRunKey((k) => k + 1)}
                sx={{ textTransform: 'none', backgroundColor: '#0ea5e9' }}
              >
                Reload Preview
              </Button>
            </Stack>
          </Paper>

          {/* Right: Preview layout */}
          <Paper
            sx={{
              p: 0,
              backgroundColor: '#ffffff',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 2,
              overflow: 'hidden',
              height: { xs: 560, md: 680 },
            }}
          >
            {/* This iframe represents the "Bot page design/UI layout" */}
            <iframe
              key={runKey}
              title="Bot Script Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{ width: '100%', height: '100%', border: 0 }}
              srcDoc={iframeSrcDoc}
            />
          </Paper>
        </Box>
      </Card>
    </Box>
  );
}

export default BotTester;


