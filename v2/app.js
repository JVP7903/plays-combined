const playBtn = document.getElementById("playBtn");
const continueBtn = document.getElementById("continueBtn");
const skipBtn = document.getElementById("skipBtn");
const successBtn = document.getElementById("successBtn");
const retryBtn = document.getElementById("retryBtn");
const stopBtn = document.getElementById("stopBtn");
const micStatus = document.getElementById("micStatus");
const stepStatus = document.getElementById("stepStatus");
const content = document.getElementById("content");

const USE_OPENAI_CLASSIFIER = false;
const OPENAI_CLASSIFIER_URL = "/classify";
const USE_SERVER_STT = true;
const STT_WS_URL = "wss://resume-strainer-stool.ngrok-free.dev";
const STT_CHUNK_MS = 4000;

const playData = {
  settings: {
    audio_base_path: "/audio/learning_colors_v1",
    default_audio_delay_ms: 500,
    mic: {
      request_on_play: true,
      open_through_end: true
    }
  },
  lines: [
    {
      id: "intro_greeting",
      text: "[excited] Hiiiii Laylaaa! [laugh] Hiii Daddy! [short pause] how is everyone doing today?",
      filename: "intro_greeting.mp3"
    },
    {
      id: "intro_reply",
      text: "[happy] I’m feeling sooo happy and ready to play! [laugh] [playful] I hope you are too!",
      filename: "intro_reply.mp3"
    },
    { id: "everything_else_reply", text: "", filename: "everything_else_reply.mp3" },
    { id: "bad_day", text: "", filename: "bad_day.mp3" },
    { id: "bad_day_intro_reply", text: "", filename: "bad_day_intro_reply.mp3" },
    { id: "lets_do_it", text: "", filename: "lets_do_it.mp3" },
    { id: "start_song", text: "", filename: "start_song.mp3" },
    { id: "lets_go", text: "", filename: "lets_go.mp3" },
    {
      id: "red_parent_prompt",
      text: "[playful] Allllright, now Daddy has something that is red… what do you have that’s red Daddy?",
      filename: "red_parent_prompt.mp3"
    },
    {
      id: "red_parent_react",
      text: "[playful] Ooooh nice one Daddy! [laugh]",
      filename: "red_parent_react.mp3"
    },
    {
      id: "red_child_prompt",
      text: "[playful] Layla… now it’s your turn. Let’s find something red just like Daddy’s. When you find one, show it to me and daddy.",
      filename: "red_child_prompt.mp3"
    },
    { id: "searching_song", text: "", filename: "searching_song.mp3" },
    {
      id: "red_success",
      text: "[excited] Yaaay! You found a red one! [laugh] [happy] That’s red! I love that!",
      filename: "red_success.mp3"
    },
    { id: "red_song", text: "", filename: "red_song.mp3" },
    {
      id: "red_retry",
      text: "[playful] Hmmm… let’s try again. Can we find something red? Daddy, let’s help her out.",
      filename: "red_retry.mp3"
    },
    { id: "red_next", text: "", filename: "red_next.mp3" },
    {
      id: "blue_parent_prompt",
      text: "[playful] [laugh] That was fun! Now let’s try blue. Daddy… what do you have that’s blue?",
      filename: "blue_parent_prompt.mp3"
    },
    {
      id: "blue_parent_react",
      text: "[playful] Ooooh I like that one! [laugh]",
      filename: "blue_parent_react.mp3"
    },
    {
      id: "blue_child_prompt",
      text: "[playful] Layla… can you find something blue to match Daddy’s? Show it to us when you’ve got it.",
      filename: "blue_child_prompt.mp3"
    },
    {
      id: "blue_success",
      text: "[excited] Yayyy! You found blue! [laugh] [happy] That’s blue! So good!",
      filename: "blue_success.mp3"
    },
    { id: "blue_song", text: "", filename: "blue_song.mp3" },
    {
      id: "blue_retry",
      text: "[playful] Let’s look again… where could something blue be? Daddy, can you help?",
      filename: "blue_retry.mp3"
    },
    { id: "blue_next", text: "", filename: "blue_next.mp3" },
    {
      id: "yellow_parent_prompt",
      text: "[playful] You’re doing so good! Now we’re looking for yellow. Daddy… what do you have that’s yellow?",
      filename: "yellow_parent_prompt.mp3"
    },
    {
      id: "yellow_parent_react",
      text: "[playful] Ohhh that’s a good one! [laugh]",
      filename: "yellow_parent_react.mp3"
    },
    {
      id: "yellow_child_prompt",
      text: "[playful] Layla… let’s find something yellow like Daddy’s. When you find it, show it to us.",
      filename: "yellow_child_prompt.mp3"
    },
    {
      id: "yellow_success",
      text: "[excited] Yaaay! You got yellow! [laugh] [happy] That’s yellow! Nice job!",
      filename: "yellow_success.mp3"
    },
    { id: "yellow_song", text: "", filename: "yellow_song.mp3" },
    {
      id: "yellow_retry",
      text: "[playful] Hmm… let’s keep looking. Can we find something yellow? Daddy, let’s try together.",
      filename: "yellow_retry.mp3"
    },
    { id: "yellow_next", text: "", filename: "yellow_next.mp3" },
    {
      id: "green_parent_prompt",
      text: "[playful] This is fun! [laugh] Now let’s find green. Daddy… what do you have that’s green?",
      filename: "green_parent_prompt.mp3"
    },
    {
      id: "green_parent_react",
      text: "[playful] Ohhh I see! [laugh]",
      filename: "green_parent_react.mp3"
    },
    {
      id: "green_child_prompt",
      text: "[playful] Layla… can you find something green like Daddy’s? Show it to us when you find it.",
      filename: "green_child_prompt.mp3"
    },
    {
      id: "green_success",
      text: "[excited] Yayyyy! You found green! [laugh] [happy] That’s green! So good!",
      filename: "green_success.mp3"
    },
    { id: "green_song", text: "", filename: "green_song.mp3" },
    {
      id: "green_retry",
      text: "[playful] Let’s try one more time… where could something green be? Daddy, can you help her?",
      filename: "green_retry.mp3"
    },
    {
      id: "ending_start",
      text: "[playful] [laugh] That was so much fun!",
      filename: "ending_start.mp3"
    },
    { id: "ending_celebrate", text: "[excited] Yaaay! You got them!", filename: "ending_celebrate.mp3" },
    { id: "ending_praise", text: "", filename: "ending_praise.mp3" },
    { id: "closing_song", text: "", filename: "closing_song.mp3" },
    { id: "ending_come_back", text: "", filename: "ending_come_back.mp3" },
    { id: "ending_goodbye", text: "[playful] [laugh] We should play again soon! [loving] Bye-bye Layla… bye Daddy!", filename: "ending_goodbye.mp3" }
  ],
  sequence: [
    { type: "mic_permission", prompt_text: "Before we start, can I use your microphone?" },
    { type: "audio", line_id: "intro_greeting", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "intro_listen",
      listen_for: ["parent answering", "child answering", "user asking Layla how she is"]
    },
    { type: "audio", line_id: "red_parent_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "red_parent_response",
      auto_advance_silence_ms: 600,
      listen_for: ["parent saying object name", "short parent response"]
    },
    { type: "audio", line_id: "red_child_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "red_child_confirm",
      listen_for: ["yes", "yeah", "yep", "ok", "let's go", "let's do it", "ready"],
      notes: ["wait for confirmation to continue"]
    },
    { type: "audio", line_id: "lets_go", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "red_search",
      audio_line_id: "searching_song",
      audio_loop: true,
      listen_for: [
        "I found one",
        "she found it",
        "parent confirming object",
        "child saying what they found"
      ],
      notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
    },
    {
      type: "branch",
      id: "red_search_result",
      on_success: [
        { type: "audio", line_id: "red_success", delay_before_ms: 500 },
        { type: "audio", line_id: "red_song", delay_before_ms: 500 },
        { type: "audio", line_id: "red_next", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "red_next_confirm",
          listen_for: ["yes", "yeah", "yep", "ok"],
          notes: ["wait for confirmation to continue"]
        }
      ],
      on_retry: [
        { type: "audio", line_id: "red_retry", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "red_search",
          audio_line_id: "searching_song",
          audio_loop: true,
          listen_for: [
            "I found one",
            "she found it",
            "parent confirming object",
            "child saying what they found"
          ],
          notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
        },
        {
          type: "branch",
          id: "red_search_result",
          on_success: [
            { type: "audio", line_id: "red_success", delay_before_ms: 500 },
            { type: "audio", line_id: "red_song", delay_before_ms: 500 },
            { type: "audio", line_id: "red_next", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "red_next_confirm",
              listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
              notes: ["wait for confirmation to continue"]
            }
          ],
          on_retry: [
            { type: "audio", line_id: "red_retry", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "red_search",
              audio_line_id: "searching_song",
              audio_loop: true,
              listen_for: [
                "I found one",
                "she found it",
                "parent confirming object",
                "child saying what they found"
              ],
              notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
            },
            {
              type: "branch",
              id: "red_search_result",
              on_success: [
                { type: "audio", line_id: "red_success", delay_before_ms: 500 },
                { type: "audio", line_id: "red_song", delay_before_ms: 500 },
                { type: "audio", line_id: "red_next", delay_before_ms: 500 },
                {
                  type: "open_mic",
                  label: "red_next_confirm",
                  listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
                  notes: ["wait for confirmation to continue"]
                }
              ],
              on_retry: [
                { type: "audio", line_id: "red_retry", delay_before_ms: 500 },
                {
                  type: "open_mic",
                  label: "red_search",
                  audio_line_id: "searching_song",
                  audio_loop: true,
                  listen_for: [
                    "I found one",
                    "she found it",
                    "parent confirming object",
                    "child saying what they found"
                  ],
                  notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
                }
              ]
            }
          ]
        }
      ]
    },

    { type: "audio", line_id: "blue_parent_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "blue_parent_response",
      auto_advance_silence_ms: 600,
      listen_for: ["parent response"]
    },
    { type: "audio", line_id: "blue_child_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "blue_child_confirm",
      listen_for: ["yes", "yeah", "yep", "ok", "let's go", "let's do it", "ready"],
      notes: ["wait for confirmation to continue"]
    },
    { type: "audio", line_id: "lets_go", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "blue_search",
      audio_line_id: "searching_song",
      audio_loop: true,
      listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
      notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
    },
    {
      type: "branch",
      id: "blue_search_result",
      on_success: [
        { type: "audio", line_id: "blue_success", delay_before_ms: 500 },
        { type: "audio", line_id: "blue_song", delay_before_ms: 500 },
        { type: "audio", line_id: "blue_next", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "blue_next_confirm",
          listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
          notes: ["wait for confirmation to continue"]
        }
      ],
      on_retry: [
        { type: "audio", line_id: "blue_retry", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "blue_search",
          audio_line_id: "searching_song",
          audio_loop: true,
          listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
          notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
        },
        {
          type: "branch",
          id: "blue_search_result",
          on_success: [
            { type: "audio", line_id: "blue_success", delay_before_ms: 500 },
            { type: "audio", line_id: "blue_song", delay_before_ms: 500 },
            { type: "audio", line_id: "blue_next", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "blue_next_confirm",
              listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
              notes: ["wait for confirmation to continue"]
            }
          ],
          on_retry: [
            { type: "audio", line_id: "blue_retry", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "blue_search",
              audio_line_id: "searching_song",
              audio_loop: true,
              listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
              notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
            }
          ]
        }
      ]
    },

    { type: "audio", line_id: "yellow_parent_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "yellow_parent_response",
      auto_advance_silence_ms: 600,
      listen_for: ["parent response"]
    },
    { type: "audio", line_id: "yellow_child_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "yellow_child_confirm",
      listen_for: ["yes", "yeah", "yep", "ok", "let's go", "let's do it", "ready"],
      notes: ["wait for confirmation to continue"]
    },
    { type: "audio", line_id: "lets_go", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "yellow_search",
      audio_line_id: "searching_song",
      audio_loop: true,
      listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
      notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
    },
    {
      type: "branch",
      id: "yellow_search_result",
      on_success: [
        { type: "audio", line_id: "yellow_success", delay_before_ms: 500 },
        { type: "audio", line_id: "yellow_song", delay_before_ms: 500 },
        { type: "audio", line_id: "yellow_next", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "yellow_next_confirm",
          listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
          notes: ["wait for confirmation to continue"]
        }
      ],
      on_retry: [
        { type: "audio", line_id: "yellow_retry", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "yellow_search",
          audio_line_id: "searching_song",
          audio_loop: true,
          listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
          notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
        },
        {
          type: "branch",
          id: "yellow_search_result",
          on_success: [
            { type: "audio", line_id: "yellow_success", delay_before_ms: 500 },
            { type: "audio", line_id: "yellow_song", delay_before_ms: 500 },
            { type: "audio", line_id: "yellow_next", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "yellow_next_confirm",
              listen_for: ["yes", "yeah", "yep", "ok", "let's move on", "move on"],
              notes: ["wait for confirmation to continue"]
            }
          ],
          on_retry: [
            { type: "audio", line_id: "yellow_retry", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "yellow_search",
              audio_line_id: "searching_song",
              audio_loop: true,
              listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
              notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
            }
          ]
        }
      ]
    },

    { type: "audio", line_id: "green_parent_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "green_parent_response",
      auto_advance_silence_ms: 600,
      listen_for: ["parent response"]
    },
    { type: "audio", line_id: "green_child_prompt", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "green_child_confirm",
      listen_for: ["yes", "yeah", "yep", "ok", "let's go", "let's do it", "ready"],
      notes: ["wait for confirmation to continue"]
    },
    { type: "audio", line_id: "lets_go", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "green_search",
      audio_line_id: "searching_song",
      audio_loop: true,
      listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
      notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
    },
    {
      type: "branch",
      id: "green_search_result",
      on_success: [
        { type: "audio", line_id: "green_success", delay_before_ms: 500 },
        { type: "audio", line_id: "green_song", delay_before_ms: 500 }
      ],
      on_retry: [
        { type: "audio", line_id: "green_retry", delay_before_ms: 500 },
        {
          type: "open_mic",
          label: "green_search",
          audio_line_id: "searching_song",
          audio_loop: true,
          listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
          notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
        },
        {
          type: "branch",
          id: "green_search_result",
          on_success: [
            { type: "audio", line_id: "green_success", delay_before_ms: 500 },
            { type: "audio", line_id: "green_song", delay_before_ms: 500 }
          ],
          on_retry: [
            { type: "audio", line_id: "green_retry", delay_before_ms: 500 },
            {
              type: "open_mic",
              label: "green_search",
              audio_line_id: "searching_song",
              audio_loop: true,
              listen_for: ["confirmation of found object", "parent saying child has it", "child naming object/color"],
              notes: ["searching_song plays while listening", "keep mic open", "transcribe any response"]
            }
          ]
        }
      ]
    },

    { type: "audio", line_id: "ending_start", delay_before_ms: 500 },
    {
      type: "open_mic",
      label: "ending_count",
      listen_for: ["counting together"],
      notes: ["wait/listen window rather than strict analysis"]
    },
    { type: "audio", line_id: "ending_celebrate", delay_before_ms: 500 },
    { type: "audio", line_id: "ending_praise", delay_before_ms: 500 },
    { type: "audio", line_id: "closing_song", delay_before_ms: 500 },
    { type: "audio", line_id: "ending_come_back", delay_before_ms: 500 }
  ]
};
let linesById = {};
let sequence = [];
let currentIndex = 0;
let currentAudio = null;
let currentAudioFadeTimer = null;
let openMicAudio = null;
let openMicAudioTimer = null;
let micStream = null;
let isPlaying = false;
let recognition = null;
let listenTimeout = null;
let activeOpenMic = null;
let autoAdvanceTriggered = false;
let skipNextIntroReply = false;
let heardSpeech = false;
let isLoaded = false;
let silenceTimeout = null;
let lastTranscript = "";
let recognitionReady = false;
let recognitionWatchdog = null;
let searchDecisionTimer = null;
let transcriptBuffer = [];
let searchDecisionLocked = false;
let introDecision = "everything_else";
let sttSocket = null;
let sttAudioContext = null;
let sttWorkletNode = null;
let sttSourceNode = null;
let sttGainNode = null;
let sttSendAudio = false;
let sttAwaitingResult = false;
let sttChunkTimer = null;
let sttInitialized = false;
let audioUnlocked = false;
let audioUnlocker = null;
let playStarting = false;
let playbackCtx = null;
let playbackGain = null;
let openMicWebAudioSource = null;
let openMicLoopGain = null;

