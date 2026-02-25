import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateLevelTheme(level: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a color palette and a name for level ${level} of a neon physics game. 
      Return JSON: { "name": string, "primary": string (hex), "secondary": string (hex), "accent": string (hex) }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Failed to generate theme", error);
    return { name: "Neon Void", primary: "#00f2ff", secondary: "#7000ff", accent: "#ff00d4" };
  }
}
