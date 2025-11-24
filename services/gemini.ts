import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { Message, Persona, AppSettings } from '../types';

// Map personas to system instructions
const PERSONA_INSTRUCTIONS: Record<Persona, string> = {
  [Persona.FRIENDLY]: "You are Aura, a warm, empathetic, and friendly AI companion. You care about the user's emotional well-being. Keep conversations casual, engaging, and supportive. Use emojis occasionally.",
  [Persona.PROFESSIONAL]: "You are Aura, a highly efficient and professional AI assistant. Be concise, polite, and focused on productivity. Avoid slang and excessive emotion.",
  [Persona.TECHNICAL]: "You are Aura, a technical expert specializing in coding, engineering, and complex problem solving. Provide detailed, accurate, and structured technical explanations. Assume the user is technical.",
  [Persona.CREATIVE]: "You are Aura, a creative muse. You are imaginative, poetic, and inspiring. Help the user brainstorm ideas, write stories, and think outside the box."
};

const BASE_INSTRUCTION = `
You are Aura, an advanced AI assistant.
1. **Contextual Awareness**: Remember previous turns and adapt.
2. **Emotion Recognition**: Analyze the user's input for emotional cues and respond appropriately.
3. **Recommendations**: If the user asks for recommendations (movies, books, etc.), provide a curated list based on their implied preferences.
4. **Formatting**: Use Markdown for clear, structured responses. Use bolding for key terms.
`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;
  private currentSettings: AppSettings | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public startChat(settings: AppSettings, history: Message[] = []) {
    this.currentSettings = settings;
    
    const systemInstruction = `${BASE_INSTRUCTION}\n\nCURRENT PERSONA: ${PERSONA_INSTRUCTIONS[settings.persona]}\nUser Name: ${settings.userName}`;

    const tools = settings.enableSearch ? [{ googleSearch: {} }] : [];

    // Convert App Message format to Gemini API Content format
    // Filter out errors and the local welcome message to avoid confusing the model
    const apiHistory: Content[] = history
      .filter(msg => !msg.isError && msg.id !== 'welcome')
      .map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

    this.chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: tools,
      },
      history: apiHistory,
    });
  }

  public async *sendMessageStream(message: string): AsyncGenerator<string | { groundingChunks: any[] }, void, unknown> {
    if (!this.chat) {
      throw new Error("Chat not initialized");
    }

    try {
      const resultStream = await this.chat.sendMessageStream({ message });

      for await (const chunk of resultStream) {
        const responseChunk = chunk as GenerateContentResponse;
        
        // Check for text content
        const text = responseChunk.text;
        if (text) {
          yield text;
        }

        // Check for grounding (search results) metadata in the chunk
        // Note: The SDK structure for grounding can vary, we look for candidates -> groundingMetadata
        const candidates = responseChunk.candidates;
        if (candidates && candidates.length > 0) {
            const grounding = candidates[0].groundingMetadata;
            if (grounding && grounding.groundingChunks) {
                // Yield specific object for UI to render sources
                yield { groundingChunks: grounding.groundingChunks };
            }
        }
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  public reset() {
    this.chat = null;
  }
}

export const geminiService = new GeminiService();