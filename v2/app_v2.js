const playBtn = document.getElementById("playBtn");
const continueBtn = document.getElementById("continueBtn");
const successBtn = document.getElementById("successBtn");
const retryBtn = document.getElementById("retryBtn");
const stopBtn = document.getElementById("stopBtn");
const micStatus = document.getElementById("micStatus");
const stepStatus = document.getElementById("stepStatus");
const content = document.getElementById("content");
const childNameInput = document.getElementById("childName");
const parentNameInput = document.getElementById("parentName");

let playData = null;
let scenesById = {};
let sceneOrder = [];
let nextSceneByOrder = {};
let currentSceneId = null;
let currentAudio = null;
let micStream = null;
let isPlaying = false;
let recognition = null;
let listenTimeout = null;
let activeListenScene = null;
let autoAdvanceTriggered = false;
let heardSpeech = false;
let silenceTimeout = null;
let lastTranscript = "";
let recognitionReady = false;
let audioBasePath = "/cache/v2";
let searchDecisionTimer = null;
let openMicLoopAudio = null;
const BASE_AUDIO_PATH = "/audio/v2";
let mediaRecorder = null;
let recordingChunks = [];
let recordingActive = false;

const DEFAULT_AUDIO_DELAY_MS = 500;
const DEFAULT_LISTEN_SECONDS = 7;
const MAX_LISTEN_MS = 7000;
const SEARCH_DECISION_SILENCE_MS = 900;
const SPEECH_END_SILENCE_MS = 2000;
const CONFIRM_SILENCE_AUTO_ADVANCE_MS = 5000;
const ELEVENLABS_VOICE_ID = "eDSwXWQpjryYdVtrkP7I";
const ELEVENLABS_MODEL = "eleven_v3";
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";

const COLORS = ["pink", "blue", "purple", "green"];

const nextConfirmPatterns = [
  /\byes\b/i,
  /\byeah\b/i,
  /\byep\b/i,
  /\bokay\b/i,
  /\bok\b/i,
  /let'?s go/i,
  /let'?s do it/i,
  /let'?s move on/i,
  /move on/i,
  /ready/i
];

const countConfirmPatterns = [/\bfour\b/i, /\b4\b/i];

const searchSuccessPatterns = [
  /\byou found it\b/i,
  /\byou got it\b/i,
  /\bi found it\b/i,
  /\bi found one\b/i,
  /\bi got it\b/i,
  /\bgot it\b/i,
  /\bhere it is\b/i,
  /\bthere it is\b/i,
  /\bthis is it\b/i,
  /\bi see it\b/i,
  /\bi have it\b/i,
  /\bi have one\b/i,
  /\bwe found it\b/i,
  /\bwe got it\b/i,
  /\bthat'?s it\b/i,
  /\bthat'?s the one\b/i,
  /\bthat'?s right\b/i,
  /\bcorrect\b/i
];

const searchRetryPatterns = [
  /not yet/i,
  /can't find/i,
  /cannot find/i,
  /don't see/i,
  /do not see/i,
  /no (it|one)/i,
  /nope,? not yet/i,
  /nope/i,
  /not sure/i,
  /didn't find/i,
  /did not find/i,
  /good try/i,
  /not that/i,
  /that's not/i,
  /try again/i,
  /let'?s try again/i,
  /keep looking/i,
  /still looking/i,
  /wrong/i,
  /almost/i
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadPlay() {
  if (playData) return;
  const response = await fetch("/v2/learning_colors_v2.json");
  if (!response.ok) {
    throw new Error("Failed to load play JSON");
  }
  playData = await response.json();
  sceneOrder = playData.scenes.map((scene) => scene.id);
  scenesById = Object.fromEntries(playData.scenes.map((scene) => [scene.id, scene]));
  nextSceneByOrder = sceneOrder.reduce((acc, id, index) => {
    acc[id] = sceneOrder[index + 1] || null;
    return acc;
  }, {});
}

async function generateAudioCache() {
  setStatus("Generating audio");
  setContent("<p>Generating audio for this play…</p>");
  const response = await fetch("/generate?play=v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      childName: childNameInput.value.trim(),
      parentName: parentNameInput.value.trim(),
      voiceId: ELEVENLABS_VOICE_ID,
      model: ELEVENLABS_MODEL,
      outputFormat: ELEVENLABS_OUTPUT_FORMAT
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to generate audio");
  }

  const data = await response.json();
  audioBasePath = data.audioBasePath || "./audio";
}

function setStatus(text) {
  stepStatus.textContent = text;
}

function setContent(html) {
  content.innerHTML = html;
}

function setButtons({ canContinue, canBranch, canStop }) {
  continueBtn.disabled = !canContinue;
  successBtn.disabled = !canBranch;
  retryBtn.disabled = !canBranch;
  stopBtn.disabled = !canStop;
}

function setMicStatus(text) {
  micStatus.textContent = text;
}

async function requestMic() {
  if (micStream) {
    return;
  }
  setMicStatus("Requesting...");
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMicStatus("Open (listening)");
  } catch (error) {
    setMicStatus("Denied");
    throw error;
  }
}

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }
  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

