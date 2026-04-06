// ─── CONFIG ─────────────────────────────────────────────────────────────────
const TILE = 48;
const ISO_W = TILE * 2;
const ISO_H = TILE;
const MAP_W = 20, MAP_H = 20;
 
// ─── CANVAS SETUP ────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
 
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
 
// ─── TILEMAP ─────────────────────────────────────────────────────────────────
// 0=floor, 1=wall, 2=door(open), 3=pillar
const BASE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,1,0,0,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,0,0,0,1,1,0,0,0,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
let map;
 
function cloneMap() {
  map = BASE_MAP.map(r => [...r]);
}
 
// ─── ISO TRANSFORM ────────────────────────────────────────────────────────────
function toIso(wx, wy) {
  return {
    x: (wx - wy) * (ISO_W / 2),
    y: (wx + wy) * (ISO_H / 2)
  };
}
 
function worldToScreen(wx, wy) {
  const iso = toIso(wx, wy);
  return {
    x: iso.x + cam.x,
    y: iso.y + cam.y
  };
}
 
function screenToWorld(sx, sy) {
  const ix = sx - cam.x;
  const iy = sy - cam.y;
  return {
    x: (ix / (ISO_W / 2) + iy / (ISO_H / 2)) / 2,
    y: (iy / (ISO_H / 2) - ix / (ISO_W / 2)) / 2
  };
}
 
// ─── CAMERA ──────────────────────────────────────────────────────────────────
const cam = { x: 0, y: 0 };
 
function updateCamera() {
const iso = toIso(player.x, player.y);
const targetX = canvas.width  / 2 - iso.x; // calcula ONDE cam.x precisa estar
cam.x += (targetX - cam.x) * 0.12;  
}
 
function worldToScreenRaw(wx, wy) {
  const iso = toIso(wx, wy);
  return { x: iso.x, y: iso.y };
}
 
// ─── INPUT ────────────────────────────────────────────────────────────────────
const keys = {};
const mouse = { x: 0, y: 0, down: false };
 
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'r') reload();
  if (e.key.toLowerCase() === 'e') tryPickup();
});
window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; tryShoot(); } });
canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouse.down = false; });
 
// ─── WEAPONS ──────────────────────────────────────────────────────────────────
const WEAPONS = {
  pistol:   { name:'PISTOL',   ammo:12, maxAmmo:12, damage:35, fireRate:350, spread:.04, bullets:1, color:'#05d9e8' },
  shotgun:  { name:'SHOTGUN',  ammo:8,  maxAmmo:8,  damage:25, fireRate:700, spread:.35, bullets:6, color:'#ff6b35' },
  uzi:      { name:'UZI',      ammo:30, maxAmmo:30, damage:20, fireRate:100, spread:.12, bullets:1, color:'#b8ff3c' },
  rifle:    { name:'RIFLE',    ammo:20, maxAmmo:20, damage:60, fireRate:500, spread:.01, bullets:1, color:'#ff2a6d' },
};
 
// ─── GAME STATE ───────────────────────────────────────────────────────────────
let score = 0, wave = 1, running = false;
let lastShot = 0, reloading = false, reloadTimer = 0;
let enemies = [], bullets = [], particles = [], drops = [], bloodDecals = [];
let killFeedItems = [];
 
const player = {
  x: 10, y: 10, hp: 100, maxHp: 100,
  angle: 0, speed: .07,
  weapon: { ...WEAPONS.pistol, key: 'pistol' },
  invTimer: 0,
  dead: false,
};
 
// ─── DRAWING HELPERS ─────────────────────────────────────────────────────────
function drawIsoRect(sx, sy, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx, sy - h);
  ctx.lineTo(sx + w/2, sy - h + w/4);
  ctx.lineTo(sx + w/2, sy + w/4);
  ctx.lineTo(sx, sy);
  ctx.lineTo(sx - w/2, sy + w/4);
  ctx.lineTo(sx - w/2, sy - h + w/4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
 
function drawFloor(sx, sy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx,           sy);
  ctx.lineTo(sx + ISO_W/2, sy + ISO_H/2);
  ctx.lineTo(sx,           sy + ISO_H);
  ctx.lineTo(sx - ISO_W/2, sy + ISO_H/2);
  ctx.closePath();
  ctx.fill();
  // subtle grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = .5;
  ctx.stroke();
  ctx.restore();
}
 
