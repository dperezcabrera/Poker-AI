
import React from 'react';
import { Player } from '../types';
import CardComponent from './Card';

interface PlayerProps {
  player: Player;
  isDealer: boolean;
  isCurrentPlayer: boolean;
  showCards: boolean;
}

const PlayerComponent: React.FC<PlayerProps> = ({ player, isDealer, isCurrentPlayer, showCards }) => {
  const { name, stack, bet, cards, isFolded, handResult } = player;

  const playerStateClasses = isFolded
    ? 'opacity-40'
    : isCurrentPlayer
    ? 'border-yellow-400 ring-4 ring-yellow-400 shadow-lg'
    : 'border-gray-600';

  return (
    <div className="flex flex-col items-center relative transition-all duration-300">
      {/* Player cards */}
      <div className="flex space-x-1 mb-1 h-24 items-center">
        {cards.map((card, index) => (
          <CardComponent key={index} card={card} faceDown={!showCards} />
        ))}
      </div>

      {/* Player info box */}
      <div className={`w-32 p-2 rounded-lg bg-gray-800 bg-opacity-80 text-center border-2 ${playerStateClasses}`}>
        <p className="font-bold text-sm truncate">{name}</p>
        <p className={`text-yellow-400 font-semibold text-lg ${isFolded ? 'text-red-500' : ''}`}>
          {isFolded ? 'Folded' : `$${stack}`}
        </p>
      </div>

      {/* Bet amount */}
      {bet > 0 && (
        <div className="absolute -bottom-6 flex items-center space-x-1 bg-black bg-opacity-50 px-2 py-1 rounded-full text-xs">
          <span className="text-yellow-300">${bet}</span>
        </div>
      )}

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -right-4 -top-2 w-6 h-6 bg-white text-black font-bold rounded-full flex items-center justify-center text-sm border-2 border-gray-400">
          D
        </div>
      )}
      
      {/* Hand result at showdown */}
      {handResult && (
        <div className="absolute top-0 mt-24 bg-blue-900 bg-opacity-90 px-2 py-1 rounded text-xs z-20">
          {handResult.description}
        </div>
      )}
    </div>
  );
};

export default PlayerComponent;