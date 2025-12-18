import * as THREE from "three";
import type { AudioData } from "./audio.ts";
import { type DB, dbToHeight } from "./audio.ts";
import { lerp } from "./interpolation.ts";

const LIGHT_BLUE = 0x48cae4;
const DARK_BLUE = 0x0077b6;
const BAR_SPACING = 0.5;

export class AudioVisualizer {
	scene: THREE.Scene;
	bars: THREE.Mesh[];
	peak: THREE.Mesh[];
	audio: AudioData;
	currentFrame: number = 0;

	private timer: number = 0;
	private readonly frameLength: number = 0;
	private readonly numBands: number;

	private readonly width: number;
	private readonly height: number;
	private readonly blockWidth: number;

	constructor(scene: THREE.Scene, audioData: AudioData, width: number, height: number) {
		this.scene = scene;
		this.audio = audioData;
		this.numBands = this.audio.frequencyBands[0].length;
		this.bars = new Array<THREE.Mesh>(this.numBands);
		this.peak = new Array<THREE.Mesh>(this.numBands);
		this.frameLength = this.audio.hopSize / this.audio.audioBuffer.sampleRate;

		this.width = width;
		this.height = height;
		this.blockWidth = this.width / this.numBands;
	}

	add() {
		for (let i = 0; i < this.numBands; i++) {
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({
				color: LIGHT_BLUE,
				emissive: 0x001111,
				roughness: 0.3,
				metalness: 0.4
			});
			this.bars[i] = new THREE.Mesh(geometry, material);
			const bar = this.bars[i];
			bar.position.x = 0;
			bar.position.z = (i - this.bars.length / 2) * (this.blockWidth + BAR_SPACING);
			const height = dbToHeight(this.audio.frequencyBands[this.currentFrame][i], this.audio.globalMaxDB, 50);
			bar.position.y = height / 2;
			bar.scale.y = height;
			this.scene.add(bar);
		}

		for (let i = 0; i < this.numBands; i++) {
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({
				color: DARK_BLUE,
				emissive: 0x001111,
				roughness: 0.3,
				metalness: 0.4
			});
			this.peak[i] = new THREE.Mesh(geometry, material);
			const bar = this.peak[i];
			bar.position.x = -1;
			bar.position.z = (i - this.bars.length / 2) * (this.blockWidth + BAR_SPACING);
			bar.position.y = 0.5;
			bar.scale.y = 1;
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
				this.timer / this.frameLength) as DB;

			const targetHeight = dbToHeight(newDB, this.audio.globalMaxDB, this.height);
			bar.scale.y = targetHeight;
			bar.position.y = targetHeight / 2;

			let currentPeakHeight = this.peak[i].scale.y;
			let newPeakHeight: number;
			if (targetHeight >= currentPeakHeight) {
				newPeakHeight = targetHeight;
			} else {
				newPeakHeight = 0.99 * currentPeakHeight;
			}
			this.peak[i].scale.y = newPeakHeight;
			this.peak[i].position.y = newPeakHeight / 2;
		})
	}
}