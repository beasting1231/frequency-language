import { GoogleGenerativeAI } from "@google/generative-ai";
import { words } from "@/data/words";

const genAI = new GoogleGenerativeAI("AIzaSyCvxbK_MNBtT9bGQpI_ZXbTtKM1OJZqqAw");

const wordList = words.map(w => w.japanese).join(", ");

export async function generateExamplePhrases(word) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a Japanese language teacher. Generate exactly 3 simple example phrases using the Japanese word "${word.japanese}" (${word.romaji}, meaning: ${word.english}).

Rules:
- Keep phrases simple and beginner-friendly
- Try to use only common words from this vocabulary list when possible: ${wordList}
- Each phrase should be natural Japanese

Return ONLY a JSON array with exactly 3 objects, each containing:
- "japanese": the phrase in Japanese
- "romaji": the romanization
- "english": the English translation

Example format:
[
  {"japanese": "水を飲む", "romaji": "mizu wo nomu", "english": "drink water"},
  {"japanese": "...", "romaji": "...", "english": "..."},
  {"japanese": "...", "romaji": "...", "english": "..."}
]

Return only the JSON array, no other text.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse the JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse response");
  }

  return JSON.parse(jsonMatch[0]);
}
