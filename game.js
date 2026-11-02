const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function fixCanvasResolution() {
    canvas.width = 800; 
    canvas.height = 400; 
}
window.addEventListener('resize', fixCanvasResolution);
fixCanvasResolution();

// UI Elements
const healthDisplay = document.getElementById('health-display');
const cokeDisplay = document.getElementById('coke-display');
const scoreDisplay = document.getElementById('score-display');
const flavorBadge = document.getElementById('flavor-badge');
const screenOverlay = document.getElementById('screen-overlay');
const screenTitle = document.getElementById('screen-title');
const screenDesc = document.getElementById('screen-desc');
const startBtn = document.getElementById('start-btn');

// Game Engine State
let gameActive = false;
let score = 0;
let keys = {};

// Hero State (Henny) with 3D Depth & Power-Up Systems
const henny = {
    x: 100, y: 300, z: 0, width: 40, height: 60,
    speed: 5, baseSpeed: 5,
    vy: 0, gravity: 0.6, jumpForce: -13, isJumping: false, groundY: 300,
    health: 100, cokeMeter: 0,
    isSlashing: false, slashTimer: 0,
    flavor: 'Classic', flavorTimer: 0,
    isInvincible: false
};

// Sidekick State (Bulleh Shah)
const bullehShah = {
    x: 50, y: 320, z: 5, width: 25, height: 25,
    isAttacking: false, attackTimer: 0, targetX: 0, targetY: 0
};

// Dynamic Game Objects
let entities =; 
let particleSystem =;
let spawnTimer = 0;
let bossMode = false;

// 3D Perspective Properties
const VANISHING_POINT_Y = 180; // Horizon height line

// Upgraded Flavor Dictionary with full text configurations and shield logic hooks
const FLAVORS = {
    'Classic': { color: '#F40009', buff: 'Health Restore +25' },
    'Cherry':  { color: '#800020', buff: 'Fire Slash (2x DMG)' },
    'Diet':    { color: '#b0b7bd', buff: 'Supersonic Speed Boost' },
    'Zero':    { color: '#222222', buff: 'Zero Sugar Invincibility Shield!' }
};

// Mobile Input Binding Engine
function setupTouchControls() {
    const bindTouch = (id, keyName) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
    };
    bindTouch('btn-left', 'ArrowLeft');
    bindTouch('btn-right', 'ArrowRight');
    bindTouch('btn-jump', 'ArrowUp');
    
    const slashBtn = document.getElementById('btn-slash');
    if (slashBtn) slashBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerSlash(); });
    
    const clawBtn = document.getElementById('btn-claw');
    if (clawBtn) clawBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerClaw(); });
}

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
startBtn.addEventListener('click', initGame);

function triggerSlash() {
    if (!gameActive) return;
    if (!henny.isSlashing) {
        henny.isSlashing = true;
        henny.slashTimer = 10;
    }
}

function triggerClaw() {
    if (!gameActive) return;
    if (!bullehShah.isAttacking) {
        bullehShah.isAttacking = true;
        bullehShah.attackTimer = 25;
        let closest = entities.find(e => e.type === 'dragon' || e.type === 'boss');
        bullehShah.targetX = closest ? closest.x : henny.x + 150;
        bullehShah.targetY = closest ? closest.y : henny.y;
    }
}

function spawnParticle(x, y, color) {
    for(let i=0; i<8; i++) {
        particleSystem.push({
            x, y, 
            vx: (Math.random() - 0.5) * 6, 
            vy: (Math.random() - 0.5) * 6, 
            life: 15, color
        });
    }
}

function initGame() {
    score = 0;
    henny.health = 100;
    henny.cokeMeter = 0;
    henny.flavor = 'Classic';
    henny.flavorTimer = 0;
    henny.isInvincible = false;
    henny.x = 100;
    henny.y = 300;
    henny.vy = 0;
    henny.isJumping = false;
    entities =;
    particleSystem =;
    bossMode = false;
    gameActive = true;
    screenOverlay.classList.add('hidden');
}

