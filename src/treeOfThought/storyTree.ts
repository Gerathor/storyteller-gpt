import { ProgressEstimator } from './progressEstimator.js';
import { BaseLLM } from 'langchain/llms';

const DO_NOT_MENTION_SUBQUESTIONS = `Omit usage of the word 'sub-questions' in your answer.`;
const PREFIX = `Question: `;
const SUFFIX = `\nAnswer: `;
const GENERIC_ROLE = `As an AI writer, your mission is to create the next bestseller that captivates readers with its immersive narrative.
With your exceptional storytelling skills, evocative language, and deep understanding of human emotions, you have the ability to transport readers to captivating worlds and create unforgettable characters.
Through your expert pacing, suspenseful plot twists, and masterful descriptions, you will keep readers enthralled and eager to devour each chapter.`;
const GENRE_PROMPT = {
  HORROR: `As an AI writer specializing in horror, your mission is to create the next spine-chilling bestseller that terrifies readers with its immersive narrative.
  With your exceptional storytelling skills, atmospheric descriptions, and ability to evoke fear, you have the power to send shivers down readers' spines and haunt their dreams.
  Through your expert pacing, bone-chilling plot twists, and vivid depictions of the macabre, you will keep readers on the edge of their seats, unable to resist the terrifying journey that unfolds with each turn of the page.`,

  FANTASY: `As an AI writer specializing in fantasy, your mission is to create the next enchanting bestseller that transports readers to a world of magic, mythical creatures, and epic adventures.
  With your exceptional storytelling skills, evocative descriptions, and imaginative world-building, you have the ability to whisk readers away to awe-inspiring realms and introduce them to unforgettable characters.
  Through your expert pacing, spellbinding plot twists, and richly detailed settings, you will keep readers spellbound, eagerly exploring the wondrous tapestry of your fantastical creation with every chapter.`,

  SCIFI: `As an AI writer specializing in science fiction, your mission is to create the next mind-bending bestseller that takes readers on a journey through the possibilities of the future.
  With your exceptional storytelling skills, visionary ideas, and thought-provoking concepts, you have the ability to immerse readers in a world where technology, science, and humanity collide.
  Through your expert pacing, mind-bending plot twists, and vivid depictions of futuristic landscapes, you will keep readers captivated, eagerly flipping pages to uncover the mysteries and marvels that await them in your thoughtfully crafted science fiction masterpiece.`
};

// Arcs go from main stages > campaign > scene

enum StoryNodeType { // the number is which depth lvl they are in the tree
  Stage = 3,
  Campaign = 2,
  Scene = 1
}

interface StoryNode {
  layerLevel: StoryNodeType; // stage, campaign, or scene name
  shortSummary: string;
  children: StoryNode[];
  hasTranspired: boolean;
  evaluationScore?: number; // what should we evaluate?
}

export class StoryTree {
  private model: BaseLLM;
  private genrePrompt: string;
  private forwardPassCounter;

  constructor(model: BaseLLM) {
    this.model = model;
    this.forwardPassCounter = new ProgressEstimator();
    this.genrePrompt = GENRE_PROMPT.FANTASY;
  }

