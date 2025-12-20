import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { type AudioSource, loadAudioSource, playAudio } from "./audioLoading.ts";
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

const panel:           HTMLElement       = document.getElementById("panel")!;
const uploadSelected:  HTMLInputElement  = document.getElementById("source-select-upload")! as HTMLInputElement;
const uploadContainer: HTMLElement       = document.getElementById("upload-container")!;
const presetContainer: HTMLElement       = document.getElementById("preset-container")!;
const fileInput:       HTMLInputElement  = document.getElementById("file-input")! as HTMLInputElement;
const presetSelection: HTMLSelectElement = document.getElementById("preset-select")! as HTMLSelectElement;
const startButton:     HTMLButtonElement = document.getElementById("start-button") as HTMLButtonElement;
const loadingOverlay:  HTMLElement       = document.getElementById("loading-overlay")!;
const sourceRadios = document.querySelectorAll<HTMLInputElement>("input[name='audio-source']")

sourceRadios.forEach(radio => {
    radio.addEventListener("change", () => {
        const isUpload = radio.value == "upload" && radio.checked;
            uploadContainer.classList.toggle("hidden", !isUpload);
            presetContainer.classList.toggle("hidden", isUpload);
    })
})


const onWindowLoad = async () => {
    scene = new THREE.Scene();
    setupCamera();
    setupLights();
    setupTweakpane();

    const app = document.getElementById("app")!;
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 50, 0)

    startButton.onclick = () => {
        startVisualization();
    }


    starField = new StarField(scene, 5000);
    animate();
}

window.onload = onWindowLoad;
window.onresize = onWindowResize;

const showPanel = (show: boolean): void => {
    panel.classList.toggle("hidden", !show);
}

const showLoading = (show: boolean): void => {
    loadingOverlay.classList.toggle("hidden", !show);
}

const startVisualization = async () => {
    let audio: AudioSource;

    if (uploadSelected.checked) {
        if (!fileInput?.files?.length) {
            alert("Please upload an audio file or choose to select a preset!");
            return;
        }
        audio = {
            type: "file",
            file: fileInput.files[0],
        }
    } else {
        const url = presetSelection.value;
        if (url === "") {
            alert("Please select a preset or choose to upload an audio file!");
            return;
        }
        audio = {
            type: "preset",
            url: url
        }
    }

    showPanel(false);
    showLoading(true);
    try {
        const audioData = await loadAudioSource(audio);
        showLoading(false);
        visualizer = new AudioVisualizer(scene, audioData, 100, 100,
            numberToHSV(pane.settings.leftColor),
            numberToHSV(pane.settings.rightColor));
        await playAudio(audioData.audioBuffer);
    } catch (error) {
        showLoading(false);
        showPanel(true);
        alert(`Failed to load audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(error);
    }
}