function stopRecognition() {
  if (recognition) {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch (error) {
      // ignore
    }
  }
  recognition = null;
  recognitionReady = false;
}

function stopFallbackRecording() {
  if (mediaRecorder && recordingActive) {
    try {
      mediaRecorder.stop();
    } catch (error) {
      // ignore
    }
  }
  recordingActive = false;
}

function clearListenTimeout() {
  if (listenTimeout) {
    clearTimeout(listenTimeout);
    listenTimeout = null;
  }
}

function clearSilenceTimeout() {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
}

function clearSearchDecisionTimer() {
  if (searchDecisionTimer) {
    clearTimeout(searchDecisionTimer);
    searchDecisionTimer = null;
  }
}

function ensureRecognitionRunning() {
  if (recognitionReady || !recognition) return;
  recognitionReady = true;
  try {
    recognition.start();
  } catch (error) {
    // ignore
  }
}

async function handleAutoAdvance() {
  if (autoAdvanceTriggered) return;
  autoAdvanceTriggered = true;
  clearListenTimeout();
  clearSilenceTimeout();
  clearSearchDecisionTimer();
  stopLoopAudio();
  stopRecognition();
  stopFallbackRecording();
  await new Promise((resolve) => setTimeout(resolve, 0));
  continueBtn.click();
}

function stopMic() {
  if (!micStream) return;
  micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
  setMicStatus("Closed");
}

function applyVariables(text) {
  if (!text) return "";
  const childName = childNameInput.value.trim();
  const parentName = parentNameInput.value.trim();
  return text
    .replaceAll("{{child_name}}", childName)
    .replaceAll("{{parent_name}}", parentName);
}

async function transcribeRecording(scene) {
  if (!recordingChunks.length) {
    return "";
  }
  const blob = new Blob(recordingChunks, { type: recordingChunks[0]?.type || "audio/webm" });
  const formData = new FormData();
  formData.append("file", blob, "speech.webm");

  const response = await fetch("/transcribe", {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    return "";
  }
  const data = await response.json();
  const transcript = (data.text || "").trim();
  lastTranscript = transcript;
  return transcript;
}

function shouldAutoAdvanceFromTranscript(scene, transcript) {
  if (!transcript) return true;
  if (isConfirmScene(scene)) {
    return shouldTriggerNextConfirm(transcript);
  }
  return true;
}

function startFallbackRecording(scene, durationMs) {
  if (!micStream || !window.MediaRecorder) return;
  if (recordingActive) return;
  recordingChunks = [];
  mediaRecorder = new MediaRecorder(micStream);
  recordingActive = true;

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordingChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    recordingActive = false;
    const transcript = await transcribeRecording(scene);
    if (shouldAutoAdvanceFromTranscript(scene, transcript)) {
      handleAutoAdvance();
    } else {
      handleAutoAdvance();
    }
  };

  mediaRecorder.start();
  setTimeout(() => {
    stopFallbackRecording();
  }, durationMs);
}

function getAudioSrc(audioFile, useCache = true) {
  if (useCache && audioBasePath && audioBasePath !== BASE_AUDIO_PATH) {
    return `${audioBasePath}/${audioFile}`;
  }
  return `${BASE_AUDIO_PATH}/${audioFile}`;
}

function getSceneColor(scene) {
  if (!scene?.id) return "";
  for (const color of COLORS) {
    if (scene.id.includes(color)) return color;
  }
  return "";
}

function isSearchScene(scene) {
  return scene?.type === "listen" && /_result_check$/.test(scene.id || "");
}

function isCountScene(scene) {
  return scene?.type === "listen" && scene.id === "listen_counting";
}

