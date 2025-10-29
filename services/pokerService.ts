import { Card, Player, HandResult, HandRank, Rank, Suit } from '../types';
import { SUITS, RANKS, RANK_VALUES } from '../constants';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getCardValue = (card: Card): number => RANK_VALUES[card.rank];

const sortCards = (cards: Card[]): Card[] => {
    return [...cards].sort((a, b) => getCardValue(b) - getCardValue(a));
};

export const evaluateHand = (holeCards: Card[], communityCards: Card[]): HandResult => {
  const allCards = sortCards([...holeCards, ...communityCards]);

  const combinations = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    const recurse = (current: T[], start: number) => {
      if (current.length === size) {
        result.push(current);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        recurse([...current, arr[i]], i + 1);
      }
    };
    recurse([], 0);
    return result;
  };

  const fiveCardCombinations = combinations(allCards, 5);
  let bestHand: HandResult | null = null;

  for (const hand of fiveCardCombinations) {
      const currentHand = checkHand(hand);
      if (!bestHand || currentHand.value > bestHand.value) {
          bestHand = currentHand;
      }
  }

  return bestHand!;
};

const checkHand = (hand: Card[]): HandResult => {
    const sortedHand = sortCards(hand);
    const ranks = sortedHand.map(c => c.rank);
    const suits = sortedHand.map(c => c.suit);
    const values = sortedHand.map(c => getCardValue(c));

    const isFlush = new Set(suits).size === 1;
    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {} as Record<Rank, number>);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    const isStraight = (vals: number[]): boolean => {
        const uniqueVals = [...new Set(vals)].sort((a,b)=>a-b);
        if (uniqueVals.length < 5) return false;
        // Ace-low straight
        if (uniqueVals[0] === 2 && uniqueVals[1] === 3 && uniqueVals[2] === 4 && uniqueVals[3] === 5 && uniqueVals[uniqueVals.length - 1] === 14) {
            return true;
        }
        for (let i = 0; i <= uniqueVals.length - 5; i++) {
            let isSeq = true;
            for (let j = 1; j < 5; j++) {
                if(uniqueVals[i+j] !== uniqueVals[i] + j) {
                    isSeq = false;
                    break;
                }
            }
            if(isSeq) return true;
        }
        return false;
    };
    
    const getStraightHighCardValue = (vals: number[]): number => {
        const uniqueVals = [...new Set(vals)].sort((a,b)=>a-b);
        if (uniqueVals[0] === 2 && uniqueVals[1] === 3 && uniqueVals[2] === 4 && uniqueVals[3] === 5 && uniqueVals[uniqueVals.length - 1] === 14) {
             return 5;
        }
        for (let i = uniqueVals.length - 1; i >= 4; i--) {
            if (uniqueVals[i] - uniqueVals[i - 4] === 4) return uniqueVals[i];
        }
        return 0;
    }

    const handIsStraight = isStraight(values);
    
    const highCardValue = (v: number[]) => v[0] * 1e8 + v[1] * 1e6 + v[2] * 1e4 + v[3] * 1e2 + v[4];

    if (handIsStraight && isFlush) {
        const highCard = getStraightHighCardValue(values);
        if (highCard === 14) return { rank: HandRank.ROYAL_FLUSH, description: 'Royal Flush', cards: sortedHand, value: 9e10 };
        return { rank: HandRank.STRAIGHT_FLUSH, description: `Straight Flush, ${RANKS[highCard-2]}-high`, cards: sortedHand, value: 8e10 + highCard };
    }
    if (counts[0] === 4) {
        const fourRank = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 4)!;
        const kicker = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 1)!;
        return { rank: HandRank.FOUR_OF_A_KIND, description: `Four of a Kind, ${fourRank}s`, cards: sortedHand, value: 7e10 + RANK_VALUES[fourRank as Rank] * 1e8 + RANK_VALUES[kicker as Rank] };
    }
    if (counts[0] === 3 && counts[1] === 2) {
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 3)!;
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 2)!;
        return { rank: HandRank.FULL_HOUSE, description: `Full House, ${threeRank}s over ${pairRank}s`, cards: sortedHand, value: 6e10 + RANK_VALUES[threeRank as Rank] * 1e8 + RANK_VALUES[pairRank as Rank] };
    }
    if (isFlush) {
        return { rank: HandRank.FLUSH, description: `Flush, ${ranks[0]}-high`, cards: sortedHand, value: 5e10 + highCardValue(values) };
    }
    if (handIsStraight) {
        const highCard = getStraightHighCardValue(values);
        return { rank: HandRank.STRAIGHT, description: `Straight, ${RANKS[highCard-2]}-high`, cards: sortedHand, value: 4e10 + highCard };
    }
    if (counts[0] === 3) {
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 3)!;
        const kickers = values.filter(v => v !== RANK_VALUES[threeRank as Rank]);
        return { rank: HandRank.THREE_OF_A_KIND, description: `Three of a Kind, ${threeRank}s`, cards: sortedHand, value: 3e10 + RANK_VALUES[threeRank as Rank] * 1e8 + kickers[0] * 1e6 + kickers[1] * 1e4 };
    }
    if (counts[0] === 2 && counts[1] === 2) {
        const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r as Rank] === 2).map(r => RANK_VALUES[r as Rank]).sort((a, b) => b - a);
        const kicker = values.find(v => !pairRanks.includes(v));
        return { rank: HandRank.TWO_PAIR, description: `Two Pair, ${RANKS[pairRanks[0]-2]}s and ${RANKS[pairRanks[1]-2]}s`, cards: sortedHand, value: 2e10 + pairRanks[0] * 1e8 + pairRanks[1] * 1e6 + kicker! };
    }
    if (counts[0] === 2) {
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r as Rank] === 2)!;
        const kickers = values.filter(v => v !== RANK_VALUES[pairRank as Rank]);
        return { rank: HandRank.ONE_PAIR, description: `One Pair of ${pairRank}s`, cards: sortedHand, value: 1e10 + RANK_VALUES[pairRank as Rank] * 1e8 + kickers[0] * 1e6 + kickers[1] * 1e4 + kickers[2] * 1e2 };
    }
    return { rank: HandRank.HIGH_CARD, description: `High Card ${ranks[0]}`, cards: sortedHand, value: highCardValue(values) };
}

