// ui/pronunciation.js
// Modo de práctica "Hablar": el usuario pronuncia el carácter y la app
// evalúa con reconocimiento de voz. Ver services/stt.js para la nota
// importante sobre la dependencia de internet.

import { addXP } from "../core/progress.js";
import { pickNextKana, recordAnswer } from "../core/srs.js";
import { speakJapanese } from "../services/voice.js";
import {
  startListening,
  isSTTSupported,
  checkPronunciation,
} from "../services/stt.js";

const ERROR_MESSAGES = {
  "not-allowed": "Activa el permiso del micrófono para Chrome en los ajustes del celular.",
  "no-speech": "No se detectó tu voz. Acércate al micrófono e intenta de nuevo.",
  network: "El reconocimiento de voz necesita conexión a internet.",
  "audio-capture": "No se encontró un micrófono disponible.",
  "not-supported": "Tu navegador no soporta reconocimiento de voz. Usa Chrome en Android.",
};

let currentChar = null;
let recordedThisRound = false;

export function renderPronunciation(container) {
  if (!isSTTSupported()) {
    container.innerHTML = `<p class="error-msg">${ERROR_MESSAGES["not-supported"]}</p>`;
    return;
  }
  nextPronQuestion(container);
}

function nextPronQuestion(container) {
  const kanaList = window.NihonGoData.kana;
  const question = pickNextKana(kanaList, currentChar);
  currentChar = question.char;
  recordedThisRound = false;

  container.innerHTML = `
    <p class="quiz-instruction">Pronuncia este carácter en voz alta</p>

    <section class="card quiz-card">
      <button class="quiz-char-btn" id="btn-hint" aria-label="Escuchar ejemplo">
        <span class="quiz-char">${question.char}</span>
        <span class="speaker-icon">🔊</span>
      </button>
    </section>

    <button class="mic-btn" id="btn-mic">
      <span class="mic-icon">🎤</span>
      <span class="mic-label">Toca y habla</span>
    </button>

    <p class="quiz-feedback" id="quiz-feedback"></p>
    <div class="pron-actions" id="pron-actions"></div>
  `;

  container.querySelector("#btn-hint").addEventListener("click", () => speakJapanese(question.char));

  const micBtn = container.querySelector("#btn-mic");
  micBtn.addEventListener("click", () => handleMicTap(container, question, micBtn));
}

function handleMicTap(container, question, micBtn) {
  const feedback = container.querySelector("#quiz-feedback");
  feedback.textContent = "";
  feedback.className = "quiz-feedback";

  micBtn.classList.add("listening");
  micBtn.querySelector(".mic-label").textContent = "Escuchando...";

  startListening({
    onResult: (alternatives) => {
      const correct = checkPronunciation(alternatives, question.char);
      showFeedback(container, question, correct, alternatives[0] || "");
    },
    onError: (err) => {
      feedback.textContent = ERROR_MESSAGES[err] || "Hubo un error, intenta de nuevo.";
      feedback.className = "quiz-feedback feedback-incorrect";
    },
    onEnd: () => {
      micBtn.classList.remove("listening");
      micBtn.querySelector(".mic-label").textContent = "Toca y habla";
    },
  });
}

function showFeedback(container, question, correct, heard) {
  const feedback = container.querySelector("#quiz-feedback");
  const actions = container.querySelector("#pron-actions");

  if (correct) {
    feedback.textContent = "¡Bien pronunciado! +10 XP";
    feedback.className = "quiz-feedback feedback-correct";
  } else {
    feedback.textContent = heard
      ? `Se escuchó "${heard}" — la respuesta es "${question.char}"`
      : `No se reconoció bien. La respuesta es "${question.char}"`;
    feedback.className = "quiz-feedback feedback-incorrect";
  }

  // Solo se registra el PRIMER intento de cada pregunta (igual que el
  // quiz de opción múltiple). Reintentar es para practicar, no para
  // "forzar" el sistema de repetición.
  if (!recordedThisRound) {
    recordAnswer(question.char, correct);
    if (correct) addXP(10);
    recordedThisRound = true;
  }

  actions.innerHTML = correct
    ? `<button class="btn btn-secondary" id="btn-next">Siguiente →</button>`
    : `<button class="btn btn-secondary" id="btn-retry">Intentar de nuevo</button>
       <button class="btn btn-primary" id="btn-skip">Siguiente →</button>`;

  actions.querySelector("#btn-next")?.addEventListener("click", () => nextPronQuestion(container));
  actions.querySelector("#btn-skip")?.addEventListener("click", () => nextPronQuestion(container));
  actions.querySelector("#btn-retry")?.addEventListener("click", () => {
    actions.innerHTML = "";
    const micBtn = container.querySelector("#btn-mic");
    handleMicTap(container, question, micBtn);
  });
}
