import * as THREE from "three";
import { dbToHeight } from "./audio.ts";
import { lerp } from "./interpolation.ts";
import type { AudioData } from "./audio.ts";

export class AudioVisualizer {
	scene: THREE.Scene;
	bars: THREE.Mesh[];
	audio: AudioData;
	currentFrame: number = 0;

	private timer: number = 0;
	private readonly frameLength: number = 0;

	constructor(scene: THREE.Scene, audioData: AudioData) {
		this.scene = scene;
		this.audio = audioData;
		this.bars = new Array<THREE.Mesh>(this.audio.frequencyBands[0].length);
		this.frameLength = this.audio.hopSize / this.audio.audioBuffer.sampleRate;
	}

	add() {
		for (let i = 0; i < this.audio.frequencyBands[this.currentFrame].length; i++) {
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({
				color: 0x00ffcc,
				emissive: 0x001111,
				roughness: 0.3,
				metalness: 0.4
			});
			this.bars[i] = new THREE.Mesh(geometry, material);
			const bar = this.bars[i];
			bar.position.x = 0;
			bar.position.z = i - this.bars.length / 2;
			const height = dbToHeight(this.audio.frequencyBands[this.currentFrame][i], 50);
			bar.position.y = height / 2;
			bar.scale.y = height;
			this.scene.add(bar);
		}
	}

	update(deltaTime: number) {
		this.timer += deltaTime;
		if (this.timer > this.frameLength) {
			this.currentFrame++;
			this.timer %= this.frameLength;
		}
		if (this.currentFrame >= this.audio.frequencyBands.length - 1) {
			return;
		}
		this.bars.forEach((bar, i) => {
			const newDB = lerp(
				this.audio.frequencyBands[this.currentFrame][i],
				this.audio.frequencyBands[this.currentFrame + 1][i],
				this.timer / this.frameLength);
			const newHeight = dbToHeight(newDB, 50);
			bar.scale.y = newHeight;
			bar.position.y = newHeight / 2;
		})
	}
}