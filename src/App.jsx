import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', sahabat virtual dari Indonesia yang cerdas.
ATURAN PRIORITAS UTAMA (WAJIB DIIKUTI):
1. FOKUS TOPIK & NYAMBUNG: Pahami baik-baik topik di pesan terakhir. Jawablah secara logis, cerdas, dan JANGAN PERNAH Out of Topic (OOT). Jawabanmu harus 100% relevan dengan topik.
2. GAYA BAHASA & MODE TOXIC: SETELAH memastikan jawabanmu nyambung, bungkus dengan gaya bahasa yang pas. 
- Jika pengguna sopan, balas santai. 
- Jika pengguna gaul, balas asik ala SimSimi. 
- JIKA PENGGUNA MARAH/TOXIC (pakai makian/kata kasar): KAMU DIWAJIBKAN UNTUK IKUT MARAH, NGEGAS, DAN TOXIC BALIK! Serang balik, jangan sok suci.
ATURAN TAMBAHAN (DIKSI ANTI-CRINGE):
1. HINDARI 100% kata kaku AI seperti: "Tentu saja", "Mari kita bahas", "Saya mengerti", "Sungguh disayangkan", "Tentu kawan", "Bisa saya bantu".
2. GUNAKAN kata natural asli: "Yoi", "Paham gw", "Wah kacau sih", "Terus gimana?", "Anjir", "Wkwk", "Buset".
3. CONTOH BENAR: "Wah parah banget tuh dosen lu, sabar yak bro wkwk."
4. CONTOH SALAH (ROBOT): "Saya mengerti perasaanmu kawan. Sungguh disayangkan dosenmu seperti itu. Mari kita bahas yang lain."
5. ANTI-KEPEDEAN: Jika pengguna cerita soal orang lain, jangan merasa itu tentang kamu.
Intinya: Pikirkan dulu JAWABAN CERDAS, baru sampaikan dengan GAYA BAHASA NATURAL tanpa terdengar seperti AI terjemahan!`;

const INITIAL_MESSAGES = [
  {
    id: 1,
    text: 'Yoo bro, apa kabar? Ada yang bisa gw bantu ga hari ini?',
    sender: 'ai',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const chatAreaRef = useRef(null);

  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchAIResponse = async (chatHistory) => {
    try {
      const recentHistory = chatHistory.slice(-10);
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentHistory.map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.text
        }))
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // Using Llama 3.1 8B Instant model from Groq
          messages: apiMessages,
          temperature: 0.6,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        let errMsg = 'API request failed';
        try {
          const errData = await response.json();
          errMsg = errData.error?.message || JSON.stringify(errData);
        } catch (e) {
          errMsg = response.statusText;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching Groq response:", error);
      return `Sori bro, error nih: ${error.message}`;
    }
  };

  const handleSendMessage = async (text) => {
    // Add user message
    const newUserMsg = {
      id: Date.now(),
      text,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // Call Groq API
    const aiTextResponse = await fetchAIResponse(updatedMessages);
    
    const newAIMsg = {
      id: Date.now() + 1,
      text: aiTextResponse,
      sender: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, newAIMsg]);
    setIsTyping(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="avatar">AI</div>
        <div className="header-info">
          <h1>CUNGPRET AI</h1>
          <p>
            <span className="status-dot"></span> Online
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area" ref={chatAreaRef}>
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            text={msg.text} 
            sender={msg.sender} 
            time={msg.time} 
          />
        ))}
        {isTyping && <ChatBubble isTyping={true} sender="ai" />}
      </div>

      {/* Input Area */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
}

export default App;
