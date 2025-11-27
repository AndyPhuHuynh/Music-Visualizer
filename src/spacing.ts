import { hzToMel, melToHz } from "./audio.ts";

class Spacing {
	start: number;
	end: number;

	constructor(start: number, end: number) {
		this.start = start;
		this.end = end;
	}

	toString(): string {
		return `[${this.start.toFixed(2)}, ${this.end.toFixed(2)}]`;
	}
}

export const linearSpacing = (
	start: number,
	end: number,
	numGroups: number
): Spacing[] => {
	const groups = new Array<Spacing>(numGroups);
	const distance = end - start;
	for (let i = 0; i < numGroups; i++) {
		const spacingStart = start + distance * (i / numGroups);
		const spacingEnd   = start + distance * ((i + 1) / numGroups);
		groups[i] = new Spacing(spacingStart, spacingEnd);
	}
	return groups;
}

export const logisticSpacing = (
	start: number,
	end: number,
	numGroups: number,
	direction: "normal" | "inverted" = "normal"
): Spacing[] => {
	if (numGroups < 1) throw new Error("numGroups must be at least one");
	if (start < 1) throw new Error("start must be a positive number");
	if (end < 1) throw new Error("end must be a positive number");

	const ratio = end / start;
	const points = new Array(numGroups + 1);

	for (let i = 0; i < numGroups + 1; i++) {
		const t = i / numGroups;
		if (direction === "inverted") {
			points[i] = end - start * Math.pow(ratio, 1 - t) + start;
		} else {
			points[i] = start * Math.pow(ratio, t);
		}
	}

	const spacings = new Array<Spacing>(numGroups);
	for (let i = 0; i < numGroups; i++) {
		spacings[i] = new Spacing(points[i], points[i + 1])
	}

	return spacings;
}

export const melSpacing = (
	start: number,
	end: number,
	numGroups: number,
): Spacing[] => {
	const melMin = hzToMel(start);
	const melMax = hzToMel(end);
	const spacings = linearSpacing(melMin, melMax, numGroups);
	for (let spacing of spacings) {
		spacing.start = melToHz(spacing.start);
		spacing.end = melToHz(spacing.end);
	}
	return spacings;
}