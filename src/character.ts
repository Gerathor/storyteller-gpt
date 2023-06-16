import { MyLocalAI } from './connectors/localLLM.js';

export class Character {
  private localLLM: MyLocalAI;
  private description: string;

  constructor(description: string, localLLM: MyLocalAI) {
    this.description = description;
    this.localLLM = localLLM;
  }

  async createPrompt(storySoFar: string): Promise<string | undefined> {
    const primeText = `
You are an AI storyteller and you are tasked with creating the next action for a character. The character is described as follows: "${this.description}". Considering the character's traits and the events of the story so far, what action does the character decide to take next? Describe what the character action should be in first person. Example: "I open the door", "I rush towards the enemy, uncaring about the flying arrows" etc. \n\n THE STORY SO FAR:`;

    const fullPrompt = primeText + '\n' + storySoFar + 'Proposed action:';

    try {
      const response = await this.localLLM.call(fullPrompt);
      return response;
    } catch (error) {
      console.error(error);
    }
  }
}
