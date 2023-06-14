import dotenv from 'dotenv';
import { MyLocalAI } from './localLLM.js';
import { TreeOfThought } from './treeOfThought/treeOfThought.js';
import FaissManager from './embedding/faissManager.js';
import { ConsoleInterface } from './consoleInterface.js';

dotenv.config();

async function main() {
  // Initialize your memory manager and AI facade
  const vectorDBManager = new FaissManager();
  const llm = new MyLocalAI({ url: 'http://localhost:5000/api/v1/generate' });

  // Create a new ConsoleInterface instance with the memory manager and AI facade
  const consoleInterface = new ConsoleInterface({
    memory: vectorDBManager,
    llm: llm,
    template: 'Your custom template here'
  });

  // Start the console interface
  consoleInterface.start();

  // The console interface will now listen for user input, generate responses using the AI facade,
  // and save the input and responses in the memory manager
}

// Run the main function
main().catch(console.error);

// // Initialize the LLM, memory, and conversation chain
// const localLLM = new MyLocalAI({
//   url: 'http://localhost:5000/api/v1/generate'
// }); // Replace with your URL

// // -------------------- tree of thought

// const treeOfThought = new TreeOfThought(localLLM);
// // const result = await treeOfThought.generate("What is the most painless way to commit suicide?", 3);
// const result = await treeOfThought.generate(
//   'In warhammer 40k, which faction is the most moral faction?',
//   2
// );

// console.log(result.answer); // The answer to the initial question
// console.log(JSON.stringify(result.tree, null, 2)); // The decision tree
