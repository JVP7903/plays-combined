class RecorderWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      this.port.postMessage({ type: "data", buffer: channelData.slice() });
    }
    return true;
  }
}

registerProcessor("recorder-worklet", RecorderWorklet);
