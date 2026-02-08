
import { GoogleGenAI, Type } from "@google/genai";

export const geminiService = {
  generateHomeworkDescription: async (title: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `宿題「${title}」について、小学生がやる気を出しそうな具体的な説明文を1つ提案してください。100文字以内でお願いします。日本語で返答してください。`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text?.trim() || "教科書の内容を確認しましょう。";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "先生からの説明: 計画的に進めましょう。";
    }
  }
};
