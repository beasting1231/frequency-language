import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

const API_KEY = "AIzaSyD8QMjh4EvvkQJlpbq2K7sGbMViefKhS0M";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;

// Simple hash function for generating unique filenames
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Create WAV header for PCM audio
function createWAVHeader(sampleRate, numChannels, bitsPerSample, dataLength) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  function writeString(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  return buffer;
}

// Combine WAV header with PCM data
function createWAVBlob(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const wavHeader = createWAVHeader(sampleRate, numChannels, bitsPerSample, pcmData.byteLength);

  const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBuffer.set(new Uint8Array(wavHeader), 0);
  wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);

  return new Blob([wavBuffer], { type: "audio/wav" });
}

// Check if audio exists in Firebase Storage
async function getExistingAudio(filename) {
  try {
    const audioRef = ref(storage, `tts/${filename}.wav`);
    const url = await getDownloadURL(audioRef);
    return url;
  } catch (error) {
    // File doesn't exist
    return null;
  }
}

// Upload audio to Firebase Storage
async function uploadAudio(filename, blob) {
  const audioRef = ref(storage, `tts/${filename}.wav`);
  await uploadBytes(audioRef, blob, { contentType: "audio/wav" });
  return await getDownloadURL(audioRef);
}

// Make TTS request with retry logic
async function makeRequest(text, retries = 2) {
  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `Say the following in Japanese: "${text}"` }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore",
            },
          },
        },
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 500 && retries > 0) {
      // Retry on server error
      await new Promise(r => setTimeout(r, 500));
      return makeRequest(text, retries - 1);
    }
    console.error("Gemini TTS HTTP error:", response.status, responseText);
    throw new Error(`TTS request failed: ${response.status}`);
  }

  return responseText;
}

// Generate speech from Japanese text using Gemini TTS
export async function generateSpeech(text) {
  // Create a unique filename based on the text
  const filename = hashText(text);

  // Check if audio already exists in Firebase Storage
  const existingUrl = await getExistingAudio(filename);
  if (existingUrl) {
    return existingUrl;
  }

  // Generate new audio
  const responseText = await makeRequest(text);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse TTS response:", responseText.substring(0, 500));
    throw new Error("Invalid JSON response from TTS API");
  }

  // Check for error in response
  if (data.error) {
    console.error("Gemini API error:", data.error);
    throw new Error(data.error.message || "API returned an error");
  }

  // Extract base64 audio data
  const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioData) {
    console.error("No audio data found. Response structure:", JSON.stringify(data, null, 2).substring(0, 1000));
    throw new Error("No audio data in response");
  }

  // Convert base64 PCM to WAV blob
  const pcmBuffer = base64ToArrayBuffer(audioData);
  const wavBlob = createWAVBlob(pcmBuffer);

  // Upload to Firebase Storage and return the URL
  const audioUrl = await uploadAudio(filename, wavBlob);
  return audioUrl;
}
