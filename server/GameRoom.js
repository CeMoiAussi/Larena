const CLASSES = {
  warrior: { hp: 150, speed: 2, damage: 20, range: 50, attackCooldown: 800, color: '#e74c3c', label: 'Warrior' },
  archer:  { hp: 100, speed: 3, damage: 15, range: 200, attackCooldown: 600, color: '#2ecc71', label: 'Archer' },
  mage:    { hp: 80,  speed: 2.5, damage: 25, range: 150, attackCooldown: 1000, color: '#3498db', label: 'Mage' },
};

const ARENA_W = 1000;
const ARENA_H = 700;

export default class GameRoom {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = new Map();
    this.tickInterval = null;
    this.tickRate = 50;
  }

  addPlayer(id, socketId, name, classType) {
    const cls = CLASSES[classType];
    const player = {
      id,
      socketId,
      name,
      class: classType,
      color: cls.color,
      x: Math.random() * (ARENA_W - 100) + 50,
      y: Math.random() * (ARENA_H - 100) + 50,
      hp: cls.hp,
      maxHp: cls.hp,
      speed: cls.speed,
      damage: cls.damage,
      range: cls.range,
      attackCooldown: cls.attackCooldown,
      targetX: null,
      targetY: null,
      lastAttackTime: 0,
      alive: true,
      kills: 0,
      deaths: 0,
    };
    this.players.set(id, player);
    if (this.players.size === 1) this.startLoop();
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.players.size === 0) this.stopLoop();
  }

  setTarget(id, x, y) {
    const p = this.players.get(id);
    if (p && p.alive) {
      p.targetX = x;
      p.targetY = y;
    }
  }

  startLoop() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), this.tickRate);
  }

  stopLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  tick() {
    const now = Date.now();
    const alive = [...this.players.values()].filter(p => p.alive);

    for (const p of alive) this.movePlayer(p);
    for (const p of alive) this.autoAttack(p, alive, now);

    this.broadcastState();
  }

  movePlayer(p) {
    if (p.targetX === null || p.targetY === null) return;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
      p.targetX = null;
      p.targetY = null;
      return;
    }
    const step = Math.min(p.speed, dist);
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    p.x = Math.max(20, Math.min(ARENA_W - 20, p.x));
    p.y = Math.max(20, Math.min(ARENA_H - 20, p.y));
  }

  autoAttack(p, alive, now) {
    if (now - p.lastAttackTime < p.attackCooldown) return;
    let nearest = null;
    let nearestDist = Infinity;
    for (const other of alive) {
      if (other.id === p.id) continue;
      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }
    if (!nearest || nearestDist > p.range) return;
    p.lastAttackTime = now;
    nearest.hp -= p.damage;
    if (nearest.hp <= 0) {
      nearest.hp = 0;
      nearest.alive = false;
      p.kills++;
      nearest.deaths++;
      setTimeout(() => this.respawn(nearest), 3000);
    }
  }

  respawn(p) {
    p.x = Math.random() * (ARENA_W - 100) + 50;
    p.y = Math.random() * (ARENA_H - 100) + 50;
    p.hp = p.maxHp;
    p.alive = true;
    p.targetX = null;
    p.targetY = null;
  }

  getState() {
    const state = {};
    for (const [id, p] of this.players) {
      state[id] = {
        id: p.id,
        name: p.name,
        class: p.class,
        color: p.color,
        x: Math.round(p.x),
        y: Math.round(p.y),
        hp: Math.round(p.hp),
        maxHp: p.maxHp,
        alive: p.alive,
        kills: p.kills,
        deaths: p.deaths,
      };
    }
    return state;
  }

  broadcastState() {
    if (this.players.size === 0) return;
    this.io.to(this.id).emit('state', { players: this.getState(), timestamp: Date.now() });
  }

  getPlayerCount() {
    return this.players.size;
  }
}
