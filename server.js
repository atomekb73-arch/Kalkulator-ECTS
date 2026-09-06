const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// Automatyczny wybór portu (zaczynając od 3000, 8080 lub portu wskazanego przez system)
function startServer(port) {
  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    const actualPort = address.port;
    console.log(`\n🚀 Serwer Kalkulatora ECTS uruchomiony pomyślnie!`);
    console.log(`🔗 Adres URL: http://localhost:${actualPort}`);
    console.log(`📁 Katalog: ${__dirname}\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} jest zajęty, próba kolejnego...`);
      startServer(0); // 0 wybiera wolny losowy port przydzielony przez OS
    } else {
      console.error('Błąd serwera:', err);
    }
  });
}

// Próbujemy port 3000 lub wolny port przydzielony dynamicznie
startServer(3000);
