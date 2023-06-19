// storyManager.js

import { OpenAI } from 'langchain';
import { StoryNode } from './storyTree.js';
import { SceneEvaluator } from '../evaluators-DEPRECATED/sceneEvaluator.js';

interface Bookmark {
  currentStage: number;
  currentCampaign: number;
  currentScene: number;
}

export class StoryManager {
  private storySkeleton: StoryNode;
  private bookmark: Bookmark;
  private evaluator: SceneEvaluator;

  constructor(storySkeleton: StoryNode) {
    this.storySkeleton = storySkeleton;
    this.bookmark = {
      currentStage: 0,
      currentCampaign: 0,
      currentScene: 0
    };
    this.evaluator = new SceneEvaluator(
      new OpenAI({
        openAIApiKey: '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'
      })
    );
  }

  getCurrentStoryTemplate() {
    const currentStage =
      this.storySkeleton.children[this.bookmark.currentStage];
    const currentCampaign =
      currentStage.children[this.bookmark.currentCampaign];
    const currentScene = currentCampaign.children[this.bookmark.currentScene];

    return `
      STORY SKELETON:
      Short synopsis: ${this.storySkeleton.shortSummary}
      Current Stage: ${currentStage.shortSummary}
      Current Campaign: ${currentCampaign.shortSummary}
      Current Scene: ${currentScene.shortSummary}
      If you think it is appropriate to end the scene and go to the next one, type "--- END OF SCENE ---".
    `;
  }

  async evaluateAndPossiblyMoveToNextScene(lastMessages: string) {
    const currentStage =
      this.storySkeleton.children[this.bookmark.currentStage];
    const currentCampaign =
      currentStage.children[this.bookmark.currentCampaign];
    const currentScene = currentCampaign.children[this.bookmark.currentScene];
    const nextScene = currentCampaign.children[this.bookmark.currentScene + 1];

    const evaluation = await this.evaluator.evaluateObjective(
      lastMessages,
      currentScene.shortSummary,
      nextScene ? nextScene.shortSummary : ''
    );

    if (evaluation.toLowerCase().includes('yes')) {
      this.advanceToNextScene();
      return true; // scene has ended
    }
    return false; // scene has not ended
  }

  advanceToNextScene() {
    const currentStage =
      this.storySkeleton.children[this.bookmark.currentStage];
    const currentCampaign =
      currentStage.children[this.bookmark.currentCampaign];

    if (this.bookmark.currentScene + 1 >= currentCampaign.children.length) {
      // Current campaign ended. Move to next campaign
      if (this.bookmark.currentCampaign + 1 >= currentStage.children.length) {
        // Current stage ended. Move to next stage
        this.bookmark.currentStage++;
        this.bookmark.currentCampaign = 0;
      } else {
        this.bookmark.currentCampaign++;
      }
      this.bookmark.currentScene = 0;
    } else {
      this.bookmark.currentScene++;
    }
    this.storySkeleton.children[this.bookmark.currentStage].children[
      this.bookmark.currentCampaign
    ].children[this.bookmark.currentScene].hasTranspired = true;
  }
}
