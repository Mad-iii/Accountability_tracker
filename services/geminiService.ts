
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getHabitSuggestions(currentHabits: string[]): Promise<string[]> {
    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ 
          parts: [{ 
            text: `I currently have these habits: ${currentHabits.join(', ')}. Suggest 3 complementary productivity or wellness habits that would fit well. Keep it brief.` 
          }] 
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });
      
      const text = response.text;
      if (!text) return ["Morning stretches", "Reading 10 pages", "Deep breathing exercises"];
      return JSON.parse(text.trim());
    } catch (error) {
      console.error("Gemini Suggestions Error:", error);
      return ["Morning stretches", "Reading 10 pages", "Deep breathing exercises"];
    }
  }

  async getMotivationalQuote(tier: string): Promise<string> {
    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ 
          parts: [{ 
            text: `Generate a short, powerful motivational quote for someone at the ${tier} rank in an accountability app. No more than 15 words.` 
          }] 
        }],
      });
      return response.text?.trim() || "Stay consistent, stay sharp.";
    } catch (error) {
        console.error("Gemini Quote Error:", error);
        return "Discipline is the bridge between goals and accomplishment.";
    }
  }
}

export const geminiService = new GeminiService();
