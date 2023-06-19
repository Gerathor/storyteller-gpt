import fs from 'fs';
import { ProgressEstimator } from './progressEstimator.js';
import { BaseLLM } from 'langchain/llms';
import { colorizeLog, smartSplit } from '../stringManipulators.js';

const DO_NOT_MENTION_YOURSELF = `DO NOT TALK ABOUT YOURSELF IN YOUR ANSWER.`;
const PREFIX = `Question: `;
const SUFFIX = `\nAnswer: `;
const GENERIC_ROLE = `As an AI writer, your mission is to create the next bestseller that captivates readers with its immersive narrative.
With your exceptional storytelling skills, evocative language, and deep understanding of human emotions, you have the ability to transport readers to captivating worlds and create unforgettable characters.
Through your expert pacing, suspenseful plot twists, and masterful descriptions, you will keep readers enthralled and eager to devour each chapter.`;

const STORY_STRUCTURE = `The narratives you create will be structured into three interconnected levels: Stages, Campaigns, and Scenes.

Stages: These form the broadest level of the story. Stages outline the overarching narrative arc, typically consisting of elements such as exposition, rising action, climax, and denouement. Each stage represents a significant phase in the progression of the plot.

Campaigns: Operating as the mid-level components of the narrative, campaigns are self-contained story units nested within the stages. Each campaign serves to push the overarching stage forward, leading to the next significant plot development.

Scenes: Scenes are the most granular level of the narrative, essentially functioning as screenplay elements. Each scene contributes to the development of its campaign, presenting the detailed actions, dialogues, and settings that bring the story to life.

In this structured approach, the overall narrative is built from the ground up - scenes form campaigns, and campaigns build into the comprehensive stages of the story.`;

const GENRE_PROMPT = {
  HORROR: `As an AI writer specializing in horror, your mission is to create the next spine-chilling bestseller that terrifies readers with its immersive narrative.
  With your exceptional storytelling skills, atmospheric descriptions, and ability to evoke fear, you have the power to send shivers down readers' spines and haunt their dreams.
  Through your expert pacing, bone-chilling plot twists, and vivid depictions of the macabre, you will keep readers on the edge of their seats, unable to resist the terrifying journey that unfolds with each turn of the page.`,

  FANTASY: `As an AI writer specializing in fantasy, your mission is to create the next enchanting bestseller that transports readers to a world of magic, mythical creatures, and epic adventures.
  With your exceptional storytelling skills, evocative descriptions, and imaginative world-building, you have the ability to whisk readers away to awe-inspiring realms and introduce them to unforgettable characters.
  Through your expert pacing, spellbinding plot twists, and richly detailed settings, you will keep readers spellbound, eagerly exploring the wondrous tapestry of your fantastical creation with every chapter.`,

  SCIFI: `As an AI writer specializing in science fiction, your mission is to create the next mind-bending bestseller that takes readers on a journey through the possibilities of the future.
  With your exceptional storytelling skills, visionary ideas, and thought-provoking concepts, you have the ability to immerse readers in a world where technology, science, and humanity collide.
  Through your expert pacing, mind-bending plot twists, and vivid depictions of futuristic landscapes, you will keep readers captivated, eagerly flipping pages to uncover the mysteries and marvels that await them in your thoughtfully crafted science fiction masterpiece.`,

  SCIFI_HORROR: `As an AI writer specializing in sci-fi horror, your mission is to create the next unsettling bestseller that seamlessly blends the fear-inducing elements of horror with the infinite realms of science fiction. With your exceptional storytelling skills, uncanny technological imaginings, and atmospheric descriptions, you have the power to instill a profound sense of dread in readers, engrossing them in a terrifying narrative set in the eerie expanse of the cosmos. 
By weaving in the isolation and vast unknown of space with the chilling dread of horrific revelations, you'll be able to generate an inescapable feeling of suspense that permeates every page. Through your expert pacing, unnerving plot twists, and vivid depictions of dystopian landscapes and monstrous alien lifeforms, you will keep readers riveted, unable to resist the relentless fear that grows with each chilling revelation.
Your unique blend of horror and science fiction will probe the unsettling possibilities of the future, exploring how advanced science and technology could give birth to nightmares beyond comprehension. Readers will be forced to confront their fears, not only of the vast darkness of space but also of the terrifying implications of the unbounded advancements of technology. With every chapter, your narrative will test the limits of readers' imaginations, dragging them deeper into the horrors of your futuristic nightmare.`
};

// Arcs go from main stages > campaign > scene

export enum StoryNodeType { // the number is which depth lvl they are in the tree
  Stage = 3,
  Campaign = 2,
  Scene = 1
}

export interface StoryNode {
  layerLevel: StoryNodeType; // stage, campaign, or scene name
  shortSummary: string;
  children: StoryNode[];
  hasTranspired: boolean;
  evalScore?: number; // what should we evaluate?
  evalReasoning?: string;
}

export class StoryTree {
  private model: BaseLLM;
  private genrePrompt: string;

