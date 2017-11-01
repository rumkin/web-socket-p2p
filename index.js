const http = require('http');
const {Server} = require('ws');
const {parse} = require('url');

const server = http.createServer((req, res) => {
  res.end('OK');
});

const wss = new Server({ server });

const rooms = new Map();

wss.on('connection', (ws, req) => {
  const {query} = parse(req.url, true);

  if (! query.id) {
    ws.close();
    return;
  }

  const id = query.id.slice(0, 256);

  if (! rooms.has(id)) {
    rooms.set(id, []);
  }

  const room = rooms.get(id);
  if (room.length > 1) {
    ws.close();
    console.log('room', id, 'is full');
    return;
  }
  rooms.set(id, [...room, ws]);

  const ctx = {
    id,
    ws,
  };

  ws.on('message', onMessage.bind(null, ctx));
  ws.on('close', onClose.bind(null, ctx));

  room.forEach((conn) => {
    send(conn, {type: 'connected'});
  });
});

function onMessage({id, ws}, msg) {
  const room = rooms.get(id);

  room.forEach((conn) => {
    if (conn !== ws) {
      send(conn, {type: 'message', payload: msg});
    }
  });
}

function onClose({id, ws}) {
  let room = rooms.get(id);
  if (! room) {
    return;
  }

  room = room.filter((item) => item !== ws);

  if (! room.length) {
    rooms.delete(id);
  }
  else {
    rooms.set(id, room);
  }

  room.forEach((conn) => {
    send(conn, {type: 'disconnected'})
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log('server is listening at port ', PORT);
});
