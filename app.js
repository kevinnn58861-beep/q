// --- 1. SETUP SCENE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Group untuk menampung seluruh bagian Saturnus agar bisa digerakkan bersama
const saturnGroup = new THREE.Group();
scene.add(saturnGroup);

// --- 2. MEMBUAT PARTIKEL SATURNUS ---

// A. Inti Planet (Bentuk Bola)
const sphereCount = 3000;
const sphereGeometry = new THREE.BufferGeometry();
const spherePos = new Float32Array(sphereCount * 3);

for (let i = 0; i < sphereCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / sphereCount);
    const theta = Math.sqrt(sphereCount * Math.PI) * phi;
    
    const r = 1.5; // Jari-jari planet
    spherePos[i * 3] = r * Math.cos(theta) * Math.sin(phi);
    spherePos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
    spherePos[i * 3 + 2] = r * Math.cos(phi);
}
sphereGeometry.setAttribute('position', new THREE.BufferAttribute(spherePos, 3));
const sphereMaterial = new THREE.PointsMaterial({ color: 0xffd700, size: 0.03 }); // Warna Emas
const planet = new THREE.Points(sphereGeometry, sphereMaterial);
saturnGroup.add(planet);

// B. Cincin Saturnus (Bentuk Ring)
const ringCount = 5000;
const ringGeometry = new THREE.BufferGeometry();
const ringPos = new Float32Array(ringCount * 3);

for (let i = 0; i < ringCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 2.2 + Math.random() * 1.5; // Jarak dari pusat (lebar cincin)
    
    ringPos[i * 3] = Math.cos(angle) * distance;
    ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.1; // Ketebalan tipis cincin
    ringPos[i * 3 + 2] = Math.sin(angle) * distance;
}
ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
const ringMaterial = new THREE.PointsMaterial({ color: 0xc2b280, size: 0.02, transparent: true, opacity: 0.6 });
const rings = new THREE.Points(ringGeometry, ringMaterial);
rings.rotation.x = Math.PI / 4; // Kemiringan khas cincin Saturnus
saturnGroup.add(rings);

camera.position.z = 8;

// --- 3. KONTROL TANGAN (MEDIAPIPE) ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});

hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Gerakan mengikuti tangan
        const x = (landmarks[9].x - 0.5) * -15;
        const y = (landmarks[9].y - 0.5) * -10;
        saturnGroup.position.x = THREE.MathUtils.lerp(saturnGroup.position.x, x, 0.1);
        saturnGroup.position.y = THREE.MathUtils.lerp(saturnGroup.position.y, y, 0.1);

        // Deteksi Mengepal (Zoom In) vs Terbuka (Zoom Out)
        const dist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
        
        if (dist < 0.05) { 
            saturnGroup.scale.lerp(new THREE.Vector3(2.0, 2.0, 2.0), 0.1); // Membesar
        } else {
            saturnGroup.scale.lerp(new THREE.Vector3(0.7, 0.7, 0.7), 0.1); // Menjauh
        }
    }
});

const cameraControl = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraControl.start();

// --- 4. ANIMASI ---
function animate() {
    requestAnimationFrame(animate);
    planet.rotation.y += 0.005;
    rings.rotation.z += 0.002; // Putaran cincin
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
