const CANVAS_BACKGROUND_COLOR = '#000000';
const ENABLE_DPR_SCALING = true;
const SNOWFLAKE_IMAGE_SRC = 'snowflake.png';
const SNOWFLAKE_CONFIG = {
    DISTANCE_MIN: 20,
    DISTANCE_MAX: 300,
    SIZE_MIN: 0.0005,
    SIZE_MAX: 0.9,
    SPEED_MIN: 0.1,
    SPEED_MAX: 400.0,
    SPIN_SPEED_MIN: 0.5,
    SPIN_SPEED_MAX: 5.0,
    INITIAL_SPAWN_PROBABILITY: 0.1,
    SPAWN_RATE: 0.02,
    MAX_SNOWFLAKES: 5000,
    SNOWFLAKE_OPACITY: 0.8,
    DESPAWN_MARGIN: 1000,
    DISTANCE_SKEW_FACTOR: 350.0
};
const NOISE_CONFIG = {
    NOISE_INCREMENT: 1,
    NOISE_SCALE: 0.005
};
const ANGLE_MIN = -25;
const ANGLE_MAX = 25;

const canvas = document.getElementById('snowCanvas');
const ctx = canvas.getContext('2d');

class PerlinNoise {
    constructor() {
        this.p = new Array(512);
        this.permutation = [
            151,160,137,91,90,15,
            131,13,201,95,96,53,194,233,7,225,140,36,103,30,
            69,142,8,99,37,240,21,10,23,
            190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
            35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,
            168, 68,175,74,165,71,134,139,48,27,166,
            77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
            55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,
            209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,
            164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,
            38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,
            182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163, 70,
            221,153,101,155,167, 43,172,9,
            129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,
            218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
            81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,
            184,84,204,176,115,121,50,45,127, 4,150,254,138,236,205,93,
            222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        ];
        for (let i = 0; i < 256; i++) {
            this.p[256 + i] = this.p[i] = this.permutation[i];
        }
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    noise(x, y = 0, z = 0) {
        const floorX = Math.floor(x) & 255;
        const floorY = Math.floor(y) & 255;
        const floorZ = Math.floor(z) & 255;
        const X = x - Math.floor(x);
        const Y = y - Math.floor(y);
        const Z = z - Math.floor(z);
        const u = this.fade(X);
        const v = this.fade(Y);
        const w = this.fade(Z);
        const A = this.p[floorX] + floorY;
        const AA = this.p[A] + floorZ;
        const AB = this.p[A + 1] + floorZ;
        const B = this.p[floorX + 1] + floorY;
        const BA = this.p[B] + floorZ;
        const BB = this.p[B + 1] + floorZ;
        return this.lerp(w, 
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA], X, Y, Z),
                            this.grad(this.p[BA], X - 1, Y, Z)),
                this.lerp(u, this.grad(this.p[AB], X, Y - 1, Z),
                            this.grad(this.p[BB], X - 1, Y - 1, Z))
            ),
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA + 1], X, Y, Z - 1),
                            this.grad(this.p[BA + 1], X - 1, Y, Z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], X, Y - 1, Z - 1),
                            this.grad(this.p[BB + 1], X - 1, Y - 1, Z - 1))
            )
        );
    }
}

const perlin = new PerlinNoise();
let noiseOffset = 0;
const noiseIncrement = NOISE_CONFIG.NOISE_INCREMENT;

function setCanvasSize() {
    if (ENABLE_DPR_SCALING) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    console.log("Canvas size set to:", canvas.width, canvas.height);
}

setCanvasSize();

window.addEventListener('resize', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setCanvasSize();
});

const snowflakeImg = new Image();
snowflakeImg.src = SNOWFLAKE_IMAGE_SRC;
snowflakeImg.onload = () => {
    console.log("Snowflake image loaded successfully.");
    init();
    initAudio();
};

function initAudio() {
    const backgroundAudio = new Audio('WindLoopingSoundEffect.mp3');
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.5;
    const startAudio = () => {
        backgroundAudio.play().then(() => {
            console.log("Audio playback started.");
        }).catch(error => {
            console.error("Error playing audio:", error);
        });
        window.removeEventListener('click', startAudio);
    };
    window.addEventListener('click', startAudio);
}

