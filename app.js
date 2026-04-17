// --- 1. SETUP SCENE & RENDERER ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 10;

// --- 2. KONFIGURASI PARTIKEL (BANYAKNYA HARUS SAMA) ---
const particleCount = 10000; // Jumlah total partikel untuk kedua bentuk
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3); // Posisi saat ini
const colors = new Float32Array(particleCount * 3);

// Data Posisi Target (Morphing)
const saturnPositions = new Float32Array(particleCount * 3);
const eiffelPositions = new Float32Array(particleCount * 3);

let currentMorphTarget = saturnPositions; // Target awal adalah Saturnus

// --- 3. MEMBUAT BENTUK SATURNUS (GENERATION) ---
// Membagi partikel: 40% planet, 60% cincin
const sphereCount = Math.floor(particleCount * 0.4);

for (let i = 0; i < particleCount; i++) {
    let x, y, z;
    const color = new THREE.Color();

    if (i < sphereCount) {
        // Bentuk Bola (Inti Saturnus)
        const phi = Math.acos(-1 + (2 * i) / sphereCount);
        const theta = Math.sqrt(sphereCount * Math.PI) * phi;
        const r = 1.8;
        x = r * Math.cos(theta) * Math.sin(phi);
        y = r * Math.sin(theta) * Math.sin(phi);
        z = r * Math.cos(phi);
        color.setHex(0xffd700); // Emas
    } else {
        // Bentuk Cincin (Rings)
        const angle = Math.random() * Math.PI * 2;
        const distance = 2.5 + Math.random() * 2.0;
        const tilt = Math.PI / 3.5; // Kemiringan cincin
        
        const tempX = Math.cos(angle) * distance;
        const tempY = (Math.random() - 0.5) * 0.1;
        const tempZ = Math.sin(angle) * distance;

        // Terapkan kemiringan (rotasi x dasar)
        x = tempX;
        y = tempY * Math.cos(tilt) - tempZ * Math.sin(tilt);
        z = tempY * Math.sin(tilt) + tempZ * Math.cos(tilt);
        
        color.setHex(0xc2b280); // Pasir/Krem
    }

    saturnPositions[i * 3] = x;
    saturnPositions[i * 3 + 1] = y;
    saturnPositions[i * 3 + 2] = z;

    // Set posisi awal partikel di Saturnus
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Set Warna
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
}

// --- 4. MEMBUAT BENTUK EIFFEL Sederhana (GENERATION) ---
// Membuat 4 kaki dan menara tengah menggunakan tumpukan titik
for (let i = 0; i < particleCount; i++) {
    // Logika dasar membuat menara lancip
    const h = 8; // Tinggi total menara
    const y = (Math.random()) * h - (h/2); // Sebaran vertikal dari -4 ke 4
    
    // Semakin tinggi (y besar), semakin kecil lebar menara (lancip)
    const normalizedY = (y + h/2) / h; // 0 di bawah, 1 di atas
    const widthAtY = 2.5 * Math.pow(1 - normalizedY, 1.5) + 0.1; 
    
    // Buat 4 kaki di bagian bawah (y rendah)
    let x, z;
    if (normalizedY < 0.3) {
        // 4 Kaki Menara
        const legIdx = Math.floor(Math.random() * 4);
        const legOffset = 1.2 * (1 - normalizedY);
        const offsetX = (legIdx === 0 || legIdx === 1) ? legOffset : -legOffset;
        const offsetZ = (legIdx === 0 || legIdx === 2) ? legOffset : -legOffset;
        
        x = (Math.random() - 0.5) * widthAtY * 0.5 + offsetX;
        z = (Math.random() - 0.5) * widthAtY * 0.5 + offsetZ;
    } else {
        // Bagian badan menara ke atas
        x = (Math.random() - 0.5) * widthAtY;
        z = (Math.random() - 0.5) * widthAtY;
    }

    eiffelPositions[i * 3] = x;
    eiffelPositions
