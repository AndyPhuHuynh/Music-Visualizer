import type { AudioAnalysisData, AudioData } from "./audioAnalysis.ts";

const audioCtx = new AudioContext();

export type AudioSource =
    | { type: "file", file: File }
    | { type: "preset", url: string };

const runAudioWorker = (samples: Float32Array<ArrayBuffer>, sampleRate: number) =>
    new Promise<AudioAnalysisData>((resolve) => {
        const worker = new Worker(
            new URL("./audioWorker.ts", import.meta.url),
            { type: "module" }
        );

        worker.onmessage = (e) => {
            resolve({
                ...e.data,
                samples: e.data.samples
            });
            worker.terminate();
        };

        worker.postMessage({ samples: samples.buffer, sampleRate }, [samples.buffer]);
    });

export const loadAudioSource = async (audio: AudioSource): Promise<AudioData> => {
    const arrayBuffer =
        audio.type === "file"
            ? await audio.file.arrayBuffer()
            : await fetch(`${import.meta.env.BASE_URL}/${audio.url}`).then(r => r.arrayBuffer());

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    let monoChannel: Float32Array<ArrayBuffer>;
    if (audioBuffer.numberOfChannels > 1) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        monoChannel = new Float32Array(left.length);
        for (let i = 0; i < left.length; i++) {
            monoChannel[i] = (left[i] + right[i]) / 2;
        }
    } else {
        monoChannel = audioBuffer.getChannelData(0);
    }

    const analysis = await runAudioWorker(monoChannel, audioBuffer.sampleRate);


    return {
        audioBuffer: audioBuffer,

        frameSize: analysis.frameSize,
        hopSize: analysis.hopSize,

        stft: analysis.stft,
        frequencyBands: analysis.frequencyBands,
        globalMaxDB: analysis.globalMaxDB,
        localMaxes: analysis.localMaxes,
    };
}

export const playAudio = async (audioBuffer: AudioBuffer) => {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    const audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;

    audioSource.channelCount = 2
    audioSource.channelCountMode = "explicit";
    audioSource.channelInterpretation = "speakers";

    audioSource.connect(audioCtx.destination);
    audioSource.start(0)
}