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

const AUDIO_ROOT = path.join(__dirname, "audio");
const PLAY_JSON_PATH = path.join(__dirname, "learning_colors_v2.json");

app.use(express.static(path.join(__dirname)));
app.use("/audio", express.static(AUDIO_ROOT));
app.use(express.json());

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
    const cacheDir = path.join(AUDIO_ROOT, cacheKey);
    await ensureDir(cacheDir);

    const jsonRaw = await fs.readFile(PLAY_JSON_PATH, "utf-8");
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
        const sharedPath = path.join(AUDIO_ROOT, audioFile);
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
      audioBasePath: `/audio/${cacheKey}`,
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

app.post("/classify", async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }
  const text = req.body?.text || "";
  const color = req.body?.color || "";
  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    const system =
      "You are classifying if a parent/child has found the correct colored object. " +
      "Return only one word: success, retry, or ignore. " +
      "Use intent, not keywords. Be conservative: if unsure, return ignore. " +
      "Success ONLY if the transcript contains the exact phrases 'you found it' or 'you got it'. " +
      "Ignore all other confirmations, color mentions, or generic affirmations.";
    const examples = [
      { role: "user", content: "Color: red. Transcript: You got it!" },
      { role: "assistant", content: "success" },
      { role: "user", content: "Color: green. Transcript: You found it." },
      { role: "assistant", content: "success" },

      { role: "user", content: "Color: blue. Transcript: Not yet." },
      { role: "assistant", content: "retry" },
      { role: "user", content: "Color: yellow. Transcript: That's not the right color." },
      { role: "assistant", content: "retry" },
      { role: "user", content: "Color: green. Transcript: No, that's not green." },
      { role: "assistant", content: "retry" },
      { role: "user", content: "Color: red. Transcript: Let's keep looking." },
      { role: "assistant", content: "retry" },
      { role: "user", content: "Color: blue. Transcript: Try again." },
      { role: "assistant", content: "retry" },

      { role: "user", content: "Color: yellow. Transcript: I can help you." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: red. Transcript: I have a red ball." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: blue. Transcript: I have a blue one." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: red. Transcript: Yeah go look over here." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: blue. Transcript: Yes to look over there." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: blue. Transcript: Yeah, okay." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: green. Transcript: Okay, keep looking." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: green. Transcript: Let's look over there." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: red. Transcript: Where should we look next?" },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: blue. Transcript: You're doing great." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: yellow. Transcript: Hold it up." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: green. Transcript: Try the other room." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: red. Transcript: Let's look together." },
      { role: "assistant", content: "ignore" },
      { role: "user", content: "Color: blue. Transcript: Take your time." },
      { role: "assistant", content: "ignore" }
    ];
    const user = `Color: ${color || "unknown"}. Transcript: ${text}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...examples, { role: "user", content: user }],
        temperature: 0,
        max_tokens: 3
      })
    });

    const data = await response.json();
    const decision = data?.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    if (!decision || !["success", "retry", "ignore"].includes(decision)) {
      return res.json({ decision: "ignore" });
    }
    if (decision === "success") {
      const explicitSuccess = /\b(you found it|you got it)\b/i;
      if (!explicitSuccess.test(text)) {
        return res.json({ decision: "ignore" });
      }
    }
    return res.json({ decision });
  } catch (error) {
    return res.status(500).json({ error: "Classification failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
