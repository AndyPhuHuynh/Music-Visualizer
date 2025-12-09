import { hannWindow } from "./windowing.ts";
import { FFTR } from "kissfft-js";
import { Spacing, melSpacing } from "./spacing.ts";
import { clamp } from "./utils.ts";

export type Magnitude = number & { readonly __brand: "Magnitude" };
export type DB = number & { readonly __brand: "Db" };

export const magnitudeToDB = (magnitude: Magnitude): DB => {
    return (20 * Math.log10(magnitude)) as DB;
}

export const hzToMel = (hz: number): number => 2595 * Math.log10(1 + hz / 700);
export const melToHz = (mel: number): number => 700 * (Math.pow(10, mel / 2595) - 1);

const audioCtx = new AudioContext();
const audioSource = audioCtx.createBufferSource();

const MIN_MAGNITUDE = 1e-4 as Magnitude;
const MIN_DB = magnitudeToDB(MIN_MAGNITUDE);

export const shortTimeFourierTransform = (
    signal: Float32Array,
    frameSize: number,
    hopSize: number
): Magnitude[][] => {
    const numFrames: number = Math.ceil((signal.length - frameSize) / hopSize) + 1;
    const numFrequencyBins = frameSize / 2 + 1;
    const fft = new FFTR(frameSize);
    const stft: Magnitude[][] = [];

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
        const magnitudes = new Array<Magnitude>(numFrequencyBins).fill(0 as Magnitude);
        for (let i = 0; i < numFrequencyBins; i ++) {
            magnitudes[i] = Math.hypot(coefficients[2 * i], coefficients[2 * i + 1]) as Magnitude;
        }

        stft.push(magnitudes);
    }
    return stft;
}

export const groupFrequencyBands = (
    stft: Magnitude[][],
    sampleRate: number,
    numBands: number
) => {
    const frameCount = stft.length;
    const numBins = stft[0].length;
    const fftSize = 2 * (stft[0].length - 1);
    const binWidth = sampleRate / fftSize;
    const minFreq = 20;
    const nyquistFreq = sampleRate / 2;
    const spacings = melSpacing(minFreq, nyquistFreq, numBands);
    console.log("Spacings:", spacings);

    const bandIndices = spacings.map((spacing: Spacing) => ({
        startIndex: Math.ceil(spacing.start / binWidth),
        endIndex: Math.min(numBins, Math.ceil(spacing.end / binWidth)),
    }));
    console.log("Bands:", bandIndices);

    const grouped: DB[][] = Array.from({ length: frameCount }, () => new Array<DB>(numBands).fill(MIN_DB));
    for (let currentFrame = 0; currentFrame < frameCount; currentFrame++) {
        bandIndices.forEach((band, spacingIndex) => {
            let sum = 0 as Magnitude;
            let numBindsAdded = 0;
            for (let i = band.startIndex; i < band.endIndex; i++) {
                if (i >= numBins) break;
                sum = (sum + stft[currentFrame][i]) as Magnitude
                numBindsAdded++;
            }
            if (numBindsAdded > 0) {
                const avgMagnitude = (sum / numBindsAdded) as Magnitude;
                grouped[currentFrame][spacingIndex] = magnitudeToDB(Math.max(avgMagnitude, MIN_MAGNITUDE) as Magnitude);
            }
        })
    }

    return grouped;
}

const calculateGlobalMaxDB = (stft: Magnitude[][]): DB => {
    let max: DB = -Infinity as DB;
    for (const row of stft) {
        for (const val of row) {
            const db: DB = magnitudeToDB(val);
            if (db > max) max = db;
        }
    }
    return max;
};

const calculateLocalMaxDB = (stft: Magnitude[][]): DB[] => {
    let max: DB[] = new Array<DB>(stft.length).fill(-Infinity as DB);
    const searchWidth = 50;
    for (let frame = 0; frame < stft.length; frame++) {
        let localMax = -Infinity as DB;
        for (let searchFrame = frame - searchWidth / 2; searchFrame < frame + searchWidth / 2; searchFrame++) {
            if (searchFrame < 0) continue;
            if (searchFrame >= stft.length) continue;

            let frameMaxMag = Math.max(...stft[searchFrame]) as Magnitude;
            let frameMaxDb = magnitudeToDB(frameMaxMag);
            if (frameMaxDb > localMax) localMax = frameMaxDb;
        }
        max[frame] = localMax;
    }
    return max;
}

export const dbToHeight = (db: DB, maxDb: DB, maxHeight: number): number => {
    const range = maxDb - MIN_DB;
    const clampedDb = clamp(db, MIN_DB, maxDb);
    const normalized = (clampedDb - MIN_DB) / range;
    if (normalized < 0) {
        console.log(`Normalized: ${normalized}, DB: ${db}`);
    }
    return Math.pow(normalized, 5) * maxHeight;
}

export interface AudioData {
    audioBuffer: AudioBuffer;

    frameSize: number;
    hopSize: number;

    stft: Magnitude[][];
    frequencyBands: DB[][];
    globalMaxDB: DB;
    localMaxes: DB[];
}

export const loadAudio = async (): Promise<AudioData> => {
    const response = await fetch(`${import.meta.env.BASE_URL}/music/megalovania.flac`)
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const samples = audioBuffer.getChannelData(0);
    const frameSize = 2 << 12;
    const hopSize = frameSize * (1 / 4);

    const stft = shortTimeFourierTransform(samples, frameSize, hopSize);
    const numBands = 128;
    const groupings = groupFrequencyBands(stft, audioBuffer.sampleRate, numBands);

    return {
        audioBuffer: audioBuffer,

        frameSize: frameSize,
        hopSize: hopSize,

        stft: stft,
        frequencyBands: groupings,
        globalMaxDB: calculateGlobalMaxDB(stft),
        localMaxes: calculateLocalMaxDB(stft)
    };
}

export const playAudio = (audioBuffer: AudioBuffer) => {
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioCtx.destination);
    audioSource.start(0)
}