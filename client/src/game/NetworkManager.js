import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default class NetworkManager {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.onState = null;
    this.onJoined = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
  }

  connect(name, classType, roomId) {
    this.socket = io(SERVER_URL);

    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        this.socket.emit('join', { name, class: classType, roomId });
      });

      this.socket.on('joined', ({ playerId, state }) => {
        this.playerId = playerId;
        if (this.onJoined) this.onJoined({ playerId, state });
        resolve({ playerId, state });
      });

      this.socket.on('state', ({ players, projectiles, timestamp }) => {
        if (this.onState) this.onState(players, projectiles, timestamp);
      });

      this.socket.on('player_joined', ({ player }) => {
        if (this.onPlayerJoined) this.onPlayerJoined(player);
      });

      this.socket.on('player_left', ({ playerId }) => {
        if (this.onPlayerLeft) this.onPlayerLeft(playerId);
      });
    });
  }

  sendInput(targetX, targetY) {
    if (this.socket?.connected) {
      this.socket.emit('input', { targetX, targetY });
    }
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