function isIntroConfirmScene(scene) {
  return scene?.type === "listen" && /^listen_intro_confirm/.test(scene.id || "");
}

function isChildConfirmScene(scene) {
  return scene?.type === "listen" && /^listen_child_ready_/.test(scene.id || "");
}

function isMoveOnConfirmScene(scene) {
  return scene?.type === "listen" && /^listen_move_on_/.test(scene.id || "");
}

function isConfirmScene(scene) {
  return isIntroConfirmScene(scene) || isChildConfirmScene(scene) || isMoveOnConfirmScene(scene);
}

function shouldTriggerNextConfirm(transcript) {
  return nextConfirmPatterns.some((pattern) => pattern.test(transcript));
}

function shouldTriggerCount(transcript) {
  return countConfirmPatterns.some((pattern) => pattern.test(transcript));
}

function isMeaningfulTranscript(text, scene) {
  const cleaned = text.trim();
  if (!cleaned) return false;
  const hasConfirm = shouldTriggerNextConfirm(cleaned);
  const hasSearch =
    searchSuccessPatterns.some((pattern) => pattern.test(cleaned)) ||
    searchRetryPatterns.some((pattern) => pattern.test(cleaned));
  const hasCount = shouldTriggerCount(cleaned);

  if (scene?.id === "listen_intro_response") {
    return cleaned.length >= 1;
  }

  if (isConfirmScene(scene)) {
    return hasConfirm;
  }

  if (hasConfirm || hasSearch || hasCount) return true;
  return cleaned.length >= 1;
}

function classifySearchDecision(transcript, scene) {
  if (!transcript) return "unknown";
  const text = transcript.toLowerCase();

  const color = getSceneColor(scene);
  if (color) {
    const foundColor = new RegExp(`\\b(i|you)\\s+found\\s+${color}\\b`, "i");
    if (foundColor.test(text)) return "correct";
  }

  if (searchSuccessPatterns.some((pattern) => pattern.test(text))) return "correct";
  if (searchRetryPatterns.some((pattern) => pattern.test(text))) return "wrong";
  return "unknown";
}

function getNextSceneId(scene) {
  return scene.next || nextSceneByOrder[scene.id] || null;
}

function classifyIntro(transcript) {
  const bad = /\b(bad|sad|not good|awful|terrible|sick|tired|angry|upset)\b/i;
  const good = /\b(good|great|awesome|amazing|fine|happy)\b/i;
  if (bad.test(transcript)) return "bad_day";
  if (good.test(transcript)) return "good_day";
  return "general";
}

