// services/stt.js
// Speech-to-Text usando la Web Speech API nativa (SpeechRecognition).
//
// IMPORTANTE — limitación real, no un bug:
// A diferencia del TTS (services/voice.js), que ya funciona sin
// conexión una vez que el navegador tiene voces instaladas, este
// reconocimiento de voz SÍ necesita internet en la mayoría de los
// casos: Chrome manda el audio a un servidor para transcribirlo.
// No hay forma de evitar esto con Web APIs nativas sin meter un
// modelo de reconocimiento de voz local (mucho más pesado y fuera
// del alcance de esta fase).

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

export function isSTTSupported() {
  return !!SpeechRecognitionAPI;
}

/**
 * Empieza a escuchar al usuario. Llama a los callbacks según corresponda.
 * @param {object} handlers - { onResult(alternatives[]), onError(code), onEnd() }
 */
export function startListening({ onResult, onError, onEnd } = {}) {
  if (!SpeechRecognitionAPI) {
    if (onError) onError("not-supported");
    return false;
  }
  if (isListening) return false;

  recognition = new SpeechRecognitionAPI();
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    const alternatives = Array.from(event.results[0]).map((alt) =>
      alt.transcript.trim()
    );
    if (onResult) onResult(alternatives);
  };

  recognition.onerror = (event) => {
    isListening = false;
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    isListening = false;
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
    isListening = true;
    return true;
  } catch (err) {
    if (onError) onError("start-failed");
    return false;
  }
}

export function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Compara lo que el reconocimiento escuchó contra el carácter esperado.
 * Es una evaluación BÁSICA (texto exacto/contenido), no un análisis real
 * de fonética. Suficiente para confirmar que el usuario dijo el sonido
 * correcto, no para medir qué tan "bien pronunciado" estuvo.
 */
export function checkPronunciation(alternatives, targetChar) {
  return alternatives.some((t) => {
    const cleaned = t.replace(/[\s。、！？.,]/g, "");
    return cleaned.includes(targetChar);
  });
}

window.NihonGoSTT = {
  isSTTSupported,
  startListening,
  stopListening,
  checkPronunciation,
};