export const calculateWinProbabilityMonteCarlo = (
  holeCards: Card[],
  communityCards: Card[],
  numOpponents: number
): number => {
  const MONTE_CARLO_SIMULATIONS = 1000;
  let wins = 0;

  const allKnownCards = [...holeCards, ...communityCards];
  const knownCardStrings = new Set(allKnownCards.map(c => `${c.rank}${c.suit}`));

  const deck = createDeck().filter(c => !knownCardStrings.has(`${c.rank}${c.suit}`));

  for (let i = 0; i < MONTE_CARLO_SIMULATIONS; i++) {
    const tempDeck = shuffleDeck([...deck]);
    
    const opponentsHands: Card[][] = Array.from({ length: numOpponents }, () => [tempDeck.pop()!, tempDeck.pop()!]);
    
    let currentCommunityCards = [...communityCards];
    const cardsToDeal = 5 - currentCommunityCards.length;

    for (let j = 0; j < cardsToDeal; j++) {
      if(tempDeck.length > 0) {
        currentCommunityCards.push(tempDeck.pop()!);
      }
    }
    
    const playerHandResult = evaluateHand(holeCards, currentCommunityCards);
    let playerIsBest = true;

    for (const opponentHand of opponentsHands) {
      const opponentHandResult = evaluateHand(opponentHand, currentCommunityCards);
      if (opponentHandResult.value > playerHandResult.value) {
        playerIsBest = false;
        break;
      }
    }

    if (playerIsBest) {
      wins++;
    }
  }

  return (wins / MONTE_CARLO_SIMULATIONS) * 100;
};