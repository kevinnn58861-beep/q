// --- 1. INITIAL SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 15;

// --- 2. PARTICLE ENGINE ---
const particleCount = 50000; 
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3); 
const colors = new Float32Array(particleCount * 3);

const saturnPos = new Float32Array(particleCount * 3);
const eiffelPos = new Float32Array(particleCount * 3);
const supernovaPos = new Float32Array(particleCount * 3);

let currentTarget = saturnPos;
let morphSpeed = 0.08;
let targetColor = new THREE.Color(0xffd700);

// --- 3. SHAPE GENERATOR ---
for (let i = 0; i < particleCount; i++) {
    // A. SATURNUS
    let sx, sy, sz;
    if (i < particleCount * 0.45) {
        const phi = Math.acos(-1 + (2 * i) / (particleCount * 0.45));
        const theta = Math.sqrt(particleCount * 0.45 * Math.PI) * phi;
        sx = 2.5 * Math.cos(theta) * Math.sin(phi);
        sy = 2.5 * Math.sin(theta) * Math.sin(phi);
        sz = 2.5 * Math.cos(phi);
    } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 3.8 + Math.random() * 2.5;
        sx = Math.cos(angle) * dist;
        sy = (Math.random() - 0.5) * 0.2;
        sz = Math.sin(angle) * dist;
    }
    saturnPos[i * 3] = sx;
    saturnPos[i * 3 + 1] = sy;
    saturnPos[i * 3 + 2] = sz;

    // B. EIFFEL
    const h = 12;
    const ey = (Math.random() * h) - h/2;
    const normY = (ey + h/2) / h;
    const w = 3.5 * Math.pow(1 - normY, 2) + 0.15;
    eiffelPos[i * 3] = (Math.random() - 0.5) * w;
    eiffelPos[i * 3 + 1] = ey;
    eiffelPos[i * 3 + 2] = (Math.random() - 0.5) * w;

    // C. SUPERNOVA
    const dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
    const burst = 18 + Math.random() * 25;
    supernovaPos[i * 3] = dir.x * burst;
    supernovaPos[i * 3 + 1] = dir.y * burst;
    supernovaPos[i * 3 + 2] = dir.z * burst;

    // Initial State
    positions[i * 3] = sx;
    positions[i * 3 + 1] = sy;
    positions[i * 3 + 2] = sz;

    const col = new THREE.Color();
    col.setHSL(0.1, 0.7, 0.5);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({ 
    size: 0.018, 
    vertexColors: true, 
    transparent: true, 
    opacity: 0.8, 
    blending: THREE.AdditiveBlending 
});
const points = new THREE.Points(geometry, material);
scene.add(points);

// --- 4. MEDIA PIPE HANDS ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((res) => {
    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        const pts = res.multiHandLandmarks[0];

        // Move following palm
        points.position.x = THREE.MathUtils.lerp(points.position.x, (pts[9].x - 0.5) * -30, 0.1);
        points.position.y = THREE.MathUtils.lerp(points.position.y, (pts[9].y - 0.5) * -20, 0.1);

        // Gesture Logic
        const indexUp = pts[8].y < pts[6].y - 0.08;
        const middleUp = pts[12].y < pts[10].y - 0.08;

        if (indexUp && middleUp) {
            currentTarget = supernovaPos;
            morphSpeed = 0.2;
            targetColor.setHex(0xff4500); // Supernova Red
        } else if (indexUp) {
            currentTarget = eiffelPos;
            morphSpeed = 0.08;
            targetColor.setHex(0xffffff); // Eiffel White
        } else {
            currentTarget = saturnPos;
            morphSpeed = 0.08;
            targetColor.setHex(0xffd700); // Saturn Gold
        }

        // Scale Logic (Thumb to Ring Finger)
        const sDist = Math.hypot(pts[4].x - pts[16].x, pts[4].y - pts[16].y);
        points.scale.lerp(new THREE.Vector3().setScalar(sDist < 0.08 ? 2.5 : 1.0), 0.1);
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraUtils.start();

// --- 5. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos.array[idx] += (currentTarget[idx] - pos.array[idx]) * morphSpeed;
        pos.array[idx+1] += (currentTarget[idx+1] - pos.array[idx+1]) * morphSpeed;
        pos.array[idx+2] += (currentTarget[idx+2] - pos.array[idx+2]) * morphSpeed;
    }
    
    pos.needsUpdate = true;
    material.color.lerp(targetColor, 0.1);
    
    if (currentTarget === supernovaPos) {
        points.rotation.y += 0.05;
    } else {
        points.rotation.y += 0.003;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