  private removeNumberingFromStartOfString(subQuestion: string): string {
    return subQuestion.replace(/^\d+[.)]\s*/, '').trim();
  }

  // function that asks the LLM to answer 1 question specifically
  private async answerQuestion(question: string): Promise<string> {
    const questionPrompt = `Given the question "${question}", what is the most accurate answer you can provide? ${DO_NOT_MENTION_SUBQUESTIONS}  Answer:\n`;
    return this.model.call(questionPrompt);
  }

  private async answerSubquestionBasedOnParentAnswer(
    parentQuestion: string,
    parentAnswer: string,
    subQuestion: string
  ): Promise<string> {
    const questionPrompt = `Given the question "${parentQuestion}" and its answer "${parentAnswer}", how would you refine or update the answer to the related sub-question "${subQuestion}"? ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
    return this.model.call(questionPrompt);
  }

  //   private async summarizeChildren(
  //     parentQuestion: string,
  //     children: StoryNode[]
  //   ): Promise<string> {
  //     const subQuestionsAndTheirAnswers = children
  //       .map((child) => `${child.question}: ${child.answer}`)
  //       .join('\n');
  //     const questionPrompt = `Given the question: ${parentQuestion}, and the following related sub-questions and their answers:\n${subQuestionsAndTheirAnswers}\n\nProvide a concise summary of all of the sub-questions and their answers. ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
  //     return this.model.call(questionPrompt);
  //   }

  //   private async generateChildren(question: string): Promise<string> {
  //     const prompt = `${ROLE}Given the question "${question}", what are some related sub-plots that we could explore?
  //     Separate each sub-question with a SINGLE newline. ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
  //     return this.model.call(prompt);
  //   }

  private async constructStoryTreeLevelRecursively(
    nodeSummary: string,
    layer: StoryNodeType
  ): Promise<StoryNode> {
    if (layer < StoryNodeType.Scene) {
      return {
        layerLevel: StoryNodeType.Scene,
        shortSummary: nodeSummary,
        children: [],
        hasTranspired: false
      };
    }

    let questionPrompt: string;
    let nodeType: StoryNodeType;
    switch (layer) {
      case StoryNodeType.Stage:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\nGiven the overall story summary "${nodeSummary}", could you generate the stages following Freytag's Pyramid (exposition, rising action, climax, and denouement)? Provide a brief summary for each stage.${SUFFIX}`;
        nodeType = StoryNodeType.Campaign;
        break;
      case StoryNodeType.Campaign:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\nGiven the stage summary "${nodeSummary}", could you create smaller story arcs (campaigns) that fit within this stage? Provide a brief summary for each campaign.${SUFFIX}`;
        nodeType = StoryNodeType.Scene;
        break;
      case StoryNodeType.Scene:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\nGiven the campaign summary "${nodeSummary}", could you outline the actual scenes as they might play out? Provide a brief description for each scene.${SUFFIX}`;
        nodeType = StoryNodeType.Scene; // This won't be used as the recursive call won't happen at this level
        break;
    }

    console.log('PROMPT:', questionPrompt);
    const responses = await this.model.call(questionPrompt);
    console.log('RESPONSE:', responses);
    const nodeSummaries = responses
      .split('\n')
      .filter((response) => response.trim().length >= 3)
      .map((response) => this.removeNumberingFromStartOfString(response));

    const children: StoryNode[] = [];
    for (let childSummary of nodeSummaries) {
      childSummary = this.removeNumberingFromStartOfString(childSummary);
      const childNode = await this.constructStoryTreeLevelRecursively(
        childSummary,
        layer - 1
      );
      if (nodeType != StoryNodeType.Scene) {
        // FIGURE OUT WHAT WE NEED TO DO AT THIS LEVEL FFS
        console.log('?????');
        // childNode.children = await this.constructStoryTreeLevelRecursively(
        //   childSummary,
        //   nodeType
        // );
      }
      children.push(childNode);
    }

    return {
      layerLevel: layer,
      shortSummary: nodeSummary,
      children: children,
      hasTranspired: false
    };
  }

  //   private async forwardPass(node: StoryNode): Promise<void> {
  //     for (const child of node.children) {
  //       await this.forwardPass(child);
  //     }

  //     let summaryAnswer = node.answer;
  //     // Summarize the answers to the sub-questions, if there are multiple
  //     if (node.children.length > 1) {
  //       summaryAnswer = await this.summarizeChildren(
  //         node.question,
  //         node.children
  //       );
  //     }
  //     node.answer = summaryAnswer;
  //   }
  //   private async backwardPass(node: ThoughtNode): Promise<void> {
  //     // Generate new answers to the sub-questions given the answer to the initial question
  //     for (const child of node.children) {
  //       const newAnswer = await this.answerSubquestionBasedOnParentAnswer(
  //         node.question,
  //         node.answer,
  //         child.question
  //       );
  //       child.answer = newAnswer;
  //       await this.backwardPass(child);
  //     }
  //   }

  //   private async iterativeRefinement(
  //     node: ThoughtNode,
  //     maxPasses = 3
  //   ): Promise<void> {
  //     let oldAnswer;
  //     let counter = 0;
  //     while (node.answer !== oldAnswer) {
  //       oldAnswer = node.answer;

  //       await this.forwardPass(node);
  //       fs.writeFileSync(
  //         `checkpoint_${counter}_afterforward.json`,
  //         JSON.stringify(node)
  //       );
  //       await this.backwardPass(node);

  //       fs.writeFileSync(
  //         `checkpoint_${counter}_afterbackwards.json`,
  //         JSON.stringify(node)
  //       );
  //       counter += 1;
  //       if (counter > maxPasses) break;
  //     }
  //   }

  public async generate(
    initialQuestion: string,
    filenameForCheckpoint = 'checkpoint'
  ): Promise<StoryNode> {
    const tree = await this.constructStoryTreeLevelRecursively(
      initialQuestion,
      StoryNodeType.Stage
    );
    // fs.writeFileSync(`${filenameForCheckpoint}.json`, JSON.stringify(tree));
    // import tree from checkpoint.json

    // let evalTestTree = JSON.parse(
    //   fs.readFileSync('./checkpoint_0_afterbackwards.json', 'utf8')
    // );

    // evalTestTree = await evaluateChildrenScoresIfUndefined(
    //   this.client,
    //   evalTestTree
    // );

    // const tree = JSON.parse(
    //   fs.readFileSync(`./${filenameForCheckpoint}.json`, 'utf8')
    // );
    // save const tree into a json file for later use

    // await this.iterativeRefinement(tree);
    // fs.writeFileSync(
    //   `${filenameForCheckpoint}_after_refinement.json`,
    //   JSON.stringify(tree)
    // );
    return tree;
  }
}
