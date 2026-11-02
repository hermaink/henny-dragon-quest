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

// Hero State (Henny) with 3D Depth Properties
const henny = {
    x: 100, y: 300, z: 0, width: 40, height: 60,
    speed: 5, baseSpeed: 5,
    vy: 0, gravity: 0.6, jumpForce: -13, isJumping: false, groundY: 300,
    health: 100, cokeMeter: 0,
    isSlashing: false, slashTimer: 0,
    flavor: 'Classic', flavorTimer: 0
};

// Sidekick State (Bulleh Shah)
const bullehShah = {
    x: 50, y: 320, z: 5, width: 25, height: 25,
    isAttacking: false, attackTimer: 0, targetX: 0, targetY: 0
};

// Dynamic Game Objects
let entities = []; 
let particleSystem = [];
let spawnTimer = 0;
let bossMode = false;

// 3D Perspective Properties
const VANISHING_POINT_Y = 180; // Horizon height line

const FLAVORS = {
    'Classic': { color: '#F40009', buff: 'None' },
    'Cherry':  { color: '#800020', buff: 'Fire Slash (2x DMG)' },
    'Diet':    { color: '#b0b7bd', buff: 'Supersonic Speed' }
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
    screenDesc.innerText = victory ? `You defended the Coca-Cola Castle! Score: ${score}` : "The dragons overwhelmed Henny and Bulleh Shah.";
    startBtn.innerText = "PLAY AGAIN";
}

