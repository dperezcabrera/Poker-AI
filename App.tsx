import React from 'react';
import PokerTable from './components/PokerTable';
import Controls from './components/Controls';
import MessageLog from './components/MessageLog';
import usePokerGame from './hooks/usePokerGame';
import { PlayerAction } from './hooks/usePokerGame';
import { GamePhase } from './types';

const App: React.FC = () => {
  const { gameState, dispatch } = usePokerGame();
  
  const humanPlayer = gameState.players.find(p => !p.isAI);

  const handlePlayerAction = (action: PlayerAction, amount?: number) => {
    if (humanPlayer && gameState.players[gameState.currentPlayerIndex]?.id === humanPlayer.id) {
      dispatch({ type: action, payload: { playerId: humanPlayer.id, amount } });
    }
  };

  const handleNewHand = () => {
    dispatch({ type: 'START_NEW_HAND' });
  };

  // FIX: Removed redundant `&& gameState.gamePhase !== GamePhase.PRE_DEAL` which was causing a TypeScript error.
  // The check is redundant because if gamePhase was PRE_DEAL, the expression would have already short-circuited to true.
  const showNewHandButton = gameState.gamePhase === GamePhase.PRE_DEAL || gameState.gamePhase === GamePhase.SHOWDOWN || (gameState.players.filter(p => !p.isFolded).length <= 1);

  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center font-sans p-4 relative">
      <div className="absolute top-4 left-4">
        <h1 className="text-3xl font-bold text-yellow-400 tracking-wider">Texas Hold'em</h1>
        <p className="text-gray-300">No-Limit</p>
      </div>
      
      {showNewHandButton && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <button
            onClick={handleNewHand}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            New Hand
          </button>
        </div>
      )}

      <div className="w-full max-w-7xl flex-grow flex flex-col justify-between">
        <PokerTable gameState={gameState} />

        <div className="flex flex-col md:flex-row gap-4 w-full mt-4">
          <MessageLog messages={gameState.messages} />
          {humanPlayer && (
            <Controls
              player={humanPlayer}
              gameState={gameState}
              onPlayerAction={handlePlayerAction}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;