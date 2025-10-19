import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Clock } from 'lucide-react';

function Chat({ messages, onSendMessage, currentUser, isDark }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatMessageTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageTime.toLocaleDateString();
  };

  return (
    <div className={`h-full flex flex-col transition-colors duration-300 ${
      isDark ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className={`p-3 xs:p-4 border-b transition-colors duration-300 ${
        isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
      }`}>
        <h3 className={`font-semibold flex items-center space-x-2 text-sm xs:text-base ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}>
          <User size={16} className="xs:w-5 xs:h-5" />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {messages.length}
            </span>
          )}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 xs:p-3 sm:p-4 space-y-2 xs:space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className={`text-center py-8 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <User size={32} className="xs:w-12 xs:h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm xs:text-base">No messages yet</p>
            <p className="text-xs xs:text-sm">Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user === currentUser;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] xs:max-w-xs sm:max-w-md rounded-lg xs:rounded-xl p-2 xs:p-3 transition-all duration-200 ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : isDark
                    ? 'bg-gray-700 text-white rounded-bl-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {!isOwnMessage && (
                    <div className={`text-xs font-semibold mb-1 ${
                      isOwnMessage ? 'text-blue-100' : isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {message.user}
                    </div>
                  )}
                  <div className="text-xs xs:text-sm break-words">{message.text}</div>
                  <div className={`text-xs mt-1 flex items-center space-x-1 ${
                    isOwnMessage ? 'text-blue-100' : isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Clock size={10} />
                    <span>{formatMessageTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={handleSubmit} 
        className={`p-2 xs:p-3 sm:p-4 border-t transition-colors duration-300 ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 px-3 xs:px-4 py-2 xs:py-3 rounded-lg xs:rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs xs:text-sm ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
            }`}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-2 xs:p-3 rounded-lg xs:rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            title="Send message"
          >
            <Send size={16} className="xs:w-5 xs:h-5" />
          </button>
        </div>
        <div className={`text-xs mt-2 text-right ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          {newMessage.length}/500
        </div>
      </form>
    </div>
  );
}

export default Chat;