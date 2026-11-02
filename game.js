const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// Hero State (Henny)
const henny = {
    x: 100, y: 300, width: 40, height: 60,
    speed: 5, baseSpeed: 5,
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
    'Diet':    { color: '# silver', buff: 'Supersonic Speed Boost' }
};

// Mobile Input Binding Engine
function setupTouchControls() {
    const bindTouch = (id, keyName) => {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
    };
    bindTouch('btn-left', 'ArrowLeft');
    bindTouch('btn-right', 'ArrowRight');
    
    document.getElementById('btn-slash').addEventListener('touchstart', (e) => { e.preventDefault(); triggerSlash(); });
    document.getElementById('btn-claw').addEventListener('touchstart', (e) => { e.preventDefault(); triggerClaw(); });
}

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
startBtn.addEventListener('click', initGame);

function triggerSlash() {
    if (!henny.isSlashing) {
        henny.isSlashing = true;
        henny.slashTimer = 10;
    }
}

function triggerClaw() {
    if (!bullehShah.isAttacking) {
        bullehShah.isAttacking = true;
        bullehShah.attackTimer = 25;
        // Search for nearest enemy target direction
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

// core game tick mechanics
function update() {
    if (!gameActive) return;

    // Movement updates
    henny.speed = henny.flavor === 'Diet' ? henny.baseSpeed * 1.8 : henny.baseSpeed;
    if (keys['ArrowLeft'] && henny.x > 0) henny.x -= henny.speed;
    if (keys['ArrowRight'] && henny.x < canvas.width - henny.width) henny.x += henny.speed;
    if (keys[' '] || keys['f']) triggerSlash();
    if (keys['c'] || keys['e']) triggerClaw();

    // Power-up countdown systems
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
        // Natural lagging tether tracking back to Henny
        bullehShah.x += ((henny.x - 30) - bullehShah.x) * 0.08;
        bullehShah.y += ((henny.y + 25) - bullehShah.y) * 0.08;
    }

    if (henny.isSlashing) {
        henny.slashTimer--;
        if (henny.slashTimer <= 0) henny.isSlashing = false;
    }

    // Engine spawning orchestrator
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

    // Entity simulation loop
    entities.forEach((ent, i) => {
        if (ent.type === 'dragon') {
            ent.x -= ent.speed;
            // Hover logic simulation
            ent.y += Math.sin(spawnTimer * 0.05) * 1.5;
            
            // Interaction Check against Player
            if (checkCollision(henny, ent)) {
                henny.health -= 15;
                spawnParticle(ent.x, ent.y, '#ff3333');
                entities.splice(i, 1);
            }
        }
        
        if (ent.type === 'boss') {
            ent.x += (600 - ent.x) * 0.02;
            ent.y += ent.vy;
            if (ent.y < 30 || ent.y > 220) ent.vy *= -1;

            // Attack projectile generator
            if (spawnTimer % 45 === 0) {
                entities.push({ type: 'fireball', x: ent.x, y: ent.y + 40, width: 15, height: 15, speed: 6 });
            }
        }

        if (ent.type === 'fireball') {
            ent.x -= ent.speed;
            if (checkCollision(henny, ent)) {
                henny.health -= 10;
                entities.splice(i, 1);
            }
        }

        if (ent.type === 'coke') {
            ent.y += 3; // Fall mechanics
            if (checkCollision(henny, ent)) {
                henny.cokeMeter = Math.min(100, henny.cokeMeter + 20);
                henny.flavor = ent.flavor;
                henny.flavorTimer = 300; // 5 seconds uptime
                flavorBadge.innerText = `${ent.flavor} Coke Active!`;
                flavorBadge.classList.remove('hidden');
                spawnParticle(ent.x, ent.y, FLAVORS[ent.flavor].color);
                entities.splice(i, 1);
                score += 50;
            }
        }

        // Combat Hitboxes Verification
        if (ent.type === 'dragon' || ent.type === 'boss') {
            let hit = false;
            let dmg = henny.flavor === 'Cherry' ? 2 : 1;

            // 1. Check Henny Slashes
            if (henny.isSlashing && Math.abs((henny.x + 40) - ent.x) < 60 && Math.abs(henny.y - ent.y) < 50) {
                hit = true;
            }
            // 2. Check Bulleh Shah Attacks
            if (bullehShah.isAttacking && checkCollision(bullehShah, ent)) {
                hit = true;
                dmg = 2; // Cat Claws pierce heavily
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
            }
        }

        // Cleanup offscreen boundaries
        if (ent.x < -100 || ent.y > 450) entities.splice(i, 1);
    });

    // Particle pipeline resolution
    particleSystem.forEach((p, idx) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particleSystem.splice(idx, 1);
    });

    // Death monitoring conditions
    if (henny.health <= 0) endGame(false);

    // Sync state metrics to UI
    healthDisplay.innerText = Math.max(0, henny.health);
    cokeDisplay.innerText = henny.cokeMeter;
    scoreDisplay.innerText = score;
}

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