class Snowflake {
    constructor(spawnAnywhere = false) {
        this.reset(spawnAnywhere);
    }
    reset(spawnAnywhere = false) {
        this.distance = this.sampleDistance();
        this.size = SNOWFLAKE_CONFIG.SIZE_MIN + 
                    ((SNOWFLAKE_CONFIG.SIZE_MAX - SNOWFLAKE_CONFIG.SIZE_MIN) * 
                    (SNOWFLAKE_CONFIG.DISTANCE_MAX - this.distance)) / 
                    (SNOWFLAKE_CONFIG.DISTANCE_MAX - SNOWFLAKE_CONFIG.DISTANCE_MIN);
        this.speed = SNOWFLAKE_CONFIG.SPEED_MIN + 
                     ((SNOWFLAKE_CONFIG.SPEED_MAX - SNOWFLAKE_CONFIG.SPEED_MIN) * 
                     (SNOWFLAKE_CONFIG.DISTANCE_MAX - this.distance)) / 
                     (SNOWFLAKE_CONFIG.DISTANCE_MAX - SNOWFLAKE_CONFIG.DISTANCE_MIN);
        this.spinSpeed = SNOWFLAKE_CONFIG.SPIN_SPEED_MIN + 
                         ((SNOWFLAKE_CONFIG.SPIN_SPEED_MAX - SNOWFLAKE_CONFIG.SPIN_SPEED_MIN) * 
                         (SNOWFLAKE_CONFIG.DISTANCE_MAX - this.distance)) / 
                         (SNOWFLAKE_CONFIG.DISTANCE_MAX - SNOWFLAKE_CONFIG.DISTANCE_MIN);
        if (spawnAnywhere) {
            this.x = Math.random() * (canvas.width / (window.devicePixelRatio || 1));
            this.y = Math.random() * (canvas.height / (window.devicePixelRatio || 1));
        } else {
            this.spawnEdge = this.determineSpawnEdge();
            this.setInitialPosition();
        }
        this.rotation = Math.random() * 360;
    }
    sampleDistance() {
        const skew = SNOWFLAKE_CONFIG.DISTANCE_SKEW_FACTOR;
        const u = Math.random();
        const biasedU = Math.pow(u, 1 / skew);
        return SNOWFLAKE_CONFIG.DISTANCE_MIN + biasedU * (SNOWFLAKE_CONFIG.DISTANCE_MAX - SNOWFLAKE_CONFIG.DISTANCE_MIN);
    }
    determineSpawnEdge() {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        const totalWeight = canvasWidth + 2 * canvasHeight;
        const rand = Math.random();
        if (rand < canvasWidth / totalWeight) return 0;
        else if (rand < (canvasWidth + canvasHeight) / totalWeight) return 1;
        else return 2;
    }
    setInitialPosition() {
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        if (this.spawnEdge === 0) {
            this.x = Math.random() * canvasWidth;
            this.y = Math.random() * -canvasHeight / 2;
        } else if (this.spawnEdge === 1) {
            this.x = Math.random() * -canvasWidth / 2;
            this.y = Math.random() * canvasHeight;
        } else {
            this.x = canvasWidth + Math.random() * canvasWidth / 2;
            this.y = Math.random() * canvasHeight;
        }
    }
    update(deltaTime, angle) {
        this.x += Math.sin(angle) * this.speed * deltaTime;
        this.y += Math.cos(angle) * this.speed * deltaTime;
        this.rotation += this.spinSpeed * deltaTime;
        if (this.y > canvas.height + SNOWFLAKE_CONFIG.DESPAWN_MARGIN || 
            this.x < -SNOWFLAKE_CONFIG.DESPAWN_MARGIN || 
            this.x > canvas.width + SNOWFLAKE_CONFIG.DESPAWN_MARGIN) {
            this.reset(false);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = SNOWFLAKE_CONFIG.SNOWFLAKE_OPACITY;
        const imgWidth = snowflakeImg.width * this.size;
        const imgHeight = snowflakeImg.height * this.size;
        ctx.drawImage(snowflakeImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.restore();
    }
}

let snowflakes = [];
let lastTime = 0;
let globalAngle = 0;

function init() {
    snowflakes = [];
    for (let i = 0; i < SNOWFLAKE_CONFIG.MAX_SNOWFLAKES; i++) {
        if (Math.random() < SNOWFLAKE_CONFIG.INITIAL_SPAWN_PROBABILITY) {
            snowflakes.push(new Snowflake(true));
        }
    }
    lastTime = performance.now();
    requestAnimationFrame(animate);
}

function animate(timestamp) {
    const deltaTime = (timestamp - lastTime) / 16.666;
    lastTime = timestamp;
    noiseOffset += noiseIncrement;
    const noiseValue = perlin.noise(noiseOffset * NOISE_CONFIG.NOISE_SCALE);
    globalAngle = degreesToRadians(map(noiseValue, 0, 1, ANGLE_MIN, ANGLE_MAX));
    ctx.fillStyle = CANVAS_BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    snowflakes.forEach(snowflake => {
        snowflake.update(deltaTime, globalAngle);
        snowflake.draw(ctx);
    });
    if (snowflakes.length < SNOWFLAKE_CONFIG.MAX_SNOWFLAKES) {
        if (Math.random() < SNOWFLAKE_CONFIG.SPAWN_RATE) {
            snowflakes.push(new Snowflake());
        }
    }
    requestAnimationFrame(animate);
}

function map(value, in_min, in_max, out_min, out_max) {
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}