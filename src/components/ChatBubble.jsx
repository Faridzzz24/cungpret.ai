import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

const ChatBubble = ({ text, image, sender, time, isTyping }) => {
  const [showModal, setShowModal] = useState(false);

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
    <>
      <div className={`message-wrapper ${sender}`}>
        <div className="bubble">
          {image && (
            <div className="bubble-image-container" onClick={() => setShowModal(true)}>
              <img src={image} alt="User attachment" className="bubble-image" />
              <div className="image-zoom-overlay">
                <ZoomIn size={18} />
              </div>
            </div>
          )}
          {text && <div className="bubble-text">{text}</div>}
        </div>
        <div className="message-time">
          {time}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showModal && image && (
        <div className="image-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn" 
              onClick={() => setShowModal(false)}
              title="Tutup"
            >
              <X size={20} />
            </button>
            <img src={image} alt="Enlarged view" className="modal-full-img" />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBubble;
