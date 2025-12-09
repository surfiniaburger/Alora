/**
 * Express server to serve the Vite-built static files
 * for Cloud Run deployment.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Serve static files from the 'dist' directory with detailed cache control
app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            // Never cache HTML to ensure new builds are seen immediately
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // Cache static assets (hashed) aggressively
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Handle SPA routing - serve index.html only for HTML requests
// This prevents serving HTML for missing assets (which causes MIME type errors)
app.get(/.*/, (req, res, next) => {
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        next(); // Use default 404 handler for non-HTML requests
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Alora server listening on port ${port}`);
});
