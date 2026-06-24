/**
 * recorder.js
 * Motor de grabación: captura de micrófono, MediaRecorder, visualizador de
 * forma de onda en vivo (canvas) y reproducción de tomas guardadas.
 */

const Recorder = (() => {
  let stream = null;
  let mediaRecorder = null;
  let chunks = [];
  let audioCtx = null;
  let analyser = null;
  let rafId = null;
  let onLevelCallback = null;

  function pickMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    return candidates.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  }

  async function requestMic() {
    if (stream) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  }

  function setupAnalyser(streamToAnalyse) {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const source = audioCtx.createMediaStreamSource(streamToAnalyse);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
  }

  function startLevelLoop(canvas) {
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext('2d');
    const data = new Uint8Array(analyser.fftSize);

    function draw() {
      analyser.getByteTimeDomainData(data);
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = '#E8542C';
      ctx2d.beginPath();
      const slice = w / data.length;
      let x = 0;
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        peak = Math.max(peak, Math.abs(v - 1));
        const y = (v * h) / 2;
        if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
        x += slice;
      }
      ctx2d.stroke();
      if (onLevelCallback) onLevelCallback(Taxonomy.clamp(peak * 2, 0, 1));
      rafId = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopLevelLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  async function start(canvasEl, onLevel) {
    onLevelCallback = onLevel || null;
    await requestMic();
    setupAnalyser(stream);
    if (canvasEl) startLevelLoop(canvasEl);

    chunks = [];
    const mimeType = pickMimeType();
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    const startedAt = Date.now();
    mediaRecorder.start();

    return new Promise((resolveStart) => {
      // Se resuelve apenas inicia; el caller espera a stop() para obtener el blob.
      resolveStart({ startedAt, mimeType: mimeType || 'audio/webm' });
    });
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) { reject(new Error('No hay grabación activa')); return; }
      mediaRecorder.onstop = () => {
        stopLevelLoop();
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        chunks = [];
        resolve({ blob, mimeType });
      };
      mediaRecorder.stop();
    });
  }

  function cancel() {
    stopLevelLoop();
    try { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); } catch (e) { /* noop */ }
    chunks = [];
  }

  function releaseMic() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function getBlobDuration(blob) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.src = url;
      audio.onloadedmetadata = () => {
        let d = audio.duration;
        // Chrome a veces reporta Infinity en blobs webm sin seek; forzamos un seek.
        if (!isFinite(d)) {
          audio.currentTime = 1e9;
          audio.ontimeupdate = () => {
            d = audio.duration;
            URL.revokeObjectURL(url);
            resolve(isFinite(d) ? d : 0);
          };
        } else {
          URL.revokeObjectURL(url);
          resolve(d);
        }
      };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    });
  }

  let activePlayback = null;
  function play(blob, onEnded) {
    stopPlayback();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activePlayback = audio;
    audio.play();
    audio.onended = () => { URL.revokeObjectURL(url); if (onEnded) onEnded(); };
    return audio;
  }

  function stopPlayback() {
    if (activePlayback) {
      activePlayback.pause();
      activePlayback = null;
    }
  }

  return { start, stop, cancel, releaseMic, getBlobDuration, play, stopPlayback };
})();

window.Recorder = Recorder;
