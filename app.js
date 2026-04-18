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
const xmasPos = new Float32Array(particleCount * 3); // Posisi Pohon Natal

const earthColors = new Float32Array(particleCount * 3);
const xmasColors = new Float32Array(particleCount * 3); // Warna Pohon Natal

let currentTarget = saturnPos;
let currentTargetColors = null; // Untuk warna dinamis seperti Bumi & Pohon
let morphSpeed = 0.08;
let targetColor = new THREE.Color(0xffd700);

// --- 3. SHAPE GENERATOR ---
for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;

    // A. SATURNUS
    if (i < particleCount * 0.45) {
        const phi = Math.acos(-1 + (2 * i) / (particleCount * 0.45));
        const theta = Math.sqrt(particleCount * 0.45 * Math.PI) * phi;
        saturnPos[idx] = 2.5 * Math.cos(theta) * Math.sin(phi);
        saturnPos[idx+1] = 2.5 * Math.sin(theta) * Math.sin(phi);
        saturnPos[idx+2] = 2.5 * Math.cos(phi);
    } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 3.8 + Math.random() * 2.5;
        saturnPos[idx] = Math.cos(angle) * dist;
        saturnPos[idx+1] = (Math.random() - 0.5) * 0.2;
        saturnPos[idx+2] = Math.sin(angle) * dist;
    }

    // B. EIFFEL
    const hE = 12;
    const ey = (Math.random() * hE) - hE/2;
    const normYE = (ey + hE/2) / hE;
    const wE = 3.5 * Math.pow(1 - normYE, 2) + 0.15;
    eiffelPos[idx] = (Math.random() - 0.5) * wE;
    eiffelPos[idx+1] = ey;
    eiffelPos[idx+2] = (Math.random() - 0.5) * wE;

    // C. BUMI
    const phiB = Math.acos(-1 + (2 * i) / particleCount);
    const thetaB = Math.sqrt(particleCount * Math.PI) * phiB;
    const rB = 4.0;
    earthPos[idx] = rB * Math.cos(thetaB) * Math.sin(phiB);
    earthPos[idx+1] = rB * Math.sin(thetaB) * Math.sin(phiB);
    earthPos[idx+2] = rB * Math.cos(phiB);
    const noiseB = Math.sin(thetaB * 5) * Math.cos(phiB * 5);
    const cB = new THREE.Color(noiseB > 0.1 ? 0x228b22 : 0x0000ff);
    earthColors[idx] = cB.r; earthColors[idx+1] = cB.g; earthColors[idx+2] = cB.b;

    // D. POHON NATAL (XMAS TREE)
    const hX = 10;
    const yX = (Math.random() * hX) - hX/2; // -5 to 5
    const normYX = (yX + hX/2) / hX; // 0 to 1
    let rX, cX;

    if (normYX < 0.15) { // Batang Pohon
        rX = 0.5;
        cX = new THREE.Color(0x4b2d0b); // Cokelat
    } else { // Daun/Badan Pohon (Kerucut bertingkat)
        const tier = Math.floor(normYX * 3); // 3 tingkatan
        rX = (1.1 - normYX) * 4; 
        cX = Math.random() > 0.98 ? new THREE.Color(0xff0000) : new THREE.Color(0x006400); // Hijau + bintik merah
    }
    xmasPos[idx] = (Math.random() - 0.5) * rX;
    xmasPos[idx+1] = yX;
    xmasPos[idx+2] = (Math.random() - 0.5) * rX;
    xmasColors[idx] = cX.r; xmasColors[idx+1] = cX.g; xmasColors[idx+2] = cX.b;

    // Default Start
    positions[idx] = saturnPos[idx];
    positions[idx+1] = saturnPos[idx+1];
    positions[idx+2] = saturnPos[idx+2];
    colors[idx] = 1; colors[idx+1] = 0.84; colors[idx+2] = 0;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0.9 });
const points = new THREE.Points(geometry, material);
scene.add(points);

// --- 4. MEDIA PIPE ---
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
        const ringUp = pts[16].y < pts[14].y - 0.05;

        if (indexUp && middleUp && ringUp) { // 3 JARI
            currentTarget = xmasPos; currentTargetColors = xmasColors; morphSpeed = 0.1;
        } else if (indexUp && middleUp) { // 2 JARI
            currentTarget = earthPos; currentTargetColors = earthColors; morphSpeed = 0.1;
        } else if (indexUp) { // 1 JARI
            currentTarget = eiffelPos; currentTargetColors = null; targetColor.setHex(0xffffff); morphSpeed = 0.08;
        } else { // MENGEPAL
            currentTarget = saturnPos; currentTargetColors = null; targetColor.setHex(0xffd700); morphSpeed = 0.08;
        }
    }
});

new Camera(videoElement, { onFrame: async () => { await hands.send({image: videoElement}); }, width: 640, height: 480 }).start();

// --- 5. ANIMATION ---
function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos.array[idx] += (currentTarget[idx] - pos.array[idx]) * morphSpeed;
        pos.array[idx+1] += (currentTarget[idx+1] - pos.array[idx+1]) * morphSpeed;
        pos.array[idx+2] += (currentTarget[idx+2] - pos.array[idx+2]) * morphSpeed;

        if (currentTargetColors) {
            col.array[idx] += (currentTargetColors[idx] - col.array[idx]) * 0.1;
            col.array[idx+1] += (currentTargetColors[idx+1] - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (currentTargetColors[idx+2] - col.array[idx+2]) * 0.1;
        } else {
            col.array[idx] += (targetColor.r - col.array[idx]) * 0.1;
            col.array[idx+1] += (targetColor.g - col.array[idx+1]) * 0.1;
            col.array[idx+2] += (targetColor.b - col.array[idx+2]) * 0.1;
        }
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    points.rotation.y += 0.005;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
