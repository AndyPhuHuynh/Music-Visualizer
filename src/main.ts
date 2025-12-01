import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { loadAudio, playAudio } from "./audio.ts";
import { AudioVisualizer } from "./audioVisualizer.ts";

let camera: any;
let lights: { ambient: any, directional: any } = {
    ambient: null,
    directional: null
}
let scene: THREE.Scene;
let renderer: any;
let controls: any;

let visualizer: AudioVisualizer;
let clock = new THREE.Clock();

const setupCamera = () => {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 1;
    const far = 10000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(100, 50, 0);
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

    const deltaTime = clock.getDelta();
    visualizer.update(deltaTime);

    controls.update();
    renderer.render(scene, camera);
}

let startButton: HTMLElement | null = null;

window.onload = async () => {
    scene = new THREE.Scene();
    setupCamera();
    setupLights();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement)

    startButton = document.getElementById("start-button");
    if (startButton === null) {
        alert("Unable to get start button!");
        return;
    }
    startButton.onclick = () => {
        startVisualization();
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 50, 0)
}

const startVisualization = async () => {
    if (startButton) {
        startButton.style.display = "none";
    }
    const audioData = await loadAudio();
    visualizer = new AudioVisualizer(scene, audioData, 100, 100);
    visualizer.add();
    playAudio(audioData.audioBuffer);
    animate()
}