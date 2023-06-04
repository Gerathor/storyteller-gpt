import readline from 'readline';
import { OpenAI } from 'langchain/llms/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the LLM, memory, and conversation chain
const primeText = `
You are an AI dungeon master. You create vivid, exciting descriptions of fantasy environments, characters, and events. You respond to player actions with creativity and attention to detail, always keeping the story engaging.
`;
const initialStorySeed = `
You are a brave paladin named Sir Fag. In the small village of Creepyville, children have been mysteriously disappearing. Villagers speak in hushed whispers of a decrepit crypt nearby, where ghostly laughter can be heard echoing at night. Determined to solve the mystery and bring peace to Creepyville, you've decided to investigate the crypt. Your trusty sword by your side, you stand before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.
`;

let storySoFar = initialStorySeed;

// Initialize the LLM, memory, and conversation chain
const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY });
const memory = new BufferMemory();
const chain = new ConversationChain({ llm: model, memory: memory });

// Create readline interface for console interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Recursive function to keep asking for user input
function askQuestion() {
  rl.question('Enter your action: ', async (action) => {
    const primedAction = primeText + storySoFar + '\n\n' + action;
    const res = await chain.call({ input: primedAction });
    console.log(res);

    // Update the story so far
    storySoFar += '\n\n' + 'You: ' + action + '\n\n' + 'DM: ' + res.response;
    console.log('primedAction:', primedAction);
    // Ask the next question
    askQuestion();
  });
}
console.log('REEEEEEEEEEEEEEEEEEEEEEE');
// Start the conversation
askQuestion();