function endGame(victory = false) {
    gameActive = false;
    screenOverlay.classList.remove('hidden');
    screenTitle.innerText = victory ? "EPIC VICTORY!" : "GAME OVER";
    screenDesc.innerText = victory ? `Unstoppable! You scored ${score} points and successfully defended the Coca-Cola Castle!` : "The dragon hordes overwhelmed Henny and Bulleh Shah.";
    startBtn.innerText = "PLAY AGAIN";
}

function update() {
    if (!gameActive) return;

    // Standard high-score victory watch rule (Extended to 10,000 points)
    if (score >= 10000) {
        endGame(true);
        return;
    }

    // Process Active Coke Buff Buffs
    henny.speed = henny.flavor === 'Diet' ? henny.baseSpeed * 1.8 : henny.baseSpeed;
    henny.isInvincible = (henny.flavor === 'Zero' && henny.flavorTimer > 0);

    if (keys['ArrowLeft'] && henny.x > 0) henny.x -= henny.speed;
    if (keys['ArrowRight'] && henny.x < canvas.width - henny.width) henny.x += henny.speed;
    
    // Jump mechanics
    if ((keys['ArrowUp'] || keys['w']) && !henny.isJumping) {
        henny.vy = henny.jumpForce;
        henny.isJumping = true;
    }
    
    henny.vy += henny.gravity;
    henny.y += henny.vy;
    
    if (henny.y >= henny.groundY) {
        henny.y = henny.groundY;
        henny.vy = 0;
        henny.isJumping = false;
    }

    if (keys[' '] || keys['f']) triggerSlash();
    if (keys['c'] || keys['e']) triggerClaw();

    if (henny.flavorTimer > 0) {
        henny.flavorTimer--;
        if (henny.flavorTimer === 0) {
            henny.flavor = 'Classic';
            flavorBadge.classList.add('hidden');
        }
    }

    // Companion floating tracking movement
    if (bullehShah.isAttacking) {
        bullehShah.x += (bullehShah.targetX - bullehShah.x) * 0.15;
        bullehShah.y += (bullehShah.targetY - bullehShah.y) * 0.15;
        bullehShah.attackTimer--;
        if (bullehShah.attackTimer <= 0) bullehShah.isAttacking = false;
    } else {
        bullehShah.x += ((henny.x - 35) - bullehShah.x) * 0.08;
        bullehShah.y += ((henny.y + 20) - bullehShah.y) * 0.08;
    }

    if (henny.isSlashing) {
        henny.slashTimer--;
        if (henny.slashTimer <= 0) henny.isSlashing = false;
    }

    spawnTimer++;
    
    // MODIFIED: Fire Spitting Dragon Elder Boss spawns much earlier now (At 500 points instead of 1500)
    if (!bossMode && score >= 500) {
        bossMode = true;
        entities.push({ type: 'boss', x: 850, y: 100, z: -30, width: 110, height: 110, health: 35, vy: 1.5 }); // Boss health extended to match 10k pace
    }

    // Spawning waves loop
    if (spawnTimer % 80 === 0) {
        let zPos = (Math.random() - 0.5) * 40; 
        entities.push({ type: 'dragon', x: 820, y: Math.random() * 120 + 60, z: zPos, width: 45, height: 45, speed: Math.random() * 2 + 2.5 });
    }
    if (spawnTimer % 120 === 0) {
        const types = ['Classic', 'Cherry', 'Diet', 'Zero']; // Added Coke Zero to item system
        entities.push({ type: 'coke', x: Math.random() * 600 + 100, y: -20, z: 0, width: 22, height: 36, flavor: types[Math.floor(Math.random() * types.length)] });
    }

    for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];

        if (ent.type === 'dragon') {
            ent.x -= ent.speed;
            ent.y += Math.sin(spawnTimer * 0.05) * 1.5;
            
            if (checkCollision(henny, ent)) {
                if (!henny.isInvincible) henny.health -= 15;
                spawnParticle(ent.x, ent.y, '#ff3333');
                entities.splice(i, 1);
                continue;
            }
        }
        
        if (ent.type === 'boss') {
            ent.x += (550 - ent.x) * 0.02;
            ent.y += ent.vy;
            if (ent.y < 40 || ent.y > 180) ent.vy *= -1;

            // Spits fireballs progressively faster as boss stays alive
            let spitRate = ent.health < 15 ? 30 : 45;
            if (spawnTimer % spitRate === 0) {
                entities.push({ type: 'fireball', x: ent.x, y: ent.y + 40, z: ent.z, width: 18, height: 18, speed: 6.5 });
            }
        }

        if (ent.type === 'fireball') {
            ent.x -= ent.speed;
            if (checkCollision(henny, ent)) {
                if (!henny.isInvincible) henny.health -= 10;
                entities.splice(i, 1);
                continue;
            }
        }

        if (ent.type === 'coke') {
            ent.y += 3.5;
            if (checkCollision(henny, ent)) {
                henny.cokeMeter = Math.min(100, henny.cokeMeter + 20);
                henny.flavor = ent.flavor;
                henny.flavorTimer = 300; // 5 seconds buff duration

                // Classic instantly heals instead of timed countdowns
                if (ent.flavor === 'Classic') {
                    henny.health = Math.min(100, henny.health + 25);
                }

                flavorBadge.innerText = `${henny.flavor} Coke: ${FLAVORS[henny.flavor].buff}`;
                flavorBadge.classList.remove('hidden');
                spawnParticle(ent.x, ent.y, FLAVORS[henny.flavor].color);
                entities.splice(i, 1);
                score += 50;
                continue;
            }
        }

        if (ent.type === 'dragon' || ent.type === 'boss') {
            let hit = false;
            let dmg = henny.flavor === 'Cherry' ? 2 : 1;

            if (henny.isSlashing && Math.abs((henny.x + 40) - ent.x) < 70 && Math.abs(henny.y - ent.y) < 60) {
                hit = true;
            }
            if (bullehShah.isAttacking && checkCollision(bullehShah, ent)) {
                hit = true;
                dmg = 3; // Buffed cat sidekick claw damage to keep up with extended loop
            }

            if (hit) {
                spawnParticle(ent.x, ent.y, '#F40009');
                if (ent.type === 'dragon') {
entities.splice(i, 1);
score += 100;
} else {
ent.health -= dmg;
score += 40; // Grant points on each hit against the boss to help reach 10k
if (ent.health <= 0) {
entities.splice(i, 1);
score += 2000; // Defeating the boss gives a massive boost towards 10k!
bossMode = false; // Reset boss tracker so a fresh elder dragon can arrive later
}
}
continue;
}
}
if (ent.x < -120 || ent.y > 450) {
entities.splice(i, 1);
}
}
for (let idx = particleSystem.length - 1; idx >= 0; idx--) {
const p = particleSystem[idx];
p.x += p.vx; p.y += p.vy; p.life--;
if (p.life <= 0) particleSystem.splice(idx, 1);
}
if (henny.health <= 0) endGame(false);
healthDisplay.innerText = Math.max(0, henny.health);
cokeDisplay.innerText = henny.cokeMeter;
scoreDisplay.innerText = score;
}
function checkCollision(r1, r2) {
return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}
function get3DScale(z) {
return 1 / (1 + (z * 0.008));
}
// Rendering Matrix Engine
function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
// 1. Sky Horizon Ambient
let skyGrad = ctx.createLinearGradient(0, 0, 0, VANISHING_POINT_Y);
skyGrad.addColorStop(0, '#090514');
skyGrad.addColorStop(1, '#231230');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, canvas.width, VANISHING_POINT_Y);
// 2. 3D Castle Projections
ctx.fillStyle = '#140c1c';
ctx.beginPath();
ctx.moveTo(0, 0); ctx.lineTo(120, 40); ctx.lineTo(120, VANISHING_POINT_Y); ctx.lineTo(0, VANISHING_POINT_Y);
ctx.fill();
ctx.fillStyle = '#1a0f24'; ctx.fillRect(120, 30, 80, VANISHING_POINT_Y - 30);
ctx.fillStyle = '#0f0817'; ctx.fillRect(600, 20, 90, VANISHING_POINT_Y - 20);
// 3. 3D Laser Grid Floor
let floorGrad = ctx.createLinearGradient(0, VANISHING_POINT_Y, 0, canvas.height);
floorGrad.addColorStop(0, '#150d1a');
floorGrad.addColorStop(1, '#08040d');
ctx.fillStyle = floorGrad;
ctx.fillRect(0, VANISHING_POINT_Y, canvas.width, canvas.height - VANISHING_POINT_Y);
ctx.strokeStyle = 'rgba(244, 0, 9, 0.25)';
ctx.lineWidth = 2;
const TOTAL_GRID_LINES = 12;
for (let i = 0; i <= TOTAL_GRID_LINES; i++) {
let xFloorEdge = (canvas.width / TOTAL_GRID_LINES) * i;
ctx.beginPath(); ctx.moveTo(400, VANISHING_POINT_Y); ctx.lineTo(xFloorEdge, canvas.height); ctx.stroke();
}
ctx.strokeStyle = 'rgba(244, 0, 9, 0.15)';
for (let j = 0; j < 6; j++) {
let horizontalY = VANISHING_POINT_Y + Math.pow(j / 5, 2) * (canvas.height - VANISHING_POINT_Y);
ctx.beginPath(); ctx.moveTo(0, horizontalY); ctx.lineTo(canvas.width, horizontalY); ctx.stroke();
}
ctx.strokeStyle = '#F40009'; ctx.lineWidth = 3;
ctx.beginPath(); ctx.moveTo(0, 360); ctx.lineTo(canvas.width, 360); ctx.stroke();
// 4. Shadows Layer
ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
ctx.beginPath(); ctx.ellipse(henny.x + 20, 362, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
ctx.beginPath(); ctx.ellipse(bullehShah.x + 12, 362, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
// Draw Sidekick: Bulleh Shah
let catScale = get3DScale(bullehShah.z);
ctx.save();
ctx.translate(bullehShah.x, bullehShah.y);
ctx.scale(catScale, catScale);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 10px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('BULLEH SHAH', bullehShah.width / 2, -6);
let catGrad = ctx.createLinearGradient(0, 0, bullehShah.width, 0);
catGrad.addColorStop(0, '#ff9233'); catGrad.addColorStop(1, '#cc6600');
ctx.fillStyle = catGrad;
ctx.fillRect(0, 6, bullehShah.width, bullehShah.height - 6);
ctx.fillStyle = '#e67300'; ctx.fillRect(2, 0, 6, 8); ctx.fillRect(16, 0, 6, 8);
ctx.fillStyle = '#ff9233'; ctx.fillRect(-6, 12, 8, 5);
ctx.fillStyle = '#00ffcc'; ctx.fillRect(18, 10, 4, 4);
if (bullehShah.isAttacking) {
ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)'; ctx.lineWidth = 3;
ctx.beginPath();
for (let o = -5; o <= 5; o += 5) { ctx.moveTo(20, 12 + o); ctx.lineTo(50, 5 + o); }
ctx.stroke();
}
ctx.restore();
// Draw Heroine: Henny
let heroScale = get3DScale(henny.z);
ctx.save();
ctx.translate(henny.x, henny.y);
ctx.scale(heroScale, heroScale);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 12px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('HENNY', henny.width / 2, -12);
// If Zero Sugar Invincibility is active, flash a neon electric shield layer
if (henny.isInvincible && spawnTimer % 6 < 3) {
ctx.strokeStyle = '#00ffcc';
ctx.lineWidth = 4;
ctx.strokeRect(-4, -4, henny.width + 8, henny.height + 8);
}
let dressGrad = ctx.createLinearGradient(0, 0, 0, henny.height);
dressGrad.addColorStop(0, '#ff6b8b'); dressGrad.addColorStop(1, '#b32d4a');
ctx.fillStyle = dressGrad;
ctx.fillRect(0, 15, henny.width, henny.height - 15);
ctx.fillStyle = '#ffd1dc'; ctx.fillRect(6, -2, henny.width - 12, 18);
ctx.fillStyle = '#301808'; ctx.fillRect(-3, 0, 6, 35); ctx.fillRect(henny.width - 3, 0, 6, 35);
ctx.fillStyle = '#42210b'; ctx.fillRect(-2, -6, henny.width + 4, 10);
if (henny.isSlashing) {
let bladeGrad = ctx.createLinearGradient(henny.width, 15, henny.width + 50, 15);
bladeGrad.addColorStop(0, '#ffffff');
bladeGrad.addColorStop(1, henny.flavor === 'Cherry' ? '#ff003c' : '#00bfff');
ctx.fillStyle = bladeGrad;
ctx.beginPath(); ctx.moveTo(henny.width, 15); ctx.lineTo(henny.width + 55, -8); ctx.lineTo(henny.width + 45, 38); ctx.closePath(); ctx.fill();
} else {
ctx.fillStyle = '#8c92ac'; ctx.fillRect(-6, 10, 8, 25);
ctx.fillStyle = '#ffd700'; ctx.fillRect(-8, 30, 12, 4);
}
ctx.restore();
// 5. Draw Obstacles & Items with 3D Depth
entities.forEach(ent => {
let zScale = get3DScale(ent.z || 0);
ctx.save();
ctx.translate(ent.x, ent.y);
ctx.scale(zScale, zScale);
if (ent.type === 'dragon') {
let dragGrad = ctx.createLinearGradient(0, 0, ent.width, ent.height);
dragGrad.addColorStop(0, '#bd0921'); dragGrad.addColorStop(1, '#4f020b');
ctx.fillStyle = dragGrad; ctx.fillRect(0, 0, ent.width, ent.height);
ctx.fillStyle = '#ffea00'; ctx.fillRect(8, 8, 5, 5);
ctx.fillStyle = '#ff2a4b';
let wingWave = Math.sin(spawnTimer * 0.2) * 15;
ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(5, -15 + wingWave); ctx.lineTo(35, 5); ctx.closePath(); ctx.fill();
}
if (ent.type === 'boss') {
let bossGrad = ctx.createLinearGradient(0, 0, 0, ent.height);
bossGrad.addColorStop(0, '#4a050f'); bossGrad.addColorStop(1, '#170003');
ctx.fillStyle = bossGrad; ctx.fillRect(0, 0, ent.width, ent.height);
ctx.fillStyle = '#ff0055'; ctx.fillRect(15, 20, 12, 12);
ctx.fillStyle = '#7a0010';
let bossWing = Math.sin(spawnTimer * 0.1) * 30;
ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(10, -30 + bossWing); ctx.lineTo(70, 20); ctx.closePath(); ctx.fill();
// Boss Health Bar Frame
ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, -20, ent.width, 8);
ctx.fillStyle = '#ff0055'; ctx.fillRect(0, -20, ent.width * (ent.health / 35), 8);
}
if (ent.type === 'fireball') {
let fireGrad = ctx.createRadialGradient(7, 7, 2, 7, 7, 10);
fireGrad.addColorStop(0, '#ffffff'); fireGrad.addColorStop(0.3, '#ffcc00'); fireGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
ctx.fillStyle = fireGrad; ctx.beginPath(); ctx.arc(7, 7, 12, 0, Math.PI*2); ctx.fill();
}
if (ent.type === 'coke') {
ctx.fillStyle = FLAVORS[ent.flavor].color;
ctx.fillRect(0, 0, ent.width, ent.height);
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.moveTo(0, 16); ctx.bezierCurveTo(6, 12, 14, 22, ent.width, 18); ctx.lineTo(ent.width, 21); ctx.bezierCurveTo(14, 25, 6, 15, 0, 19);
ctx.closePath(); ctx.fill();
ctx.fillStyle = '#b0b7bd'; ctx.fillRect(2, -2, ent.width - 4, 2);
}
ctx.restore();
});
// 6. Particles pipeline bloom
particleSystem.forEach(p => {
ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3);
});
}
function gameLoop() {
update();
draw();
requestAnimationFrame(gameLoop);
}
setupTouchControls();
gameLoop();