function classifyCorrectWrong(transcript, scene) {
  if (isSearchScene(scene)) {
    return classifySearchDecision(transcript, scene);
  }
  const correct = /\b(you found it|you got it|i found it|i found one|i got it|got it|here it is|there it is|this is it|i see it|i have it|i have one|we found it|we got it|that'?s it|that'?s the one|that'?s right|correct)\b/i;
  const wrong = /\b(no|not|wrong|try again|almost)\b/i;
  if (correct.test(transcript)) return "correct";
  if (wrong.test(transcript)) return "wrong";
  return "unknown";
}

function selectBranch(scene, transcript) {
  const branches = scene.branches || {};
  const keys = Object.keys(branches);
  if (!keys.length) return null;

  if (keys.includes("good_day") || keys.includes("bad_day")) {
    const decision = classifyIntro(transcript);
    return branches[decision] || branches.general || branches[keys[0]];
  }

  if (keys.includes("correct") || keys.includes("wrong")) {
    const decision = classifyCorrectWrong(transcript, scene);
    if (decision === "correct" && branches.correct) return branches.correct;
    if (decision === "wrong" && branches.wrong) return branches.wrong;
    return branches.wrong || branches[keys[0]];
  }

  return branches[keys[0]];
}

async function playAudioFile(audioFile, delayMs, text) {
  stopLoopAudio();
  const cacheSrc = getAudioSrc(audioFile, true);
  const baseSrc = getAudioSrc(audioFile, false);
  setStatus(`Playing: ${audioFile}`);
  setContent(`<strong>Audio:</strong> ${audioFile}<br /><em>${text || ""}</em>`);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  if (currentAudio) {
    currentAudio.pause();
  }
  currentAudio = new Audio(cacheSrc);
  currentAudio.addEventListener(
    "error",
    () => {
      if (cacheSrc !== baseSrc) {
        currentAudio.src = baseSrc;
        currentAudio.play().catch(() => {});
      }
    },
    { once: true }
  );
  await currentAudio.play();
  await new Promise((resolve) => {
    currentAudio.addEventListener("ended", resolve, { once: true });
  });
}

function showOpenMic(scene) {
  setStatus(`Open mic: ${scene.id}`);
  const duration = scene.duration_seconds ?? DEFAULT_LISTEN_SECONDS;
  const timingText = isSearchScene(scene) || isCountScene(scene)
    ? ""
    : isConfirmScene(scene)
      ? `Auto-advance after ${Math.round(CONFIRM_SILENCE_AUTO_ADVANCE_MS / 1000)}s if no speech.`
      : `Auto-advance after ${duration}s if no speech.`;
  setContent(
    `<p><strong>Listening…</strong> (mic stays open)</p>
     ${timingText ? `<p><em>${timingText}</em></p>` : ""}`
  );
  const canBranch = Boolean(scene?.branches?.correct || scene?.branches?.wrong);
  setButtons({ canContinue: true, canBranch, canStop: true });
}

function startLoopAudio(audioFile) {
  stopLoopAudio();
  const cacheSrc = getAudioSrc(audioFile, true);
  const baseSrc = getAudioSrc(audioFile, false);
  const audio = new Audio(cacheSrc);
  audio.loop = true;
  audio.volume = 0.18;
  audio.addEventListener(
    "error",
    () => {
      if (cacheSrc !== baseSrc) {
        audio.src = baseSrc;
        audio.play().catch(() => {});
      }
    },
    { once: true }
  );
  audio.play().catch(() => {});
  openMicLoopAudio = audio;
}

function stopLoopAudio() {
  if (openMicLoopAudio) {
    openMicLoopAudio.pause();
    openMicLoopAudio = null;
  }
}

function scheduleSilenceAdvance(ms) {
  clearSilenceTimeout();
  silenceTimeout = setTimeout(() => {
    handleAutoAdvance();
  }, ms);
}

function scheduleSearchDecision(scene) {
  clearSearchDecisionTimer();
  searchDecisionTimer = setTimeout(() => {
    if (!activeListenScene) return;
    const decision = classifySearchDecision(lastTranscript, scene);
    if (decision === "correct" || decision === "wrong") {
      handleAutoAdvance();
    }
  }, SEARCH_DECISION_SILENCE_MS);
}

function handleTranscript(transcript, isFinal, scene) {
  if (!activeListenScene || !transcript) return;
  const cleaned = transcript.trim();
  if (!isMeaningfulTranscript(cleaned, scene)) return;
  heardSpeech = true;
  lastTranscript = cleaned;

  clearListenTimeout();
  clearSilenceTimeout();

  if (!isFinal && !isConfirmScene(scene)) {
    scheduleSilenceAdvance(SPEECH_END_SILENCE_MS);
    return;
  }

  if (scene?.id === "listen_intro_response") {
    scheduleSilenceAdvance(SPEECH_END_SILENCE_MS);
    return;
  }

  if (isCountScene(scene)) {
    scheduleSilenceAdvance(SPEECH_END_SILENCE_MS);
    return;
  }

  if (isConfirmScene(scene)) {
    if (shouldTriggerNextConfirm(cleaned)) {
      handleAutoAdvance();
    }
    return;
  }

  if (isSearchScene(scene)) {
    scheduleSearchDecision(scene);
    return;
  }

  scheduleSilenceAdvance(SPEECH_END_SILENCE_MS);
}

async function runScene(scene) {
  if (!scene) return;

  if (scene.type === "tts" || scene.type === "audio") {
    const text = applyVariables(scene.text);
    const audioFile = scene.audio_file;
    await playAudioFile(audioFile, DEFAULT_AUDIO_DELAY_MS, text);
    return;
  }

  if (scene.type === "listen") {
    activeListenScene = scene;
    autoAdvanceTriggered = false;
    heardSpeech = false;
    lastTranscript = "";
    clearListenTimeout();
    clearSilenceTimeout();
    clearSearchDecisionTimer();
    showOpenMic(scene);

    if (isSearchScene(scene)) {
      startLoopAudio("searching_song.mp3");
    }

    if (recognition) {
      ensureRecognitionRunning();
    } else if (window.MediaRecorder) {
      const durationMs = (scene.duration_seconds ?? DEFAULT_LISTEN_SECONDS) * 1000;
      startFallbackRecording(scene, durationMs);
    }

    const duration = scene.duration_seconds ?? DEFAULT_LISTEN_SECONDS;
    if (!isSearchScene(scene) && !isCountScene(scene)) {
      const timeoutMs = isConfirmScene(scene)
        ? CONFIRM_SILENCE_AUTO_ADVANCE_MS
        : duration * 1000;
      listenTimeout = setTimeout(() => {
        if (!heardSpeech) {
          handleAutoAdvance();
        }
      }, timeoutMs);
    }
    return;
  }
}

async function runSequence() {
  isPlaying = true;
  playBtn.disabled = true;
  setButtons({ canContinue: false, canBranch: false, canStop: true });

  while (currentSceneId && isPlaying) {
    const scene = scenesById[currentSceneId];
    if (!scene) {
      break;
    }

    if (scene.type === "listen") {
      await runScene(scene);
      return;
    }

    await runScene(scene);
    currentSceneId = getNextSceneId(scene);
  }

  finishPlay();
}

function finishPlay() {
  isPlaying = false;
  playBtn.disabled = false;
  setButtons({ canContinue: false, canBranch: false, canStop: false });
  setStatus("Complete");
  setContent("<p>Play finished.</p>");
  clearListenTimeout();
  clearSilenceTimeout();
  clearSearchDecisionTimer();
  stopLoopAudio();
  stopFallbackRecording();
  stopRecognition();
  stopMic();
}

playBtn.addEventListener("click", async () => {
  try {
    await loadPlay();
    const childName = childNameInput.value.trim();
    const parentName = parentNameInput.value.trim();
    if (!childName || !parentName) {
      setStatus("Missing names");
      setContent("<p>Please enter both the child name and parent name.</p>");
      return;
    }
    await generateAudioCache();
    currentSceneId = sceneOrder[0];
    setStatus("Mic permission");
    setContent("<p>Before we start, can I use your microphone?</p>");
    setButtons({ canContinue: false, canBranch: false, canStop: true });
    await requestMic();

    recognition = initRecognition();
    if (!recognition) {
      setContent(
        "<p><strong>Speech recognition is not supported in this browser.</strong> Use Continue manually during listen steps.</p>"
      );
    } else {
      recognition.onresult = (event) => {
        if (!activeListenScene) return;
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        const transcript = (latestResult?.[0]?.transcript || "").trim();
        const isFinal = Boolean(latestResult?.isFinal);
        if (!transcript) return;
        handleTranscript(transcript, isFinal, activeListenScene);
      };

      recognition.onerror = () => {
        // fallback to timeouts
      };

      recognition.onend = () => {
        recognitionReady = false;
        if (activeListenScene) {
          ensureRecognitionRunning();
        }
      };

      ensureRecognitionRunning();
    }

    await runSequence();
  } catch (error) {
    setStatus("Error");
    setContent(`<p>${error.message}</p>`);
    playBtn.disabled = false;
  }
});

continueBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  if (activeListenScene) {
    const scene = activeListenScene;
    activeListenScene = null;
    const transcript = lastTranscript || "";
    stopLoopAudio();
    let nextId = getNextSceneId(scene);
    if (scene.branches) {
      nextId = selectBranch(scene, transcript) || nextId;
    }
    currentSceneId = nextId;
  } else {
    const scene = scenesById[currentSceneId];
    currentSceneId = getNextSceneId(scene);
  }
  await runSequence();
});

successBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  if (!activeListenScene?.branches?.correct) return;
  currentSceneId = activeListenScene.branches.correct;
  activeListenScene = null;
  stopLoopAudio();
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  await runSequence();
});

retryBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  if (!activeListenScene?.branches?.wrong) return;
  currentSceneId = activeListenScene.branches.wrong;
  activeListenScene = null;
  stopLoopAudio();
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  await runSequence();
});

stopBtn.addEventListener("click", () => {
  isPlaying = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  clearListenTimeout();
  clearSilenceTimeout();
  clearSearchDecisionTimer();
  stopLoopAudio();
  stopFallbackRecording();
  stopRecognition();
  stopMic();
  audioBasePath = "./audio";
  playData = null;
  scenesById = {};
  sceneOrder = [];
  nextSceneByOrder = {};
  currentSceneId = null;
  activeListenScene = null;
  playBtn.disabled = false;
  setButtons({ canContinue: false, canBranch: false, canStop: false });
  setStatus("Stopped");
  setContent("<p>Playback stopped.</p>");
});
