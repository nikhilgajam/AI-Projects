import os
import wave
from google import genai
from google.genai import types

# 1. Initialize the client with your free Google AI Studio API key
# Get an API key from: https://aistudio.google.com/app/apikey
client = genai.Client(api_key="same_api_key_used_for_LLMs")

# 2. Call the Gemini TTS model
response = client.models.generate_content(
    model="gemini-3.1-flash-tts",
    contents="Hey there! I'm generating this audio natively using Google's Gemini models.",
    config=types.GenerateContentConfig(
        # Force the model to output audio instead of text
        response_modalities=["AUDIO"], 
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name='Erinome', # Available voices: Kore, Puck, Aoede, etc.
                )
            )
        ),
    )
)

# 3. Extract the raw audio bytes
audio_data = response.candidates[0].content.parts[0].inline_data.data

# 4. Save the raw PCM output to a WAV file (Gemini outputs 24kHz, 16-bit mono)
with wave.open('output.wav', "wb") as wf:
    wf.setnchannels(1)       # Mono
    wf.setsampwidth(2)       # 16-bit
    wf.setframerate(24000)   # 24kHz
    wf.writeframes(audio_data)

print("Audio saved successfully to output.wav!")