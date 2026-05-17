const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const express = require("express");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 8000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "eDSwXWQpjryYdVtrkP7I";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_v3";
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

const PLAY_CONFIG = {
  v2: {
    jsonPath: path.join(__dirname, "v2", "learning_colors_v2.json"),
    staticAudioPath: path.join(__dirname, "v2", "audio"),
    cacheDir: path.join(__dirname, "cache", "v2")
  },
  v3: {
    jsonPath: path.join(__dirname, "v3", "learning_balance_freeze_v3.json"),
    staticAudioPath: path.join(__dirname, "v3", "audio"),
    cacheDir: path.join(__dirname, "cache", "v3")
  }
};

app.use(express.static(path.join(__dirname)));
app.use(express.json());

app.use("/v2", express.static(path.join(__dirname, "v2")));
app.use("/v3", express.static(path.join(__dirname, "v3")));
app.use("/audio/v2", express.static(PLAY_CONFIG.v2.staticAudioPath));
app.use("/audio/v3", express.static(PLAY_CONFIG.v3.staticAudioPath));
app.use("/cache/v2", express.static(PLAY_CONFIG.v2.cacheDir));
app.use("/cache/v3", express.static(PLAY_CONFIG.v3.cacheDir));

function normalizeName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildCacheKey({ childName, parentName, voiceId, model, outputFormat }) {
  const rawKey = `${normalizeName(childName)}|${normalizeName(parentName)}|${voiceId}|${model}|${outputFormat}`;
  return crypto.createHash("sha256").update(rawKey).digest("hex").slice(0, 16);
}

function applyVariables(text, variables) {
  if (!text) return "";
  return text
    .replaceAll("{{child_name}}", variables.child_name)
    .replaceAll("{{parent_name}}", variables.parent_name);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

async function generateTts({ voiceId, model, outputFormat, text }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_id: model,
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

app.post("/generate", async (req, res) => {
  const play = req.query.play;
  const config = PLAY_CONFIG[play];
  if (!config) {
    return res.status(400).json({ error: "Unknown play" });
  }

  const childName = req.body?.childName?.trim();
  const parentName = req.body?.parentName?.trim();
  const voiceId = req.body?.voiceId || ELEVENLABS_VOICE_ID;
  const model = req.body?.model || ELEVENLABS_MODEL;
  const outputFormat = req.body?.outputFormat || ELEVENLABS_OUTPUT_FORMAT;

  if (!childName || !parentName) {
    return res.status(400).json({ error: "Missing childName or parentName" });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "Missing ELEVENLABS_API_KEY" });
  }

  try {
    const cacheKey = buildCacheKey({ childName, parentName, voiceId, model, outputFormat });
    const cacheDir = path.join(config.cacheDir, cacheKey);
    await ensureDir(cacheDir);

    const jsonRaw = await fs.readFile(config.jsonPath, "utf-8");
    const playJson = JSON.parse(jsonRaw);

    const variables = {
      child_name: childName,
      parent_name: parentName
    };

    const generatedFiles = [];
    const reusedFiles = [];

    for (const scene of playJson.scenes || []) {
      const audioFile = scene.audio_file;
      if (!audioFile) continue;

      const destPath = path.join(cacheDir, audioFile);
      if (await fileExists(destPath)) {
        reusedFiles.push(audioFile);
        continue;
      }

      if (scene.type === "audio" && !scene.text) {
        const sharedPath = path.join(config.staticAudioPath, audioFile);
        if (await fileExists(sharedPath)) {
          await fs.copyFile(sharedPath, destPath);
          reusedFiles.push(audioFile);
        }
        continue;
      }

      if (scene.type === "tts") {
        const text = applyVariables(scene.text || "", variables);
        if (!text) continue;
        const audioBuffer = await generateTts({ voiceId, model, outputFormat, text });
        await fs.writeFile(destPath, audioBuffer);
        generatedFiles.push(audioFile);
      }
    }

    const manifest = {
      cacheKey,
      createdAt: new Date().toISOString(),
      voiceId,
      model,
      outputFormat,
      variables,
      generatedFiles,
      reusedFiles
    };
    await fs.writeFile(path.join(cacheDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    return res.json({
      cacheKey,
      audioBasePath: `/cache/${play}/${cacheKey}`,
      manifest
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Audio generation failed" });
  }
});

app.post("/transcribe", upload.single("file"), async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Missing audio file" });
  }

  try {
    const formData = new FormData();
    formData.append("model", req.body.model || "gpt-4o-mini-transcribe");
    const blob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "audio/webm"
    });
    formData.append("file", blob, req.file.originalname || "speech.webm");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
