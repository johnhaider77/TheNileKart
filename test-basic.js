console.log('✅ Node.js is working!');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <body>
        <h1>🎉 TheNileKart Test Server</h1>
        <p>Backend is running successfully!</p>
        <p>Node.js version: ${process.version}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

server.listen(5000, () => {
  console.log('🚀 Test server running on http://localhost:5000');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});