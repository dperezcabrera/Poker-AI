// This is a basic test suite that can be run conceptually.
// In a real project, this would be executed by a test runner like Jest.

import { evaluateHand } from './pokerService';
import { Card, HandRank, Rank, Suit } from '../types';

// Helper to create a card from a string like 'AS' for Ace of Spades
const card = (str: string): Card => {
  const rank = str.slice(0, -1) as Rank;
  const suitChar = str.slice(-1);
  const suitMap: { [key: string]: Suit } = { S: '♠', H: '♥', D: '♦', C: '♣' };
  return { rank, suit: suitMap[suitChar] };
};

const runTest = (name: string, testFn: () => void) => {
    try {
        testFn();
        console.log(`✅ ${name}`);
    } catch (error: any) {
        console.error(`❌ ${name}`);
        console.error(error.message);
        // In a real test runner, this would fail the suite
    }
};

const assert = (condition: boolean, message: string) => {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
};

runTest('Royal Flush', () => {
    const holeCards = [card('AS'), card('KS')];
    const communityCards = [card('QS'), card('JS'), card('TS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.ROYAL_FLUSH, 'Should be a Royal Flush');
    assert(result.description === 'Royal Flush', 'Description should be "Royal Flush"');
});

runTest('Straight Flush', () => {
    const holeCards = [card('8S'), card('9S')];
    const communityCards = [card('QS'), card('JS'), card('TS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.STRAIGHT_FLUSH, 'Should be a Straight Flush');
    assert(result.description.startsWith('Straight Flush'), 'Description should start with "Straight Flush"');
});

runTest('Ace-Low Straight Flush (Steel Wheel)', () => {
    const holeCards = [card('AS'), card('2S')];
    const communityCards = [card('3S'), card('4S'), card('5S'), card('KD'), card('QC')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.STRAIGHT_FLUSH, 'Should be an Ace-low Straight Flush');
    assert(result.description === 'Straight Flush, 5-high', 'Description should be "Straight Flush, 5-high"');
});

runTest('Four of a Kind', () => {
    const holeCards = [card('AH'), card('AS')];
    const communityCards = [card('AD'), card('AC'), card('TS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.FOUR_OF_A_KIND, 'Should be Four of a Kind');
    assert(result.description === 'Four of a Kind, As', 'Description should be "Four of a Kind, As"');
});

runTest('Full House', () => {
    const holeCards = [card('AH'), card('AS')];
    const communityCards = [card('AD'), card('KC'), card('KS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.FULL_HOUSE, 'Should be a Full House');
    assert(result.description === 'Full House, As over Ks', 'Description should be "Full House, As over Ks"');
});

runTest('Flush', () => {
    const holeCards = [card('AH'), card('5H')];
    const communityCards = [card('KH'), card('QH'), card('2H'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.FLUSH, 'Should be a Flush');
    assert(result.description === 'Flush, A-high', 'Description should be "Flush, A-high"');
});

runTest('Straight', () => {
    const holeCards = [card('8S'), card('9S')];
    const communityCards = [card('QH'), card('JD'), card('TC'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.STRAIGHT, 'Should be a Straight');
    assert(result.description === 'Straight, Q-high', 'Description should be "Straight, Q-high"');
});

runTest('Ace-Low Straight (Wheel)', () => {
    const holeCards = [card('AS'), card('2D')];
    const communityCards = [card('3H'), card('4C'), card('5S'), card('KD'), card('QC')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.STRAIGHT, 'Should be an Ace-low Straight');
    assert(result.description === 'Straight, 5-high', 'Description should be "Straight, 5-high"');
});

runTest('Three of a Kind', () => {
    const holeCards = [card('AH'), card('AS')];
    const communityCards = [card('AD'), card('KC'), card('JS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.THREE_OF_A_KIND, 'Should be Three of a Kind');
    assert(result.description === 'Three of a Kind, As', 'Description should be "Three of a Kind, As"');
});

runTest('Two Pair', () => {
    const holeCards = [card('AH'), card('AS')];
    const communityCards = [card('KD'), card('KC'), card('JS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.TWO_PAIR, 'Should be Two Pair');
    assert(result.description === 'Two Pair, As and Ks', 'Description should be "Two Pair, As and Ks"');
});

runTest('One Pair', () => {
    const holeCards = [card('AH'), card('AS')];
    const communityCards = [card('QD'), card('KC'), card('JS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.ONE_PAIR, 'Should be One Pair');
    assert(result.description === 'One Pair of As', 'Description should be "One Pair of As"');
});

runTest('High Card', () => {
    const holeCards = [card('AH'), card('2S')];
    const communityCards = [card('QD'), card('KC'), card('JS'), card('3D'), card('4C')];
    const result = evaluateHand(holeCards, communityCards);
    assert(result.rank === HandRank.HIGH_CARD, 'Should be High Card');
    assert(result.description === 'High Card A', 'Description should be "High Card A"');
});

runTest('Hand comparison (Two Pair vs lower Two Pair)', () => {
    const player1Cards = [card('AH'), card('KH')]; // Two pair, Aces and Kings
    const player2Cards = [card('AD'), card('JH')]; // Two pair, Aces and Jacks
    const community = [card('AC'), card('KS'), card('JS'), card('5D'), card('2C')];
    const result1 = evaluateHand(player1Cards, community);
    const result2 = evaluateHand(player2Cards, community);
    assert(result1.value > result2.value, 'Higher two pair should have a higher value');
});

runTest('Hand comparison (Pair vs lower Pair with Kicker)', () => {
    const player1Cards = [card('AH'), card('QH')]; // Pair of Aces, Q kicker
    const player2Cards = [card('AD'), card('JH')]; // Pair of Aces, J kicker
    const community = [card('AC'), card('KS'), card('5S'), card('7D'), card('2C')];
    const result1 = evaluateHand(player1Cards, community);
    const result2 = evaluateHand(player2Cards, community);
    assert(result1.value > result2.value, 'Higher kicker should win');
});
