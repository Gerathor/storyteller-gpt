import dotenv from 'dotenv';
import { MyLocalAI } from './localLLM.js';
import { TreeOfThought } from './treeOfThought/treeOfThought.js';
import FaissManager from './embedding/faissManager.js';
import { ConsoleInterface } from './consoleInterface.js';
import { StoryTree } from './treeOfThought/storyTree.js';

dotenv.config();

const llm = new MyLocalAI({ url: 'http://localhost:5000/api/v1/generate' });
const storyTree = new StoryTree(llm);
storyTree.generate(
  'A brief yet tragic story about the escapades of Sir Fag, a fallen from grace alcoholic paladin that still keeps trying to do the right thing despite not knowing what it is and repeatedly failing to achieve anything anyone would consider to be a good outcome'
);

// async function main() {
//   // Initialize your memory manager and AI facade
//   const vectorDBManager = new FaissManager();
//   const llm = new MyLocalAI({ url: 'http://localhost:5000/api/v1/generate' });

//   // Save the story intro to memory
//   await vectorDBManager.saveContext({
//     text: `Our story begins in the small village of Creepyville, where children have been mysteriously disappearing.
// Villagers speak in hushed whispers of a decrepit crypt nearby, ghostly laughter can be heard echoing at night.
// Determined to solve the mystery and bring peace to Creepyville, the player - called Sir Fag - has decided to investigate the crypt.
// With his trusty sword by his side, he stands before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.`
//   });

//   // Create a new ConsoleInterface instance with the memory manager and AI facade
//   const consoleInterface = new ConsoleInterface({
//     memory: vectorDBManager,
//     llm: llm
//   });

//   // Start the console interface
//   consoleInterface.start();

//   // The console interface will now listen for user input, generate responses using the AI facade,
//   // and save the input and responses in the memory manager
// }

// // Run the main function
// main().catch(console.error);

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
