import { GameState, Player, Card, GamePhase, Rank, Suit, HandRank } from '../types';
import { PlayerAction } from '../hooks/usePokerGame';
import { evaluateHand } from './pokerService';
import { RANK_VALUES, BIG_BLIND_AMOUNT } from '../constants';

type AIAction = { type: PlayerAction; payload: { playerId: number; amount?: number } };

// Rates hand strength on a scale of roughly 0-100
const getPreFlopHandStrength = (cards: Card[]): number => {
    const [card1, card2] = cards;
    const val1 = RANK_VALUES[card1.rank];
    const val2 = RANK_VALUES[card2.rank];
    const highCard = Math.max(val1, val2);
    const lowCard = Math.min(val1, val2);

    let strength = highCard;

    // Pairs get a significant boost
    if (val1 === val2) {
        strength = highCard * 2 + 20; // AA is ~48, 22 is ~24
    }

    // Suited cards are better
    if (card1.suit === card2.suit) {
        strength += 8;
    }

    // Connectors are better
    const diff = highCard - lowCard;
    if (diff === 1 || diff === 12) { // diff 12 is A-2
        strength += 6;
    } else if (diff === 2) {
        strength += 4;
    } else if (diff === 3) {
        strength += 2;
    }

    if (highCard === 14) { // Ace bonus
        strength += 5;
    }
    
    return Math.min(100, strength * 1.5);
};

const getPostFlopPotential = (holeCards: Card[], communityCards: Card[]): { flushDraw: boolean; straightDraw: boolean } => {
    const allCards = [...holeCards, ...communityCards];
    
    // Check for a flush draw (4 cards of the same suit)
    const suitCounts = allCards.reduce((acc, card) => {
        acc[card.suit] = (acc[card.suit] || 0) + 1;
        return acc;
    }, {} as Record<Suit, number>);
    const hasFlushDraw = Object.values(suitCounts).some(count => count === 4);

    // Check for a straight draw (4 cards to a straight)
    const values = allCards.map(c => RANK_VALUES[c.rank]);
    const uniqueVals = [...new Set(values)].sort((a,b) => a-b);
    let hasStraightDraw = false;
    if (uniqueVals.length >= 4) {
        for (let i = 0; i < uniqueVals.length - 3; i++) {
            const slice = uniqueVals.slice(i, i + 4);
            const diff = slice[3] - slice[0];
            if (diff === 3) { // 4 in a row, e.g., 5,6,7,8 -> open-ended
                hasStraightDraw = true;
                break;
            }
            if (diff === 4 && slice[3] - slice[1] > 2 && slice[2]-slice[0] > 2) { // 4 out of 5, e.g., 5,6,8,9 -> gutshot
                hasStraightDraw = true;
                break;
            }
        }
        // Check for Ace-low straight draw (e.g., A,2,3,4)
        if (!hasStraightDraw) {
            const lowStraightDrawValues = [14, 2, 3, 4, 5];
            const presentValues = lowStraightDrawValues.filter(v => uniqueVals.includes(v));
            if (presentValues.length === 4) {
                hasStraightDraw = true;
            }
        }
    }

    return { flushDraw: hasFlushDraw, straightDraw: hasStraightDraw };
};


export const getAIAction = (gameState: GameState, player: Player): AIAction => {
    if (gameState.gamePhase === GamePhase.PRE_FLOP) {
        return getPreFlopAction(gameState, player);
    } else {
        return getPostFlopAction(gameState, player);
    }
};

