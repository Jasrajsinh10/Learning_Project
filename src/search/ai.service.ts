import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class AiService {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async explainRelevance(query: string, productName: string, productDescription: string): Promise<string> {
    try {
      // if (!process.env.GROQ_API_KEY) {
      //   return 'GROQ_API_KEY not found in environment.';
      // }

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a super helpful assistant that explains why a product matches a user search query. Be extremely concise (maximum 10 words).',
          },
          {
            role: 'user',
            content: `Search Query: "${query}"\nProduct: "${productName}"\nDescription: "${productDescription}"\nExplain relevance:`,
          },
        ],
        temperature: 0.5,
        max_tokens: 50,
      });

      return response.choices[0]?.message?.content || 'No explanation available.';
    } catch (error) {
      console.error('Groq Explanation failed:', error);
      return 'Explanation service currently unavailable.';
    }
  }
}
