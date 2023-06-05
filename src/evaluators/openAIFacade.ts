import { ChainValues } from 'langchain/schema';
import { LLMFacade } from './evaluator.js';
import { ConversationChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { BufferMemory } from 'langchain/memory';
import dotenv from 'dotenv';
dotenv.config();

export class OpenAIFacade implements LLMFacade {
  private chain: ConversationChain;
  public lastResponse: ChainValues;

  constructor() {
    // Initialize the LLM, memory, and conversation chain
    const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY });
    const memory = new BufferMemory();
    this.chain = new ConversationChain({ llm: model, memory: memory });
    this.lastResponse = {};
  }

  async generateResponse(query: string) {
    const res = await this.chain.call({ input: query });
    return res.response;
  }

  extractLastResponseText() {
    return this.lastResponse.response;
  }
}