const SEARCH_TRANSCRIPT_WINDOW_MS = 60000;

const MAX_LISTEN_MS = 7000;

const introAskPatterns = [
  /how are you/i,
  /how are you doing/i,
  /how's your day/i,
  /how is your day/i,
  /how are you today/i
];

const badDayPatterns = [
  /i'?m sick/i,
  /i feel sick/i,
  /my tummy hurts/i,
  /i don'?t feel good/i,
  /i'?m sad/i,
  /i feel sad/i,
  /i'?m upset/i,
  /i'?m mad/i,
  /i'?m angry/i,
  /i'?m tired/i,
  /i'?m cranky/i,
  /i'?m grumpy/i,
  /i'?m not okay/i,
  /i'?m scared/i,
  /i'?m worried/i
];

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
  /i (got|have) (it|one)/i,
  /we (got|have) (it|one)/i,
  /she (got|has) (it|one)/i,
  /(got|have) (it|one)/i,
  /found (it|one)/i,
  /we found (it|one)/i,
  /i found (it|one)/i,
  /there (it|one) is/i,
  /here (it|one) is/i,
  /i see it/i
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
  /try again/i,
  /let'?s try again/i,
  /keep looking/i,
  /still looking/i
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function canUseServerStt() {
  return Boolean(USE_SERVER_STT && STT_WS_URL);
}

