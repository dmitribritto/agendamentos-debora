const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'reservations.json');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
let lastServerUpdate = Date.now();
function harmonizeReservations(list) {
  if (!Array.isArray(list)) return list;
  const latestByAuthor = new Map();
  list.forEach((r) => {
    if (r && r.authorId && r.authorName) {
      const prev = latestByAuthor.get(r.authorId);
      const rTime = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (!prev || rTime >= prev.time) {
        latestByAuthor.set(r.authorId, {
          name: r.authorName.trim(),
          role: r.authorRole ? r.authorRole.trim() : 'Docente CPS',
          time: rTime
        });
      }
    }
  });
  const knownNameMap = new Map();
  const anaLatest = latestByAuthor.get('user_anacarol');
  if (anaLatest) {
    knownNameMap.set('ana carol', anaLatest);
    knownNameMap.set('carol', anaLatest);
  }
  const dimitriLatest = latestByAuthor.get('user_dimitri');
  if (dimitriLatest) {
    knownNameMap.set('dimitri', dimitriLatest);
  }
  return list.map((r) => {
    if (!r) return r;
    let authorInfo = null;
    if (r.authorId && latestByAuthor.has(r.authorId)) {
      authorInfo = latestByAuthor.get(r.authorId);
    } else if (r.authorName && knownNameMap.has(r.authorName.trim().toLowerCase())) {
      authorInfo = knownNameMap.get(r.authorName.trim().toLowerCase());
    }
    const schoolId = r.schoolId || 'furlan';
    if (authorInfo && authorInfo.name) {
      return {
        ...r,
        schoolId,
        authorName: authorInfo.name,
        authorRole: authorInfo.role || r.authorRole || 'Docente CPS',
        authorId: r.authorId || (authorInfo === anaLatest ? 'user_anacarol' : 'user_dimitri')
      };
    }
    return {
      ...r,
      schoolId
    };
  });
}
function readReservationsFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return harmonizeReservations(parsed);
    }
  } catch (e) {}
  return [];
}
let serverReservations = readReservationsFromFile();
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = urlObj.pathname;
  if (reqPath === '/api/update-profile' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { userId, name, role, oldName } = JSON.parse(body);
        if (userId && name) {
          const normOld = (oldName || '').trim().toLowerCase();
          const newName = name.trim();
          const newRole = role ? role.trim() : 'Docente CPS';
          serverReservations = serverReservations.map(r => {
            if (!r) return r;
            const matchId = r.authorId === userId;
            const matchOld = normOld && r.authorName && r.authorName.trim().toLowerCase() === normOld;
            const matchKnownAna = userId === 'user_anacarol' && r.authorName && (r.authorName.trim().toLowerCase() === 'ana carol' || r.authorName.trim().toLowerCase() === 'carol');
            const matchKnownDimitri = userId === 'user_dimitri' && r.authorName && (r.authorName.trim().toLowerCase() === 'dimitri' || r.authorName.trim().toLowerCase() === 'jow');
            if (matchId || matchOld || matchKnownAna || matchKnownDimitri) {
              return {
                ...r,
                authorName: newName,
                authorRole: newRole,
                authorId: userId
              };
            }
            return r;
          });
          serverReservations = harmonizeReservations(serverReservations);
          lastServerUpdate = Date.now();
          try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(serverReservations, null, 2), 'utf-8');
          } catch (e) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, reservations: serverReservations, lastUpdated: lastServerUpdate }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Erro ao atualizar perfil' }));
      }
    });
    return;
  }
  const DEFAULT_SCHOOLS = [
    {
      id: "furlan",
      name: "ETEC Antônio Furlan",
      code: "ETEC-AF2026-8392",
      aliases: ["ETEC-AF2026-8392", "ETEC-AB12CD", "AF2026-8392"],
      city: "Barueri - SP",
      description: "Sistema de agendamento de espaços"
    }
  ];
  if (reqPath === '/api/schools') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ schools: DEFAULT_SCHOOLS }));
      return;
    }
  }
  if (reqPath === '/api/reservations') {
    if (req.method === 'GET') {
      const schoolFilter = urlObj.searchParams.get('schoolId');
      let returnList = serverReservations;
      if (schoolFilter) {
        returnList = serverReservations.filter(r => (r.schoolId || 'furlan') === schoolFilter);
      }
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(JSON.stringify({
        reservations: returnList,
        allReservations: serverReservations,
        lastUpdated: lastServerUpdate
      }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed.reservations)) {
            if (parsed.schoolId) {
              const targetSchool = parsed.schoolId;
              const others = serverReservations.filter(r => (r.schoolId || 'furlan') !== targetSchool);
              const updated = parsed.reservations.map(r => ({ ...r, schoolId: targetSchool }));
              serverReservations = harmonizeReservations([...others, ...updated]);
            } else {
              const map = new Map();
              serverReservations.forEach(r => map.set(r.id, r));
              parsed.reservations.forEach(r => map.set(r.id, { ...r, schoolId: r.schoolId || 'furlan' }));
              serverReservations = harmonizeReservations(Array.from(map.values()));
            }
            lastServerUpdate = Date.now();
            try {
              fs.writeFileSync(DATA_FILE, JSON.stringify(serverReservations, null, 2), 'utf-8');
            } catch (err) {
              console.warn('Erro ao salvar no disco:', err);
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, count: serverReservations.length, lastUpdated: lastServerUpdate }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'JSON inválido' }));
        }
      });
      return;
    }
  }
  let filePath = path.join(ROOT, reqPath === '/' ? 'index.html' : path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, ''));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Não Encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Landing page (Aplika): http://localhost:${PORT}/ ou http://localhost:${PORT}/landing.html`);
  console.log(`Página de login/cadastro: http://localhost:${PORT}/login.html`);
  console.log(`Painel de agendamentos: http://localhost:${PORT}/app.html`);
  console.log(`Página de contratação: http://localhost:${PORT}/contratar.html`);
});