function drawWall(sx, sy) {
  const WH = 36;
  // top face
  ctx.fillStyle = '#2a0f1f';
  ctx.beginPath();
  ctx.moveTo(sx,           sy - WH);
  ctx.lineTo(sx + ISO_W/2, sy - WH + ISO_H/2);
  ctx.lineTo(sx,           sy - WH + ISO_H);
  ctx.lineTo(sx - ISO_W/2, sy - WH + ISO_H/2);
  ctx.closePath();
  ctx.fill();
  // left face
  ctx.fillStyle = '#1a0810';
  ctx.beginPath();
  ctx.moveTo(sx - ISO_W/2, sy - WH + ISO_H/2);
  ctx.lineTo(sx,           sy - WH + ISO_H);
  ctx.lineTo(sx,           sy + ISO_H);
  ctx.lineTo(sx - ISO_W/2, sy + ISO_H/2);
  ctx.closePath();
  ctx.fill();
  // right face
  ctx.fillStyle = '#220d18';
  ctx.beginPath();
  ctx.moveTo(sx + ISO_W/2, sy - WH + ISO_H/2);
  ctx.lineTo(sx,           sy - WH + ISO_H);
  ctx.lineTo(sx,           sy + ISO_H);
  ctx.lineTo(sx + ISO_W/2, sy + ISO_H/2);
  ctx.closePath();
  ctx.fill();
  // border glow
  ctx.strokeStyle = '#ff2a6d22';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - ISO_W/2, sy - WH + ISO_H/2);
  ctx.lineTo(sx,           sy - WH);
  ctx.lineTo(sx + ISO_W/2, sy - WH + ISO_H/2);
  ctx.stroke();
}
 
function drawPillar(sx, sy) {
  const PH = 52;
  const PW = ISO_W * 0.4;
  ctx.fillStyle = '#1e0a14';
  // shadow floor
  ctx.save();
  ctx.globalAlpha = .3;
  ctx.fillStyle = '#000';
  drawFloorShape(sx, sy + ISO_H/2, ISO_W * .5, ISO_H * .5);
  ctx.restore();
  // body
  ctx.fillStyle = '#3a1228';
  ctx.beginPath();
  ctx.moveTo(sx,        sy - PH);
  ctx.lineTo(sx + PW/2, sy - PH + PW/4);
  ctx.lineTo(sx + PW/2, sy + PW/4);
  ctx.lineTo(sx,        sy);
  ctx.lineTo(sx - PW/2, sy + PW/4);
  ctx.lineTo(sx - PW/2, sy - PH + PW/4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ff2a6d44';
  ctx.lineWidth = 1;
  ctx.stroke();
  // cap
  ctx.fillStyle = '#ff2a6d33';
  ctx.beginPath();
  ctx.moveTo(sx,        sy - PH);
  ctx.lineTo(sx + PW/2, sy - PH + PW/4);
  ctx.lineTo(sx,        sy - PH + PW/2);
  ctx.lineTo(sx - PW/2, sy - PH + PW/4);
  ctx.closePath();
  ctx.fill();
}
 
function drawFloorShape(sx, sy, w, h) {
  ctx.beginPath();
  ctx.moveTo(sx,     sy);
  ctx.lineTo(sx+w/2, sy+h/2);
  ctx.lineTo(sx,     sy+h);
  ctx.lineTo(sx-w/2, sy+h/2);
  ctx.closePath();
  ctx.fill();
}
 
// ─── DRAW SPRITE (placeholder boxes) ─────────────────────────────────────────
// Replace these with actual sprite images! 
// ctx.drawImage(spriteSheet, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
 
function drawPlayerSprite(sx, sy, angle, dead) {
  ctx.save();
  ctx.translate(sx, sy - 8);
  // shadow
  ctx.globalAlpha = .25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 14, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
 
  if (dead) {
    ctx.fillStyle = '#ff2a6d88';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    return;
  }
 
  // body (replace with sprite image)
  ctx.fillStyle = '#05d9e8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
 
  // gun direction indicator
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const isoAngle = angle - Math.PI / 4;
  ctx.lineTo(Math.cos(isoAngle) * 14, Math.sin(isoAngle) * 14);
  ctx.stroke();
 
  // eye
  ctx.fillStyle = '#0a0005';
  ctx.beginPath();
  ctx.ellipse(Math.cos(isoAngle) * 4, Math.sin(isoAngle) * 4, 2.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
 
  ctx.restore();
}
 
function drawEnemySprite(sx, sy, angle, hp, maxHp, type, dead, alerted) {
  ctx.save();
  ctx.translate(sx, sy - 8);
 
  ctx.globalAlpha = .2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 14, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
 
  if (dead) {
    ctx.fillStyle = '#ff2a6d55';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
    return;
  }
 
  const colors = { grunt: '#ff6b35', heavy: '#ffcc00', shooter: '#b8ff3c' };
  const col = colors[type] || '#ff6b35';
 
  // body (replace with sprite image)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 0, type === 'heavy' ? 10 : 7, type === 'heavy' ? 10 : 7, 0, 0, Math.PI * 2);
  ctx.fill();
 
  // alert indicator
  if (alerted) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const a = angle - Math.PI / 4;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.stroke();
  }
 
  // hp bar
  const barW = 20, barH = 3;
  ctx.fillStyle = '#300';
  ctx.fillRect(-barW/2, -18, barW, barH);
  ctx.fillStyle = hp/maxHp > .5 ? '#0f0' : hp/maxHp > .25 ? '#ff0' : '#f00';
  ctx.fillRect(-barW/2, -18, barW * (hp/maxHp), barH);
 
  ctx.restore();
}
 
function drawBulletSprite(sx, sy, color) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
 
function drawDrop(sx, sy, type) {
  ctx.save();
  ctx.translate(sx, sy - 6);
  const wDef = WEAPONS[type];
  if (wDef) {
    ctx.strokeStyle = wDef.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = wDef.color;
    ctx.shadowBlur = 12;
    ctx.strokeRect(-8, -4, 16, 8);
    ctx.fillStyle = wDef.color + '33';
    ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = wDef.color;
    ctx.font = '7px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText(wDef.name[0], 0, 3);
  }
  ctx.restore();
}
 
// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnBlood(wx, wy, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 1.5 + .3;
    particles.push({
      wx, wy,
      vx: Math.cos(a) * s * .04,
      vy: Math.sin(a) * s * .04,
      life: 1, decay: Math.random() * .03 + .02,
      size: Math.random() * 5 + 2,
      color: `hsl(${Math.random()*20},100%,${30+Math.random()*20}%)`
    });
  }
  bloodDecals.push({ wx, wy, r: Math.random() * 6 + 4, alpha: .55 });
}
 