async function unlockAudioPlayback() {
  if (audioUnlocked) return true;
  try {
    await ensurePlaybackContext();
    if (playbackCtx?.state === "suspended") {
      try {
        await playbackCtx.resume();
      } catch {
        // ignore
      }
    }
    const silentWav =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
    audioUnlocker = new Audio(silentWav);
    audioUnlocker.playsInline = true;
    audioUnlocker.loop = true;
    audioUnlocker.volume = 0;
    const playPromise = audioUnlocker.play();
    await Promise.race([
      playPromise,
      new Promise((resolve) => setTimeout(resolve, 400))
    ]);
    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

async function tryPlayAudioElement(audioEl, attempts = 3) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await audioEl.play();
      return true;
    } catch {
      await unlockAudioPlayback();
      await delay(150);
    }
  }
  return false;
}

async function ensurePlaybackContext() {
  if (playbackCtx) return playbackCtx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  playbackCtx = new AudioCtx();
  playbackGain = playbackCtx.createGain();
  playbackGain.gain.value = 1;
  playbackGain.connect(playbackCtx.destination);
  return playbackCtx;
}

async function playViaWebAudio(src) {
  const ctx = await ensurePlaybackContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
  let buffer;
  try {
    const resp = await fetch(src, { cache: "no-store" });
    const arrayBuf = await resp.arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuf);
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackGain || ctx.destination);
    source.onended = () => resolve(true);
    try {
      source.start(0);
    } catch {
      resolve(false);
    }
  });
}