function update() {
    if (!gameActive) return;

    // Move logic
    henny.speed = henny.flavor === 'Diet' ? henny.baseSpeed * 1.8 : henny.baseSpeed;
    if (keys['ArrowLeft'] && henny.x > 0) henny.x -= henny.speed;
    if (keys['ArrowRight'] && henny.x < canvas.width - henny.width) henny.x += henny.speed;
    
    // Jump physics
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

    // Companion floating movement with fake Z tracking
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
    if (!bossMode && score >= 1500) {
        bossMode = true;
        // Spawn boss further back in 3D depth space (z = -30)
        entities.push({ type: 'boss', x: 850, y: 100, z: -30, width: 110, height: 110, health: 15, vy: 1.5 });
    }

    if (spawnTimer % 90 === 0 && !bossMode) {
        // Give dragons randomized Z-depth channels for overlapping 3D appearance
        let zPos = (Math.random() - 0.5) * 40; 
        entities.push({ type: 'dragon', x: 820, y: Math.random() * 120 + 60, z: zPos, width: 45, height: 45, speed: Math.random() * 2 + 2 });
    }
    if (spawnTimer % 140 === 0) {
        const types = ['Classic', 'Cherry', 'Diet'];
        entities.push({ type: 'coke', x: Math.random() * 600 + 100, y: -20, z: 0, width: 22, height: 36 });
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
            ent.x += (550 - ent.x) * 0.02;
            ent.y += ent.vy;
            if (ent.y < 40 || ent.y > 180) ent.vy *= -1;

            if (spawnTimer % 45 === 0) {
                entities.push({ type: 'fireball', x: ent.x, y: ent.y + 40, z: ent.z, width: 18, height: 18, speed: 6 });
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
            ent.y += 3.5;
            if (checkCollision(henny, ent)) {
                henny.cokeMeter = Math.min(100, henny.cokeMeter + 20);
                henny.flavor = ent.flavor || 'Classic';
                henny.flavorTimer = 300;
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
    // Basic structural tracking bounds
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

// Upgraded 3D Projective Rendering System Engine
function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);
// 1. Sky Horizon Atmospheric Engine
let skyGrad = ctx.createLinearGradient(0, 0, 0, VANISHING_POINT_Y);
skyGrad.addColorStop(0, '#090514');
skyGrad.addColorStop(1, '#231230');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, canvas.width, VANISHING_POINT_Y);
// 2. 3D Parallax Wall Panels / Castle Pillars
ctx.fillStyle = '#140c1c';
// Deep 3D perspective lines drawing the side towers
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(120, 40);
ctx.lineTo(120, VANISHING_POINT_Y);
ctx.lineTo(0, VANISHING_POINT_Y);
ctx.fill();
ctx.fillStyle = '#1a0f24';
ctx.fillRect(120, 30, 80, VANISHING_POINT_Y - 30);
ctx.fillStyle = '#0f0817';
ctx.fillRect(600, 20, 90, VANISHING_POINT_Y - 20);
// 3. True 3D Linear Perspective Floor Grid Mechanics
let floorGrad = ctx.createLinearGradient(0, VANISHING_POINT_Y, 0, canvas.height);
floorGrad.addColorStop(0, '#150d1a');
floorGrad.addColorStop(1, '#08040d');
ctx.fillStyle = floorGrad;
ctx.fillRect(0, VANISHING_POINT_Y, canvas.width, canvas.height - VANISHING_POINT_Y);
// Draw Vanishing Perspective Floor Grid Lines
ctx.strokeStyle = 'rgba(244, 0, 9, 0.25)'; // Crimson laser neon grid look
ctx.lineWidth = 2;
const TOTAL_GRID_LINES = 12;
for (let i = 0; i <= TOTAL_GRID_LINES; i++) {
let xFloorEdge = (canvas.width / TOTAL_GRID_LINES) * i;
ctx.beginPath();
ctx.moveTo(400, VANISHING_POINT_Y); // Converge lines at central horizon point
ctx.lineTo(xFloorEdge, canvas.height);
ctx.stroke();
}
// Horizontal Depth Grid Steps (closer = spaced further apart)
ctx.strokeStyle = 'rgba(244, 0, 9, 0.15)';
for (let j = 0; j < 6; j++) {
let horizontalY = VANISHING_POINT_Y + Math.pow(j / 5, 2) * (canvas.height - VANISHING_POINT_Y);
ctx.beginPath();
ctx.moveTo(0, horizontalY);
ctx.lineTo(canvas.width, horizontalY);
ctx.stroke();
}
// Ground Separation Line
ctx.strokeStyle = '#F40009';
ctx.lineWidth = 3;
ctx.beginPath(); ctx.moveTo(0, 360); ctx.lineTo(canvas.width, 360); ctx.stroke();
// 4. Object 3D Scaling Helper Function
function get3DScale(z) {
// Calculate factor where objects shrink as Z gets more negative (further back)
return 1 / (1 + (z * 0.008));
}
// --- RENDER CHARACTERS & SHADOWS WITH DEPTH LAYER SCALES ---
// 3D Drop Shadows on Ground Grid
ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
ctx.beginPath();
ctx.ellipse(henny.x + 20, 362, 22, 6, 0, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.ellipse(bullehShah.x + 12, 362, 14, 4, 0, 0, Math.PI * 2);
ctx.fill();
// Draw Sidekick: Bulleh Shah
let catScale = get3DScale(bullehShah.z);
ctx.save();
ctx.translate(bullehShah.x, bullehShah.y);
ctx.scale(catScale, catScale);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 10px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('BULLEH SHAH', bullehShah.width / 2, -6);
// Render Body with fake 3D volume gradient shading
let catGrad = ctx.createLinearGradient(0, 0, bullehShah.width, 0);
catGrad.addColorStop(0, '#ff9233');
catGrad.addColorStop(1, '#cc6600');
ctx.fillStyle = catGrad;
ctx.fillRect(0, 6, bullehShah.width, bullehShah.height - 6);
ctx.fillStyle = '#e67300';
ctx.fillRect(2, 0, 6, 8); ctx.fillRect(16, 0, 6, 8); // Ears
ctx.fillStyle = '#ff9233'; ctx.fillRect(-6, 12, 8, 5); // Tail
ctx.fillStyle = '#00ffcc'; ctx.fillRect(18, 10, 4, 4); // Eyes
if (bullehShah.isAttacking) {
ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
ctx.lineWidth = 3;
ctx.beginPath();
for (let o = -5; o <= 5; o += 5) {
ctx.moveTo(20, 12 + o); ctx.lineTo(50, 5 + o);
}
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
// Layered Tunic with depth shadows
let dressGrad = ctx.createLinearGradient(0, 0, 0, henny.height);
dressGrad.addColorStop(0, '#ff6b8b');
dressGrad.addColorStop(1, '#b32d4a');
ctx.fillStyle = dressGrad;
ctx.fillRect(0, 15, henny.width, henny.height - 15);
// Head & Skin
ctx.fillStyle = '#ffd1dc'; ctx.fillRect(6, -2, henny.width - 12, 18);
// 3D Overlapping Hair Layering
ctx.fillStyle = '#301808'; // Darker background hair depth
ctx.fillRect(-3, 0, 6, 35); ctx.fillRect(henny.width - 3, 0, 6, 35);
ctx.fillStyle = '#42210b'; // Main front locks
ctx.fillRect(-2, -6, henny.width + 4, 10);
// Neon 3D Blade Attack Overlay
if (henny.isSlashing) {
let bladeGrad = ctx.createLinearGradient(henny.width, 15, henny.width + 50, 15);
bladeGrad.addColorStop(0, '#ffffff');
bladeGrad.addColorStop(1, henny.flavor === 'Cherry' ? '#ff003c' : '#00bfff');
ctx.fillStyle = bladeGrad;
ctx.beginPath();
ctx.moveTo(henny.width, 15);
ctx.lineTo(henny.width + 55, -8);
ctx.lineTo(henny.width + 45, 38);
ctx.closePath();
ctx.fill();
} else {
ctx.fillStyle = '#8c92ac'; ctx.fillRect(-6, 10, 8, 25);
ctx.fillStyle = '#ffd700'; ctx.fillRect(-8, 30, 12, 4);
}
ctx.restore();
// 5. Draw Dynamic Obstacles & Items with Active 3D Scale Scaling Matrix
entities.forEach(ent => {
let zScale = get3DScale(ent.z || 0);
ctx.save();
ctx.translate(ent.x, ent.y);
ctx.scale(zScale, zScale);
// Shadows beneath dragons/items
ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
ctx.fillRect(0, 360 - ent.y, ent.width, 5);
if (ent.type === 'dragon') {
// Textured shaded dragon body volume
let dragGrad = ctx.createLinearGradient(0, 0, ent.width, ent.height);
dragGrad.addColorStop(0, '#bd0921');
dragGrad.addColorStop(1, '#4f020b');
ctx.fillStyle = dragGrad;
ctx.fillRect(0, 0, ent.width, ent.height);
ctx.fillStyle = '#ffea00'; ctx.fillRect(8, 8, 5, 5); // Eye
// Flapping 3D layered wings
ctx.fillStyle = '#ff2a4b';
let wingWave = Math.sin(spawnTimer * 0.2) * 15;
ctx.beginPath();
ctx.moveTo(20, 15);
ctx.lineTo(5, -15 + wingWave);
ctx.lineTo(35, 5);
ctx.closePath(); ctx.fill();
}
if (ent.type === 'boss') {
let bossGrad = ctx.createLinearGradient(0, 0, 0, ent.height);
bossGrad.addColorStop(0, '#4a050f');
bossGrad.addColorStop(1, '#170003');
ctx.fillStyle = bossGrad;
ctx.fillRect(0, 0, ent.width, ent.height);
ctx.fillStyle = '#ff0055'; ctx.fillRect(15, 20, 12, 12); // Giant Eye
// Massive wings
ctx.fillStyle = '#7a0010';
let bossWing = Math.sin(spawnTimer * 0.1) * 30;
ctx.beginPath();
ctx.moveTo(40, 40); ctx.lineTo(10, -30 + bossWing); ctx.lineTo(70, 20);
ctx.closePath(); ctx.fill();
// Boss Health Overlay
ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, -20, ent.width, 8);
ctx.fillStyle = '#ff0055'; ctx.fillRect(0, -20, ent.width * (ent.health / 15), 8);
}
if (ent.type === 'fireball') {
let fireGrad = ctx.createRadialGradient(7, 7, 2, 7, 7, 10);
fireGrad.addColorStop(0, '#ffffff');
fireGrad.addColorStop(0.3, '#ffcc00');
fireGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
ctx.fillStyle = fireGrad;
ctx.beginPath(); ctx.arc(7, 7, 12, 0, Math.PI*2); ctx.fill();
}
if (ent.type === 'coke') {
let cokeColor = '#F40009';
ctx.fillStyle = cokeColor;
ctx.fillRect(0, 0, ent.width, ent.height);
// White Swoosh wave detail
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.moveTo(0, 16);
ctx.bezierCurveTo(6, 12, 14, 22, ent.width, 18);
ctx.lineTo(ent.width, 21);
ctx.bezierCurveTo(14, 25, 6, 15, 0, 19);
ctx.closePath(); ctx.fill();
// Silver metallic can lip reflection
ctx.fillStyle = '#b0b7bd'; ctx.fillRect(2, -2, ent.width - 4, 2);
}
ctx.restore();
});
// 6. 3D Particles bloom explosion
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