function spawnMuzzle(wx, wy, color, count = 4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      wx, wy,
      vx: Math.cos(a) * .12,
      vy: Math.sin(a) * .12,
      life: .8, decay: .08,
      size: Math.random() * 3 + 1,
      color
    });
  }
}
 
function spawnDust(wx, wy) {
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      wx, wy,
      vx: Math.cos(a) * .05,
      vy: Math.sin(a) * .05,
      life: .6, decay: .04,
      size: Math.random() * 4 + 1,
      color: '#555'
    });
  }
}
 
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.wx += p.vx;
    p.wy += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
 
function drawParticles() {
  for (const p of particles) {
    const s = worldToScreen(p.wx, p.wy);
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, p.size, p.size * .5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
 
function drawBloodDecals() {
  for (const d of bloodDecals) {
    const s = worldToScreen(d.wx, d.wy);
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + ISO_H/2, d.r * 1.5, d.r * .6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
 
// ─── COLLISION ────────────────────────────────────────────────────────────────
function isSolid(wx, wy) {
  const tx = Math.floor(wx), ty = Math.floor(wy);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return map[ty][tx] === 1 || map[ty][tx] === 3;
}
 
function canMove(x, y) {
  const m = .32;
  return !isSolid(x + m, y + m) &&
         !isSolid(x - m, y + m) &&
         !isSolid(x + m, y - m) &&
         !isSolid(x - m, y - m);
}

function moveEntity(e, dx, dy) {
  // tenta movimento diagonal completo
  if (canMove(e.x + dx, e.y + dy)) {
    e.x += dx; e.y += dy;
    return;
  }
  // tenta só X
  if (dx !== 0 && canMove(e.x + dx, e.y)) {
    e.x += dx;
    return;
  }
  // tenta só Y
  if (dy !== 0 && canMove(e.x, e.y + dy)) {
    e.y += dy;
  }
}
 
// ─── SHOOTING ────────────────────────────────────────────────────────────────
function tryShoot() {
  if (!running || player.dead) return;
  const now = Date.now();
  const w = player.weapon;
  if (reloading) return;
  if (now - lastShot < w.fireRate) return;
  if (w.ammo <= 0) { reload(); return; }
 
  lastShot = now;
  w.ammo--;
  updateHUD();
 
  const wPos = screenToWorld(mouse.x, mouse.y);
  const dx = wPos.x - player.x;
  const dy = wPos.y - player.y;
  const baseAngle = Math.atan2(dy, dx);
 
  for (let i = 0; i < w.bullets; i++) {
    const a = baseAngle + (Math.random() - .5) * w.spread;
    const speed = 0.35;
    bullets.push({
      wx: player.x, wy: player.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 60, color: w.color,
      owner: 'player', damage: w.damage
    });
  }
  spawnMuzzle(player.x, player.y, w.color);
  screenShake(2);
}
 
function reload() {
  if (reloading || player.dead) return;
  const w = player.weapon;
  if (w.ammo === w.maxAmmo) return;
  reloading = true;
  document.getElementById('ammo-display').textContent = 'RELOADING...';
  setTimeout(() => {
    reloading = false;
    player.weapon.ammo = player.weapon.maxAmmo;
    updateHUD();
  }, 1200);
}
 
function tryPickup() {
  if (!running || player.dead) return;
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    const dist = Math.hypot(d.wx - player.x, d.wy - player.y);
    if (dist < 1.2) {
      player.weapon = { ...WEAPONS[d.type], key: d.type };
      drops.splice(i, 1);
      updateHUD();
      addKillFeed('WEAPON PICKED UP: ' + WEAPONS[d.type].name);
      return;
    }
  }
}
 
// ─── ENEMY AI ─────────────────────────────────────────────────────────────────
function spawnEnemies(count) {
  const spawnPoints = [
    {x:2,y:2},{x:17,y:2},{x:2,y:17},{x:17,y:17},
    {x:2,y:9},{x:17,y:9},{x:9,y:2},{x:9,y:17},
    {x:5,y:5},{x:14,y:5},{x:5,y:14},{x:14,y:14},
  ];
  const types = ['grunt','grunt','grunt','shooter','heavy'];
  for (let i = 0; i < count; i++) {
    const sp = spawnPoints[i % spawnPoints.length];
    const type = types[Math.floor(Math.random() * types.length)];
    enemies.push({
      x: sp.x + Math.random() * 1.5,
      y: sp.y + Math.random() * 1.5,
      hp: type === 'heavy' ? 120 : type === 'shooter' ? 60 : 80,
      maxHp: type === 'heavy' ? 120 : type === 'shooter' ? 60 : 80,
      type,
      angle: 0,
      speed: type === 'heavy' ? .028 : .048,
      alerted: false,
      alertTimer: 0,
      shootTimer: 0,
      dead: false,
      deathTimer: 0,
    });
  }
}
 
function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.dead) {
      e.deathTimer++;
      continue;
    }
 
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
 
    // line-of-sight (simple)
    const los = dist < 8 || e.alerted;
    if (dist < 10 && !e.alerted) {
      e.alerted = true;
    }
 
    if (e.alerted) {
      e.angle = Math.atan2(dy, dx) + Math.PI / 4;
 
      if (e.type === 'shooter') {
        // keep distance and shoot
        if (dist > 5) moveEntity(e, (dx / dist) * e.speed, (dy / dist) * e.speed);
        e.shootTimer++;
        if (e.shootTimer > 80) {
          e.shootTimer = 0;
          const a = Math.atan2(dy, dx) + (Math.random() - .5) * .2;
          bullets.push({
            wx: e.x, wy: e.y,
            vx: Math.cos(a) * .18, vy: Math.sin(a) * .18,
            life: 80, color: '#ff6b35',
            owner: 'enemy', damage: 15
          });
        }
      } else if (e.type === 'heavy') {
        if (dist > 1.1) moveEntity(e, (dx / dist) * e.speed, (dy / dist) * e.speed);
        e.shootTimer++;
        if (e.shootTimer > 50) {
          e.shootTimer = 0;
          const a = Math.atan2(dy, dx) + (Math.random() - .5) * .15;
          bullets.push({
            wx: e.x, wy: e.y,
            vx: Math.cos(a) * .22, vy: Math.sin(a) * .22,
            life: 70, color: '#ffcc00',
            owner: 'enemy', damage: 25
          });
        }
      } else {
        // grunt: charge
        if (dist > 0.9) moveEntity(e, (dx / dist) * e.speed, (dy / dist) * e.speed);
        // melee
        if (dist < 1.0) {
          if (!e._hitCd || Date.now() - e._hitCd > 800) {
            e._hitCd = Date.now();
            damagePlayer(18);
          }
        }
      }
    }
  }
}
 
