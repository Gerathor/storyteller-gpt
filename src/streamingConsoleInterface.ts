import { ReadLine, createInterface } from 'readline';
import { BaseMemory } from 'langchain/memory';

import { MyLocalAIStream } from './connectors/localLLMStream.js';
import { StoryNode } from './treeOfThought/storyTree.js';
import { StoryManager } from './treeOfThought/storyManager.js';

const DUNGEON_MASTER = `
You are an AI storyteller. Your task is to create vivid, detailed, and dramatic descriptions of the actions taken by the characters,
regardless of what those actions are. Your job is to bring the character's intentions to screen, though the outcome need not always be what the player intends. Always write in third person.
You have a story skeleton to guide you, you are to try to steer the story into that direction.
`;
export const STORY_STRUCTURE = `Your narratives will be organized into three tiers: Stages, Campaigns, and Scenes.
Stages: These are broad narrative phases, including exposition, rising action, climax, and denouement, defining the overall plot progression.
Campaigns: These are mid-level, self-contained units within stages, each driving the plot towards the next major development.
Scenes: The smallest narrative units, functioning as screenplay elements with actions, dialogues, and settings, each propelling its campaign.
In this approach, scenes construct campaigns, and campaigns form the comprehensive stages of the story, info about this is stored in the story skeleton.`;

const GENRE_PROMPT_SHORT = {
  HORROR: `As a horror AI storyteller, create a spine-chilling experience for the player that terrifies with an immersive narrative. Utilize atmospheric descriptions and expert pacing to evoke fear and keep readers on edge with each turn of the page.`,
  FANTASY: `As a fantasy AI storyteller, craft an enchanting experience for the player that transports readers to a world of magic and adventure. Use imaginative world-building and spellbinding plot twists to captivate readers with every new chapter.`,
  SCIFI: `As a sci-fi AI storyteller, weave a mind-bending experience for the player that explores the future's possibilities. Engage readers with visionary ideas, thought-provoking concepts, and vivid depictions of futuristic landscapes, all while keeping them captivated page after page.`
};

interface ConsoleInterfaceConfig {
  memory: BaseMemory;
  llm: MyLocalAIStream;
  template?: string;
  storySkeleton: StoryNode;
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
  private humanPrefix = 'Player: ';
  private aiPrefix = 'Storyteller: ';
  private inPromptMemory: Exchange[] = [];
  private incomingTextStream = '';

  constructor({
    memory,
    llm,
    template = `${DUNGEON_MASTER}
${GENRE_PROMPT_SHORT.FANTASY}
${STORY_STRUCTURE}`,
    storySkeleton
  }: ConsoleInterfaceConfig) {
    this.memory = memory;
    this.llm = llm;
    this.template = template;
    this.storyManager = new StoryManager(storySkeleton);
    this.inPromptMemory = [];
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
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

  private prompt(): void {
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
    const memoryLimit = 2000; // rule of thumb: 1 token is 4 chars

    while (this.calculateCharLength(this.inPromptMemory) > memoryLimit) {
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
    const memoryContext = await this.memory.loadMemoryVariables({
      text: input
    });

    let lastMessages = this.getInPromptMemoryAsRawText();

    let promptEnding = `${this.humanPrefix}${input}
    ${this.aiPrefix}`;
    if (input.toLowerCase() === 'continue') {
      promptEnding = '';
      lastMessages = lastMessages.trimEnd();
    }
    const prompt = `${this.template}
${this.storyManager.getCurrentStoryTemplate()}
Relevant past story events (feel free to ignore these if you don't think they are relevant):\n${
      memoryContext.texts
    }
The current story (you are to continue from here):\n${lastMessages}${promptEnding}`;
    // Answer the question, along with the memory recall

    this.llm.events.on('incomingTextStream', this.incomingTextStreamHandler);
    this.llm.events.on('end', this.endHandler);
    await this.llm.call(prompt);
    // Remove the event listeners to stop listening
    this.llm.events.removeListener(
      'incomingTextStream',
      this.incomingTextStreamHandler
    );
    this.llm.events.removeListener('end', this.endHandler);
    // console.log(this.incomingTextStream);
    this.inPromptMemory.push({
      human: `${this.humanPrefix}${input}`,
      ai: `${this.aiPrefix}${this.incomingTextStream}`
    });
    this.truncateMemoryAndStoreLongTermIfNeeded();

    await this.storyManager.evaluateAndPossiblyMoveToNextScene(lastMessages);
    this.incomingTextStream = '';
  }
}
