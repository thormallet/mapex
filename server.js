const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'src', 'data', 'world_layers.json');
const SAVES_DIR = path.join(ROOT, 'saves');

if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB max
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', err => reject(err));
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // API: Salvar Camadas e Gerar Snapshot
  if (req.method === 'POST' && pathname === '/api/layers') {
    try {
      const raw = await readRequestBody(req);
      const parsed = JSON.parse(raw);
      if (!parsed.metadata || !parsed.layers) {
        return sendJson(res, 400, { ok: false, error: 'JSON deve conter "metadata" e "layers".' });
      }

      // Snapshot com timestamp legível
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const snapshotFilename = `snapshot_${timestamp}.json`;
      const snapshotPath = path.join(SAVES_DIR, snapshotFilename);

      const formattedJson = JSON.stringify(parsed, null, 2);
      fs.writeFileSync(snapshotPath, formattedJson, 'utf8');
      fs.writeFileSync(DATA_FILE, formattedJson, 'utf8');

      return sendJson(res, 200, {
        ok: true,
        message: 'Camadas salvas com sucesso no disco e snapshot gerado.',
        snapshot: snapshotFilename,
        timestamp: now.toISOString()
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // API: Listar Snapshots
  if (req.method === 'GET' && pathname === '/api/snapshots') {
    try {
      const files = fs.readdirSync(SAVES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const stats = fs.statSync(path.join(SAVES_DIR, f));
          return {
            filename: f,
            createdAt: stats.birthtime || stats.mtime,
            size: stats.size
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return sendJson(res, 200, { ok: true, snapshots: files });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // API: Restaurar Snapshot
  if (req.method === 'POST' && pathname === '/api/snapshots/restore') {
    try {
      const raw = await readRequestBody(req);
      const { filename } = JSON.parse(raw);
      if (!filename) {
        return sendJson(res, 400, { ok: false, error: 'Nome do snapshot não fornecido.' });
      }

      const safeFilename = path.basename(filename);
      const targetSnapshot = path.join(SAVES_DIR, safeFilename);

      if (!fs.existsSync(targetSnapshot)) {
        return sendJson(res, 404, { ok: false, error: 'Snapshot não encontrado.' });
      }

      // Backup de segurança antes de restaurar
      if (fs.existsSync(DATA_FILE)) {
        fs.copyFileSync(DATA_FILE, path.join(SAVES_DIR, `pre_restore_${Date.now()}.bak`));
      }

      const content = fs.readFileSync(targetSnapshot, 'utf8');
      fs.writeFileSync(DATA_FILE, content, 'utf8');

      return sendJson(res, 200, {
        ok: true,
        message: `Snapshot "${safeFilename}" restaurado com sucesso!`,
        data: JSON.parse(content)
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // Servidor Estático de Arquivos
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end('404 Arquivo não encontrado');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    });
    if (req.method === 'HEAD') {
      return res.end();
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Mapex 3D Server ativo em http://localhost:${PORT}`);
});
