import { ReadLine, createInterface } from 'readline';
import { BaseMemory } from 'langchain/memory';
import { BaseLLM } from 'langchain/llms';
import { truncateOutputAtStoppingString } from './stringManipulators.js';

const DUNGEON_MASTER = `
You are an AI storyteller. Your task is to create vivid, detailed, and dramatic descriptions of the actions taken by the characters,
regardless of what those actions are. Whether the character is charging into battle or breaking down in tears, your job is to paint a clear, 
evocative picture of the scene. Always write in the third person, providing as much detail and depth as possible.
`;

interface ConsoleInterfaceConfig {
  memory: BaseMemory; // these "should" be theoretically easily changable
  llm: BaseLLM; // these "should" be theoretically easily changable
  template?: string;
  startupPrompt?: string;
}

interface Exchange {
  human: string;
  ai: string;
}

export class ConsoleInterface {
  private memory: BaseMemory;
  private llm: BaseLLM;
  private readline: ReadLine;
  private template: string;
  private humanPrefix = 'Player: ';
  private aiPrefix = 'Storyteller: ';
  private inPromptMemory: Exchange[] = [];

  constructor({
    memory,
    llm,
    template = DUNGEON_MASTER,
    startupPrompt = ''
  }: ConsoleInterfaceConfig) {
    this.memory = memory;
    this.llm = llm;
    this.template = template;
    this.inPromptMemory = [
      { human: '', ai: `${this.aiPrefix}${startupPrompt}` }
    ];
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log(startupPrompt);
  }

  start(): void {
    this.prompt();
  }

  stop(): void {
    this.readline.close();
  }

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

    const prompt = `${this.template}
Relevant past story events (feel free to ignore these if you don't think they are relevant):\n${
      memoryContext.texts
    }
The current story (you are to continue from here):\n${this.getInPromptMemoryAsRawText()}
${this.humanPrefix}${input}
${this.aiPrefix}`;

    // Answer the question, along with the memory recall
    const response = await this.llm.call(prompt);
    const truncatedResponse = truncateOutputAtStoppingString(response, [
      'player',
      'Player'
    ]);

    this.inPromptMemory.push({
      human: `${this.humanPrefix}: ${input}`,
      ai: `${this.aiPrefix}: ${truncatedResponse}`
    });
    this.truncateMemoryAndStoreLongTermIfNeeded();

    // Print the response to keep conversation flowing
    console.log(truncatedResponse);
    console.log('\n');
  }
}
