// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 15;

// --- 2. KONFIGURASI PARTIKEL ---
const particleCount = 50000; 
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3); 
const colors = new Float32Array(particleCount * 3);

const saturnPositions = new Float32Array(particleCount * 3);
const eiffelPositions = new Float32Array(particleCount * 3);
const supernovaPositions = new Float32Array(particleCount * 3);

let currentMorphTarget = saturnPositions; 
let morphSpeed = 0.08;

// --- 3. GENERATE SHAPES ---

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
        const dist = 3.5 + Math.random() * 3;
        sx = Math.cos(angle) * dist;
        sy = (Math.random() - 0.5) * 0.2;
        sz = Math.sin(angle) * dist;
    }
    saturnPositions[i * 3] = sx;
    saturnPositions[i * 3 + 1] = sy;
    saturnPositions[i * 3 + 2] = sz;

    // B. EIFFEL
    const h = 12;
    const ey = (Math.random() * h) - h/2;
    const normY = (ey + h/2) / h;
    const w = 4 * Math.pow(1 - normY, 2) + 0.2;
    eiffelPositions[i * 3] = (Math.random() - 0.5) * w;
    eiffelPositions[i * 3 + 1] = ey;
    eiffelPositions[i * 3 + 2] = (Math.random() - 0.5) * w;

    // C. SUPERNOVA (Ledakan ke segala arah)
    const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
    ).normalize();
    const explosionDist = 15 + Math.random() * 20; // Partikel terpental jauh
    supernovaPositions[i * 3] = direction.x * explosionDist;
    supernovaPositions[i * 3 + 1] = direction.y * explosionDist;
    supernovaPositions[i * 3 + 2] = direction.z * explosionDist;

    // Setup Awal
    positions[i * 3] = sx;
    positions[i * 3 + 1] = sy;
    positions[i * 3 + 2] = sz;
    
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.2 + 0.05, 0.8, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
const particlePoints = new THREE.Points(geometry, material);
scene.add(particlePoints);

// --- 4. HAND TRACKING ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Ikuti Tangan
        const tx = (landmarks[9].x - 0.5) * -30;
        const ty = (landmarks[9].y - 0.5) * -20;
        particlePoints.position.x = THREE.MathUtils.lerp(particlePoints.position.x, tx, 0.1);
        particlePoints.position.y = THREE.MathUtils.lerp(particlePoints.position.y, ty, 0.1);

        // DETEKSI JARI
        const isIndexUp = landmarks[8].y < landmarks[6].y - 0.1;
        const isMiddleUp = landmarks[12].y < landmarks[10].y - 0.1;

        if (isMiddleUp) {
            // JARI TENGAH -> SUPERNOVA
            currentMorphTarget = supernovaPositions;
            morphSpeed = 0.15; // Ledakan lebih cepat
        } else if (isIndexUp) {
            // JARI TELUNJUK -> EIFFEL
            currentMorphTarget = eiffelPositions;
            morphSpeed = 0.08;
        } else {
            // DEFAULT -> SATURNUS
            currentMorphTarget = saturnPositions;
            morphSpeed = 0.08;
        }
    }
});

const cameraControl = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraControl.start();

// --- 5. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const posAttr = geometry.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        posAttr.array[idx] += (currentMorphTarget[idx] - posAttr.array[idx]) * morphSpeed;
        posAttr.array[idx+1] += (currentMorphTarget[idx+1] - posAttr.array[idx+1]) * morphSpeed;
        posAttr.array[idx+2] += (currentMorphTarget[idx+2] - posAttr.array[idx+2]) * morphSpeed;
    }
    
    posAttr.needsUpdate = true;
    if (currentMorphTarget !== supernovaPositions) {
        particlePoints.rotation.y += 0.003;
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
