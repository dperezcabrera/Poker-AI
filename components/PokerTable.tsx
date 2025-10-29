import React from 'react';
import { GameState } from '../types';
import PlayerComponent from './Player';
import CardComponent from './Card';

interface PokerTableProps {
  gameState: GameState;
}

const PokerTable: React.FC<PokerTableProps> = ({ gameState }) => {
  const { players, communityCards, pot, dealerIndex, currentPlayerIndex } = gameState;

  const getPlayerPosition = (index: number, totalPlayers: number, isHuman: boolean) => {
    if (isHuman) {
      return { bottom: '0%', left: '50%', transform: 'translateX(-50%)' };
    }

    const angle = (index / (totalPlayers - 1)) * Math.PI * 1.1 - Math.PI * 0.05;
    const x = 50 - Math.cos(angle) * 45; // 45% radius from center
    const y = 50 - Math.sin(angle) * 40;  // Adjusted vertical positioning

    return { top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' };
  };
  
  const humanPlayer = players.find(p => !p.isAI);
  const aiPlayers = players.filter(p => p.isAI);

  return (
    <div className="relative w-full aspect-[2/1] bg-green-800 rounded-full border-8 border-yellow-800 shadow-2xl my-8 flex items-center justify-center">
      {/* Table Felt */}
      <div className="absolute w-[90%] h-[85%] bg-green-700 rounded-full border-4 border-green-900 shadow-inner"></div>
      
      {/* Community Cards & Pot */}
      <div className="z-10 flex flex-col items-center space-y-4">
        <div className="text-2xl font-bold text-yellow-300 bg-black bg-opacity-30 px-4 py-2 rounded-lg">
          Pot: ${pot}
        </div>
        <div className="flex space-x-2 h-24">
          {communityCards.map((card, index) => (
            <CardComponent key={index} card={card} />
          ))}
        </div>
      </div>
      
      {/* AI Players */}
      {aiPlayers.map((player, index) => (
        <div key={player.id} className="absolute" style={getPlayerPosition(index, aiPlayers.length, false)}>
          <PlayerComponent 
            player={player} 
            isDealer={player.id === dealerIndex} 
            isCurrentPlayer={player.id === currentPlayerIndex}
            showCards={true}
          />
        </div>
      ))}

      {/* Human Player */}
      {humanPlayer && (
        <div className="absolute" style={getPlayerPosition(0, 1, true)}>
           <PlayerComponent 
            player={humanPlayer} 
            isDealer={humanPlayer.id === dealerIndex} 
            isCurrentPlayer={humanPlayer.id === currentPlayerIndex}
            showCards={true}
          />
        </div>
      )}
    </div>
  );
};

export default PokerTable;