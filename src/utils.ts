export const clamp = (value: number, min: number, max: number): number => {
	return Math.max(0, Math.min(value, max));
}