import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { loadAudioDataFromFileObject, playAudio } from "./audio.ts";
import { AudioVisualizer } from "./audioVisualizer.ts";
import { Tweakpane } from "./tweakpane.ts";
import { StarField } from "./stars.ts";
import { numberToHSV } from "./color.ts";

let camera: any;
let lights: { ambient: any, directional: any } = {
    ambient: null,
    directional: null
}
let scene: THREE.Scene;
let renderer: any;
let controls: any;
let pane: Tweakpane;

let visualizer: AudioVisualizer;
let starField: StarField;
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

const setupTweakpane = () => {
    pane = new Tweakpane();
    pane.leftColorBinding.on("change", (ev) => {
        if (visualizer) {
            const leftColor = numberToHSV(ev.value as number);
            visualizer.changeColors(leftColor, visualizer.getRightHSV());
        }
    })
    pane.rightColorBinding.on("change", (ev) => {
        if (visualizer) {
            const rightColor = numberToHSV(ev.value as number);
            visualizer.changeColors(visualizer.getLeftHSV(), rightColor);
        }
    })
}

const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
};

const animate = () => {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    if (visualizer) {
        visualizer.update(deltaTime);
    }
    if (starField) {
        starField.animate();
    }

    controls.update();
    renderer.render(scene, camera);
}

let panel: HTMLElement;
let fileInput: HTMLInputElement;
let startButton: HTMLButtonElement;

const onWindowLoad = async () => {
    scene = new THREE.Scene();
    setupCamera();
    setupLights();
    setupTweakpane();

    const app = document.getElementById("app")!;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.appendChild(renderer.domElement)

    const maybePanel = document.getElementById("panel");
    if (!maybePanel) {
        alert("Error: panel does not exist");
        return;
    }
    panel = maybePanel;

    const maybeInput = document.getElementById("file-input");
    if (!maybeInput) {
        alert("Error: file-input does not exist")
        return;
    }
    fileInput = maybeInput as HTMLInputElement;

    const maybeStartButton = document.getElementById("start-button");
    if (!maybeStartButton) {
        alert("Error: start-button does not exist")
        return;
    }
    startButton = maybeStartButton as HTMLButtonElement;
    startButton.onclick = () => {
        startVisualization();
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 50, 0)

    starField = new StarField(scene, 5000);
    animate();
}

window.onload = onWindowLoad;
window.onresize = onWindowResize;

const startVisualization = async () => {
    if (!fileInput?.files?.length) {
        console.log("No file selected");
        return;
    }

    if (panel) {
        panel.style.display = "none";
    }

    const file = fileInput.files[0];
    const audioData = await loadAudioDataFromFileObject(file);
    visualizer = new AudioVisualizer(scene, audioData, 100, 100,
        numberToHSV(pane.settings.leftColor),
        numberToHSV(pane.settings.rightColor));
    playAudio(audioData.audioBuffer);
}