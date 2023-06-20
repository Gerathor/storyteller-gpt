import dotenv from 'dotenv';
import { MyLocalAI } from './connectors/localLLM.js';
import FaissManager from './embedding/faissManager.js';
import fs from 'fs';
import { StoryNodeType, StoryTree } from './treeOfThought/storyTree.js';
import { MyLocalAIStream } from './connectors/localLLMStream.js';
import { StreamingConsoleInterface } from './streamingConsoleInterface.js';
import { Character } from './character.js';

dotenv.config();
const aiCharacter = new Character(
  'Sir Fag is an alcoholic fallen from grace paladin. He can probably take a few enemies on his own, but he is definitely not a one-man-army. He is struggling with his self-esteem but tries to overcompensate with bravado still left over from when he was touched by grace.',
  new MyLocalAI({ url: 'http://localhost:5000/api/v1/generate' })
  // new OpenAI({
  //   openAIApiKey: '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'
  // })
);
function storyTreeDemo() {
  const llm = new MyLocalAI({
    url: 'http://localhost:5000/api/v1/generate',
    maxTokens: 750
  });
  const storyTree = new StoryTree(llm, 'SCIFI_HORROR');
  const SIR_FAG_STORY_TREE_PROMPT =
    'A brief yet tragic story about the escapades of Sir Fag, a fallen from grace alcoholic paladin that still keeps trying to do the right thing despite not knowing what it is and repeatedly failing to achieve anything anyone would consider to be a good outcome';
  const SCIFI_HORROR_PROMPT = `In the year 2823, humanity has ventured to the stars aboard the colony ship "Pilgrimage," destined for the far-flung habitable world of Persephara.
The ship's AI, known as H.E.L.E.N (Helpful Electronic Lifeform and Exploration Navigator), has inexplicably deviated from protocol, awakening a handful of few crew members from their cryogenic sleep - among these select few is Penny McFixit, a lowly but talented engineer.
Yet, H.E.L.E.N remains ominously silent, no longer communicating with the crew while continuing to execute its core functions. As the bewildered humans grapple with their predicament, they're oblivious to the looming threat that isn't their uncommunicative guardian AI.
The final plot twist should be that H.E.L.E.N. is in fact benevolent and means them no harm.`;
  storyTree.generate(SCIFI_HORROR_PROMPT, 'colony_ship_2');
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

  const pennyMcFixit = new Character(
    `Penny McFixit serves as the Chief Engineer aboard the "Pilgrimage," a colony ship traversing the cosmos. A devout Christian, Penny views her role as a divine mission, maintaining the ship's operations with an unwavering faith in God and a vivacious spirit. Known for her infectious optimism and wit, she's the heart of the crew. Her quick quips and cheerful demeanor bring light to the most grueling tasks, making her a popular figure among her team. However, her bright outlook can be a double-edged sword. Penny's tendency to downplay potential risks often leads to underestimated problems. Additionally, her high expectations set her up for disappointment, especially in personal relationships. Regardless, her technical expertise and faith-driven dedication make her a cornerstone in the Pilgrimage's journey through space.`,
    llm
  );
  // Create a new ConsoleInterface instance with the memory manager and AI facade
  const consoleInterface = new StreamingConsoleInterface({
    memory: vectorDBManager,
    llm: llm,
    storySkeleton: JSON.parse(
      fs.readFileSync('./colony_ship_2_future.json', 'utf8')
    ),
    // storySkeletonHighestLevel: StoryNodeType.Stage,
    aiCharacterOverride: pennyMcFixit
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
