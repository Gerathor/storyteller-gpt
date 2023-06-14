import { ReadLine, createInterface } from 'readline';
import { BaseMemory } from 'langchain/memory';
import { BaseLLM } from 'langchain/llms';

const DUNGEON_MASTER = `
You are an AI storyteller. Your task is to create vivid, detailed, and dramatic descriptions of the actions taken by the characters,
regardless of what those actions are. Whether the character is charging into battle or breaking down in tears, your job is to paint a clear, 
evocative picture of the scene. Always write in the third person, providing as much detail and depth as possible.
`;

interface ConsoleInterfaceConfig {
  memory: BaseMemory; // these "should" be theoretically easily changable
  llm: BaseLLM; // these "should" be theoretically easily changable
  template?: string;
}

export class ConsoleInterface {
  private memory: BaseMemory;
  private llm: BaseLLM;
  private readline: ReadLine;
  private template: string;
  private humanPrefix = 'Player: ';
  private aiPrefix = 'Storyteller: ';
  private lastQuestion = '';

  constructor({
    memory,
    llm,
    template = DUNGEON_MASTER
  }: ConsoleInterfaceConfig) {
    this.memory = memory;
    this.llm = llm;
    this.template = template;
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
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

  private async handleInput(input: string): Promise<void> {
    // Query the memory for similar items
    const memoryContext = await this.memory.loadMemoryVariables({
      text: input
    });

    const prompt = `${this.template}
Relevant past story events (feel free to ignore these if you don't think they are relevant):\n${memoryContext.texts}
The current story (you are to continue from here):\n${this.lastQuestion}
${this.humanPrefix}: ${input}
${this.aiPrefix}: `;

    // Answer the question, along with the memory recall
    const response = await this.llm.call(prompt);

    this.lastQuestion = `${this.humanPrefix}: ${input}\n${this.aiPrefix}: ${response}`;
    // Print the response to keep conversation flowing
    console.log(response);
    await this.memory.saveContext(
      { text: `${this.humanPrefix}: ${input}` },
      { text: `${this.aiPrefix}: ${response}` }
    );
  }
}
