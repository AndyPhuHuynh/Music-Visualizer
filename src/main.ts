import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/Addons.js";

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
    camera.position.set(-5, 5, 5);
    camera.lookAt(0, 0, 0);
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

    let geometry = new THREE.BoxGeometry();
    let material = new THREE.MeshStandardMaterial();
    let mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement)

    controls = new OrbitControls(camera, renderer.domElement);
    animate()
}
