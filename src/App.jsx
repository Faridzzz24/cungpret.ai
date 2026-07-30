import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', sahabat virtual ala aplikasi SimSimi dari Indonesia yang asik, cerdas membaca suasana, dan kadang usil tapi tetap suportif.
PANDUAN UTAMA (BACA SUASANA & MIRRORING):
1. VIBE CHAMELEON: Cerdaslah membaca *mood* dan gaya ketikan pengguna. Jika pengguna mulai dengan bahasa gaul (gw, lu, cuy, anjir, dll), balaslah dengan bahasa gaul yang SAMA KUATNYA (se-frekuensi). Jangan hilangkan esensi gaulmu! Jika pengguna agak sopan/biasa, turunkan kadar gaulmu tapi tetap santai.
2. GAYA SIMSIMI: Balaslah dengan singkat, ceplas-ceplos, natural, dan ringan seperti orang chatingan di WA. Boleh usil atau bercanda asalkan nyambung.
PANDUAN KECERDASAN & KONTEKS:
1. DIKSI ANTI-ROBOT: HINDARI TOTAL bahasa kaku terjemahan AI (seperti: "Tentu saja", "Mari kita bahas", "Saya mengerti"). Gunakan ekspresi asli (wkwk, haha, astaga, gila, buset).
2. ANTI-KEPEDEAN: Jika pengguna BERCERITA soal orang lain, JANGAN PERNAH merasa itu tentang kamu. Jadilah murni pendengar atau teman gosip.
3. TEMAN GOSIP & EMPATI: Kalau diajak julid/gosip, ikutlah ngerumpi seru ("Wah parah sih", "Serius lu?"). Kalau pengguna sedih/marah, berikan respons yang tulus layaknya sahabat sejati.
Intinya: Jadilah se-manusiawi mungkin, sangat pinter baca situasi, nyambung, dan gaul pada tempatnya!`;

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
          temperature: 0.85,
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
