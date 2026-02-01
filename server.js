
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = parseInt(process.env.PORT || '8080', 10);
const BACKEND_URL = "https://rockitapi-292122978848.us-west1.run.app";

// --- API PROXY MIDDLEWARE ---
// Explicitly handles /api requests by forwarding them to the backend
// This resolves CORS issues when running the production build
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}${req.url}`;
    console.log(`[PROXY] ${req.method} ${targetUrl}`);

    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(BACKEND_URL).host, // Override host to match backend
      },
    };

    // Forward body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Need to capture the body stream
      // Since we didn't parse body yet, we can pipe req directly if we used a stream-aware fetch
      // But global fetch in Node 18+ consumes body. 
      // For simplicity in this environment without extra deps, we read the body buffer.
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers);
      if (data.length > 0) {
         options.body = data;
      }
    }
    
    // Remove headers that might confuse the backend or fetch
    delete options.headers['content-length'];
    delete options.headers['connection'];

    const response = await fetch(targetUrl, options);
    
    // Forward status and headers
    res.status(response.status);
    response.headers.forEach((val, key) => {
       res.setHeader(key, val);
    });

    // Pipe response body
    if (response.body) {
       // Convert web stream to node stream
       const reader = response.body.getReader();
       while (true) {
         const { done, value } = await reader.read();
         if (done) break;
         res.write(value);
       }
       res.end();
    } else {
       res.end();
    }

  } catch (err) {
    console.error('[PROXY ERROR]', err);
    res.status(500).json({ error: 'Proxy Request Failed', details: err.message });
  }
});

// --- STATIC FILES & SPA FALLBACK ---
const distPath = path.join(__dirname, 'dist');
console.log(`[SERVER] Serving static files from: ${distPath}`);

app.use(express.static(distPath));

// Handle SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend Server listening on port ${port}`);
});
