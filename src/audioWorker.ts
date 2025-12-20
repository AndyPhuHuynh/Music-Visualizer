/// <reference lib="webworker" />
import { calculateGlobalMaxDB, calculateLocalMaxDB, groupFrequencyBands, shortTimeFourierTransform } from "./audioAnalysis.ts";

self.onmessage = async (e) => {
    const samples = new Float32Array(e.data.samples);
    const sampleRate = e.data.sampleRate;

    const frameSize = 1 << 12;
    const hopSize = frameSize * (1 / 4);

    const stft = shortTimeFourierTransform(samples, frameSize, hopSize);
    const numBands = 128;
    const groupings = groupFrequencyBands(stft, sampleRate, numBands);

    const globalMaxDB = calculateGlobalMaxDB(stft);
    const localMaxDB = calculateLocalMaxDB(stft);

    self.postMessage({
            frameSize: frameSize,
            hopSize: hopSize,

            stft: stft,
            frequencyBands: groupings,
            globalMaxDB: globalMaxDB,
            localMaxes: localMaxDB
        },
    );
}