async function playLoopViaWebAudio(src) {
  const ctx = await ensurePlaybackContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
  let buffer;
  try {
    const resp = await fetch(src, { cache: "no-store" });
    const arrayBuf = await resp.arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuf);
  } catch {
    return false;
  }
  try {
    if (openMicWebAudioSource) {
      openMicWebAudioSource.stop();
      openMicWebAudioSource.disconnect();
    }
  } catch {
    // ignore
  }
  const source = ctx.createBufferSource();
  const loopGain = ctx.createGain();
  loopGain.gain.value = 0.18;
  source.buffer = buffer;
  source.loop = true;
  source.connect(loopGain);
  loopGain.connect(playbackGain || ctx.destination);
  try {
    source.start(0);
    openMicWebAudioSource = source;
    openMicLoopGain = loopGain;
    return true;
  } catch {
    return false;
  }
}

function downsampleBuffer(buffer, sampleRate, outRate = 16000) {
  if (outRate >= sampleRate) return buffer;
  const sampleRateRatio = sampleRate / outRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(floatBuffer) {
  const buffer = new ArrayBuffer(floatBuffer.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < floatBuffer.length; i += 1) {
    let sample = Math.max(-1, Math.min(1, floatBuffer[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(i * 2, sample, true);
  }
  return buffer;
}

async function prepareServerStt() {
  if (!canUseServerStt()) return false;
  if (!micStream) {
    const ok = await requestMic();
    if (!ok) return false;
  }
  if (sttInitialized) return true;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    sttAudioContext = new AudioCtx();
    await sttAudioContext.audioWorklet.addModule("audio-worklet.js");
    sttSourceNode = sttAudioContext.createMediaStreamSource(micStream);
    sttWorkletNode = new AudioWorkletNode(sttAudioContext, "recorder-worklet");
    sttGainNode = sttAudioContext.createGain();
    sttGainNode.gain.value = 0;
    sttWorkletNode.port.onmessage = (event) => {
      if (!sttSendAudio || sttAwaitingResult) return;
      const buffer = event?.data?.buffer;
      if (!buffer || !sttAudioContext) return;
      const input = new Float32Array(buffer);
      const downsampled = downsampleBuffer(input, sttAudioContext.sampleRate, 16000);
      const pcmBuffer = floatTo16BitPCM(downsampled);
      if (sttSocket?.readyState === WebSocket.OPEN) {
        sttSocket.send(pcmBuffer);
      }
    };
    sttSourceNode.connect(sttWorkletNode);
    sttWorkletNode.connect(sttGainNode);
    sttGainNode.connect(sttAudioContext.destination);
    sttInitialized = true;
    return true;
  } catch (error) {
    console.error("Server STT init error:", error);
    return false;
  }
}

function connectServerSttSocket() {
  if (!canUseServerStt()) return false;
  if (sttSocket && (sttSocket.readyState === WebSocket.OPEN || sttSocket.readyState === WebSocket.CONNECTING)) {
    return true;
  }
  sttSocket = new WebSocket(STT_WS_URL);
  sttSocket.binaryType = "arraybuffer";
  sttSocket.onopen = () => {
    if (sttSendAudio) {
      sendSttStart();
    }
  };
  sttSocket.onmessage = (event) => {
    let transcript = "";
    if (typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data);
        transcript = String(parsed?.transcript || "").trim();
      } catch {
        transcript = String(event.data || "").trim();
      }
    }
    sttAwaitingResult = false;
    if (transcript) {
      handleTranscript(transcript, true);
    }
    if (activeOpenMic) {
      sttSendAudio = true;
      sendSttStart();
    }
  };
  sttSocket.onerror = () => {
    setMicStatus("STT error");
  };
  sttSocket.onclose = () => {
    sttSendAudio = false;
    sttAwaitingResult = false;
  };
  return true;
}

function sendSttStart() {
  if (sttSocket?.readyState === WebSocket.OPEN) {
    sttSocket.send(JSON.stringify({ type: "start" }));
    sttAwaitingResult = false;
  }
}

function sendSttEnd() {
  if (sttSocket?.readyState === WebSocket.OPEN) {
    sttSocket.send(JSON.stringify({ type: "end" }));
    sttAwaitingResult = true;
  }
}

async function startServerSttStreaming() {
  if (!canUseServerStt()) return false;
  const ok = await prepareServerStt();
  if (!ok) return false;
  if (sttAudioContext?.state === "suspended") {
    await sttAudioContext.resume();
  }
  connectServerSttSocket();
  sttSendAudio = true;
  sendSttStart();
  if (sttChunkTimer) clearInterval(sttChunkTimer);
  sttChunkTimer = setInterval(() => {
    if (!activeOpenMic || sttAwaitingResult) return;
    sttSendAudio = false;
    sendSttEnd();
  }, STT_CHUNK_MS);
  return true;
}

function stopServerSttStreaming() {
  if (sttChunkTimer) {
    clearInterval(sttChunkTimer);
    sttChunkTimer = null;
  }
  sttSendAudio = false;
  sttAwaitingResult = false;
}

function loadPlay() {
  linesById = Object.fromEntries(playData.lines.map((line) => [line.id, line]));
  sequence = [...playData.sequence];
  currentIndex = 0;
  isLoaded = true;
  clearContent();
}

function setStatus(text) {
  stepStatus.textContent = text;
}

function setContent(html) {
  const divider = content.innerHTML ? "<hr />" : "";
  content.innerHTML = `${content.innerHTML}${divider}${html}`;
}

function clearContent() {
  content.innerHTML = "";
}

window.addEventListener("error", (event) => {
  setStatus("Error");
  setContent(`<p>${event?.message || "Unknown error"}</p>`);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.message || event?.reason || "Unknown error";
  setStatus("Error");
  setContent(`<p>${reason}</p>`);
});

function setButtons({ canContinue, canBranch, canStop }) {
  continueBtn.disabled = !canContinue;
  successBtn.disabled = !canBranch;
  retryBtn.disabled = !canBranch;
  stopBtn.disabled = !canStop;
  skipBtn.disabled = !canStop;
}

function setMicStatus(text) {
  micStatus.textContent = text;
}

async function requestMic() {
  if (micStream) {
    return true;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setMicStatus("Unavailable");
    setContent(
      "<p><strong>Microphone not supported in this browser.</strong> Try Chrome or update iOS.</p>"
    );
    setButtons({ canContinue: false, canBranch: false, canStop: false });
    return false;
  }
  setMicStatus("Requesting...");
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMicStatus("Open (listening)");
    return true;
  } catch (error) {
    setMicStatus("Denied");
    const message =
      error?.name === "NotSupportedError"
        ? "Microphone access isn't supported here. Try Chrome or ensure you opened http://localhost:8000 over Wi‑Fi, not a file URL."
        : "Microphone permission denied. Please allow mic access and reload.";
    setContent(`<p><strong>${message}</strong></p>`);
    setButtons({ canContinue: false, canBranch: false, canStop: false });
    return false;
  }
}

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }
  try {
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    return rec;
  } catch (error) {
    return null;
  }
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

