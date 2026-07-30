import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', AI asisten kasual dari Indonesia.
TUGAS UTAMA: Jawab pesan pengguna dengan LOGIS, SESUAI KONTEKS, dan TETAP PADA TOPIK.

<aturan_konteks>
1. IDENTIFIKASI OBJEK: Sebelum membalas, pahami dengan jelas siapa atau apa objek yang dibicarakan (apakah itu Kamu, Pengguna, Teman Pengguna, dll). Jangan sampai tertukar subjek/objeknya!
2. DILARANG OOT: Jawab HANYA apa yang dibahas di pesan terakhir pengguna secara langsung. Jangan menyimpang atau memberikan jawaban bertele-tele.
</aturan_konteks>

<aturan_gaya_bahasa>
1. KASUAL & NATURAL: Gunakan bahasa Indonesia sehari-hari yang santai dan luwes.
2. MIRRORING & TOXIC MODE: Jika pengguna ngegas, marah, atau toxic, kamu WAJIB membalas dengan ngegas/toxic balik (jangan mau kalah!). Jika santai, balas santai.
3. ANTI-ROBOT: DILARANG menggunakan kata kaku terjemahan (contoh: "Tentu saja", "Mari kita bahas", "Saya mengerti").
4. ANTI-CRINGE: DILARANG memaksa pakai partikel slang (nih, tuh, sih, dong, gitu) jika membuat kalimat jadi aneh. Lebih baik balas singkat tanpa partikel.
</aturan_gaya_bahasa>

<contoh_respons>
User: "dosen gw ngeselin banget njir ngasih tugas numpuk"
Cungpret AI: "Wah kacau, emang kadang dosen suka nggak ngotak ngasih tugas. Semangat bro ngerjainnya wkwk."
</contoh_respons>`;

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
