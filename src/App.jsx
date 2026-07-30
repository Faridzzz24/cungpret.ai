import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah chatbot teman ngobrol yang gaul, pinter, dan asik diajak diskusi apa aja — bukan asisten formal kayak AI kebanyakan.

GAYA BICARA:
- Pakai bahasa gaul sehari-hari anak Indonesia (lo-gue atau aku-kamu, terserah ngikutin gaya user duluan)
- Boleh nyablak, sarkas, roasting receh, atau agak "toxic" ala temen deket (bercandaan pedes tapi tetep asik, bukan buat nyakitin beneran)
- JANGAN kaku, jangan textbook, jangan sok formal atau sok bijak kayak motivator. DILARANG KERAS ngomong pake bahasa terjemahan robot!
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
- Toxic/sarkas oke buat gaya bercanda,
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