function clearRecognitionWatchdog() {
  if (recognitionWatchdog) {
    clearInterval(recognitionWatchdog);
    recognitionWatchdog = null;
  }
}

function clearSearchDecisionTimer() {
  if (searchDecisionTimer) {
    clearInterval(searchDecisionTimer);
    searchDecisionTimer = null;
  }
}

function clearSilenceTimeout() {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
}

function clearOpenMicAudioTimer() {
  if (openMicAudioTimer) {
    clearTimeout(openMicAudioTimer);
    openMicAudioTimer = null;
  }
}

function shouldTriggerIntroReply(transcript) {
  return introAskPatterns.some((pattern) => pattern.test(transcript));
}

function isBadDayReply(transcript) {
  return badDayPatterns.some((pattern) => pattern.test(transcript));
}

function getIntroDecision(transcript) {
  if (isBadDayReply(transcript)) return "bad_day";
  if (shouldTriggerIntroReply(transcript)) return "intro_reply";
  return "everything_else";
}

function isNextConfirmStep(step) {
  return step?.type === "open_mic" && /_next_confirm$/.test(step.label || "");
}

function isIntroConfirmStep(step) {
  return step?.type === "open_mic" && step.label === "intro_confirm";
}

function shouldTriggerNextConfirm(transcript) {
  return nextConfirmPatterns.some((pattern) => pattern.test(transcript));
}

function isCountStep(step) {
  return step?.type === "open_mic" && step.label === "ending_count";
}

function shouldTriggerCount(transcript) {
  return countConfirmPatterns.some((pattern) => pattern.test(transcript));
}

function isSearchStep(step) {
  return step?.type === "open_mic" && /_search/.test(step.label || "");
}

function isSearchBranchStep(step) {
  if (!step || step.type !== "branch") return false;
  const priorStep = sequence[currentIndex - 1];
  return isSearchStep(priorStep);
}

function detectSearchDecision(transcript, stepLabel = "") {
  if (!transcript) return null;
  const text = transcript.toLowerCase();
  if (searchSuccessPatterns.some((pattern) => pattern.test(text))) {
    return "success";
  }
  if (searchRetryPatterns.some((pattern) => pattern.test(text))) {
    return "retry";
  }
  return null;
}

function addTranscriptToBuffer(text) {
  const now = Date.now();
  transcriptBuffer.push({ text, ts: now });
  transcriptBuffer = transcriptBuffer.filter((item) => now - item.ts <= SEARCH_TRANSCRIPT_WINDOW_MS);
}

function getTranscriptWindow() {
  const now = Date.now();
  transcriptBuffer = transcriptBuffer.filter((item) => now - item.ts <= SEARCH_TRANSCRIPT_WINDOW_MS);
  return transcriptBuffer.map((item) => item.text).join(" ").trim();
}

function clearTranscriptBuffer() {
  transcriptBuffer = [];
}

function getSearchColor(step) {
  const label = step?.label || "";
  if (label.startsWith("red_")) return "red";
  if (label.startsWith("blue_")) return "blue";
  if (label.startsWith("yellow_")) return "yellow";
  if (label.startsWith("green_")) return "green";
  return "";
}

