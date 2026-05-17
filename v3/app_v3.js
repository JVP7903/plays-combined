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
let lastTranscript = "";
let recognitionReady = false;
let audioBasePath = "/cache/v3";
const BASE_AUDIO_PATH = "/audio/v3";

const DEFAULT_AUDIO_DELAY_MS = 500;
const INTRO_LISTEN_SECONDS = 7;
const DEFAULT_LISTEN_SECONDS = 8;
const ELEVENLABS_VOICE_ID = "eDSwXWQpjryYdVtrkP7I";
const ELEVENLABS_MODEL = "eleven_v3";
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";

const confirmPatterns = [
  /\byes\b/i,
  /\byeah\b/i,
  /\byep\b/i,
  /\bokay\b/i,
  /\bok\b/i,
  /let'?s go/i,
  /ready/i
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadPlay() {
  if (playData) return;
  const response = await fetch("/v3/learning_balance_freeze_v3.json");
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
  const response = await fetch("/generate?play=v3", {
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

function clearListenTimeout() {
  if (listenTimeout) {
    clearTimeout(listenTimeout);
    listenTimeout = null;
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
  stopRecognition();
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

function selectBranch(scene, transcript) {
  const branches = scene.branches || {};
  const keys = Object.keys(branches);
  if (!keys.length) return null;

  if (keys.includes("good_day") || keys.includes("bad_day")) {
    const decision = classifyIntro(transcript);
    return branches[decision] || branches.general || branches[keys[0]];
  }

  return branches[keys[0]];
}

function getAudioSrc(audioFile, useCache = true) {
  if (useCache && audioBasePath && audioBasePath !== BASE_AUDIO_PATH) {
    return `${audioBasePath}/${audioFile}`;
  }
  return `${BASE_AUDIO_PATH}/${audioFile}`;
}

async function playAudioFile(audioFile, delayMs, text) {
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
  const duration = scene.duration_seconds ?? DEFAULT_LISTEN_SECONDS;
  setStatus(`Open mic: ${scene.id}`);
  setContent(
    `<p><strong>Listening…</strong> (mic stays open)</p>
     <p><em>Auto-advance after ${duration}s.</em></p>`
  );
  setButtons({ canContinue: true, canBranch: false, canStop: true });
}

function isEndingConfirm(scene) {
  return scene?.id === "listen_ending_confirm";
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
    lastTranscript = "";
    clearListenTimeout();
    showOpenMic(scene);

    if (recognition) {
      ensureRecognitionRunning();
    }

    const duration = scene.duration_seconds ?? DEFAULT_LISTEN_SECONDS;
    listenTimeout = setTimeout(() => {
      handleAutoAdvance();
    }, duration * 1000);
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
        if (!transcript) return;
        lastTranscript = transcript;

        if (isEndingConfirm(activeListenScene)) {
          if (confirmPatterns.some((pattern) => pattern.test(transcript))) {
            handleAutoAdvance();
          }
        }
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
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  await runSequence();
});

retryBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  if (!activeListenScene?.branches?.wrong) return;
  currentSceneId = activeListenScene.branches.wrong;
  activeListenScene = null;
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
