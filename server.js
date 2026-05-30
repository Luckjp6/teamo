const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

const COLORS = ['#22d3ee', '#f43f5e', '#f59e0b', '#a78bfa', '#34d399', '#fb923c'];
const rooms = {};

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('join_room', ({ roomId, name }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = { players: {} };

    const colorIdx = Object.keys(rooms[roomId].players).length % COLORS.length;
    rooms[roomId].players[socket.id] = {
      x: 400 + Math.random() * 200,
      y: 300 + Math.random() * 200,
      color: COLORS[colorIdx],
      name: name || 'Player',
      id: socket.id,
    };

    socket.emit('room_state', rooms[roomId].players);
    socket.to(roomId).emit('player_joined', rooms[roomId].players[socket.id]);
    console.log(`${name} entrou na sala ${roomId}. Total: ${Object.keys(rooms[roomId].players).length}`);
  });

  socket.on('move', ({ roomId, x, y }) => {
    if (!rooms[roomId]?.players[socket.id]) return;
    rooms[roomId].players[socket.id].x = x;
    rooms[roomId].players[socket.id].y = y;
    socket.to(roomId).emit('player_moved', { id: socket.id, x, y });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('player_left', socket.id);
        if (Object.keys(rooms[roomId].players).length === 0) delete rooms[roomId];
        break;
      }
    }
    console.log('Desconectado:', socket.id);
  });
});

// Railway usa PORT do ambiente, fallback 3000 local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ ArenaPix rodando na porta ${PORT}\n`);
});
