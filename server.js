const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

http.createServer((req, res) => {
  let clean = decodeURIComponent(req.url.split('?')[0]);
  if (clean === '/') clean = '/index.html';
  const filePath = path.join(root, clean.replace(/^\/+/, ''));
  if (!filePath.startsWith(root)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control':'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(port, '0.0.0.0', () => console.log(`SaeedIntex demo running on ${port}`));
