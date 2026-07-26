const ARENA_W = 1000;
const ARENA_H = 700;

export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = ARENA_W;
    canvas.height = ARENA_H;
    this.players = {};
    this.myId = null;
    this.lastUpdate = 0;
    this.running = false;
    this.onClick = null;

    canvas.addEventListener('click', (e) => {
      if (!this.onClick) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.onClick(x, y);
    });
  }

  setState(players) {
    for (const id in players) {
      const server = players[id];
      const local = this.players[id];
      if (!local) {
        this.players[id] = {
          ...server,
          renderX: server.x,
          renderY: server.y,
        };
      } else {
        local.targetX = server.x;
        local.targetY = server.y;
        local.hp = server.hp;
        local.maxHp = server.maxHp;
        local.alive = server.alive;
        local.kills = server.kills;
        local.deaths = server.deaths;
        local.class = server.class;
        local.color = server.color;
        local.name = server.name;
      }
    }
    for (const id in this.players) {
      if (!players[id]) {
        delete this.players[id];
      }
    }
  }

  setMyId(id) {
    this.myId = id;
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }

  update() {
    for (const id in this.players) {
      const p = this.players[id];
      if (p.targetX !== undefined) {
        p.renderX += (p.targetX - p.renderX) * 0.15;
        p.renderY += (p.targetY - p.renderY) * 0.15;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, ARENA_W - 2, ARENA_H - 2);

    for (const id in this.players) {
      const p = this.players[id];
      if (!p.alive) continue;
      this.drawPlayer(p, id === this.myId);
    }
  }

  drawPlayer(p, isMe) {
    const ctx = this.ctx;
    const x = p.renderX;
    const y = p.renderY;
    const r = 16;

    ctx.save();

    if (isMe) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.strokeStyle = isMe ? '#fff' : '#555';
    ctx.lineWidth = isMe ? 3 : 1;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.getClassIcon(p.class), x, y);

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(p.name, x, y - r - 12);

    const barW = 40;
    const barH = 5;
    const barX = x - barW / 2;
    const barY = y - r - 6;
    ctx.fillStyle = '#555';
    ctx.fillRect(barX, barY, barW, barH);
    const hpPct = p.hp / p.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    ctx.restore();
  }

  getClassIcon(cls) {
    switch (cls) {
      case 'warrior': return '⚔';
      case 'archer':  return '🏹';
      case 'mage':    return '✦';
      default:        return '?';
    }
  }
}
