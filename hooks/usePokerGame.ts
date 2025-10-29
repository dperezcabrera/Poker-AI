import { useReducer, useEffect, useCallback } from 'react';
import { GameState, GamePhase, Player, Card, HandResult } from '../types';
import { PLAYER_COUNT, STARTING_STACK, SMALL_BLIND_AMOUNT, BIG_BLIND_AMOUNT } from '../constants';
import { createDeck, shuffleDeck, evaluateHand, calculateWinProbabilityMonteCarlo } from '../services/pokerService';
import { getAIAction } from '../services/aiService';

export type PlayerAction = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE';
type Action =
  | { type: 'START_NEW_HAND' }
  | { type: PlayerAction; payload: { playerId: number; amount?: number } };

const createInitialState = (): GameState => {
  const players: Player[] = Array.from({ length: PLAYER_COUNT }, (_, i) => ({
    id: i,
    name: i === 0 ? 'You' : `Player ${i + 1}`,
    cards: [],
    stack: STARTING_STACK,
    bet: 0,
    totalBet: 0,
    hasActed: false,
    isFolded: false,
    isAllIn: false,
    isAI: i !== 0,
    position: i,
  }));

  return {
    players,
    deck: [],
    communityCards: [],
    pot: 0,
    gamePhase: GamePhase.PRE_DEAL,
    currentPlayerIndex: 0,
    dealerIndex: -1,
    smallBlind: SMALL_BLIND_AMOUNT,
    bigBlind: BIG_BLIND_AMOUNT,
    minRaise: BIG_BLIND_AMOUNT,
    lastRaiser: null,
    roundInitialPlayerIndex: 0,
    messages: ['Welcome to Texas Hold\'em! Click "New Hand" to start.'],
  };
};

const handleShowdown = (state: GameState): GameState => {
  const newState = JSON.parse(JSON.stringify(state));
  newState.gamePhase = GamePhase.SHOWDOWN;

  const remainingPlayers = newState.players.filter(p => !p.isFolded);
  if (remainingPlayers.length === 0) return newState;

  remainingPlayers.forEach(p => {
    p.handResult = evaluateHand(p.cards, newState.communityCards);
  });

  remainingPlayers.sort((a, b) => b.handResult!.value - a.handResult!.value);
  const bestHandValue = remainingPlayers[0].handResult!.value;
  
  const winners = remainingPlayers.filter(p => p.handResult!.value === bestHandValue);
  const potSplit = Math.floor(newState.pot / winners.length);

  winners.forEach(w => {
    const winnerInState = newState.players.find(p => p.id === w.id)!;
    winnerInState.stack += potSplit;
    newState.messages.push(`${winnerInState.name} wins a share of the pot (${potSplit}) with ${w.handResult!.description}.`);
  });

  newState.pot = 0;
  return newState;
};

const advanceGame = (state: GameState): GameState => {
  let newState = JSON.parse(JSON.stringify(state));

  newState.players.forEach(p => {
    newState.pot += p.bet;
    p.bet = 0;
  });

  const activePlayers = newState.players.filter(p => !p.isFolded);
  if (activePlayers.length <= 1) {
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const foundWinner = newState.players.find(p => p.id === winner.id)!;
      foundWinner.stack += newState.pot;
      newState.messages.push(`${foundWinner.name} wins the pot of ${newState.pot}.`);
    }
    newState.pot = 0;
    newState.gamePhase = GamePhase.SHOWDOWN;
    return newState;
  }
  
  const playersAbleToBet = newState.players.filter(p => !p.isFolded && !p.isAllIn && p.stack > 0);

  if (playersAbleToBet.length < 2) {
    const phasesToDeal: GamePhase[] = [];
    if (newState.gamePhase === GamePhase.PRE_FLOP) phasesToDeal.push(GamePhase.FLOP, GamePhase.TURN, GamePhase.RIVER);
    else if (newState.gamePhase === GamePhase.FLOP) phasesToDeal.push(GamePhase.TURN, GamePhase.RIVER);
    else if (newState.gamePhase === GamePhase.TURN) phasesToDeal.push(GamePhase.RIVER);
    
    phasesToDeal.forEach(phase => {
      if (newState.deck.length < 3 && phase === GamePhase.FLOP) return;
      if (newState.deck.length < 1) return;

      if (phase === GamePhase.FLOP) {
        newState.communityCards.push(newState.deck.pop()!, newState.deck.pop()!, newState.deck.pop()!);
      } else {
        newState.communityCards.push(newState.deck.pop()!);
      }
    });
    
    newState.gamePhase = GamePhase.RIVER;
    return handleShowdown(newState);
  }

  newState.players.forEach(p => {
    p.totalBet = 0;
    p.hasActed = false;
  });
  newState.minRaise = newState.bigBlind;
  newState.lastRaiser = null;

  switch (newState.gamePhase) {
    case GamePhase.PRE_FLOP:
      newState.gamePhase = GamePhase.FLOP;
      newState.communityCards = [newState.deck.pop()!, newState.deck.pop()!, newState.deck.pop()!];
      newState.messages.push(`Flop: ${newState.communityCards.map(c => c.rank + c.suit).join(' ')}`);
      break;
    case GamePhase.FLOP:
      newState.gamePhase = GamePhase.TURN;
      newState.communityCards.push(newState.deck.pop()!);
      newState.messages.push(`Turn: ${newState.communityCards[3].rank}${newState.communityCards[3].suit}`);
      break;
    case GamePhase.TURN:
      newState.gamePhase = GamePhase.RIVER;
      newState.communityCards.push(newState.deck.pop()!);
      newState.messages.push(`River: ${newState.communityCards[4].rank}${newState.communityCards[4].suit}`);
      break;
    case GamePhase.RIVER:
      return handleShowdown(newState);
  }

  const humanPlayer = newState.players.find(p => !p.isAI && !p.isFolded);
  if (humanPlayer) {
    const activeOpponents = newState.players.filter(p => p.isAI && !p.isFolded).length;
    if (activeOpponents > 0) {
      const winProbability = calculateWinProbabilityMonteCarlo(
        humanPlayer.cards,
        newState.communityCards,
        activeOpponents
      );
      newState.messages.push(`Your win/tie probability: ${winProbability.toFixed(1)}%`);
    }
  }

  let nextIndex = newState.dealerIndex;
  do {
    nextIndex = (nextIndex + 1) % PLAYER_COUNT;
  } while (newState.players[nextIndex].isFolded || newState.players[nextIndex].isAllIn);
  
  newState.currentPlayerIndex = nextIndex;
  newState.roundInitialPlayerIndex = nextIndex;
  
  return newState;
};


