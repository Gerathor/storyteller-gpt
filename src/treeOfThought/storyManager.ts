import { StoryNode, StoryNodeType } from './storyTree.js';
import { SceneEvaluator } from '../evaluators-DEPRECATED/sceneEvaluator.js';
import { BaseLLM } from 'langchain/llms';
import { rewriteScene } from './storyWriterHelpers.js';
import { colorizeLog } from '../stringManipulators.js';

const MIN_INTERACTION_PER_SCENE = 3;

export interface Bookmark {
  currentStage: number;
  currentCampaign: number;
  currentScene: number;
}

interface StoryManagerConfig {
  storySkeleton: StoryNode;
  highestLevel: StoryNodeType;
  model: BaseLLM;
}

export class StoryManager {
  private storySkeleton: StoryNode;
  private highestStoryLevel: StoryNodeType;
  private bookmark: Bookmark;
  private currentInteractionCount: number;
  private evaluator: SceneEvaluator;
  private model: BaseLLM;
  private currentSceneText = '';
  private optionalNextScene = () => {
    if (this.currentInteractionCount > MIN_INTERACTION_PER_SCENE) {
      return `Next scene: ${this.getNextScene().shortSummary}`;
    }
    return '';
  };

  constructor(config: StoryManagerConfig) {
    const { storySkeleton, highestLevel, model } = config;
    this.highestStoryLevel = highestLevel;
    this.bookmark = {
      currentStage: 0,
      currentCampaign: 0,
      currentScene: 0
    };
    this.currentInteractionCount = 0;
    this.storySkeleton = storySkeleton;
    this.validateStorySkeleton(this.highestStoryLevel);
    this.model = model;
    this.evaluator = new SceneEvaluator(this.model);
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

    const optionalNextScene = this.optionalNextScene();
    const storyTemplate = `STORY SKELETON:
Short synopsis of the whole story: ${this.storySkeleton.shortSummary}
Current Campaign: ${currentCampaign.shortSummary}
Current Scene: ${currentScene.shortSummary}
${optionalNextScene}`;
    console.log(
      colorizeLog(
        `####CurrentScene: ${currentScene.shortSummary}\n${optionalNextScene}#####`
      )
    );
    return storyTemplate;
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
    this.currentInteractionCount++;
    if (this.currentInteractionCount <= MIN_INTERACTION_PER_SCENE) return false;
    const currentScene = this.getCurrentScene();
    const nextScene = this.getNextScene();

    // ToDo - find out when and how one should be moved to the next scene...
    // const evaluation = await this.evaluator.evaluateObjective(
    //   lastMessages,
    //   currentScene.shortSummary,
    //   nextScene ? nextScene.shortSummary : ''
    // );

    // if (evaluation.toLowerCase().includes('yes')) {
    this.advanceToNextScene();
    this.currentInteractionCount = 0;
    return true; // scene has ended
    // }
    // return false; // scene has not ended
  }

  public appendToCurrentSceneText(text: string) {
    this.currentSceneText += text;
  }

  async advanceToNextScene() {
    const currentStage = this.getCurrentStage();
    const currentCampaign = this.getCurrentCampaign();
    const currentScene = this.getCurrentScene();
    currentScene.shortSummary = await rewriteScene(
      currentCampaign.shortSummary,
      this.currentSceneText,
      this.model
    );

    this.currentSceneText = '';

    if (this.bookmark.currentScene + 1 >= currentCampaign.children.length) {
      this.handleNextCampaign(currentStage);
    } else {
      this.bookmark.currentScene++;
    }

    currentScene.hasTranspired = true;
  }

  handleNextCampaign(currentStage: StoryNode) {
    if (this.bookmark.currentCampaign + 1 >= currentStage.children.length) {
      this.handleNextStage();
    } else {
      this.bookmark.currentCampaign++;
    }
    this.bookmark.currentScene = 0;
  }

  handleNextStage() {
    this.bookmark.currentStage++;
    this.bookmark.currentCampaign = 0;
  }
}
