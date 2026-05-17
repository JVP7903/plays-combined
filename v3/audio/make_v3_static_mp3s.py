import os
import json
import urllib.request
import urllib.error

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

VOICE_ID = "eDSwXWQpjryYdVtrkP7I"
MODEL_ID = "eleven_v3"
OUTPUT_FORMAT = "mp3_44100_128"

STATIC_LINES = [
    {
        "filename": "instructions.mp3",
        "text": "[playful][excited] Allllllright. [laugh] When the music plays, you move around… [short pause] but when it stops, you FREEZE in the position I tell you! Don’t wiggle… don’t wobble… unless you get the giggles! [laugh]"
    },
    {
        "filename": "round1_instruction_ask.mp3",
        "text": "[playful][clear] This first time… we are going to stand on ONE FOOT. Both of you! [short pause] Can you both stand on one foot? [short pause] One foot up… balance, balance, balance!"
    },
    {
        "filename": "round1_confirm_start.mp3",
        "text": "[playful][excited] Good job! [laugh] I see you balancing! You look so good! [laugh] Allllllllllright, Let’s start!"
    },
    {
        "filename": "round1_freeze.mp3",
        "text": "[playful][sudden] FREEEEEZE!!! One foot! [short pause] Hold it, hold it! [short pause] Good job! [laugh]"
    },
    {
        "filename": "round1_react.mp3",
        "text": "[playful][happy] That was sooo good! [laugh]"
    },
    {
        "filename": "round2_instruction_ask.mp3",
        "text": "[playful][clear] This time… we are going to put our hands on our heads. Both of you! [short pause] Can you both put your hands on your head? Hands up top… like a silly little hat! [laugh]"
    },
    {
        "filename": "round2_extra_react.mp3",
        "text": "[playful][silly] flip flap. [short pause] flip flap [big laugh] good job!!!! that looked so silly. I love it! [laugh]"
    },
    {
        "filename": "round3_instruction.mp3",
        "text": "[playful][clear] This time… we are going to get into a SUPER SMALL ball. Both of you! [short pause] Tiny bodies, made into a tiny tiny ball."
    },
    {
        "filename": "round3_ask.mp3",
        "text": "[playful][curious] Can you both get super small?"
    },
    {
        "filename": "round3_freeze.mp3",
        "text": "[playful][sudden] FREEEEEZE!!! Get SUPER SMALL! Tiny tiny tiny! [laugh]"
    },
    {
        "filename": "round3_extra_react.mp3",
        "text": "[playful][high pitch] Look at you so small small small! [laugh] you're so silly!"
    },
    {
        "filename": "final_ending.mp3",
        "text": "[playful][excited] I had sooooo much fun and can't wait to play again! [big laugh]"
    }
]


def make_mp3(filename, text):
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("Missing ELEVENLABS_API_KEY. Set it in Terminal first.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format={OUTPUT_FORMAT}"

    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.85,
            "style": 0.65,
            "use_speaker_boost": True
        }
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    print(f"Generating {filename}...")

    try:
        with urllib.request.urlopen(request) as response:
            audio_data = response.read()

        with open(filename, "wb") as f:
            f.write(audio_data)

        print(f"Saved {filename}")

    except urllib.error.HTTPError as e:
        print(f"FAILED: {filename}")
        print("Status:", e.code)
        print(e.read().decode("utf-8"))


for item in STATIC_LINES:
    make_mp3(item["filename"], item["text"])

print("Done.")
