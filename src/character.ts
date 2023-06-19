import { BaseLLM } from 'langchain/llms';

export class Character {
  private localLLM: BaseLLM;
  private description: string;

  constructor(description: string, localLLM: BaseLLM) {
    this.description = description;
    this.localLLM = localLLM;
  }

  async createPrompt(storySoFar: string): Promise<string | undefined> {
    const instructions = `You are a character in a tabletop RPG-style game. Your task is to propose your next action based on your description and the storyline. Speak in first person, keep your actions concise, and respond based on what has been mentioned in the story. Assume your action's success is undetermined until the storyteller decides.`;

    const fullPrompt = `Character Description: "${this.description}".
    THE STORY SO FAR: ${storySoFar}
    ${instructions}
    Proposed action:`;

    try {
      const response = await this.localLLM.call(fullPrompt);
      console.log(response);
      return response;
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
  }
}
