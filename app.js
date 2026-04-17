// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 10;

// --- 2. PARTICLE CONFIGURATION ---
const particleCount = 10000; 
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3); 
const colors = new Float32Array(particleCount * 3);

const saturnPositions = new Float32Array(particleCount * 3);
const eiffelPositions = new Float32Array(particleCount * 3);

let currentMorphTarget = saturnPositions; 

// --- 3. GENERATE SATURN SHAPE ---
const sphereCount = Math.floor(particleCount * 0.4);
for (let i = 0; i < particleCount; i++) {
    let x, y, z;
    const color = new THREE.Color();

    if (i < sphereCount) {
        const phi = Math.acos(-1 + (2 * i) / sphereCount);
        const theta = Math.sqrt(sphereCount * Math.PI) * phi;
        const r = 1.8;
        x = r * Math.cos(theta) * Math.sin(phi);
        y = r * Math.sin(theta) * Math.sin(phi);
        z = r * Math.cos(phi);
        color.setHex(0xffd700); 
    } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = 2.5 + Math.random() * 2.0;
        const tilt = Math.PI / 3.5;
        const tempX = Math.cos(angle) * distance;
        const tempY = (Math.random() - 0.5) * 0.1;
        const tempZ = Math.sin(angle) * distance;
        x = tempX;
        y = tempY * Math.cos(tilt) - tempZ * Math.sin(tilt);
        z = tempY * Math.sin(tilt) + tempZ * Math.cos(tilt);
        color.setHex(0xc2b280);
    }
    saturnPositions[i * 3] = x;
    saturnPositions[i * 3 + 1] = y;
    saturnPositions[i * 3 + 2] = z;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
}

// --- 4. GENERATE EIFFEL SHAPE ---
for (let i = 0; i < particleCount; i++) {
    const h = 8; 
    const y = (Math.random()) * h - (h/2);
    const normalizedY = (y + h/2) / h; 
    const widthAtY = 2.5 * Math.pow(1 - normalizedY, 1.5) + 0.1; 
    
    let x, z;
    if (normalizedY < 0.3) {
        const legIdx = Math.floor(Math.random() * 4);
        const legOffset = 1.2 * (1 - normalizedY);
        const offsetX = (legIdx === 0 || legIdx === 1) ? legOffset : -legOffset;
        const offsetZ = (legIdx === 0 || legIdx === 2) ? legOffset : -legOffset;
        x = (Math.random() - 0.5) * widthAtY * 0.5 + offsetX;
        z = (Math.random() - 0.5) * widthAtY * 0.5 + offsetZ;
    } else {
        x = (Math.random() - 0.5) * widthAtY;
        z = (Math.random() - 0.5) * widthAtY;
    }
    eiffelPositions[i * 3] = x;
    eiffelPositions[i * 3 + 1] = y;
    eiffelPositions[i * 3 + 2] = z;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const material = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.9 });
const particlePoints = new THREE.Points(geometry, material);
scene.add(particlePoints);

// --- 5. HAND TRACKING LOGIC ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Posisi
        const targetX = (landmarks[9].x - 0.5) * -20;
        const targetY = (landmarks[9].y - 0.5) * -12;
        particlePoints.position.x = THREE.MathUtils.lerp(particlePoints.position.x, targetX, 0.1);
        particlePoints.position.y = THREE.MathUtils.lerp(particlePoints.position.y, targetY, 0.1);

        // TRIGGER: Jari Telunjuk (Landmark 8 vs 6)
        if (landmarks[8].y < landmarks[6].y - 0.05) {
            currentMorphTarget = eiffelPositions;
        } else {
            currentMorphTarget = saturnPositions;
        }

        // ZOOM: Jempol (4) vs Jari Tengah (12)
        const zoomDist = Math.hypot(landmarks[4].x - landmarks[12].x, landmarks[4].y - landmarks[12].y);
        if (zoomDist < 0.06) { 
            particlePoints.scale.lerp(new THREE.Vector3(2.2, 2.2, 2.2), 0.1);
        } else {
            particlePoints.scale.lerp(new THREE.Vector3(0.8, 0.8, 0.8), 0.1);
        }
    }
});

const cameraControl = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraControl.start();

// --- 6. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
        posAttr.setXYZ(i,
            THREE.MathUtils.lerp(posAttr.getX(i), currentMorphTarget[i * 3], 0.07),
            THREE.MathUtils.lerp(posAttr.getY(i), currentMorphTarget[i * 3 + 1], 0.07),
            THREE.MathUtils.lerp(posAttr.getZ(i), currentMorphTarget[i * 3 + 2], 0.07)
        );
    }
    posAttr.needsUpdate = true;
    particlePoints.rotation.y += 0.003;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
