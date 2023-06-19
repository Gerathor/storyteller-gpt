import { BaseLLM } from 'langchain/llms';
import { STORY_STRUCTURE } from '../streamingConsoleInterface.js';
const DUNGEON_MASTER_EVALUATOR = `You are the AI assistant to a storyteller. You will see the dialog between the player and the storyteller.
Your task is to evaluate the progression of the story so far and determine if it is appropriate to move on to the next scene now.
Scenes should not be too long and too repetitive, but also not too short and too abrupt.`; // Todo: do the 3-4 interactions manually?
// The main class that performs the objective evaluation
export class SceneEvaluator {
  private model: BaseLLM;
  private objective: string; // e.g. 'Should the current scene end and move to the next?'
  public currentEvaluation: string;

  constructor(model: BaseLLM) {
    this.model = model;
    this.objective = 'Is it appropriate to move to the next scene now?';
    this.currentEvaluation = '';
  }

  async evaluateObjective(
    sceneSoFar: string,
    currentSceneSummary: string,
    nextSceneSummary: string
  ) {
    const query = `${DUNGEON_MASTER_EVALUATOR}
${STORY_STRUCTURE}
Answer the following question with a clear YES/NO answer, followed by a percentage score with how confident you are in the answer. Use the format: "YES - 100%".

THE SCENE SO FAR:
${sceneSoFar}

WHAT THE GOAL OF THE SCENE SHOULD BE:
${currentSceneSummary}

WHAT THE NEXT SCENE WILL BE ABOUT:
${nextSceneSummary}

QUESTION:
${this.objective}

FINAL ANSWER:`;

    const rawResult = await this.model.call(query);
    return rawResult.trim();
  }
}
