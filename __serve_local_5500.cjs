const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = 5510;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_KEY_FILE = path.join(root, 'openai-api-key.txt');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(payload);
}

function getApiKey() {
  const fromEnv = (process.env.OPENAI_API_KEY || '').trim();
  if (fromEnv) return fromEnv;

  try {
    const fromFile = fs.readFileSync(OPENAI_KEY_FILE, 'utf8').trim();
    if (fromFile) return fromFile;
  } catch {
    return '';
  }

  return '';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 3 * 1024 * 1024) {
        reject(new Error('요청 본문이 너무 큽니다.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        reject(new Error('JSON 본문 형식이 올바르지 않습니다.'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

async function proxyOpenAI(req, res, endpoint) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 500, {
      message: 'OpenAI API 키가 설정되지 않았습니다. set-api-key.cmd를 실행해 주세요.'
    }, {
      'Access-Control-Allow-Origin': '*'
    });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { message: error.message }, {
      'Access-Control-Allow-Origin': '*'
    });
  }

  try {
    const upstream = await fetch(`${OPENAI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';

    res.writeHead(upstream.status, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 502, {
      message: 'OpenAI 서버 연결에 실패했습니다. 네트워크를 확인해 주세요.',
      detail: error.message
    }, {
      'Access-Control-Allow-Origin': '*'
    });
  }
}

function serveStatic(req, res) {
  const reqUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  const clean = reqUrl === '/' ? '/edu-ai-image-lab.html' : reqUrl;
  const filePath = path.normalize(path.join(root, clean));

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    const hasKey = Boolean(getApiKey());
    return sendJson(res, 200, {
      ok: true,
      apiKeyConfigured: hasKey
    }, {
      'Access-Control-Allow-Origin': '*'
    });
  }

  if (req.method === 'POST' && pathname === '/api/moderations') {
    return proxyOpenAI(req, res, '/moderations');
  }

  if (req.method === 'POST' && pathname === '/api/images/generations') {
    return proxyOpenAI(req, res, '/images/generations');
  }

  return serveStatic(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SERVING http://127.0.0.1:${port}/edu-ai-image-lab.html`);
});
