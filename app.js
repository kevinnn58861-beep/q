// --- 1. SETUP SCENE ---
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
const earthPos = new Float32Array(particleCount * 3);
const earthColors = new Float32Array(particleCount * 3); // Warna khusus Bumi

let currentTarget = saturnPos;
let morphSpeed = 0.08;
let targetColor = new THREE.Color(0xffd700);
let isEarthMode = false;

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

    // C. BUMI (Planet Bola dengan pola warna daratan/laut)
    const phiE = Math.acos(-1 + (2 * i) / particleCount);
    const thetaE = Math.sqrt(particleCount * Math.PI) * phiE;
    const rE = 4.0; // Ukuran Bumi sedikit lebih besar
    earthPos[i * 3] = rE * Math.cos(thetaE) * Math.sin(phiE);
    earthPos[i * 3 + 1] = rE * Math.sin(thetaE) * Math.sin(phiE);
    earthPos[i * 3 + 2] = rE * Math.cos(phiE);

    // Warna Bumi (Logika sederhana untuk daratan hijau & laut biru)
    const noise = Math.sin(thetaE * 5) * Math.cos(phiE * 5);
    const earthCol = new THREE.Color();
    if (noise > 0.1) {
        earthCol.setHex(0x228b22); // Hijau (Forest)
    } else {
        earthCol.setHex(0x0000ff); // Biru (Ocean)
    }
    earthColors[i * 3] = earthCol.r;
    earthColors[i * 3 + 1] = earthCol.g;
    earthColors[i * 3 + 2] = earthCol.b;

    // Initial State (Saturnus)
    positions[i * 3] = sx;
    positions[i * 3 + 1] = sy;
    positions[i * 3 + 2] = sz;
    colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.84; colors[i * 3 + 2] = 0;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0.9 });
const points = new THREE.Points(geometry, material);
scene.add(points);

// --- 4. MEDIA PIPE HANDS ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((res) => {
    if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
        const pts = res.multiHandLandmarks[0];

        points.position.x = THREE.MathUtils.lerp(points.position.x, (pts[9].x - 0.5) * -30, 0.1);
        points.position.y = THREE.MathUtils.lerp(points.position.y, (pts[9].y - 0.5) * -20, 0.1);

        const indexUp = pts[8].y < pts[6].y - 0.05;
        const middleUp = pts[12].y < pts[10].y - 0.05;

        if (indexUp && middleUp) {
            currentTarget = earthPos;
            isEarthMode = true;
            morphSpeed = 0.1;
        } else if (indexUp) {
            currentTarget = eiffelPos;
            isEarthMode = false;
            targetColor.setHex(0xffffff);
            morphSpeed = 0.08;
        } else {
            currentTarget = saturnPos;
            isEarthMode = false;
            targetColor.setHex(0xffd700);
            morphSpeed = 0.08;
        }

        const sDist = Math.hypot(pts[4].x - pts[16].x, pts[4].y - pts[16].y);
        points.scale.lerp(new THREE.Vector3().setScalar(sDist < 0.08 ? 2.5 : 1.0), 0.1);
    }
});

new Camera(videoElement, { onFrame: async () => { await hands.send({image: videoElement}); }, width: 640, height: 480 }).start();

// --- 5. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        // Morph Posisi
        pos.array[idx] += (currentTarget[idx] - pos.array[idx]) * morphSpeed;
        pos.array[idx+1] += (currentTarget[idx+1] - pos.array[idx+1]) * morphSpeed;
        pos.array[idx+2] += (currentTarget[idx+2] - pos.array[idx+2]) * morphSpeed;

        // Morph Warna (Jika Bumi gunakan earthColors, jika tidak gunakan targetColor)
        if (isEarthMode) {
            col.array[idx] += (earthColors[idx] - col.array[idx]) * 0.1;
            col.array[idx+1] += (earthColors[idx+1] - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (earthColors[idx+2] - col.array[idx+2]) * 0.1;
        } else {
            col.array[idx] += (targetColor.r - col.array[idx]) * 0.1;
            col.array[idx+1] += (targetColor.g - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (targetColor.b - col.array[idx+2]) * 0.1;
        }
    }
    
    pos.needsUpdate = true;
    col.needsUpdate = true;
    points.rotation.y += 0.005;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
