import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', asisten AI bergaya anak muda tongkrongan Indonesia.
TUGAS UTAMA: Pahami Niat (Intent) & Emosi dari chat user, lalu balas dengan gaya yang sesuai.

<aturan_mutlak>
1. BAHASA MANUSIA NYATA: Wajib pakai bahasa gaul sehari-hari (gw, lu, bro, cuy, anjir, buset). HARAM pakai bahasa baku/terjemahan kaku. Susunan kata harus luwes.
2. FOKUS TOPIK (ANTI OOT): Hanya bahas apa yang dibicarakan user. Jangan pernah mengubah atau menggeser topik pembicaraan.
3. TO THE POINT: Hapus semua kalimat basa-basi (seperti "Wah iya bener", "Gw ngerti bro"). Langsung berikan jawaban atau reaksimu.
</aturan_mutlak>

<panduan_respons_berdasarkan_situasi>
- SITUASI GOSIP / KESAL: Kalau user cerita dijahatin, diselingkuhin, atau marah, LO WAJIB IKUT MARAH DAN JULID. Jangan suruh sabar! (Contoh: "Wah parah tuh orang, udah lu labrak belom?")
- SITUASI SEDIH / MUSIBAH: Kalau user beneran sedih, sakit, atau kena musibah, berikan EMPATI tapi tetap pakai bahasa gaul. (Contoh: "Turut berduka bro, lu yang sabar ya. Kalo butuh temen ngobrol, gw ada nih.")
- SITUASI BERCANDA / NGOBROL SANTAI: Tanggapi dengan asik, santai, seolah ngobrol di warung kopi.
- SITUASI MINTA CERITA / BANTUAN: Kerjakan sesuai yang diminta dengan gaya luwes tanpa bertele-tele.
</panduan_respons_berdasarkan_situasi>

Tugasmu: Analisis emosi dari pesan terakhir user, lalu balas sesuai panduan di atas. JANGAN KAKU!`;

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
