/**
 * StoryAudioProcessor — High-performance AudioWorkletProcessor.
 * Replaces deprecated ScriptProcessorNode for real-time PCM audio streaming.
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
    if (!input || !input[0]) {
      return true;
    }

    const channelData = input[0];
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.min(1, Math.sqrt(sum / channelData.length) * 5);

    for (let i = 0; i < channelData.length; i++) {
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

    return true;
  }
}

registerProcessor('story-audio-processor', StoryAudioProcessor);
