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
    this.running = false;
    this.onClick = null;
    this.wasDead = false;

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
      let local = this.players[id];

      if (!local) {
        this.players[id] = {
          ...server,
          renderX: server.x,
          renderY: server.y,
          targetX: null,
          targetY: null,
        };
        continue;
      }

      if (id === this.myId) {
        const wasAlive = local.alive;
        local.hp = server.hp;
        local.maxHp = server.maxHp;
        local.alive = server.alive;
        local.kills = server.kills;
        local.deaths = server.deaths;
        local.speed = server.speed;

        if (!wasAlive && server.alive) {
          local.renderX = server.x;
          local.renderY = server.y;
          local.targetX = null;
          local.targetY = null;
        }
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
        local.speed = server.speed;
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

  setLocalTarget(x, y) {
    const me = this.players[this.myId];
    if (me && me.alive) {
      me.targetX = x;
      me.targetY = y;
    }
  }

  start() {
    this.running = true;
    let lastTime = performance.now();
    const loop = (time) => {
      if (!this.running) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  update(dt) {
    for (const id in this.players) {
      const p = this.players[id];
      if (p.targetX === null || p.targetY === null || !p.alive) continue;

      const dx = p.targetX - p.renderX;
      const dy = p.targetY - p.renderY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        p.renderX = p.targetX;
        p.renderY = p.targetY;
        if (id === this.myId) {
          p.targetX = null;
          p.targetY = null;
        }
        continue;
      }

      if (id === this.myId) {
        const step = Math.min(p.speed * 60 * dt, dist);
        p.renderX += (dx / dist) * step;
        p.renderY += (dy / dist) * step;
      } else {
        p.renderX += (dx / dist) * Math.min(dist * 0.25, p.speed * 60 * dt * 3);
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
    const x = Math.round(p.renderX);
    const y = Math.round(p.renderY);
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
