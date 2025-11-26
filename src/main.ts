import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { groupFrequencyBands, loadAudio, magnitudeToHeight, shortTimeFourierTransform } from "./audio.ts";

let camera: any;
let lights: { ambient: any, directional: any } = {
    ambient: null,
    directional: null
}
let scene: any;
let renderer: any;
let controls: any;

const setupCamera = () => {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1;
    const far = 10000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(10, 10, 10);
}

const setupLights = () => { 
    lights.ambient = new THREE.AmbientLight();
    scene.add(lights.ambient);

    lights.directional = new THREE.DirectionalLight(0xffffff, 5);
    lights.directional.position.set(10, 100, 10);
    scene.add(lights.directional);
}

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.onload = async () => {
    scene = new THREE.Scene();
    setupCamera();
    setupLights();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0)
    animate()

    const audioBuffer = await loadAudio();
    const samples = audioBuffer.getChannelData(0);

    const frameSize = 2048;
    const hopSize = frameSize * (3 / 4);

    const stft = shortTimeFourierTransform(samples, frameSize, hopSize);
    const numBands = 128;
    const groupings = groupFrequencyBands(stft, audioBuffer.sampleRate, numBands);

    const currentGroup = 0;
    for (let i = 0; i < numBands; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffcc,
            emissive: 0x001111,
            roughness: 0.3,
            metalness: 0.4
        });
        const bar = new THREE.Mesh(geometry, material);
        bar.position.x = 0;
        bar.position.z = i - numBands / 2;
        const height = magnitudeToHeight(groupings[currentGroup][i], 50);
        console.log(`${i}: ${height}`);
        bar.position.y = height / 2;
        bar.scale.y = height;
        scene.add(bar);
    }
}
