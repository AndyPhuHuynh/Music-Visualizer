import * as THREE from "three";

export class StarField {
	scene: THREE.Scene;
	stars: THREE.Points;

	constructor(scene: THREE.Scene, numStars: number) {
		this.scene = scene;

		const positions = new Float32Array(numStars * 3);
		for (let i = 0; i < positions.length; i++) {
			positions[i] = (Math.random() - 0.5) * 2000;
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const material = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 2,
			sizeAttenuation: true,
		})

		this.stars = new THREE.Points(geometry, material);
		this.scene.add(this.stars);
	}

	animate() {
		this.stars.rotation.y += 0.0005;
		this.stars.rotation.x += 0.0002;
	}
}