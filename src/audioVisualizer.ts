import * as THREE from "three";
import type { AudioData } from "./audio.ts";
import { type DB, dbToHeight } from "./audio.ts";
import { lerp } from "./interpolation.ts";
import { gradientHSV, type HSV, hsvToThreeColor } from "./color.ts";

const BAR_SPACING = 0.5;

export class AudioVisualizer {
	scene: THREE.Scene;
	bars: THREE.Mesh[];
	peak: THREE.Mesh[];
	audio: AudioData;
	currentFrame: number = 0;

	private leftHSV: HSV;
	private rightHSV: HSV;
	private readonly baseMainHSV: HSV[];
	private readonly baseBackgroundHSV: HSV[];

	private timer: number = 0;
	private readonly frameLength: number = 0;
	private readonly numBands: number;

	private readonly width: number;
	private readonly height: number;
	private readonly blockWidth: number;

	constructor(scene: THREE.Scene, audioData: AudioData, width: number, height: number, leftHSV: HSV, rightHSV: HSV) {
		this.scene = scene;
		this.audio = audioData;
		this.numBands = this.audio.frequencyBands[0].length;
		this.bars = new Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>(this.numBands);
		this.peak = new Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>(this.numBands);
		this.frameLength = this.audio.hopSize / this.audio.audioBuffer.sampleRate;

		this.width = width;
		this.height = height;
		this.blockWidth = this.width / this.numBands;

		this.leftHSV = leftHSV;
		this.rightHSV = rightHSV;

		this.baseMainHSV = new Array(this.numBands);
		this.baseBackgroundHSV = new Array(this.numBands);
		this.initColors(leftHSV, rightHSV);
		this.initMeshes();
	}

	getLeftHSV(): HSV { return this.leftHSV; }
	getRightHSV(): HSV { return this.rightHSV; }

	changeColors(leftColor: HSV, rightColor: HSV) {
		this.initColors(leftColor, rightColor);
		for (let i = 0; i < this.numBands; i++) {
			let mat = this.bars[i].material as THREE.MeshStandardMaterial;
			mat.color.copy(hsvToThreeColor(this.baseMainHSV[i]));
		}
	}

	private initColors(leftColor: HSV, rightColor: HSV): void {
		this.leftHSV = leftColor;
		this.rightHSV = rightColor;
		for (let i = 0; i < this.numBands; i++) {
			this.baseMainHSV[i] = gradientHSV(this.leftHSV, this.rightHSV, i / (this.numBands - 1), 1);
			this.baseBackgroundHSV[i] = {
				h: this.baseMainHSV[i].h,
				s: this.baseMainHSV[i].s * 0.6,
				v: this.baseMainHSV[i].v * 0.8,
			}
		}
	}

	private initMeshes(): void {
		// Main bars
		for (let i = 0; i < this.numBands; i++) {
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({
				color: hsvToThreeColor(this.baseMainHSV[i]),
				emissive: 0x001111,
				roughness: 0.3,
				metalness: 0.4
			});
			this.bars[i] = new THREE.Mesh(geometry, material);
			const bar = this.bars[i];
			bar.position.x = 0;
			bar.position.z = (this.bars.length / 2 - i) * (this.blockWidth + BAR_SPACING);
			const height = dbToHeight(this.audio.frequencyBands[this.currentFrame][i], this.audio.globalMaxDB, 50);
			bar.position.y = height / 2;
			bar.scale.y = height;
			this.scene.add(bar);
		}

		// Peak bars
		for (let i = 0; i < this.numBands; i++) {
			const emissiveColor = hsvToThreeColor({
				...this.baseBackgroundHSV[i],
				v: 0.15
			});

			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({
				color: hsvToThreeColor(this.baseBackgroundHSV[i]),
				emissive: emissiveColor,
				roughness: 0.3,
				metalness: 0.4,
				opacity: 0.8,
				transparent: true
			});
			this.peak[i] = new THREE.Mesh(geometry, material);
			const bar = this.peak[i];
			bar.position.x = -1;
			bar.position.z = (this.bars.length / 2 - i) * (this.blockWidth + BAR_SPACING);
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
			let material = this.peak[i].material as THREE.MeshStandardMaterial;
			material.color.copy(hsvToThreeColor({
				...this.baseBackgroundHSV[i],
				v: this.baseBackgroundHSV[i].v * (newPeakHeight / this.height)
			}));
		})
	}
}