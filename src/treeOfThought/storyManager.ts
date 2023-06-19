// storyManager.js

import { OpenAI } from 'langchain';
import { StoryNode, StoryNodeType } from './storyTree.js';
import { SceneEvaluator } from '../evaluators-DEPRECATED/sceneEvaluator.js';

const MIN_INTERACTION_PER_SCENE = 3;

interface Bookmark {
  currentStage: number;
  currentCampaign: number;
  currentScene: number;
  currentInteractionCount: number;
}

export class StoryManager {
  private storySkeleton: StoryNode;
  private highestStoryLevel: StoryNodeType;
  private bookmark: Bookmark;
  private evaluator: SceneEvaluator;
  private optionalNextScene = () => {
    if (this.bookmark.currentInteractionCount > MIN_INTERACTION_PER_SCENE) {
      return `Next scene: ${this.getNextScene().shortSummary}`;
    }
  };

  constructor(
    storySkeleton: StoryNode,
    highestLevel: StoryNodeType = StoryNodeType.Stage
  ) {
    this.highestStoryLevel = highestLevel;
    this.bookmark = {
      currentStage: 0,
      currentCampaign: 0,
      currentScene: 0,
      currentInteractionCount: 0
    };
    this.storySkeleton = storySkeleton;
    this.validateStorySkeleton(highestLevel);
    this.evaluator = new SceneEvaluator(
      new OpenAI({
        openAIApiKey: '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'
      })
    );
  }

  validateStorySkeleton(highestStoryLevel: StoryNodeType) {
    try {
      if (highestStoryLevel >= StoryNodeType.Stage) {
        const currentStage = this.getCurrentStage();
        if (!currentStage)
          throw new Error('The story skeleton does not contain any stages.');

        if (highestStoryLevel >= StoryNodeType.Campaign) {
          const currentCampaign = this.getCurrentCampaign();
          if (!currentCampaign)
            throw new Error(
              `Stage at index ${this.bookmark.currentStage} does not contain any campaigns.`
            );

          if (highestStoryLevel >= StoryNodeType.Scene) {
            const currentScene = this.getCurrentScene();
            if (!currentScene)
              throw new Error(
                `Campaign at index ${this.bookmark.currentCampaign} of stage ${this.bookmark.currentStage} does not contain any scenes.`
              );
          }
        }
      }
    } catch (error) {
      if (error instanceof Error)
        throw new Error(`Invalid Story Skeleton: ${error.message}`);
      else throw error;
    }
  }

  getCurrentStoryTemplate() {
    // const currentStage = this.getCurrentStage();
    const currentCampaign = this.getCurrentCampaign();
    const currentScene = this.getCurrentScene();

    return `STORY SKELETON:
Short synopsis of the whole story: ${this.storySkeleton.shortSummary}
Current Campaign: ${currentCampaign.shortSummary}
Current Scene: ${currentScene.shortSummary}
${this.optionalNextScene()}`;
  }

  getCurrentStageTemplate() {
    const currentStage = this.getCurrentStage();
    if (currentStage) {
      return `Current Stage: ${currentStage.shortSummary}`;
    }
    return '';
  }

  getCurrentStage = () => {
    if (this.highestStoryLevel == StoryNodeType.Stage) {
      return this.storySkeleton.children[this.bookmark.currentStage];
    }
    if (this.highestStoryLevel == StoryNodeType.Campaign) {
      return this.storySkeleton;
    }
    return this.storySkeleton;
  };

  getCurrentCampaign = () => {
    const currentStage = this.getCurrentStage();
    if (currentStage) {
      return currentStage.children[this.bookmark.currentCampaign];
    } else {
      return this.storySkeleton;
    }
  };

  getCurrentScene = () => {
    const currentCampaign = this.getCurrentCampaign();
    return currentCampaign.children[this.bookmark.currentScene];
  };

  getNextScene = () =>
    this.getCurrentCampaign().children[this.bookmark.currentScene + 1];

  async evaluateAndPossiblyMoveToNextScene(lastMessages: string) {
    this.bookmark.currentInteractionCount++;
    if (this.bookmark.currentInteractionCount <= MIN_INTERACTION_PER_SCENE)
      return false;
    this.bookmark.currentInteractionCount = 0;
    const currentScene = this.getCurrentScene();
    const nextScene = this.getNextScene();

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
    // TODO:  might want to rewrite the next scene at this point
    const currentStage = this.getCurrentStage();
    const currentCampaign = this.getCurrentCampaign();

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
    this.getCurrentScene().hasTranspired = true;
  }
}
