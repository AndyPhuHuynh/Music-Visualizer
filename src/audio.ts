import { hannWindow } from "./windowing.ts";
import { FFTR } from "kissfft-js";
import {  melSpacing } from "./spacing.ts";

export const magnitudeToDB = (magnitude: number): number => {
    return 20 * Math.log10(magnitude);
}

export const hzToMel = (hz: number): number => 2595 * Math.log10(1 + hz / 700);
export const melToHz = (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1);

const audioCtx = new AudioContext();
const MIN_MAGNITUDE = 1e-4;
const MIN_DB = magnitudeToDB(1e-4);

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
        const dbs = new Array<number>(numFrequencyBins).fill(0);
        for (let i = 0; i < numFrequencyBins; i ++) {
            const magnitude = Math.hypot(coefficients[2 * i], coefficients[2 * i + 1]);
            dbs[i] = magnitudeToDB(Math.max(magnitude, MIN_MAGNITUDE));
        }

        stft.push(dbs);
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
    const spacings = melSpacing(minFreq, nyquistFreq, numBands);
    console.log("Spacings:", spacings);

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

export const dbToHeight = (db: number, maxHeight: number): number => {
    const normalized = (db - MIN_DB) / -MIN_DB;
    return normalized * maxHeight;
}