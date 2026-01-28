
import express from 'express';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Config
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'rockit-data'; 

// Initialize GCS Client
const storage = new Storage();

// --- Middleware ---
app.use(express.json());

// Request Logging for Cloud Run Debugging
app.use((req, res, next) => {
  // Exclude health checks or internal noise if necessary, but keep it verbose for now
  console.log(`[WEB] ${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---

// 1. Hello / Status Check
app.get('/api/hello', (req, res) => {
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  console.log(`[API] /api/hello handled. Session: ${sessionId}`);
  res.json({ 
    message: "System Online. Backend connection established.", 
    sessionId,
    timestamp: new Date().toISOString()
  });
});

// 2. Save Journal
app.post('/api/journal', async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.date) {
      return res.status(400).json({ error: 'Invalid payload: Date required' });
    }

    const filename = `journals/${data.date}.jsonl`;
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filename);

    console.log(`[API] Writing journal: ${filename}`);

    await file.save(JSON.stringify(data), {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=0' },
    });

    res.status(200).json({ success: true, path: filename });
  } catch (error) {
    console.error('[API] Save Failed:', error);
    res.status(500).json({ error: 'Cloud Storage Write Failed', details: error.message });
  }
});

// 3. Debug Routes (Added for diagnostics)
app.get('/debug-routes', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }));
  res.json({ routes });
});

// 4. API 404 Handler (Prevents falling through to React index.html for API calls)
app.use('/api/*', (req, res) => {
  console.warn(`[API] 404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ error: "API Endpoint Not Found", path: req.originalUrl });
});

// --- STATIC FILES & SPA FALLBACK ---

const distPath = path.join(__dirname, 'dist');
console.log(`[SERVER] Serving static files from: ${distPath}`);

// 1. Serve static files from the 'dist' directory
app.use(express.static(distPath));

// 2. Handle SPA Fallback: 
// Only redirect to index.html if the request is NOT an API call
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`ROCKIT Engine Server listening on port ${port}`);
});