const pokerReducer = (state: GameState, action: Action): GameState => {
    switch (action.type) {
        case 'START_NEW_HAND': {
            // FIX: Explicitly type `startingPlayers` as `Player[]` to resolve a type inference issue.
            // TypeScript was inferring a type with a required `handResult` property, which is
            // incompatible with the `Player` type where `handResult` is optional.
            let startingPlayers: Player[] = state.players.map(p => ({ ...p, stack: p.stack, handResult: undefined }));
            if(state.dealerIndex === -1) { 
                startingPlayers = createInitialState().players;
            }

            const playersWithChips = startingPlayers.filter(p => p.stack > 0);
            if (playersWithChips.length < 2) {
                return state;
            }

            const newState = createInitialState();
            newState.players.forEach(p => {
                const existingPlayer = startingPlayers.find(sp => sp.id === p.id);
                p.stack = existingPlayer?.stack || 0;
                if(p.stack <= 0) {
                    p.isFolded = true;
                } else {
                    p.isFolded = false;
                }
            });

            const activePlayerIds = newState.players.filter(p => p.stack > 0).map(p => p.id);
            let currentDealerId = state.dealerIndex;
            
            if (currentDealerId === -1 || !activePlayerIds.includes(currentDealerId)) {
                currentDealerId = activePlayerIds[0];
            } else {
                let currentDealerIndexInActive = activePlayerIds.indexOf(currentDealerId);
                let nextDealerIndexInActive = (currentDealerIndexInActive + 1) % activePlayerIds.length;
                currentDealerId = activePlayerIds[nextDealerIndexInActive];
            }
            newState.dealerIndex = currentDealerId;

            let deck = shuffleDeck(createDeck());
            newState.players.forEach(p => {
                if(p.stack > 0) {
                    p.isFolded = false;
                    p.isAllIn = false;
                    p.bet = 0;
                    p.totalBet = 0;
                    p.hasActed = false;
                    p.cards = [deck.pop()!, deck.pop()!];
                } else {
                    p.cards = [];
                    p.isFolded = true;
                }
            });
            newState.deck = deck;
            
            const getNextActivePlayerIndex = (startIndex: number) => {
                let index = startIndex;
                do {
                    index = (index + 1) % PLAYER_COUNT;
                } while(newState.players[index].isFolded);
                return index;
            };

            const sbIndex = getNextActivePlayerIndex(newState.dealerIndex);
            const bbIndex = getNextActivePlayerIndex(sbIndex);

            const sbPlayer = newState.players[sbIndex];
            const sbAmount = Math.min(newState.smallBlind, sbPlayer.stack);
            sbPlayer.stack -= sbAmount;
            sbPlayer.bet = sbAmount;
            sbPlayer.totalBet = sbAmount;
            if (sbPlayer.stack === 0) sbPlayer.isAllIn = true;

            const bbPlayer = newState.players[bbIndex];
            const bbAmount = Math.min(newState.bigBlind, bbPlayer.stack);
            bbPlayer.stack -= bbAmount;
            bbPlayer.bet = bbAmount;
            bbPlayer.totalBet = bbAmount;
            if (bbPlayer.stack === 0) bbPlayer.isAllIn = true;
            
            newState.pot = sbAmount + bbAmount;
            newState.currentPlayerIndex = getNextActivePlayerIndex(bbIndex);
            newState.roundInitialPlayerIndex = newState.currentPlayerIndex;
            newState.gamePhase = GamePhase.PRE_FLOP;
            newState.minRaise = newState.bigBlind;
            newState.messages = [`New hand starting. Blinds are ${sbAmount} and ${bbAmount}.`];
            
            return newState;
        }
        
        default:
            return state;
    }
};

