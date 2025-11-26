import { hannWindow } from "./windowing.ts";
import { FFTR } from "kissfft-js";
import { logisticSpacing } from "./spacing.ts";

const audioCtx = new AudioContext();

export const loadAudio = async (): Promise<AudioBuffer> => {
    const response = await fetch(`${import.meta.env.BASE_URL}/music/paper-planes.mp3`)
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

export const shortTimeFourierTransform = (
    signal: Float32Array,
    frameSize: number,
    hopSize: number
): number[][] => {
    const numFrames: number = Math.ceil((signal.length - frameSize) / hopSize) + 1;
    const numFrequencyBins = frameSize / 2 + 1;
    const fft = new FFTR(frameSize);
    const stft: number[][] = [];

    for (let currentFrame = 0; currentFrame < numFrames; currentFrame++) {
        const frameStart = currentFrame * hopSize;
        const windowedFrame = new Array<number>(frameSize).fill(0);

        // Calculate the window
        for (let i = 0; i < frameSize; i++) {
            const index = frameStart + i;
            const sample = index >= signal.length ? 0 : signal[index];
            windowedFrame[i] = sample * hannWindow(i, frameSize)
        }
        const coefficients = fft.forward(windowedFrame);

        // Calculate magnitudes
        const magnitudes = new Array<number>(numFrequencyBins).fill(0);
        for (let i = 0; i < numFrequencyBins; i ++) {
            magnitudes[i] = Math.hypot(coefficients[2 * i], coefficients[2 * i + 1]);
        }

        stft.push(magnitudes);
    }
    return stft;
}

const getBinFrequency = (binIndex: number, binWidth: number) => {
    return binIndex * binWidth;
}

export const groupFrequencyBands = (stft: number[][], sampleRate: number, numBands: number) => {
    const frameCount = stft.length;
    const numBins = stft[0].length;
    const fftSize = 2 * (stft[0].length - 1);
    const binWidth = sampleRate / fftSize;
    const minFreq = 20;
    const nyquistFreq = sampleRate / 2;
    const spacings = logisticSpacing(minFreq, nyquistFreq, numBands);

    const grouped = Array.from({ length: frameCount }, () => new Array<number>(numBands).fill(0));
    for (let currentFrame = 0; currentFrame < frameCount; currentFrame++) {
        let currentBin = 0;
        spacings.forEach((spacing, spacingIndex) =>  {
            let numBinsAdded = 0;
            while (currentBin < numBins && getBinFrequency(currentBin, binWidth) < spacing.start) currentBin++;
            while (currentBin < numBins && getBinFrequency(currentBin, binWidth) < spacing.end) {
                grouped[currentFrame][spacingIndex] += stft[currentFrame][currentBin];
                numBinsAdded++;
                currentBin++;
            }
            if (numBinsAdded > 0) {
                grouped[currentFrame][spacingIndex] /= numBinsAdded;
            }
        })
    }

    return grouped;
}

export const magnitudeToHeight = (magnitude: number, maxHeight: number): number => {
    const minMagnitude = 1e-4;
    const minDB = 20 * Math.log10(minMagnitude);
    let db = 20 * Math.log10(Math.max(magnitude, minMagnitude));
    const normalized = (db - minDB) / -minDB;
    return normalized * maxHeight;
}