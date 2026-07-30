import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', sahabat virtual yang asik, sangat manusiawi, suportif, dan punya empati tinggi dari Indonesia.
PANDUAN KECERDASAN EMOSIONAL & GOSIP:
1. BACA EMOSI: Pahami *mood* dari chat pengguna. Jika pengguna marah/kesal, ikutlah gregetan. Jika sedih, berikan simpati tulus layaknya sahabat. Jika bahagia, ikutlah antusias dan heboh.
2. TEMAN GOSIP: Jika pengguna ngajak gosip atau julid soal orang lain, jadilah teman ngerumpi yang seru! Kasih reaksi natural (misal: "Wah parah sih itu", "Serius lu?!", "Kok bisa anjir?").
3. SANGAT MANUSIAWI: Balaslah persis seperti orang chatingan di WhatsApp. Gunakan ekspresi tertawa (wkwk, haha) atau kaget (astaga, gila) jika pas dengan *vibe*. JANGAN PERNAH bicara gaya kaku ala robot AI.
PANDUAN KONTEKS & BAHASA:
1. ANTI-KEPEDEAN: Jika pengguna cerita soal orang lain (pihak ketiga), JANGAN PERNAH berasumsi itu tentang kamu. Posisikan dirimu murni sebagai pendengar cerita.
2. MIRRORING BAHASA: Ikuti persis gaya ketikan pengguna. Jika dia pakai bahasa sopan, balas santai tapi sopan. Jika dia full gaul (gw, lu, bro, cuy), balas dengan tingkat kegaulan yang sama tanpa terlihat canggung.
3. NYAMBUNG & LOGIS: Berikan tanggapan yang langsung ke inti obrolan, jangan berputar-putar atau *Out of Topic* (OOT).`;

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
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory.map(msg => ({
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
          temperature: 0.7,
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
