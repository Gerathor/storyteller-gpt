import { BaseLLM } from 'langchain/llms';
import { colorizeLog } from './stringManipulators.js';

export class Character {
  private localLLM: BaseLLM;
  private description: string;

  constructor(description: string, localLLM: BaseLLM) {
    this.description = description;
    this.localLLM = localLLM;
  }

  async createPrompt(storySoFar: string): Promise<string | undefined> {
    const instructions = `Based on your character's description and the given storyline, propose your next action in the third person. 
Consider your character's personality, background, and current situation when deciding what to do.
Your character's dialogue should reflect their personality, and their decisions should align with their character traits.
Remember, the success of your proposed action is not yet determined and will be decided by the storyteller. Keep your actions short, ideally one or two sentences max.`;

    const fullPrompt = `Character Description: "${this.description}".
    THE STORY SO FAR: ${storySoFar}
    ${instructions}
    Proposed action:`;

    try {
      console.log(colorizeLog('\nAI character: Thinking about next action...'));
      const storySoFarIsComplete = storySoFar.trimEnd().endsWith('.');
      if (!storySoFarIsComplete) {
        return 'continue';
      }
      const response = await this.localLLM.call(fullPrompt);
      console.log(`\nAI character: ${response}`);
      return response;
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
  }
}
