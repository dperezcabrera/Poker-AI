
import React, { useRef, useEffect } from 'react';

interface MessageLogProps {
  messages: string[];
}

const MessageLog: React.FC<MessageLogProps> = ({ messages }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full md:w-1/2 p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-inner">
      <h3 className="font-bold text-lg mb-2 text-yellow-400">Game Log</h3>
      <div ref={logContainerRef} className="h-32 overflow-y-auto space-y-1 pr-2">
        {messages.map((msg, index) => (
          <p key={index} className="text-sm text-gray-300">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
};

export default MessageLog;
