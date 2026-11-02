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

// Hero State (Henny) with Jumping Physics
const henny = {
    x: 100, y: 300, width: 40, height: 60,
    speed: 5, baseSpeed: 5,
    vy: 0, gravity: 0.6, jumpForce: -13, isJumping: false, groundY: 300,
    health: 100, cokeMeter: 0,
    isSlashing: false, slashTimer: 0,
    flavor: 'Classic', flavorTimer: 0
};

// Sidekick State (Bulleh Shah)
const bullehShah = {
    x: 50, y: 320, width: 25, height: 25,
    isAttacking: false, attackTimer: 0, targetX: 0, targetY: 0
};

// Dynamic Game Objects
let entities = []; 
let particleSystem = [];
let spawnTimer = 0;
let bossMode = false;

// Configuration Lookups
const FLAVORS = {
    'Classic': { color: '#F40009', buff: 'None' },
    'Cherry':  { color: '#800020', buff: 'Fire Slash (Double Damage)' },
    'Diet':    { color: '#b0b7bd', buff: 'Supersonic Speed Boost' }
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
    henny.x = 100;
    henny.y = 300;
    henny.vy = 0;
    henny.isJumping = false;
    entities = [];
    particleSystem = [];
    bossMode = false;
    gameActive = true;
    screenOverlay.classList.add('hidden');
}

function endGame(victory = false) {
    gameActive = false;
    screenOverlay.classList.remove('hidden');
    screenTitle.innerText = victory ? "VICTORY!" : "GAME OVER";
    screenDesc.innerText = victory ? `You defended the Coca-Cola Castle! Final Score: ${score}` : "The dragons overwhelmed Henny and Bulleh Shah.";
    startBtn.innerText = "PLAY AGAIN";
}