// Rendering canvas scene operations
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Castles / Parallax Backdrop
    ctx.fillStyle = '#221e22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw simple silhouettes of castle spires
    ctx.fillStyle = '#181518';
    ctx.fillRect(50, 120, 80, 280); ctx.fillRect(40, 80, 30, 60);
    ctx.fillRect(680, 100, 100, 300);

    // 2. Draw Floor Surface
    ctx.fillStyle = '#343038';
    ctx.fillRect(0, 360, canvas.width, 40);

    // 3. Draw Sidekick: Bulleh Shah
    ctx.fillStyle = '#FFA500'; // Orange tabby cat color
    ctx.fillRect(bullehShah.x, bullehShah.y, bullehShah.width, bullehShah.height);
    ctx.fillStyle = '#fff'; // Glowing eyes
ctx.fillRect(bullehShah.x + (bullehShah.isAttacking ? 18 : 12), bullehShah.y + 4, 4, 4);
if (bullehShah.isAttacking) {
ctx.strokeStyle = '#fff';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(bullehShah.x, bullehShah.y);
ctx.lineTo(bullehShah.x + 35, bullehShah.y + 10);
ctx.stroke();
}
// 4. Draw Main Character Hero: Henny
ctx.fillStyle = '#ffc0cb'; // Pink tunic attire design
ctx.fillRect(henny.x, henny.y, henny.width, henny.height);
// Hair
ctx.fillStyle = '#4a2c11';
ctx.fillRect(henny.x - 2, henny.y, henny.width + 4, 15);
// Draw Henny's Sword Slashes
if (henny.isSlashing) {
ctx.fillStyle = henny.flavor === 'Cherry' ? '#ff3300' : '#e0e0e0';
ctx.fillRect(henny.x + henny.width, henny.y + 15, 35, 12);
} else {
// Holstered idle position weapon look
ctx.fillStyle = '#888';
ctx.fillRect(henny.x + henny.width - 5, henny.y + 25, 6, 20);
}
// 5. Draw Active Adversaries and Buff Drop Objects
entities.forEach(ent => {
if (ent.type === 'dragon') {
ctx.fillStyle = '#4A0E17'; // Crimson dragon skin tone
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
// Flapping wing visual element trace
ctx.fillStyle = '#a61c32';
ctx.fillRect(ent.x + 10, ent.y - 10 + Math.sin(spawnTimer * 0.2)*10, 20, 20);
}
if (ent.type === 'boss') {
ctx.fillStyle = '#220005';
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
// Boss details
ctx.fillStyle = '#ff0000';
ctx.fillRect(ent.x + 15, ent.y + 20, 15, 15); // Eyes
// Health overlay bar tracking
ctx.fillStyle = '#ff0000';
ctx.fillRect(ent.x, ent.y - 15, ent.width * (ent.health / 10), 8);
}
if (ent.type === 'fireball') {
ctx.fillStyle = '#ff6600';
ctx.beginPath(); ctx.arc(ent.x + 7, ent.y + 7, 8, 0, Math.PI*2); ctx.fill();
}
if (ent.type === 'coke') {
// Draw branded can profiles
ctx.fillStyle = FLAVORS[ent.flavor].color;
ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
// Label stripe design line accentuation
ctx.fillStyle = '#fff';
ctx.fillRect(ent.x, ent.y + 12, ent.width, 4);
}
});
// 6. Draw Explosion System Particles
particleSystem.forEach(p => {
ctx.fillStyle = p.color;
ctx.fillRect(p.x, p.y, 4, 4);
});
}
// Master Loop Integration
function gameLoop() {
update();
draw();
requestAnimationFrame(gameLoop);
}
setupTouchControls();
gameLoop();