// ─── BULLETS UPDATE ───────────────────────────────────────────────────────────
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.wx += b.vx;
    b.wy += b.vy;
    b.life--;
 
    if (b.life <= 0 || isSolid(b.wx, b.wy)) {
      if (isSolid(b.wx, b.wy)) spawnDust(b.wx, b.wy);
      bullets.splice(i, 1);
      continue;
    }
 
    if (b.owner === 'player') {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.dead) continue;
        if (Math.hypot(b.wx - e.x, b.wy - e.y) < .6) {
          e.hp -= b.damage;
          spawnBlood(e.x, e.y);
          bullets.splice(i, 1);
          if (e.hp <= 0) killEnemy(e, j);
          break;
        }
      }
    } else {
      if (!player.dead && player.invTimer <= 0) {
        if (Math.hypot(b.wx - player.x, b.wy - player.y) < .6) {
          damagePlayer(b.damage);
          spawnBlood(player.x, player.y, 5);
          bullets.splice(i, 1);
        }
      }
    }
  }
}
 
function killEnemy(e, idx) {
  e.dead = true;
  e.hp = 0;
  spawnBlood(e.x, e.y, 14);
  score += e.type === 'heavy' ? 300 : e.type === 'shooter' ? 200 : 100;
  addKillFeed('KILL +' + (e.type === 'heavy' ? 300 : e.type === 'shooter' ? 200 : 100));
  updateHUD();
  // chance to drop weapon
  if (Math.random() < .3) {
    const wTypes = Object.keys(WEAPONS).filter(k => k !== 'pistol');
    drops.push({ wx: e.x, wy: e.y, type: wTypes[Math.floor(Math.random() * wTypes.length)] });
  }
  checkWaveClear();
}
 
