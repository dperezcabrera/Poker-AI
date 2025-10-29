import React from 'react';
import { Card } from '../types';

interface CardProps {
  card: Card;
  faceDown?: boolean;
}

const CardComponent: React.FC<CardProps> = ({ card, faceDown = false }) => {
  if (faceDown) {
    return (
      <div className="w-12 h-16 md:w-16 md:h-24 bg-blue-800 rounded-md border-2 border-blue-900 shadow-md flex items-center justify-center">
        <div className="w-10 h-14 md:w-12 md:h-20 rounded-md border-2 border-blue-500 bg-blue-700"></div>
      </div>
    );
  }

  const { suit, rank } = card;
  const isRed = suit === '♥' || suit === '♦';
  const colorClass = isRed ? 'text-red-500' : 'text-black';

  return (
    <div className={`w-12 h-16 md:w-16 md:h-24 bg-white rounded-md border border-gray-300 shadow-lg flex flex-col justify-start p-1 ${colorClass} font-bold`}>
      <div className="text-left text-lg md:text-xl leading-none">
        <div>{rank}</div>
      </div>
      <div className="text-center text-3xl md:text-5xl flex-grow flex items-center justify-center">
        {suit}
      </div>
    </div>
  );
};

export default CardComponent;