/**
 * Express server to serve the Vite-built static files
 * for Cloud Run deployment.
 */

const express = require('express');
const path = require('path');

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - all routes serve index.html
// Using regex pattern for Express v5 compatibility
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Alora server listening on port ${port}`);
});