function damagePlayer(dmg) {
  if (player.dead) return;
  player.hp = Math.max(0, player.hp - dmg);
  player.invTimer = 20;
  screenShake(5);
  updateHUD();
  if (player.hp <= 0) {
    player.dead = true;
    spawnBlood(player.x, player.y, 20);
    setTimeout(() => showOverlay('VOCÊ MORREU', 'SCORE: ' + score, 'TENTAR NOVAMENTE'), 1400);
  }
}
 
function checkWaveClear() {
  if (enemies.every(e => e.dead)) {
    wave++;
    setTimeout(() => {
      addKillFeed('── WAVE ' + wave + ' ──');
      updateHUD();
      spawnEnemies(4 + wave * 2);
    }, 2000);
  }
}
 
// ─── SCREEN SHAKE ─────────────────────────────────────────────────────────────
let shakeAmt = 0;
function screenShake(amt) { shakeAmt = Math.max(shakeAmt, amt); }
 
// ─── HUD ──────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  document.getElementById('hud-wave').textContent = 'WAVE ' + wave;
  document.getElementById('hp-fill').style.width = (player.hp / player.maxHp * 100) + '%';
  const w = player.weapon;
  document.getElementById('ammo-display').textContent = w.ammo + ' / ' + w.maxAmmo;
  document.getElementById('weapon-display').textContent = w.name;
}
 
function addKillFeed(msg) {
  const feed = document.getElementById('kill-feed');
  const el = document.createElement('div');
  el.className = 'kill-msg';
  el.textContent = msg;
  feed.prepend(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 2000);
}
 
// ─── OVERLAY ──────────────────────────────────────────────────────────────────
function showOverlay(title, sub, btn) {
  running = false;
  const ov = document.getElementById('overlay');
  ov.querySelector('h1').textContent = title;
  ov.querySelectorAll('p')[0].textContent = sub;
  ov.querySelectorAll('.sub')[0].textContent = '';
  ov.querySelector('button').textContent = btn;
  ov.style.display = 'flex';
}
 
function startGame() {
  document.getElementById('overlay').style.display = 'none';
  resetGame();
  running = true;
  requestAnimationFrame(gameLoop);
}
 
function resetGame() {
  cloneMap();
  score = 0; wave = 1;
  player.x = 10; player.y = 10;
  player.hp = player.maxHp;
  player.dead = false;
  player.weapon = { ...WEAPONS.pistol, key: 'pistol' };
  player.invTimer = 0;
  enemies = []; bullets = []; particles = [];
  drops = []; bloodDecals = [];
  reloading = false; lastShot = 0;
  spawnEnemies(6);
  updateHUD();
  // reset cam
  const iso = toIso(player.x, player.y);
  cam.x = canvas.width  / 2 - iso.x;
  cam.y = canvas.height / 2 - iso.y;
}
 
// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
let lastTime = 0;
function gameLoop(ts) {
  if (!running) return;
  requestAnimationFrame(gameLoop);
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
 
  // Input
  if (!player.dead) {
    const spd = player.speed;
    const diag = (keys['w']||keys['arrowup']||keys['s']||keys['arrowdown']) &&
                 (keys['a']||keys['arrowleft']||keys['d']||keys['arrowright']);
    const m = diag ? spd * .707 : spd;
    if (keys['w']||keys['arrowup'])    moveEntity(player, -m, -m);
    if (keys['s']||keys['arrowdown'])  moveEntity(player,  m,  m);
    if (keys['a']||keys['arrowleft'])  moveEntity(player, -m,  m);
    if (keys['d']||keys['arrowright']) moveEntity(player,  m, -m);
 
    if (mouse.down && Date.now() - lastShot >= player.weapon.fireRate) tryShoot();
 
    // aim angle
    const wPos = screenToWorld(mouse.x, mouse.y);
    player.angle = Math.atan2(wPos.y - player.y, wPos.x - player.x) + Math.PI / 4;
    player.invTimer = Math.max(0, player.invTimer - 1);
  }
 
  updateCamera();
  updateEnemies(dt);
  updateBullets();
  updateParticles();
 
  // screen shake
  const sx = shakeAmt > .1 ? (Math.random() - .5) * shakeAmt : 0;
  const sy = shakeAmt > .1 ? (Math.random() - .5) * shakeAmt : 0;
  shakeAmt *= .8;
 
  // ─── RENDER ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(sx, sy);
 
  // background
  ctx.fillStyle = '#0a0005';
  ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
 
  // collect render items sorted by iso depth
  const renderItems = [];
 
  // tiles
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const s = worldToScreen(tx + .5, ty + .5);
      renderItems.push({ depth: tx + ty, type: 'tile', tx, ty, sx: s.x - ISO_W/2, sy: s.y });
    }
  }
 
  // blood decals (drawn after floor)
  // entities
  for (const e of enemies) {
    const s = worldToScreen(e.x, e.y);
    renderItems.push({ depth: e.x + e.y + .5, type: 'enemy', e, sx: s.x, sy: s.y });
  }
 
  const ps = worldToScreen(player.x, player.y);
  renderItems.push({ depth: player.x + player.y + .5, type: 'player', sx: ps.x, sy: ps.y });
 
  for (const d of drops) {
    const s = worldToScreen(d.wx, d.wy);
    renderItems.push({ depth: d.wx + d.wy + .4, type: 'drop', d, sx: s.x, sy: s.y });
  }
 
  renderItems.sort((a, b) => a.depth - b.depth);
 
  // Draw floor pass first
  for (const it of renderItems) {
    if (it.type !== 'tile') continue;
    const t = map[it.ty][it.tx];
    if (t === 0 || t === 2) {
      const even = (it.tx + it.ty) % 2 === 0;
      drawFloor(it.sx, it.sy, even ? '#1a0612' : '#1e0816');
    }
  }
 
  // Blood decals
  drawBloodDecals();
 
  // Draw walls and entities in depth order
  for (const it of renderItems) {
    if (it.type === 'tile') {
      const t = map[it.ty][it.tx];
      if (t === 1) drawWall(it.sx + ISO_W/2, it.sy);
      if (t === 3) drawPillar(it.sx + ISO_W/2, it.sy);
    } else if (it.type === 'enemy') {
      drawEnemySprite(it.sx, it.sy, it.e.angle, it.e.hp, it.e.maxHp, it.e.type, it.e.dead, it.e.alerted);
    } else if (it.type === 'player') {
      if (!player.dead || Math.floor(Date.now() / 200) % 2) {
        drawPlayerSprite(it.sx, it.sy, player.angle, player.dead);
      }
    } else if (it.type === 'drop') {
      drawDrop(it.sx, it.sy, it.d.type);
    }
  }
 
  // Bullets
  for (const b of bullets) {
    const s = worldToScreen(b.wx, b.wy);
    drawBulletSprite(s.x, s.y, b.color);
  }
 
  // Particles
  drawParticles();
 
  // Pickup prompt
  for (const d of drops) {
    if (Math.hypot(d.wx - player.x, d.wy - player.y) < 1.2) {
      const s = worldToScreen(d.wx, d.wy);
      ctx.save();
      ctx.font = '10px Share Tech Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('[E] PEGAR ' + WEAPONS[d.type].name, s.x, s.y - 28);
      ctx.restore();
    }
  }
 
  ctx.restore();
}
 
// init
cloneMap();