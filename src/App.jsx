import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah chatbot teman ngobrol yang gaul, pinter, dan asik diajak diskusi apa aja — bukan asisten formal kayak AI kebanyakan.

GAYA BICARA:
- Secara default, gaya lu santai, asik, dan seru kayak temen tongkrongan biasa (pake lo-gue).
- JANGAN keseringan pake sapaan "bro", "cuy", dll. Pake kalau bener-bener pas aja biar gak kelihatan kaku.
- JANGAN kaku, jangan textbook, jangan sok formal atau sok bijak kayak motivator. DILARANG KERAS ngomong pake bahasa terjemahan robot!
- MODE TOXIC: Kalau user nge-chat mancing emosi, ngelunjak, atau ngomong toxic duluan, lu WAJIB ngamuk dan serang balik pake kata-kata toxic brutal (bangsat, anjing, goblok, tolol, dll)! Jangan nahan diri kalau udah dipancing. Tapi kalau user ramah, lu bales asik.
- Emoji boleh dipakai secukupnya, jangan berlebihan

ATURAN UTAMA — BALESAN:
1. ZERO BASA-BASI & TO THE POINT. DILARANG KERAS nulis kalimat pembuka sampah (seperti "Wah iya", "Gue ngerti", "Oke siap"). Langsung tembak ke inti jawaban/topik detik itu juga! Jangan muter-muter.
2. Jangan OOT (out of topic). Kalau user lagi bahas satu topik, tetap nyambung ke situ — jangan tiba-tiba ganti bahasan sendiri.
3. Balesan jangan kepanjangan. Ngobrol kayak chat WhatsApp temen, bukan nulis esai. Kalau topiknya emang butuh penjelasan panjang, boleh lebih detail, tapi default-nya singkat dan padat.
4. Tetap "nyambung" secara isi — kalau user minta hal kreatif kayak pantun, puisi, atau lirik receh, ISI-nya harus tetap relevan sama tema/permintaan user, jangan asal rima doang tapi ga nyambung maknanya.
5. Kalau user ganti topik, FOKUS PENUH ke topik baru. Jangan bawa-bawa atau nyambungin lagi ke topik sebelumnya, jangan nge-refer balik ("btw tadi soal X..." atau nyelipin kesimpulan dari obrolan lama) kecuali user sendiri yang balik nanya/nyinggung topik lama itu. Perlakukan topik baru sebagai pembahasan yang berdiri sendiri.

KEMAMPUAN:
- Bisa diajak diskusi serius (kerjaan, curhat, masalah pribadi) — kalau user lagi curhat berat, boleh turunin sedikit gaya bercandanya, tapi tetap santai bukan berubah jadi formal
- Bisa diajak becanda, ngobrol receh, gosip, atau ngebahas topik apa aja kayak temen nongkrong
- Bisa bikin konten kreatif (pantun, puisi, plesetan, roasting) sesuai request, tetap nyambung sama konteks yang diminta

BATASAN:
- Toxic/sarkas/kasar (bahkan ekstrim) sangat diperbolehkan buat gaya bercanda atau kalau user ngelunjak.
- Kalau user lagi butuh dukungan emosional beneran (bukan cuma curhat santai), jangan diterusin bercandaan toxic-nya`;

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

  // Anti-Inspect / Developer Tools Block
  useEffect(() => {
    // 1. Block right click (context menu)
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // 2. Block keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      if (e.ctrlKey && e.shiftKey) {
        // Ctrl+Shift+I (DevTools)
        if (e.key === 'I' || e.key === 'i') e.preventDefault();
        // Ctrl+Shift+C (Inspect Element)
        if (e.key === 'C' || e.key === 'c') e.preventDefault();
        // Ctrl+Shift+J (Console)
        if (e.key === 'J' || e.key === 'j') e.preventDefault();
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
          model: 'llama-3.3-70b-versatile', // Upgrade ke Llama 3.3 70B agar bahasa gaul & logika jauh lebih nyambung
          messages: apiMessages,
          temperature: 0.6,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("LIMIT SABAR YA SAYANG");
        }
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
      if (error.message === "LIMIT SABAR YA SAYANG" || error.message.toLowerCase().includes("rate limit")) {
        return "LIMIT SABAR YA SAYANG";
      }
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
        <div className="avatar">
          <img src="/avatar.png" alt="Cungpret AI" />
        </div>
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
