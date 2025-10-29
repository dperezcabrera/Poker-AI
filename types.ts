
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: number;
  name: string;
  cards: Card[];
  stack: number;
  bet: number;
  totalBet: number; // Total bet in the current round
  hasActed: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isAI: boolean;
  position: number;
  handResult?: HandResult;
}

export enum GamePhase {
  PRE_DEAL = 'PRE_DEAL',
  PRE_FLOP = 'PRE_FLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
}

export interface GameState {
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  gamePhase: GamePhase;
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  lastRaiser: Player | null;
  roundInitialPlayerIndex: number;
  messages: string[];
}

export interface HandResult {
  rank: HandRank;
  description: string;
  cards: Card[];
  value: number;
}

export enum HandRank {
  HIGH_CARD,
  ONE_PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  FOUR_OF_A_KIND,
  STRAIGHT_FLUSH,
  ROYAL_FLUSH,
}
