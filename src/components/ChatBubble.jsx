import React from 'react';

const ChatBubble = ({ text, sender, time, isTyping }) => {
  if (isTyping) {
    return (
      <div className="typing-indicator">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    );
  }

  return (
    <div className={`message-wrapper ${sender}`}>
      <div className="bubble">
        {text}
      </div>
      <div className="message-time">
        {time}
      </div>
    </div>
  );
};

export default ChatBubble;
