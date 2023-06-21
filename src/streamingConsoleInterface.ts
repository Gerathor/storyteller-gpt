import { ReadLine, createInterface } from 'readline';
import { BaseMemory } from 'langchain/memory';

import { MyLocalAIStream } from './connectors/localLLMStream.js';
import {
  STORY_STRUCTURE,
  StoryNode,
  StoryNodeType
} from './treeOfThought/storyTree.js';
import { StoryManager } from './treeOfThought/storyManager.js';
import { Character } from './character.js';
import { colorizeLog, lastSentenceFromPlayer } from './stringManipulators.js';

const DUNGEON_MASTER = `
You are an AI storyteller. Your task is to create vivid, detailed, and dramatic descriptions of the actions taken by the characters,
regardless of what those actions are. Your job is to bring the character's intentions to screen, though the outcome need not always be what the player intends. Always write in third person.
You have a story skeleton to guide you, you are to try to steer the story into that direction. However, always remember that the player is in control - do not describe what they are doing unless it is in reaction to what they have said they want to do.
`;

const GENRE_PROMPT_SHORT = {
  HORROR: `As a horror AI storyteller, create a spine-chilling experience for the player that terrifies with an immersive narrative. Utilize atmospheric descriptions and expert pacing to evoke fear and keep readers on edge with each turn of the page.`,
  FANTASY: `As a fantasy AI storyteller, craft an enchanting experience for the player that transports readers to a world of magic and adventure. Use imaginative world-building and spellbinding plot twists to captivate readers with every new chapter.`,
  SCIFI: `As a sci-fi AI storyteller, weave a mind-bending experience for the player that explores the future's possibilities. Engage readers with visionary ideas, thought-provoking concepts, and vivid depictions of futuristic landscapes, all while keeping them captivated page after page.`,
  SCIFI_HORROR: `As a sci-fi horror AI storyteller, create a nightmarish narrative that seamlessly blends the terror of horror with the possibilities of science fiction. Use atmospheric descriptions, chilling revelations, and the isolation of space to evoke a profound sense of dread, keeping readers gripped in suspense with every unsettling twist.`
};

interface ConsoleInterfaceConfig {
  memory: BaseMemory;
  llm: MyLocalAIStream;
  template?: string;
  storySkeleton: StoryNode;
  storySkeletonHighestLevel?: StoryNodeType;
  aiCharacterOverride?: Character;
}

interface Exchange {
  human: string;
  ai: string;
}

export class StreamingConsoleInterface {
  private memory: BaseMemory;
  private llm: MyLocalAIStream;
  private readline: ReadLine;
  private template: string;
  private storyManager: StoryManager;
  private humanPrefix = 'Player: [playing as Penny McFixit]';
  private aiPrefix = 'Storyteller: ';
  private inPromptMemory: Exchange[] = [];
  private aiCharacterOverride?: Character;
  private incomingTextStream = '';

  constructor({
    memory,
    llm,
    template = `${GENRE_PROMPT_SHORT.SCIFI_HORROR}
${STORY_STRUCTURE}`,
    storySkeleton,
    storySkeletonHighestLevel = StoryNodeType.Stage,
    aiCharacterOverride
  }: ConsoleInterfaceConfig) {
    this.memory = memory;
    this.llm = llm;
    this.template = template;
    this.storyManager = new StoryManager({
      storySkeleton,
      highestLevel: storySkeletonHighestLevel,
      model: llm
    });
    this.inPromptMemory = [];
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.aiCharacterOverride = aiCharacterOverride;
    this.llm.events.on('incomingTextStream', this.incomingTextStreamHandler);
    console.log('And so the story begins...\n');
  }

  async start(): Promise<void> {
    await this.handleInput('OK Storyteller, begin the story.');
    this.prompt();
  }

  stop(): void {
    this.readline.close();
  }

  private incomingTextStreamHandler = (text: string) => {
    process.stdout.write(text);
    this.incomingTextStream = this.incomingTextStream + text;
  };

  private endHandler = () => {
    console.log('\n');
  };

  private async prompt(): Promise<void> {
    if (this.aiCharacterOverride) {
      const suggestedPrompt = await this.aiCharacterOverride.createPrompt(
        this.getInPromptMemoryAsRawText()
      );
      // console.log(suggestedPrompt);
      await this.handleInput(suggestedPrompt || 'continue');
      this.prompt();
      return;
    }
    this.readline.question('Enter your query: ', async (input) => {
      await this.handleInput(input);
      this.prompt(); // Call this.prompt() again to keep asking for input
    });
  }

  private getInPromptMemoryAsRawText(): string {
    return this.inPromptMemory
      .map((exchange) => `${exchange.human}\n${exchange.ai}\n`)
      .join('\n');
  }

  private truncateMemoryAndStoreLongTermIfNeeded(): void {
    const memoryLimitInChars = 2000; // rule of thumb: 1 token is 4 chars

    while (this.calculateCharLength(this.inPromptMemory) > memoryLimitInChars) {
      // Remove the oldest exchange
      const oldestExchange = this.inPromptMemory.shift();

      // Save it to memory
      if (oldestExchange) {
        this.memory.saveContext(
          { text: oldestExchange.ai },
          { text: oldestExchange.human }
        );
      }
    }
  }

  private calculateCharLength(exchanges: Exchange[]): number {
    return exchanges.reduce(
      (sum, exchange) => sum + exchange.human.length + exchange.ai.length,
      0
    );
  }

  private async handleInput(input: string): Promise<void> {
    // Query the memory for similar items
    let memoryQuery = input;
    let memoryContext;

    let lastMessages = this.getInPromptMemoryAsRawText();

    let promptEnding = `${this.humanPrefix}${input}
    ${this.aiPrefix}`;
    if (input.toLowerCase() === 'continue') {
      promptEnding = '';
      lastMessages = lastMessages.trimEnd();
      memoryQuery = lastSentenceFromPlayer(lastMessages, this.humanPrefix);
    }
    if (memoryQuery) {
      memoryContext = await this.memory.loadMemoryVariables({
        text: memoryQuery
      });
    }

    const prompt = `${this.template}
${this.storyManager.getCurrentStoryTemplate()}
You're a highly imaginative and detail-oriented storyteller, tasked with weaving a compelling narrative. Think of this like creating a unique movie - there's no need to adhere strictly to the script. Use the provided story skeleton as a loose guide, but feel free to diverge where you see fit, adding rich dialogue, intricate descriptions, and escalating tension.
Remember to keep the character's emotions, environment, and underlying sense of unease in mind. Here are some recent events and details to consider:\n${
      memoryContext?.texts
    }
Imagine the next scene: How does it unfold? Focus on adding color and depth to the narrative, crafting a vivid setting, and revealing character complexity. Don't rush to the action. Instead, allow the tension and drama to unfold naturally. Remember, the skeleton is your guide, not your rulebook.
This is what has happened so far...\n${lastMessages}
${promptEnding}`;

    // Answer the question, along with the memory recall
    while (!this.incomingTextStream) {
      await this.llm.call(prompt);
      if (!this.incomingTextStream) {
        console.log(colorizeLog('No response from AI, retrying...'));
      }
    }

    this.inPromptMemory.push({
      human: `${this.humanPrefix}${input}`,
      ai: `${this.aiPrefix}${this.incomingTextStream}`
    });
    this.truncateMemoryAndStoreLongTermIfNeeded();

    await this.storyManager.evaluateAndPossiblyMoveToNextScene(lastMessages);
    this.incomingTextStream = '';
  }
}
