/**
 * StoryAudioProcessor — High-performance AudioWorkletProcessor.
 * Captures microphone audio on the Web Audio rendering thread,
 * calculates RMS volume levels, and streams 2048-sample Float32 buffers.
 */
class StoryAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0];
    const len = channelData.length;

    // Calculate root-mean-square (RMS) for signal detection and live VU meter
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.min(1, Math.sqrt(sum / len) * 4);

    // Buffer audio into uniform chunks for downstream downsampling & Whisper STT
    for (let i = 0; i < len; i++) {
      this.buffer[this.index++] = channelData[i];
      if (this.index >= this.bufferSize) {
        this.port.postMessage({
          type: 'audio-chunk',
          buffer: this.buffer.slice(0),
          rms: rms
        });
        this.index = 0;
      }
    }

    // Pass through to output so the Web Audio rendering graph remains continuously clocked
    const output = outputs[0];
    if (output && output[0]) {
      output[0].set(channelData);
    }

    return true;
  }
}

registerProcessor('story-audio-processor', StoryAudioProcessor);
