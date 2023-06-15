import { smartSplit } from '../stringManipulators.js';

const MINED_STAGE_EXAMPLE = `Stage 1: Exposition
Summary: In this stage, we are introduced to Sir Fag, a once-great paladin who has fallen from grace due to his addiction to alcohol. Despite his flaws, he remains determined to do the right thing and sets out on a quest to redeem himself. Along the way, he encounters various challenges and obstacles that test his resolve and force him to confront his own demons.
Overarching Theme: Redemption
Stage 2: Rising Action
Summary: As Sir Fag continues his journey, he becomes embroiled in a larger conflict between two rival factions vying for control of the kingdom. He must navigate the complex political landscape, dealing with treacherous alliances and betrayals along the way. His struggles lead him down a dark path, where he begins to question his own morality and the very nature of justice itself.
Overarching Theme: Morality
stage 3: Climax
summary: At the height of the conflict, Sir Fag finally faces off against his greatest enemy - a powerful sorcerer who seeks to usurp the throne. In a desperate battle, Sir Fag must summon all his strength and courage to defeat the sorcerer and save the kingdom. However, even in victory, he finds no sense of satisfaction or closure, as he realizes that his actions have only led to more suffering and chaos.
Overarching Theme: Consequences
Stage 4: Denouement
Summary: In the aftermath of the battle, Sir Fag returns to his hometown, haunted by the memories of his past mistakes and failures. He tries to make amends with those he has wronged, but finds that forgiveness is hard to come by. Ultimately, he comes to accept his fate and the consequences of his choices, finding solace in the knowledge that he did what he could to help others.
Overarching Theme: Acceptance`;

describe('evaluator', () => {
  jest.setTimeout(30000);
  describe(`testing smartSplit`, () => {
    test('splits it into correct numbers', () => {
      const splitArray = smartSplit(MINED_STAGE_EXAMPLE, 'Stage');
      expect(splitArray.length).toBe(4);
    });
    test('works for smallcaps as well', () => {
      const splitArray = smartSplit(MINED_STAGE_EXAMPLE.toLowerCase(), 'stage');
      expect(splitArray.length).toBe(4);
    });
    test('works if matchPattern is in wrong caps', () => {
      const splitArray = smartSplit(MINED_STAGE_EXAMPLE, 'StAgE');
      expect(splitArray.length).toBe(4);
    });
  });
});
