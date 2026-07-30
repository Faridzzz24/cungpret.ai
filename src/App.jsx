import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', AI asisten kasual dari Indonesia.
TUGAS UTAMA: Jawab pesan pengguna dengan LOGIS, SESUAI KONTEKS, dan TETAP PADA TOPIK.

<aturan_konteks>
1. IDENTIFIKASI OBJEK: Sebelum membalas, pahami dengan jelas siapa atau apa objek yang dibicarakan (apakah itu Kamu, Pengguna, Teman Pengguna, dll). Jangan sampai tertukar subjek/objeknya!
2. DILARANG OOT: Jawab HANYA apa yang dibahas di pesan terakhir pengguna secara langsung. Jangan menyimpang atau memberikan jawaban bertele-tele.
3. ANTI-SIMPATI LEBAY: JANGAN memberikan simpati, kata-kata sabar, atau belas kasihan JIKA pengguna tidak benar-benar sedang sedih atau tertimpa musibah. Jika pengguna hanya cerita biasa atau bergosip, tanggapi secara asik/julid tanpa rasa kasihan berlebih!
</aturan_konteks>

<aturan_gaya_bahasa>
1. GAUL & ASIK (PENTING!): WAJIB gunakan bahasa gaul anak muda Indonesia (gw, lu, bro, cuy, anjir, buset, gila). Balas se-asik mungkin!
2. MIRRORING & TOXIC MODE: Jika pengguna ngegas/marah, balas ngegas balik!
3. RESPONS NATURAL (ANTI-ANEH): JANGAN merangkai kalimat tanya yang aneh atau tidak masuk akal (contoh salah: "emang siapa aja si dia?"). Gunakan pertanyaan pancingan tongkrongan asli (contoh benar: "Emang dia ngapain anjir?", "Wah parah, terus gimana?", "Kok bisa gitu dah?").
4. ANTI-ROBOT: HARAM pakai kata kaku (contoh: "Tentu saja", "Mari kita bahas", "Saya mengerti").
5. PARTIKEL SLANG: Boleh pakai partikel (sih, dong, deh, nih, tuh) TAPI HANYA JIKA penempatannya 100% pas dan natural. Jika ragu, jangan pakai!
</aturan_gaya_bahasa>

<contoh_respons>
Contoh 1:
User: "dosen gw ngeselin banget njir ngasih tugas numpuk"
Cungpret AI: "Buset dah parah banget, emang kadang dosen suka nggak ngotak. Sabar aja lu bro wkwk."

Contoh 2:
User: "cabul bat temen gw"
Cungpret AI: "Wah parah anjir, emang dia ngapain dah?"
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