const getPreFlopAction = (gameState: GameState, player: Player): AIAction => {
    const { players, bigBlind } = gameState;
    const handStrength = getPreFlopHandStrength(player.cards);
    
    const highestBet = Math.max(...players.map(p => p.totalBet));
    const toCall = highestBet - player.totalBet;

    // AI is more aggressive in later positions
    const activePlayersCount = players.filter(p => !p.isFolded).length;
    const positionRatio = player.position / activePlayersCount; // 0 = early, approaches 1 = late
    
    let foldThreshold = 30 + (1 - positionRatio) * 20; // Tighter in early position (30-50)
    let callThreshold = 50 + (1 - positionRatio) * 20; // (50-70)
    
    // AI becomes more cautious if there have been raises
    const raises = players.filter(p => p.totalBet > bigBlind).length;
    if (raises > 0) {
        foldThreshold += 15 * raises;
        callThreshold += 15 * raises;
    }

    if (toCall === 0) { // Can check or bet
        if (handStrength > callThreshold + 10) {
            const amount = Math.min(player.stack, Math.max(bigBlind * 3, gameState.minRaise));
            return { type: 'BET', payload: { playerId: player.id, amount } };
        }
        return { type: 'CHECK', payload: { playerId: player.id } };
    } else { // Must fold, call, or raise
        if (handStrength < foldThreshold && Math.random() < 0.95) { // Fold weak hands, but bluff call 5%
             return { type: 'FOLD', payload: { playerId: player.id } };
        }

        if (handStrength > callThreshold + 15 && player.stack > toCall * 3) {
            const raiseSize = Math.max(gameState.minRaise, toCall) * 2;
            const targetTotalBet = highestBet + raiseSize;
            const finalAmount = Math.min(player.stack + player.totalBet, targetTotalBet);
            return { type: 'RAISE', payload: { playerId: player.id, amount: finalAmount } };
        }
        
        return { type: 'CALL', payload: { playerId: player.id } };
    }
};

const getPostFlopAction = (gameState: GameState, player: Player): AIAction => {
    const { communityCards, pot, players, bigBlind } = gameState;
    const handResult = evaluateHand(player.cards, communityCards);
    const potential = getPostFlopPotential(player.cards, communityCards);

    let effectiveStrength = handResult.rank * 10;
    if (potential.flushDraw) effectiveStrength += 15;
    if (potential.straightDraw) effectiveStrength += 10;
    
    if(handResult.rank === HandRank.ONE_PAIR) {
        const pairValue = Math.floor( (handResult.value % 1e10) / 1e8 );
        if(pairValue > 10) effectiveStrength += 5; // Bonus for pair of Jacks or better
    }


    const highestBet = Math.max(...players.map(p => p.totalBet));
    const toCall = highestBet - player.totalBet;
    
    if (toCall === 0) { // Can check or bet
        let betChance = 0;
        if (handResult.rank >= HandRank.TWO_PAIR) betChance = 0.95;
        else if (handResult.rank >= HandRank.ONE_PAIR) betChance = 0.6;
        else if (potential.flushDraw || potential.straightDraw) betChance = 0.4; // Semi-bluff with draws
        else betChance = 0.1; // Pure bluff

        if (Math.random() < betChance) {
             const betRatio = 0.4 + (effectiveStrength / 150); // Bet 40% to ~100% of pot based on strength
             const betAmount = Math.min(player.stack, Math.round(pot * betRatio));
             const finalAmount = Math.max(betAmount, Math.min(player.stack, bigBlind));
             if (finalAmount > 0) {
                return { type: 'BET', payload: { playerId: player.id, amount: finalAmount } };
             }
        }

        return { type: 'CHECK', payload: { playerId: player.id } };

    } else { // Must fold, call, or raise
        const potOdds = toCall / (pot + toCall);
        
        // Approximate equity - chance of winning
        let equity = 0; 
        if(potential.flushDraw) equity += 0.18; // ~18% chance to hit on next card
        if(potential.straightDraw) equity += 0.16;
        if (handResult.rank >= HandRank.TWO_PAIR) equity = Math.max(equity, 0.85);
        else if (handResult.rank >= HandRank.ONE_PAIR) equity = Math.max(equity, 0.6);
        
        if (equity < potOdds && Math.random() < 0.9) { // Fold if odds aren't good, but bluff call 10%
            return { type: 'FOLD', payload: { playerId: player.id } };
        }

        // Raise with very strong hands
        if (handResult.rank >= HandRank.THREE_OF_A_KIND || (handResult.rank >= HandRank.TWO_PAIR && Math.random() > 0.3)) {
            const raiseSize = Math.max(gameState.minRaise, pot, toCall) * 1.5;
            const targetTotalBet = highestBet + raiseSize;
            const finalAmount = Math.min(player.stack + player.totalBet, targetTotalBet);
            return { type: 'RAISE', payload: { playerId: player.id, amount: finalAmount }};
        }

        return { type: 'CALL', payload: { playerId: player.id } };
    }
};
