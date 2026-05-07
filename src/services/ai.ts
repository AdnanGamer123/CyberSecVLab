import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function askQA(question: string, context?: string) {
  try {
    const c = getAI();
    let prompt = `أنت مساعد ذكي ولطيف في مختبر الأمن السيبراني للمبتدئين. أجب على أسئلة المستخدم حول الأمن السيبراني باللغة العربية بأسلوب مبسط وسهل الفهم.\n\n`;
    if (context) {
      prompt += `الموضوع الحالي الذي يقرأه المستخدم:\n${context}\n\n`;
    }
    prompt += `سؤال المستخدم: ${question}`;

    const response = await c.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (err: any) {
    console.error("AI Error:", err);
    return "عذراً، حدث خطأ أثناء التواصل مع الذكاء الاصطناعي. يرجى التأكد من إعداد مفتاح API بشكل صحيح والمحاولة لاحقاً.";
  }
}
