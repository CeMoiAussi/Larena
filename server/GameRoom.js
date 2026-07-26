const CLASSES = {
  warrior: { hp: 150, speed: 3.5, damage: 20, range: 60, attackCooldown: 800, color: '#e74c3c', label: 'Warrior' },
  archer:  { hp: 100, speed: 2.5, damage: 15, range: 500, attackCooldown: 1200, color: '#2ecc71', label: 'Archer', projSpeed: 10, projColor: '#2ecc71', projIcon: '🏹' },
  mage:    { hp: 80,  speed: 2.0, damage: 25, range: 250, attackCooldown: 1500, color: '#3498db', label: 'Mage', projSpeed: 6, projColor: '#9b59b6', projIcon: '✦' },
};

const ARENA_W = 1000;
const ARENA_H = 700;

export default class GameRoom {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = new Map();
    this.projectiles = [];
    this.nextProjId = 0;
    this.tickInterval = null;
    this.tickRate = 33;
  }

  addPlayer(id, socketId, name, classType) {
    const cls = CLASSES[classType];
    const player = {
      id, socketId, name,
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
      projSpeed: cls.projSpeed || 0,
      projColor: cls.projColor || null,
      projIcon: cls.projIcon || null,
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
    for (const p of alive) this.attack(p, alive, now);
    for (const proj of [...this.projectiles]) {
      this.moveProjectile(proj);
      this.checkProjectileHit(proj);
    }

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

  attack(p, alive, now) {
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

    if (p.projSpeed && p.projSpeed > 0) {
      this.fireProjectile(p, nearest);
    } else {
      nearest.hp -= p.damage;
      if (nearest.hp <= 0) {
        nearest.hp = 0;
        nearest.alive = false;
        p.kills++;
        nearest.deaths++;
        setTimeout(() => this.respawn(nearest), 3000);
      }
    }
  }

  fireProjectile(owner, target) {
    const proj = {
      id: this.nextProjId++,
      x: owner.x,
      y: owner.y,
      targetX: target.x,
      targetY: target.y,
      targetId: target.id,
      ownerId: owner.id,
      speed: owner.projSpeed,
      damage: owner.damage,
      color: owner.projColor,
      icon: owner.projIcon,
    };
    this.projectiles.push(proj);
  }

  moveProjectile(proj) {
    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < proj.speed) {
      this.projectiles = this.projectiles.filter(p => p.id !== proj.id);
      return;
    }
    proj.x += (dx / dist) * proj.speed;
    proj.y += (dy / dist) * proj.speed;
    proj.x = Math.max(0, Math.min(ARENA_W, proj.x));
    proj.y = Math.max(0, Math.min(ARENA_H, proj.y));
  }

  checkProjectileHit(proj) {
    const target = this.players.get(proj.targetId);
    if (!target || !target.alive) {
      this.projectiles = this.projectiles.filter(p => p.id !== proj.id);
      return;
    }
    const dx = proj.x - target.x;
    const dy = proj.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      target.hp -= proj.damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        const owner = this.players.get(proj.ownerId);
        if (owner) {
          owner.kills++;
          target.deaths++;
        }
        setTimeout(() => this.respawn(target), 3000);
      }
      this.projectiles = this.projectiles.filter(p => p.id !== proj.id);
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
        speed: p.speed,
        hp: Math.round(p.hp),
        maxHp: p.maxHp,
        alive: p.alive,
        kills: p.kills,
        deaths: p.deaths,
      };
    }
    return state;
  }

  getProjectilesState() {
    return this.projectiles.map(p => ({
      id: p.id,
      x: Math.round(p.x),
      y: Math.round(p.y),
      color: p.color,
      icon: p.icon,
      ownerId: p.ownerId,
    }));
  }

  broadcastState() {
    if (this.players.size === 0) return;
    this.io.to(this.id).emit('state', {
      players: this.getState(),
      projectiles: this.getProjectilesState(),
      timestamp: Date.now(),
    });
  }
}