const usePokerGame = () => {
  const getNextPlayerIndex = useCallback((state: GameState, currentIndex: number): number => {
    let nextIndex = currentIndex;
    for (let i = 0; i < PLAYER_COUNT; i++) {
        nextIndex = (nextIndex + 1) % PLAYER_COUNT;
        const nextPlayer = state.players[nextIndex];
        if (!nextPlayer.isFolded && !nextPlayer.isAllIn) {
            return nextIndex;
        }
    }
    return -1; // Should not be reached if round over logic is correct
  }, []);

  const fullReducer = (state: GameState, action: Action): GameState => {
      switch (action.type) {
        case 'START_NEW_HAND':
            return pokerReducer(state, action);
        case 'FOLD':
        case 'CHECK':
        case 'CALL':
        case 'BET':
        case 'RAISE': {
            let newState = JSON.parse(JSON.stringify(state));
            const player = newState.players.find(p => p.id === action.payload.playerId)!;
            
            player.hasActed = true;
            
            const currentHighestBet = Math.max(...newState.players.map(p => p.totalBet));

            if (action.type === 'FOLD') {
                player.isFolded = true;
                newState.messages.push(`${player.name} folds.`);
            } else if (action.type === 'CHECK') {
                newState.messages.push(`${player.name} checks.`);
            } else if (action.type === 'CALL') {
                const callAmount = currentHighestBet - player.totalBet;
                const amountToPost = Math.min(player.stack, callAmount);
                player.stack -= amountToPost;
                player.bet += amountToPost;
                player.totalBet += amountToPost;
                if(player.stack === 0) player.isAllIn = true;
                newState.messages.push(`${player.name} calls ${amountToPost}.`);
            } else if (action.type === 'BET' || action.type === 'RAISE') {
                const targetTotalBet = action.payload.amount!;
                const amountToPost = targetTotalBet - player.totalBet;
                const finalAmountToPost = Math.max(0, Math.min(player.stack, amountToPost));

                player.stack -= finalAmountToPost;
                player.bet += finalAmountToPost;
                player.totalBet += finalAmountToPost;

                if (player.stack === 0) {
                    player.isAllIn = true;
                }

                if (player.totalBet > currentHighestBet) {
                    newState.minRaise = player.totalBet - currentHighestBet;
                    newState.lastRaiser = player;
                    newState.players.forEach(p => {
                        if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
                            p.hasActed = false;
                        }
                    });
                }
                
                const messageAction = player.isAllIn ? `goes all-in with ${player.totalBet}` : `${action.type.toLowerCase()}s to ${player.totalBet}`;
                newState.messages.push(`${player.name} ${messageAction}.`);
            }

            const activePlayersUnfolded = newState.players.filter(p => !p.isFolded);
            if(activePlayersUnfolded.length <= 1) {
                return advanceGame(newState);
            }
            
            const highestBet = Math.max(...newState.players.filter(p => !p.isFolded).map(p => p.totalBet));
            const roundOver = newState.players.every(p => p.isFolded || p.isAllIn || (p.hasActed && p.totalBet === highestBet));

            if (roundOver) {
                return advanceGame(newState);
            } else {
                newState.currentPlayerIndex = getNextPlayerIndex(newState, newState.currentPlayerIndex);
                return newState;
            }
        }
        default: return state;
      }
  };
  
  const [trueGameState, trueDispatch] = useReducer(fullReducer, createInitialState());

  useEffect(() => {
    const currentPlayer = trueGameState.players[trueGameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isAI && 
        trueGameState.gamePhase !== GamePhase.SHOWDOWN && 
        trueGameState.gamePhase !== GamePhase.PRE_DEAL && 
        !currentPlayer.isFolded && 
        !currentPlayer.isAllIn
    ) {
      const timeoutId = setTimeout(() => {
        const aiAction = getAIAction(trueGameState, currentPlayer);
        trueDispatch(aiAction);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [trueGameState]);


  return { gameState: trueGameState, dispatch: trueDispatch };
};

export default usePokerGame;