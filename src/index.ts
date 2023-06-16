import dotenv from 'dotenv';
import { MyLocalAI } from './connectors/localLLM.js';
import FaissManager from './embedding/faissManager.js';
import { ConsoleInterface } from './consoleInterface.js';
import { StoryNode, StoryTree } from './treeOfThought/storyTree.js';
import { MyLocalAIStream } from './connectors/localLLMStream.js';
import { StreamingConsoleInterface } from './streamingConsoleInterface.js';

dotenv.config();
const sirFagStoryTree: StoryNode = {
  layerLevel: 1,
  shortSummary:
    '\nIn "The Fall of Sir Fag," we follow the journey of a brave knight who is betrayed by his own kingdom and left to face the dangers of the orc invasion alone. Despite facing overwhelming odds, Sir Fag fights valiantly against the enemy, but ultimately finds refuge among a group of rebel fighters. Together, they form an unlikely alliance and plan a counterattack against the orc army, hoping to restore peace to the land.',
  children: [
    {
      layerLevel: 1,
      shortSummary:
        'Scene 1: Introduction - In this opening scene, we are introduced to Sir Fag, a brave knight who has dedicated his life to serving the kingdom of Eldoria. We see him riding through the countryside on his trusty steed, determined to defend the realm from any threats that may arise.',
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        "Scene 2: The Attack - Suddenly, Sir Fag's peaceful ride is interrupted by the sound of approaching hoofbeats. Looking up, he sees a band of orcs charging towards him, their weapons at the ready. Without hesitation, Sir Fag draws his sword and prepares to fight, but he quickly realizes that he is vastly outnumbered.",
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        'Scene 3: The Battle - Despite being outnumbered, Sir Fag fights bravely against the orc horde, striking down several foes with his mighty blade. However, the sheer number of enemies proves too much for even his considerable skill, and he finds himself overwhelmed and forced to retreat.',
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        'Scene 4: The Chase - The orcs pursue Sir Fag relentlessly, chasing him across the countryside until finally, he reaches the safety of a nearby castle. Breathless and exhausted, he collapses before the gates, begging for sanctuary.',
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        "Scene 5: The Betrayal - To Sir Fag's horror, the gatekeeper refuses to let him enter, revealing that the kingdom of Eldoria has been betrayed by its own nobles, who have allied themselves with the orcs. With no other option, Sir Fag flees into the surrounding forest, alone and abandoned.",
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        'Scene 6: The Exile - Over the course of several days, Sir Fag wanders aimlessly through the woods, lost and without hope. He knows that he cannot return home, and that he must find a new purpose in order to survive. Eventually, he stumbles upon a hidden village inhabited by a group of rebels fighting against the orc invasion.',
      children: [],
      hasTranspired: false
    },
    {
      layerLevel: 1,
      shortSummary:
        'Scene 7: The Alliance - Sir Fag joins forces with the rebels, using his combat skills to help defend the village against attack. Together, they begin to plan a counterattack against the orc army, hoping to drive them back and restore peace to',
      children: [],
      hasTranspired: false
    }
  ],
  hasTranspired: false
};

function storyTreeDemo() {
  const llm = new MyLocalAI({ url: 'http://localhost:5000/api/v1/generate' });
  const storyTree = new StoryTree(llm, 'FANTASY');
  storyTree.generate(
    'A brief yet tragic story about the escapades of Sir Fag, a fallen from grace alcoholic paladin that still keeps trying to do the right thing despite not knowing what it is and repeatedly failing to achieve anything anyone would consider to be a good outcome',
    'checkpoint_smarter'
  );
}

async function consoleInterfaceDemo() {
  // Initialize your memory manager and AI facade
  const vectorDBManager = new FaissManager();
  const llm = new MyLocalAIStream({
    uri: 'ws://localhost:5005/api/v1/stream'
  });
  console.log(
    '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n'
  );

  // Create a new ConsoleInterface instance with the memory manager and AI facade
  const consoleInterface = new StreamingConsoleInterface({
    memory: vectorDBManager,
    llm: llm,
    storySkeleton: sirFagStoryTree
  });

  // Start the console interface
  consoleInterface.start();
  // The console interface will now listen for user input, generate responses using the AI facade,
  // and save the input and responses in the memory manager
}

// run storytree generation
// storyTreeDemo();

// run the chat "game"
consoleInterfaceDemo().catch(console.error);

// const treeOfThought = new TreeOfThought(localLLM);
// // const result = await treeOfThought.generate("What is the most painless way to commit suicide?", 3);
// const result = await treeOfThought.generate(
//   'In warhammer 40k, which faction is the most moral faction?',
//   2
// );

// console.log(result.answer); // The answer to the initial question
// console.log(JSON.stringify(result.tree, null, 2)); // The decision tree
