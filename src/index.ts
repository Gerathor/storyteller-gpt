import readline from 'readline';
import dotenv from 'dotenv';
import { ConversationChain } from 'langchain/chains';
import { MyLocalAI } from './localLLM.js';
import { Character } from './character.js';
import { TreeOfThought } from './treeOfThought/treeOfThought.js';
import VectraManager from './embedding/vectraManager.js';
import { SystemMessagePromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate } from "langchain/prompts";
import FaissManager from './embedding/faissManager.js';

dotenv.config();

// Initialize the LLM, memory, and conversation chain
const primeText = `
You are an AI dungeon master. Your task is to create vivid, detailed, and dramatic descriptions of the actions taken by the characters,
regardless of what those actions are. Whether the character is charging into battle or breaking down in tears, your job is to paint a clear, 
evocative picture of the scene. Always write in the third person, providing as much detail and depth as possible.
`;
const initialStorySeed = `
You are a paladin named Sir Fag. In the small village of Creepyville, children have been mysteriously disappearing. Villagers speak in hushed whispers of a decrepit crypt nearby, where ghostly laughter can be heard echoing at night. Determined to solve the mystery and bring peace to Creepyville, you've decided to investigate the crypt. Your trusty sword by your side, you stand before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.
`;

let storySoFar = initialStorySeed;
// Initialize the LLM, memory, and conversation chain
const vectorDBManager = new FaissManager();
// await vectorDBManager.addItem('dog');
// await vectorDBManager.addItem('bicycle');
// await vectorDBManager.addItem('banana');
const results = await vectorDBManager.queryItems('vehicle', 3);
console.log(results);
const localLLM = new MyLocalAI({
  url: 'http://localhost:5000/api/v1/generate'
}); // Replace with your URL

// Defining the new behavior for the AI assistant
const systemPrompt = SystemMessagePromptTemplate.fromTemplate(
  "You are a witty, brutally honest, and incredibly politically incorrect assistant. Question: {userPrompt} Answer:"
);

// Constructing the ChatPromptTemplate with the new behavior
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  systemPrompt,
  HumanMessagePromptTemplate.fromTemplate("{text}"),
]);

const chain = new ConversationChain({ 
  llm: localLLM,
   memory: vectorDBManager, 
   prompt: chatPrompt });

// Mock user input
let mock_input = 'What is a moon cricket?';

// Passing the mock user input to the LLMChain
const response = await chain.call({
  userPrompt: mock_input,
  text: mock_input,
});

   console.log(response)
// const llmFacade = new LocalAIFacade();
// const eval = new ObjectiveEvaluator()

// Create readline interface for console interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Recursive function to keep asking for user input
async function askQuestion(action: string) {
  //   rl.question('Enter your action: ', async (action) => {
  const formattedAction = `The character (Sir Fag) decides to take an action: "${action}". Describe this action in vivid detail and continue with the story.\n\nStoryteller:`;

  const primedAction = primeText + storySoFar + '\n\n' + formattedAction;

  const res = await chain.call({prompt: primedAction}); // Use localLLM.call() instead of proomptLocalAI
  const character = new Character(
    `A paladin who has fallen from grace. Once a paragon of virtue, Sir Fag now drowns his regrets in drink and debauchery.
    He is a brooding man, haunted by his past, his honor tarnished, his courage faded into a distant memory.
    Despite his failings, there is a lingering spark of the hero he once was.`,
    localLLM
  );
  // const truncatedRes = truncateOutputAtStoppingString(res, [
  //   '\nPlayer',
  //   '\nplayer'
  // ]);
  console.log(res);
  // console.log(truncatedRes);

  // Update the story so far
  storySoFar += '\n' + 'You: ' + action + '\n' + 'DM: ' + res;

  // const hasKilled = await evaluateObjective(
  //   storySoFar,
  //   'Has the player character killed anything in the story thus far?',
  //   chain
  // );

  // Ask the next question
  // const nextPrompt = await character.createPrompt(storySoFar);
  // console.log('AI came up with prompt' + nextPrompt);
  // askQuestion(nextPrompt || '');
  
  //   });
}
// console.log(storySoFar);
// // Start the conversation
rl.question('Enter your first action: ', async (action) => {
  askQuestion(action);
});

// -------------------- tree of thought

const treeOfThought = new TreeOfThought(localLLM);
// const result = await treeOfThought.generate("What is the most painless way to commit suicide?", 3);
const result = await treeOfThought.generate(
  'In warhammer 40k, which faction is the most moral faction?',
  2
);

console.log(result.answer); // The answer to the initial question
console.log(JSON.stringify(result.tree, null, 2)); // The decision tree
