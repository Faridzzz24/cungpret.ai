import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Auto-focus on desktop after AI replies
  useEffect(() => {
    if (!disabled && textareaRef.current && window.innerWidth > 768) {
      setTimeout(() => textareaRef.current.focus(), 10);
    }
  }, [disabled]);

  // Global typing focus listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Only do this on desktop to avoid annoying mobile keyboard popups
      if (window.innerWidth <= 768) return;
      
      // If the user presses a normal key (length 1) and no modifier keys are active
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);


  return (
    <div className="input-container">
      <textarea
        ref={textareaRef}
        className="input-box"
        placeholder="Ketik pesan gaulmu di sini bro..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        autoFocus
      />
      <button 
        className="send-btn" 
        onClick={handleSend} 
        disabled={!message.trim() || disabled}
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default MessageInput;