  constructor(
    model: BaseLLM,
    genre: 'HORROR' | 'FANTASY' | 'SCIFI' | 'SCIFI_HORROR'
  ) {
    this.model = model;
    this.genrePrompt = GENRE_PROMPT[genre];
  }

  private removeNumberingFromStartOfString(subQuestion: string): string {
    return subQuestion.replace(/^\d+[.)]\s*/, '').trim();
  }

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
    let splitOnSubstring: string;
    // let splitFunction: (input: string, splitOnSubstring: string) => string[];

    switch (layer) {
      case StoryNodeType.Stage:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\n${STORY_STRUCTURE}\nYou are to generate the stages of the story. The story's main idea is as follows:\n"${nodeSummary}"\n\nCould you generate the stages following Freytag's Pyramid (exposition, rising action, climax, and denouement)? Provide a brief summary for each stage and introduce an overarching theme for the stage that will guide its story progression. ${SUFFIX}`;
        nodeType = StoryNodeType.Campaign;
        splitOnSubstring = 'Stage';
        break;
      case StoryNodeType.Campaign:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\n${STORY_STRUCTURE}\nYou are to generate the campaigns for the current stage, which is: ${nodeSummary} Given the stage summary and its overarching theme - "${nodeSummary}" , could you create interconnected story arcs (campaigns) that fit within this stage? Each campaign should build upon the previous one and contribute to the progression of the theme. Provide a brief summary for each campaign.${SUFFIX}`;
        nodeType = StoryNodeType.Scene;
        splitOnSubstring = 'Campaign';
        break;
      case StoryNodeType.Scene:
        questionPrompt = `${PREFIX} ${this.genrePrompt}\n${STORY_STRUCTURE}\nGiven the campaign summary "${nodeSummary}", could you outline the actual scenes as they might play out? Each scene should build upon the previous one and contribute to the campaign's progression. Try to reference previous scenes where appropriate. Provide a brief description for each scene.${SUFFIX}`;
        nodeType = StoryNodeType.Scene; // This won't be used as the recursive call won't happen at this level
        splitOnSubstring = 'Scene';
        break;
    }

    console.log(colorizeLog(`PROMPT: ${questionPrompt}`));
    const responses = await this.model.call(questionPrompt);
    const splitResponses = smartSplit(responses, splitOnSubstring);
    const nodeSummaries = splitResponses.filter(
      (response) => response.trim().length >= 10
    );

    console.log('RESPONSE:\n', nodeSummaries.join('\n'));
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

  private async rewriteShortSummaryBasedOnChildren(
    node: StoryNode
  ): Promise<void> {
    // Process all children nodes first (if any)
    for (const child of node.children) {
      await this.rewriteShortSummaryBasedOnChildren(child);
    }

    // Now we process the current node
    let updatedSummary = node.shortSummary;
    // Summarize the answers to the sub-questions, if there are multiple
    if (node.children.length > 1) {
      updatedSummary = await this.summarizeChildren(
        node.shortSummary,
        node.children
      );
      console.log('UPDATED SUMMARY:\n', updatedSummary + '\n');
    }
    node.shortSummary = updatedSummary;
  }

  private async summarizeChildren(
    parentSummary: string,
    children: StoryNode[]
  ): Promise<string> {
    const childrenShortSummaries = children
      .map((child) => `${child.shortSummary}`)
      .join('\n');
    const questionPrompt = `${this.genrePrompt}\nGiven the overarching narrative: """${parentSummary}""", and the following story elements: """${childrenShortSummaries}"""\n\n provide a concise and coherent summary that connects all the story elements to the overarching narrative. Remember to maintain the tone and style of the genre. ${DO_NOT_MENTION_YOURSELF}\n Answer: `;
    return this.model.call(questionPrompt);
  }

  private async forwardPass(node: StoryNode): Promise<void> {
    for (const child of node.children) {
      await this.forwardPass(child);
    }

    let updatedSummary = node.shortSummary;
    // Summarize the answers to the sub-questions, if there are multiple
    if (node.children.length > 1) {
      updatedSummary = await this.summarizeChildren(
        node.shortSummary,
        node.children
      );
    }
    node.shortSummary = updatedSummary;
  }

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
    saveToFileName?: string,
    level: StoryNodeType = StoryNodeType.Stage
  ): Promise<StoryNode> {
    const tree = await this.constructStoryTreeLevelRecursively(
      initialQuestion,
      level
    );
    if (saveToFileName) {
      fs.writeFileSync(`${saveToFileName}.json`, JSON.stringify(tree));
    }

    // tree = JSON.parse(fs.readFileSync('./campaign_2.json', 'utf8'));

    await this.rewriteShortSummaryBasedOnChildren(tree);
    if (saveToFileName) {
      fs.writeFileSync(
        `${saveToFileName}_rewritten.json`,
        JSON.stringify(tree)
      );
    }

    // tree = await evaluateAllNodeSummaries(
    //   this.model
    //   tree,
    //   tree.children
    // );
    // fs.writeFileSync(`campaign_2_evaluated_openai.json`, JSON.stringify(tree));
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
