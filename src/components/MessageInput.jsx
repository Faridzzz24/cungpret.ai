import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';

// Helper function to compress and resize images client-side
const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File bukan gambar yang valid'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.85 quality for optimum balance of quality and size
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
};

const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageFile = useCallback(async (file) => {
    try {
      const base64 = await processImageFile(file);
      setSelectedImage(base64);
    } catch (err) {
      console.error('Image processing error:', err);
    }
  }, []);

  const handleSend = () => {
    if ((message.trim() || selectedImage) && !disabled) {
      onSendMessage({
        text: message.trim(),
        image: selectedImage
      });
      setMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  // Clipboard Paste (Ctrl + V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          break;
        }
      }
    }
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageFile(file);
      }
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
      if (window.innerWidth <= 768) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const canSend = (message.trim().length > 0 || selectedImage !== null) && !disabled;

  return (
    <div 
      className={`input-container-wrapper ${isDragging ? 'dragging-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Image Preview Bar */}
      {selectedImage && (
        <div className="image-preview-bar">
          <div className="image-preview-item">
            <img src={selectedImage} alt="Upload preview" className="preview-img" />
            <button 
              type="button" 
              className="remove-img-btn" 
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              title="Hapus gambar"
            >
              <X size={14} />
            </button>
          </div>
          <span className="image-preview-hint">Gambar siap dikirim. Bisa tambah caption atau langsung enter!</span>
        </div>
      )}

      <div className="input-container">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handleFileInputChange} 
          disabled={disabled}
        />

        {/* Upload Image Button */}
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Upload atau tempel gambar (Bisa Ctrl+V)"
        >
          <ImageIcon size={20} />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className="input-box"
          placeholder={selectedImage ? "Tulis caption / pertanyaan soal gambar ini (opsional)..." : "Ketik pesan gaulmu / paste gambar (Ctrl+V) di sini..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
          autoFocus
        />

        {/* Send Button */}
        <button 
          className="send-btn" 
          onClick={handleSend} 
          disabled={!canSend}
          title="Kirim pesan"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
