export const hannWindow = (n: number, frameSize: number): number => {
	return Math.pow(Math.sin(Math.PI * n / frameSize), 2);
}