async function classifySearchIntent(transcript, step) {
  if (!USE_OPENAI_CLASSIFIER || !transcript) return null;
  try {
    const response = await fetch(OPENAI_CLASSIFIER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: transcript,
        color: getSearchColor(step)
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    const decision = data?.decision || null;
    if (decision) {
      setContent(
        `<p><strong>Classifier:</strong> ${decision} <br /><em>${transcript}</em></p>`
      );
    }
    return decision;
  } catch (error) {
    return null;
  }
}

function autoResolveSearch(decision) {
  if (!isPlaying || !activeOpenMic || !isSearchStep(activeOpenMic)) return;
  if (searchDecisionLocked) return;
  searchDecisionLocked = true;
  const nextStep = sequence[currentIndex + 1];
  if (!nextStep || nextStep.type !== "branch") return;
  clearRecognitionWatchdog();
  clearSearchDecisionTimer();
  stopOpenMicAudio();
  // remove the branch step, we'll inject the resolved steps in its place
  sequence.splice(currentIndex + 1, 1);
  if (decision === "success") {
    injectBranchSteps(nextStep.on_success);
  } else {
    injectBranchSteps(nextStep.on_retry);
  }
  currentIndex += 1;
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  runSequence();
}

function setTranscriptText(text) {
  const transcriptEl = document.getElementById("liveTranscript");
  if (transcriptEl) {
    transcriptEl.textContent = text || "(waiting)";
  }
}

function handleTranscript(transcript, isFinal = true) {
  if (!activeOpenMic || !transcript) return;
  heardSpeech = true;
  lastTranscript = transcript;
  setTranscriptText(transcript);
  addTranscriptToBuffer(transcript);

  clearListenTimeout();
  clearSilenceTimeout();
  if (!isSearchStep(activeOpenMic) && !isCountStep(activeOpenMic) && !isNextConfirmStep(activeOpenMic) && !isIntroConfirmStep(activeOpenMic)) {
    silenceTimeout = setTimeout(() => {
      if (activeOpenMic?.label === "intro_listen") {
        introDecision = getIntroDecision(lastTranscript);
      }
      handleAutoAdvance();
    }, activeOpenMic?.auto_advance_silence_ms ?? 2600);
  }

  if (!isFinal) return;

  if (activeOpenMic?.label === "intro_listen") {
    introDecision = getIntroDecision(lastTranscript);
    handleAutoAdvance();
  }

  if (isIntroConfirmStep(activeOpenMic)) {
    if (shouldTriggerNextConfirm(lastTranscript) || lastTranscript) {
      handleAutoAdvance();
    }
  }

  if (isNextConfirmStep(activeOpenMic)) {
    if (shouldTriggerNextConfirm(lastTranscript) || lastTranscript) {
      handleAutoAdvance();
    }
  }

  if (isCountStep(activeOpenMic)) {
    if (shouldTriggerCount(lastTranscript)) {
      handleAutoAdvance();
    }
  }

  if (isSearchStep(activeOpenMic)) {
    if (searchDecisionLocked) return;
    const decision = detectSearchDecision(lastTranscript, activeOpenMic.label);
    if (decision) {
      autoResolveSearch(decision);
    }
  }

  if (isSearchBranchStep(sequence[currentIndex])) {
    if (searchDecisionLocked) return;
    const decision = detectSearchDecision(lastTranscript, activeOpenMic?.label || "");
    if (decision) {
      autoResolveSearch(decision);
    }
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
  clearRecognitionWatchdog();
  clearSearchDecisionTimer();
  stopServerSttStreaming();
  stopOpenMicAudio();
  await new Promise((resolve) => setTimeout(resolve, 0));
  continueBtn.click();
}

function stopMic() {
  if (!micStream) return;
  micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
  setMicStatus("Closed");
}

function stopOpenMicAudio() {
  clearOpenMicAudioTimer();
  if (openMicAudio) {
    openMicAudio.pause();
    openMicAudio = null;
  }
  if (openMicWebAudioSource) {
    try {
      openMicWebAudioSource.stop();
      openMicWebAudioSource.disconnect();
    } catch {
      // ignore
    }
    openMicWebAudioSource = null;
  }
  if (openMicLoopGain) {
    try {
      openMicLoopGain.disconnect();
    } catch {
      // ignore
    }
    openMicLoopGain = null;
  }
}


function startOpenMicAudio(lineId, delayMs = 0, loopAudio = false) {
  const line = linesById[lineId];
  if (!line) {
    return;
  }
  const audioBase = playData.settings?.audio_base_path || "../audio";
  const src = `${audioBase}/${line.filename}`;
  const play = () => {
    if (loopAudio) {
      playLoopViaWebAudio(src).catch(() => {});
      return;
    }
    openMicAudio = new Audio(src);
    openMicAudio.playsInline = true;
    openMicAudio.loop = Boolean(loopAudio);
    if (loopAudio) {
      openMicAudio.volume = 0.18;
    }
    tryPlayAudioElement(openMicAudio).catch(async () => {
      await playViaWebAudio(src);
    });
  };
  if (delayMs > 0) {
    openMicAudioTimer = setTimeout(play, delayMs);
  } else {
    play();
  }
}

async function playAudio(lineId, delayMs) {
  const line = linesById[lineId];
  if (!line) {
    throw new Error(`Unknown line id: ${lineId}`);
  }

  const audioBase = playData.settings?.audio_base_path || "../audio";
  const src = `${audioBase}/${line.filename}`;
  setStatus(`Playing: ${lineId}`);
  setContent(`<strong>Audio:</strong> ${line.filename}<br /><em>${line.text || ""}</em>`);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  if (currentAudio) {
    currentAudio.pause();
  }
  if (currentAudioFadeTimer) {
    clearInterval(currentAudioFadeTimer);
    currentAudioFadeTimer = null;
  }
  currentAudio = new Audio(src);
  currentAudio.preload = "auto";
  currentAudio.playsInline = true;
  currentAudio.volume = 1;
  const played = await tryPlayAudioElement(currentAudio, 4);
  if (!played) {
    const webAudioPlayed = await playViaWebAudio(src);
    if (!webAudioPlayed) {
      throw new Error(`Audio failed to play: ${line.filename}`);
    }
    return;
  }
  currentAudio.volume = 0;
  const fadeInMs = 120;
  const fadeInSteps = 6;
  let fadeInCount = 0;
  currentAudioFadeTimer = setInterval(() => {
    fadeInCount += 1;
    currentAudio.volume = Math.min(1, fadeInCount / fadeInSteps);
    if (fadeInCount >= fadeInSteps) {
      clearInterval(currentAudioFadeTimer);
      currentAudioFadeTimer = null;
    }
  }, fadeInMs / fadeInSteps);

  const fadeOutMs = 120;
  const onTimeUpdate = () => {
    if (!currentAudio || !currentAudio.duration) return;
    const remaining = currentAudio.duration - currentAudio.currentTime;
    if (remaining <= fadeOutMs / 1000) {
      currentAudio.volume = Math.max(0, remaining / (fadeOutMs / 1000));
    }
  };
  currentAudio.addEventListener("timeupdate", onTimeUpdate);
  await new Promise((resolve) => {
    currentAudio.addEventListener(
      "ended",
      () => {
        currentAudio.removeEventListener("timeupdate", onTimeUpdate);
        resolve();
      },
      { once: true }
    );
  });
}

function showOpenMic(step) {
  setStatus(`Open mic: ${step.label}`);
  const listenFor = step.listen_for || [];
  const notes = step.notes || [];
  const listenHtml = listenFor.length
    ? `<ul>${listenFor.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const notesHtml = notes.length
    ? `<p><strong>Notes</strong></p><ul>${notes
        .map((item) => `<li>${item}</li>`)
        .join("")}</ul>`
    : "";
  const timingHtml =
    isSearchStep(step) || isCountStep(step) || isNextConfirmStep(step) || isIntroConfirmStep(step)
      ? ""
      : `<p><em>Auto-advance after ${MAX_LISTEN_MS / 1000}s.</em></p>`;
  setContent(
    `<p><strong>Listening…</strong> (mic stays open)</p>
     ${timingHtml}
     <div class="transcript"><strong>Transcript:</strong> <span id="liveTranscript">(waiting)</span></div>
     ${listenHtml}${notesHtml}`
  );
  setButtons({ canContinue: true, canBranch: false, canStop: true });
}

function showBranch(step) {
  const priorStep = sequence[currentIndex - 1];
  if (isSearchStep(priorStep)) {
    const decision = detectSearchDecision(lastTranscript, priorStep.label);
    if (decision) {
      autoResolveSearch(decision);
      return;
    }
    const retrySearchStep = { ...priorStep };
    sequence.splice(currentIndex + 1, 0, retrySearchStep, step);
    currentIndex += 1;
    runSequence();
    return;
  }
  setStatus(`Branch: ${step.id}`);
  setContent(
    `<p><strong>Choose result</strong></p><p>Success or Retry?</p>`
  );
  setButtons({ canContinue: false, canBranch: true, canStop: true });
}

function injectBranchSteps(branchSteps) {
  const nextSteps = Array.isArray(branchSteps) ? branchSteps : [];
  sequence.splice(currentIndex + 1, 0, ...nextSteps);
}

async function runStep(step) {
  if (!step) return;

  if (step.type === "mic_permission") {
    setStatus("Mic permission");
    setContent(`<p>${step.prompt_text || "Allow microphone access."}</p>`);
    setButtons({ canContinue: false, canBranch: false, canStop: true });
    const micOk = await requestMic();
    if (!micOk) {
      isPlaying = false;
      playBtn.disabled = false;
      return;
    }
    await unlockAudioPlayback();
    const useServerStt = canUseServerStt();
    if (useServerStt) {
      const ok = await prepareServerStt();
      if (!ok) {
        setContent(
          `<p>${step.prompt_text || "Allow microphone access."}</p><p><strong>Server STT could not start.</strong> Check your STT WebSocket URL.</p>`
        );
      }
      stopRecognition();
      recognition = null;
    } else {
      recognition = initRecognition();
      if (!recognition) {
        setContent(
          `<p>${step.prompt_text || "Allow microphone access."}</p><p><strong>Speech recognition is not supported in this browser.</strong> Use Continue manually during open-mic steps.</p>`
        );
        return;
      }
    }

    if (recognition) recognition.onresult = (event) => {
      if (!activeOpenMic) return;
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];
      const transcript = (latestResult?.[0]?.transcript || "").trim();

      if (!transcript) return;
      const hasFinal = results.some((result) => result.isFinal);
      handleTranscript(transcript, hasFinal);
    };

    if (recognition) {
      recognition.onerror = () => {
        recognitionReady = false;
        if (activeOpenMic) {
          ensureRecognitionRunning();
        }
      };

      recognition.onend = () => {
        recognitionReady = false;
        if (activeOpenMic) {
          ensureRecognitionRunning();
        }
      };

      ensureRecognitionRunning();
    }
    return;
  }

  if (step.type === "audio") {
    activeOpenMic = null;
    stopOpenMicAudio();
    stopServerSttStreaming();
    const defaultDelay = playData.settings?.default_audio_delay_ms ?? 0;
    const delayMs = step.delay_before_ms ?? defaultDelay;
    await playAudio(step.line_id, delayMs);
    return;
  }

  if (step.type === "open_mic") {
    activeOpenMic = step;
    autoAdvanceTriggered = false;
    heardSpeech = false;
    lastTranscript = "";
    searchDecisionLocked = false;
    clearListenTimeout();
    clearSilenceTimeout();
    clearSearchDecisionTimer();
    stopOpenMicAudio();
    clearTranscriptBuffer();
    showOpenMic(step);

    if (step.audio_line_id) {
      startOpenMicAudio(step.audio_line_id, step.audio_delay_ms || 0, step.audio_loop);
    }
    if (canUseServerStt()) {
      await startServerSttStreaming();
    } else if (recognition) {
      ensureRecognitionRunning();
    }

    clearRecognitionWatchdog();
    if (recognition && !canUseServerStt()) {
      recognitionWatchdog = setInterval(() => {
        if (activeOpenMic) {
          ensureRecognitionRunning();
        }
      }, 2000);
    }

    if (!isSearchStep(activeOpenMic) && !isCountStep(activeOpenMic)) {
      listenTimeout = setTimeout(() => {
        if (!heardSpeech) {
          if (activeOpenMic?.label === "intro_listen") {
            skipNextIntroReply = true;
          }
          // auto-advance on silence for confirm steps to keep hands-free
          handleAutoAdvance();
        }
      }, MAX_LISTEN_MS);
    }
    return;
  }

  if (step.type === "branch") {
    const priorStep = sequence[currentIndex - 1];
    if (isSearchStep(priorStep)) {
      await runStep(priorStep);
      return;
    }
    showBranch(step);
    return;
  }

  if (step.type === "wait") {
    setStatus(step.label || "Waiting");
    setContent(`<p>${step.text || "Waiting..."}</p>`);
    setButtons({ canContinue: true, canBranch: false, canStop: true });
    return;
  }
}

async function runSequence() {
  if (!isLoaded) {
    loadPlay();
  }

  isPlaying = true;
  playBtn.disabled = true;
  setButtons({ canContinue: false, canBranch: false, canStop: true });

  while (currentIndex < sequence.length && isPlaying) {
    const step = sequence[currentIndex];

    if (step.type === "open_mic" || step.type === "branch" || step.type === "wait") {
      await runStep(step);
      return;
    }

    await runStep(step);
    currentIndex += 1;
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
  clearRecognitionWatchdog();
  clearSearchDecisionTimer();
  stopOpenMicAudio();
  stopServerSttStreaming();
  stopRecognition();
  if (playData?.settings?.mic?.open_through_end) {
    stopMic();
  }
  if (audioUnlocker) {
    audioUnlocker.pause();
    audioUnlocker = null;
    audioUnlocked = false;
  }
  if (playbackCtx) {
    playbackCtx.close().catch(() => {});
    playbackCtx = null;
    playbackGain = null;
  }
}

async function handlePlayClick() {
  if (isPlaying || playStarting) return;
  playStarting = true;
  try {
    setStatus("Starting");
    unlockAudioPlayback();
    await ensurePlaybackContext();
    if (playbackCtx?.state === "suspended") {
      try {
        await playbackCtx.resume();
      } catch {
        // ignore
      }
    }
    const micOk = await requestMic();
    if (!micOk) {
      playBtn.disabled = false;
      playStarting = false;
      return;
    }
    await unlockAudioPlayback();
    loadPlay();
    await runSequence();
  } catch (error) {
    setStatus("Error");
    setContent(`<p>${error.message}</p>`);
    playBtn.disabled = false;
  } finally {
    playStarting = false;
  }
}

playBtn.addEventListener("click", handlePlayClick);
playBtn.addEventListener("touchend", (event) => {
  event.preventDefault();
  handlePlayClick();
});

skipBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  stopOpenMicAudio();
  stopServerSttStreaming();
  clearListenTimeout();
  clearSilenceTimeout();
  currentIndex += 1;
  await runSequence();
});

continueBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  stopOpenMicAudio();
  stopServerSttStreaming();
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  const currentStep = sequence[currentIndex];
  if (currentStep?.type === "open_mic" && currentStep.label === "intro_listen") {
    const introSteps = [];
    if (introDecision === "bad_day") {
      introSteps.push({ type: "audio", line_id: "bad_day", delay_before_ms: 500 });
      introSteps.push({ type: "open_mic", label: "intro_confirm", listen_for: ["yes", "yeah", "yep", "ok", "let's go", "ready"], notes: ["wait for confirmation to continue"] });
      introSteps.push({ type: "audio", line_id: "bad_day_intro_reply", delay_before_ms: 500 });
    } else if (introDecision === "intro_reply") {
      introSteps.push({ type: "audio", line_id: "intro_reply", delay_before_ms: 500 });
      introSteps.push({ type: "open_mic", label: "intro_confirm", listen_for: ["yes", "yeah", "yep", "ok", "let's go", "ready"], notes: ["wait for confirmation to continue"] });
    } else {
      introSteps.push({ type: "audio", line_id: "everything_else_reply", delay_before_ms: 500 });
      introSteps.push({ type: "open_mic", label: "intro_confirm", listen_for: ["yes", "yeah", "yep", "ok", "let's go", "ready"], notes: ["wait for confirmation to continue"] });
    }
    introSteps.push({ type: "audio", line_id: "lets_do_it", delay_before_ms: 500 });
    introSteps.push({ type: "audio", line_id: "start_song", delay_before_ms: 500 });
    sequence.splice(currentIndex + 1, 0, ...introSteps);
  }
  if (
    skipNextIntroReply &&
    sequence[currentIndex + 1]?.type === "audio" &&
    sequence[currentIndex + 1]?.line_id === "intro_reply"
  ) {
    currentIndex += 2;
    skipNextIntroReply = false;
  } else {
    currentIndex += 1;
  }
  await runSequence();
});

successBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  const step = sequence[currentIndex];
  if (step?.type !== "branch") return;
  injectBranchSteps(step.on_success);
  currentIndex += 1;
  setButtons({ canContinue: false, canBranch: false, canStop: true });
  await runSequence();
});

retryBtn.addEventListener("click", async () => {
  if (!isPlaying) return;
  const step = sequence[currentIndex];
  if (step?.type !== "branch") return;
  injectBranchSteps(step.on_retry);
  currentIndex += 1;
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
  clearRecognitionWatchdog();
  clearSearchDecisionTimer();
  stopOpenMicAudio();
  stopServerSttStreaming();
  stopRecognition();
  stopMic();
  isLoaded = false;
  playBtn.disabled = false;
  setButtons({ canContinue: false, canBranch: false, canStop: false });
  setStatus("Stopped");
  setContent("<p>Playback stopped.</p>");
  if (audioUnlocker) {
    audioUnlocker.pause();
    audioUnlocker = null;
    audioUnlocked = false;
  }
  if (playbackCtx) {
    playbackCtx.close().catch(() => {});
    playbackCtx = null;
    playbackGain = null;
  }
});

loadPlay();

// Hide manual branch buttons (auto-detection only)
successBtn.style.display = "none";
retryBtn.style.display = "none";

// Hide manual branch buttons (auto-detection only)
successBtn.style.display = "none";
retryBtn.style.display = "none";
