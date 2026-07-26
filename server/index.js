import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import GameRoom from './GameRoom.js';

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('Battle Arena server running'));
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameRoom(roomId, io));
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  let playerId = null;
  let currentRoom = null;

  socket.on('join', ({ name, class: classType, roomId }) => {
    if (!name || !classType || !roomId) return;
    playerId = socket.id;
    const room = getOrCreateRoom(roomId);
    currentRoom = room;
    socket.join(roomId);
    const player = room.addPlayer(playerId, socket.id, name, classType);
    socket.emit('joined', { playerId, state: room.getState() });
    socket.to(roomId).emit('player_joined', { player });
  });

  socket.on('input', ({ targetX, targetY }) => {
    if (currentRoom && playerId) {
      currentRoom.setTarget(playerId, targetX, targetY);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && playerId) {
      currentRoom.removePlayer(playerId);
      io.to(currentRoom.id).emit('player_left', { playerId });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
