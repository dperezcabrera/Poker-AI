
import React, { useState, useEffect } from 'react';
import { Player, GameState } from '../types';
import { PlayerAction } from '../hooks/usePokerGame';

interface ControlsProps {
  player: Player;
  gameState: GameState;
  onPlayerAction: (action: PlayerAction, amount?: number) => void;
}

const Controls: React.FC<ControlsProps> = ({ player, gameState, onPlayerAction }) => {
  const { currentPlayerIndex, minRaise, bigBlind } = gameState;
  const isPlayerTurn = player.id === currentPlayerIndex;
  
  const currentHighestBet = Math.max(...gameState.players.map(p => p.totalBet));
  const toCallAmount = Math.min(player.stack, currentHighestBet - player.totalBet);

  const canCheck = toCallAmount === 0;
  const minBet = Math.min(player.stack, Math.max(minRaise, bigBlind));
  const maxBet = player.stack;

  const [betAmount, setBetAmount] = useState(minBet);

  useEffect(() => {
    setBetAmount(minBet);
  }, [minBet]);

  if (!isPlayerTurn) {
    return (
      <div className="w-full md:w-1/2 p-4 bg-gray-700 rounded-lg shadow-inner flex items-center justify-center">
        <p className="text-gray-400">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="w-full md:w-1/2 p-4 bg-gray-700 rounded-lg shadow-inner space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onPlayerAction('FOLD')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-transform transform hover:scale-105"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            onClick={() => onPlayerAction('CHECK')}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-transform transform hover:scale-105"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onPlayerAction('CALL')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-transform transform hover:scale-105"
          >
            Call ${toCallAmount}
          </button>
        )}
        <button
          onClick={() => onPlayerAction(currentHighestBet > 0 ? 'RAISE' : 'BET', betAmount)}
          disabled={maxBet <= 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded transition-transform transform hover:scale-105"
        >
          {currentHighestBet > 0 ? 'Raise' : 'Bet'}
        </button>
      </div>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min={minBet}
          max={maxBet}
          step={bigBlind}
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          disabled={maxBet <= 0}
          className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <span className="font-bold text-lg text-yellow-300 w-20 text-center">${betAmount}</span>
      </div>
    </div>
  );
};

export default Controls;
