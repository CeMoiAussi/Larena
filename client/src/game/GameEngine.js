const ARENA_W = 1000;
const ARENA_H = 700;

export default class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = ARENA_W;
    canvas.height = ARENA_H;
    this.players = {};
    this.projectiles = [];
    this.myId = null;
    this.running = false;
    this.onClick = null;
    this.onSendInput = null;
    this.keys = { w: false, a: false, s: false, d: false };
    this.keyboardActive = false;

    canvas.addEventListener('click', (e) => {
      if (!this.onClick) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.keyboardActive = false;
      this.onClick(x, y);
    });

    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
        if (k === 'w' || k === 'arrowup') this.keys.w = true;
        if (k === 's' || k === 'arrowdown') this.keys.s = true;
        if (k === 'a' || k === 'arrowleft') this.keys.a = true;
        if (k === 'd' || k === 'arrowright') this.keys.d = true;
        this.keyboardActive = true;
        this.updateKeyboardTarget();
      }
    });

    document.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.keys.w = false;
      if (k === 's' || k === 'arrowdown') this.keys.s = false;
      if (k === 'a' || k === 'arrowleft') this.keys.a = false;
      if (k === 'd' || k === 'arrowright') this.keys.d = false;
      if (this.keys.w || this.keys.a || this.keys.s || this.keys.d) {
        this.updateKeyboardTarget();
      } else {
        this.keyboardActive = false;
      }
    });
  }

  updateKeyboardTarget() {
    const me = this.players[this.myId];
    if (!me || !me.alive) return;
    let dx = 0, dy = 0;
    if (this.keys.w) dy -= 1;
    if (this.keys.s) dy += 1;
    if (this.keys.a) dx -= 1;
    if (this.keys.d) dx += 1;
    if (dx === 0 && dy === 0) return;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    me.targetX = me.renderX + dx * 10000;
    me.targetY = me.renderY + dy * 10000;
    if (this.onSendInput) {
      this.onSendInput(me.targetX, me.targetY);
    }
  }

  setState(players, projectiles) {
    const oldProjs = {};
    for (const p of this.projectiles) oldProjs[p.id] = p;

    this.projectiles = (projectiles || []).map(p => {
      const old = oldProjs[p.id];
      return {
        ...p,
        renderX: old ? old.renderX : p.x,
        renderY: old ? old.renderY : p.y,
      };
    });

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
        local.speed = server.speed ?? 2;

        if (!wasAlive && server.alive) {
          local.renderX = server.x;
          local.renderY = server.y;
          local.targetX = null;
          local.targetY = null;
        } else if (server.alive) {
          const dx = server.x - local.renderX;
          const dy = server.y - local.renderY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2) {
            local.renderX += dx * 0.1;
            local.renderY += dy * 0.1;
          } else {
            local.renderX = server.x;
            local.renderY = server.y;
          }
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
        local.speed = server.speed ?? 2;
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
    if (this.keyboardActive) {
      this.updateKeyboardTarget();
    }

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

      const speed = p.speed || 2;
      if (id === this.myId) {
        const step = Math.min(speed * 60 * dt, dist);
        p.renderX += (dx / dist) * step;
        p.renderY += (dy / dist) * step;
      } else {
        p.renderX += (dx / dist) * Math.min(dist * 0.25, speed * 60 * dt * 3);
      }
    }

    for (const p of this.projectiles) {
      p.renderX += (p.x - p.renderX) * 0.4;
      p.renderY += (p.y - p.renderY) * 0.4;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, ARENA_W - 2, ARENA_H - 2);

    this.drawProjectiles();

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

  drawProjectiles() {
    const ctx = this.ctx;
    for (const p of this.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.renderX, p.renderY, 7, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, p.renderX, p.renderY);
      ctx.restore();
    }
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
