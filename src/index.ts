// import readline from 'readline';
// import dotenv from 'dotenv';
// import { LocalAIFacade } from './evaluators/localAIFacade.js';
// import { ObjectiveEvaluator } from './evaluators/evaluator.js';

// dotenv.config();

// // // Initialize the LLM, memory, and conversation chain
// // const primeText = `
// // You are an AI dungeon master. You create vivid, exciting descriptions of fantasy environments, characters, and events. You respond to player actions with creativity and attention to detail. Always write in third person.
// // `;
// // const initialStorySeed = `
// // You are a brave paladin named Sir Fag. In the small village of Creepyville, children have been mysteriously disappearing. Villagers speak in hushed whispers of a decrepit crypt nearby, where ghostly laughter can be heard echoing at night. Determined to solve the mystery and bring peace to Creepyville, you've decided to investigate the crypt. Your trusty sword by your side, you stand before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.
// // `;

// // let storySoFar = initialStorySeed;

// // Create readline interface for console interaction
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// const localLLMConnection = new LocalAIFacade();
// const evaluator = new ObjectiveEvaluator(localLLMConnection, )
// // Recursive function to keep asking for user input
// function askQuestion() {
//   rl.question('Enter your action: ', async (action) => {
//     const formattedAction = `Player: ${action}\n\nStoryteller:`;

//     const primedAction = primeText + storySoFar + '\n\n' + formattedAction;
//     const res = await proomptLocalAI(primedAction);
//     const truncatedRes = truncateOutputAtStoppingString(res, [
//       '\nPlayer',
//       '\nplayer'
//     ]);
//     // const res = await proomptLocalAIStream(primedAction);
//     console.log(truncatedRes);

//     // Update the story so far
//     storySoFar += '\n' + 'You: ' + action + '\n' + 'DM: ' + truncatedRes;
//     // console.log('primedAction:', primedAction);
//     const hasKilled = await evaluateObjective(
//       storySoFar,
//       'Has the player character killed anything in the story thus far?',
//       chain
//     );
//     // const hasDied = evaluateObjective(
//     //   storySoFar,
//     //   'Has the player character died in the story thus far?'
//     // );
//     // Ask the next question
//     askQuestion();
//   });
// }
// console.log(storySoFar);
// // Start the conversation
// askQuestion();