// Core Game Tick Mechanics
function update() {
    if (!gameActive) return;

    // Run Mechanics
    henny.speed = henny.flavor === 'Diet' ? henny.baseSpeed * 1.8 : henny.baseSpeed;
    if (keys['ArrowLeft'] && henny.x > 0) henny.x -= henny.speed;
    if (keys['ArrowRight'] && henny.x < canvas.width - henny.width) henny.x += henny.speed;
    
    // Jump Mechanics
    if ((keys['ArrowUp'] || keys['w']) && !henny.isJumping) {
        henny.vy = henny.jumpForce;
        henny.isJumping = true;
    }
    
    // Apply Gravity Physics
    henny.vy += henny.gravity;
    henny.y += henny.vy;
    
    // Floor Collision Check
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

    // Companion AI state updates
    if (bullehShah.isAttacking) {
        bullehShah.x += (bullehShah.targetX - bullehShah.x) * 0.15;
        bullehShah.y += (bullehShah.targetY - bullehShah.y) * 0.15;
        bullehShah.attackTimer--;
        if (bullehShah.attackTimer <= 0) bullehShah.isAttacking = false;
    } else {
        bullehShah.x += ((henny.x - 30) - bullehShah.x) * 0.08;
        bullehShah.y += ((henny.y + 25) - bullehShah.y) * 0.08;
    }

    if (henny.isSlashing) {
        henny.slashTimer--;
        if (henny.slashTimer <= 0) henny.isSlashing = false;
    }

    spawnTimer++;
    if (!bossMode && score >= 1500) {
        bossMode = true;
        entities.push({ type: 'boss', x: 850, y: 80, width: 90, height: 90, health: 10, vy: 2 });
    }

    if (spawnTimer % 90 === 0 && !bossMode) {
        entities.push({ type: 'dragon', x: 820, y: Math.random() * 200 + 50, width: 45, height: 45, speed: Math.random() * 2 + 2 });
    }
    if (spawnTimer % 140 === 0) {
        const types = ['Classic', 'Cherry', 'Diet'];
        entities.push({ type: 'coke', x: Math.random() * 600 + 100, y: -20, width: 20, height: 35, flavor: types[Math.floor(Math.random() * types.length)] });
    }

    for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];

        if (ent.type === 'dragon') {
            ent.x -= ent.speed;
            ent.y += Math.sin(spawnTimer * 0.05) * 1.5;
            
            if (checkCollision(henny, ent)) {
                henny.health -= 15;
                spawnParticle(ent.x, ent.y, '#ff3333');
                entities.splice(i, 1);
                continue;
            }
        }
        
        if (ent.type === 'boss') {
            ent.x += (600 - ent.x) * 0.02;
            ent.y += ent.vy;
            if (ent.y < 30 || ent.y > 220) ent.vy *= -1;

            if (spawnTimer % 45 === 0) {
                entities.push({ type: 'fireball', x: ent.x, y: ent.y + 40, width: 15, height: 15, speed: 6 });
            }
        }

        if (ent.type === 'fireball') {
            ent.x -= ent.speed;
            if (checkCollision(henny, ent)) {
                henny.health -= 10;
                entities.splice(i, 1);
                continue;
            }
        }

        if (ent.type === 'coke') {
            ent.y += 3;
            if (checkCollision(henny, ent)) {
                henny.cokeMeter = Math.min(100, henny.cokeMeter + 20);
                henny.flavor = ent.flavor;
                henny.flavorTimer = 300;
                flavorBadge.innerText = `${ent.flavor} Coke: ${FLAVORS[ent.flavor].buff}`;
                flavorBadge.classList.remove('hidden');
                spawnParticle(ent.x, ent.y, FLAVORS[ent.flavor].color);
                entities.splice(i, 1);
                score += 50;
                continue;
            }
        }

        if (ent.type === 'dragon' || ent.type === 'boss') {
            let hit = false;
            let dmg = henny.flavor === 'Cherry' ? 2 : 1;

            if (henny.isSlashing && Math.abs((henny.x + 40) - ent.x) < 60 && Math.abs(henny.y - ent.y) < 50) {
                hit = true;
            }
            if (bullehShah.isAttacking && checkCollision(bullehShah, ent)) {
                hit = true;
                dmg = 2;
            }

            if (hit) {
                spawnParticle(ent.x, ent.y, '#F40009');
                if (ent.type === 'dragon') {
                    entities.splice(i, 1);
                    score += 100;
                } else {
                    ent.health -= dmg;
                    if (ent.health <= 0) {
                        entities.splice(i, 1);
                        score += 1000;
                        endGame(true);
                    }
                }
                continue;
            }
        }

        if (ent.x < -100 || ent.y > 450) {
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

// Rendering Engine
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Stylized Parallax Castle Backdrop
    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#140c1c'); 
    bgGrad.addColorStop(1, '#2c1635'); 
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#1c0f24';
ctx.fillRect(40, 100, 90, 260);
ctx.fillRect(70, 50, 30, 50);
ctx.fillRect(660, 80, 110, 280);
ctx.fillRect(700, 20, 30, 60);
ctx.fillStyle = 'rgba(255, 244, 220, 0.05)';
ctx.beginPath(); ctx.arc(400, 100, 60, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = 'rgba(255, 244, 220, 0.02)';
ctx.beginPath(); ctx.arc(400, 100, 85, 0, Math.PI * 2); ctx.fill();
// 2. Surface Floor
ctx.fillStyle = '#1f1326';
ctx.fillRect(0, 360, canvas.width, 40);
ctx.strokeStyle = '#F40009';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(0, 360);
ctx.lineTo(canvas.width, 360);
ctx.stroke();
// 3. Draw Bulleh Shah
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 10px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('BULLEH SHAH', bullehShah.x + (bullehShah.width / 2), bullehShah.y - 6);
ctx.fillStyle = '#ff9233';
ctx.fillRect(bullehShah.x, bullehShah.y + 6, bullehShah.width, bullehShah.height - 6);
ctx.fillStyle = '#e67300';
ctx.fillRect(bullehShah.x + 2, bullehShah.y, 6, 8);
ctx.fillRect(bullehShah.x + 16, bullehShah.y, 6, 8);
ctx.fillStyle = '#ff9233';
ctx.fillRect(bullehShah.x - 6, bullehShah.y + 12, 8, 5);
ctx.fillStyle = '#00ffcc';
ctx.fillRect(bullehShah.x + 18, bullehShah.y + 10, 4, 4);
if (bullehShah.isAttacking) {
ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
ctx.lineWidth = 3;
ctx.beginPath();
for (let o = -5; o <= 5; o += 5) {
ctx.moveTo(bullehShah.x + 20, bullehShah.y + 12 + o);
ctx.lineTo(bullehShah.x + 50, bullehShah.y + 5 + o);
}
ctx.stroke();
}
// 4. Draw Main Character Hero: Henny
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 12px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('HENNY', henny.x + (henny.width / 2), henny.y - 12);
ctx.fillStyle = '#ff6b8b';
ctx.fillRect(henny.x, henny.y + 15, henny.width, henny.height - 15);
ctx.fillStyle = '#ffd1dc';
ctx.fillRect(henny.x + 6, henny.y - 2, henny.width - 12, 18);
ctx.fillStyle = '#42210b';
ctx.fillRect(henny.x - 2, henny.y - 6, henny.width + 4, 10);
ctx.fillRect(henny.x - 3, henny.y, 6, 35);
ctx.fillRect(henny.x + henny.width - 3, henny.y, 6, 35);
if (henny.isSlashing) {
let bladeGrad = ctx.createLinearGradient(henny.x, henny.y, henny.x + 60, henny.y);
bladeGrad.addColorStop(0, '#ffffff');
bladeGrad.addColorStop(1, henny.flavor === 'Cherry' ? '#ff003c' : '#00bfff');
ctx.fillStyle = bladeGrad;
ctx.beginPath();
ctx.moveTo(henny.x + henny.width, henny.y + 15);
ctx.lineTo(henny.x + henny.width + 50, henny.y - 5);
ctx.lineTo(henny.x + henny.width + 40, henny.y + 35);
ctx.closePath();
ctx.fill();
} else {
ctx.fillStyle = '#8c92ac';
ctx.fillRect(henny.x - 6, henny.y + 10, 8, 25);
ctx.fillStyle = '#ffd700';
ctx.fillRect(henny.x - 8, henny.y + 30, 12, 4);
}
// 5. Draw Obstacles & Items
entities.forEach(ent => {
if (ent.type === 'dragon') {
ctx.fillStyle = '#990012';
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
ctx.fillStyle = '#ffea00';
ctx.fillRect(ent.x + 8, ent.y + 8, 5, 5);
ctx.fillStyle = '#ff2a4b';
let wingWave = Math.sin(spawnTimer * 0.2) * 15;
ctx.beginPath();
ctx.moveTo(ent.x + 20, ent.y + 15);
ctx.lineTo(ent.x + 5, ent.y - 15 + wingWave);
ctx.lineTo(ent.x + 35, ent.y + 5);
ctx.closePath();
ctx.fill();
}
if (ent.type === 'boss') {
ctx.fillStyle = '#3a0007';
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
ctx.fillStyle = '#ff0055';
ctx.fillRect(ent.x + 15, ent.y + 20, 12, 12);
ctx.fillStyle = '#7a0010';
let bossWing = Math.sin(spawnTimer * 0.1) * 30;
ctx.beginPath();
ctx.moveTo(ent.x + 40, ent.y + 40);
ctx.lineTo(ent.x + 10, ent.y - 30 + bossWing);
ctx.lineTo(ent.x + 70, ent.y + 20);
ctx.closePath();
ctx.fill();
ctx.fillStyle = 'rgba(0,0,0,0.5)';
ctx.fillRect(ent.x, ent.y - 20, ent.width, 8);
ctx.fillStyle = '#ff0055';
ctx.fillRect(ent.x, ent.y - 20, ent.width * (ent.health / 10), 8);
}
if (ent.type === 'fireball') {
let fireGrad = ctx.createRadialGradient(ent.x+7, ent.y+7, 2, ent.x+7, ent.y+7, 8);
fireGrad.addColorStop(0, '#ffffff');
fireGrad.addColorStop(0.4, '#ff9900');
fireGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
ctx.fillStyle = fireGrad;
ctx.beginPath(); ctx.arc(ent.x + 7, ent.y + 7, 10, 0, Math.PI*2); ctx.fill();
}
if (ent.type === 'coke') {
ctx.fillStyle = FLAVORS[ent.flavor].color;
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.moveTo(ent.x, ent.y + 16);
ctx.bezierCurveTo(ent.x + 6, ent.y + 12, ent.x + 14, ent.y + 22, ent.x + ent.width, ent.y + 18);
ctx.lineTo(ent.x + ent.width, ent.y + 21);
ctx.bezierCurveTo(ent.x + 14, ent.y + 25, ent.x + 6, ent.y + 15, ent.x, ent.y + 19);
ctx.closePath();
ctx.fill();
ctx.fillStyle = '#b0b7bd';
ctx.fillRect(ent.x + 2, ent.y - 2, ent.width - 4, 2);
}
});
// 6. Particles
particleSystem.forEach(p => {
ctx.fillStyle = p.color;
ctx.fillRect(p.x, p.y, 3, 3);
});
}
function gameLoop() {
update();
draw();
requestAnimationFrame(gameLoop);
}
setupTouchControls();
gameLoop();
