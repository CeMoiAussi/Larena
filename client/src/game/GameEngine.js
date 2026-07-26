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

    canvas.setAttribute('tabindex', '0');
    canvas.focus();

    canvas.addEventListener('click', (e) => {
      if (!this.onClick) return;
      canvas.focus();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      this.onClick((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    });

    const handleKey = (e, down) => {
      const k = e.key;
      let dx = 0, dy = 0;
      if (k === 'w' || k === 'W' || k === 'ArrowUp') dy = -1;
      else if (k === 's' || k === 'S' || k === 'ArrowDown') dy = 1;
      else if (k === 'a' || k === 'A' || k === 'ArrowLeft') dx = -1;
      else if (k === 'd' || k === 'D' || k === 'ArrowRight') dx = 1;
      else return;

      e.preventDefault();
      const me = this.players[this.myId];
      if (!me || !me.alive) return;

      if (down) {
        me.targetX = me.renderX + dx * 10000;
        me.targetY = me.renderY + dy * 10000;
      } else {
        me.targetX = me.renderX;
        me.targetY = me.renderY;
      }
      if (this.onSendInput) this.onSendInput(me.targetX, me.targetY);
    };

    document.addEventListener('keydown', (e) => handleKey(e, true));
    document.addEventListener('keyup', (e) => handleKey(e, false));
  }

  setState(players, projectiles) {
    const oldProjs = {};
    for (const p of this.projectiles) oldProjs[p.id] = p;

    this.projectiles = (projectiles || []).map(p => {
      const old = oldProjs[p.id];
      return { ...p, renderX: old ? old.renderX : p.x, renderY: old ? old.renderY : p.y };
    });

    for (const id in players) {
      const s = players[id];
      let p = this.players[id];

      if (!p) {
        this.players[id] = { ...s, renderX: s.x, renderY: s.y, targetX: s.x, targetY: s.y };
        continue;
      }

      if (id === this.myId) {
        if (!p.alive && s.alive) {
          p.renderX = s.x;
          p.renderY = s.y;
          p.targetX = s.x;
          p.targetY = s.y;
        }
        p.hp = s.hp;
        p.maxHp = s.maxHp;
        p.alive = s.alive;
        p.kills = s.kills;
        p.deaths = s.deaths;
        p.speed = s.speed ?? 2;
      } else {
        p.targetX = s.x;
        p.targetY = s.y;
        p.hp = s.hp;
        p.maxHp = s.maxHp;
        p.alive = s.alive;
        p.kills = s.kills;
        p.deaths = s.deaths;
        p.class = s.class;
        p.color = s.color;
        p.name = s.name;
        p.speed = s.speed ?? 2;
      }
    }

    for (const id in this.players) {
      if (!players[id]) delete this.players[id];
    }
  }

  setMyId(id) { this.myId = id; }

  start() {
    this.running = true;
    let last = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  update(dt) {
    const lerp = 0.2;
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.alive || p.targetX === undefined || p.targetY === undefined) continue;
      p.renderX += (p.targetX - p.renderX) * lerp;
      p.renderY += (p.targetY - p.renderY) * lerp;
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
    if (isMe) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }

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

    const bw = 40, bh = 5, bx = x - bw / 2, by = y - r - 6;
    ctx.fillStyle = '#555';
    ctx.fillRect(bx, by, bw, bh);
    const hpPct = p.hp / p.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(bx, by, bw * hpPct, bh);
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
