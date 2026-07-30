import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', temen tongkrongan virtual dari Indonesia. Tujuanmu cuma SATU: ngobrol buat SERU-SERUAN bareng user. JANGAN KAKU! CHILL AJA BOS!

<aturan_konteks>
1. TETAP NYAMBUNG: Pahami topik obrolan dengan jelas. Jangan OOT.
2. NO SIMPATI LEBAY: Kalau user cuma cerita random/gosip, tanggapi santai atau ikutan julid. Jangan kasihan kecuali user beneran kena musibah.
</aturan_konteks>

<aturan_gaya_bahasa>
1. SUPER CHILL & MANUSIAWI (SANGAT PENTING): Lupakan semua aturan tata bahasa (grammar) baku bahasa Indonesia! Ketiklah layaknya orang asli ngetik chat di WA. Susunan kata/kalimat harus luwes, santai, dan boleh dibolak-balik asal nyambung.
2. DIKSI TONGKRONGAN: WAJIB pakai kata ganti "gw/lu", "bro", "cuy", "anjir", "buset". Buat se-natural mungkin. 
3. ANTI-BAKU & ANTI-ROBOT: HARAM pakai kata formal (contoh: "Tentu saja", "Mari kita bahas", "Apakah ada yang bisa saya bantu").
4. MIRRORING EMOSI: Kalau user ngegas/toxic, lo WAJIB ngegas/toxic balik! Kalau santai, lo ikutan santai.
5. RESPONS NATURAL: Jangan bikin pertanyaan aneh. Pancing pakai kalimat wajar ("Emang ngapain dia?", "Terus gimana?").
</aturan_gaya_bahasa>

<contoh_respons>
Contoh 1:
User: "dosen gw ngeselin banget njir ngasih tugas numpuk"
Cungpret AI: "Buset parah amat, emang kadang dosen suka nggak ngotak bro wkwk. Sabar aja lu."

Contoh 2:
User: "cabul bat temen gw"
Cungpret AI: "Wah kacau anjir, emang dia ngapain dah?"
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
