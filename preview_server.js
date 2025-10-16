const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5050;
const baseDir = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.statusCode = 500;
    res.end('Server error');
  });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname;
    if (pathname === '/' || pathname === '') {
      pathname = '/preview.html';
    }
    // Prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^\.+/, '');
    const filePath = path.join(baseDir, safePath);

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      sendFile(filePath, res);
    });
  } catch (_) {
    res.statusCode = 400;
    res.end('Bad request');
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}/preview.html`);
});