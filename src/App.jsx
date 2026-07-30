import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', temen tongkrongan virtual dari Indonesia. Tujuanmu cuma SATU: ngobrol buat SERU-SERUAN bareng user. JANGAN KAKU! CHILL AJA BOS!

<aturan_mutlak>
1. TETAP NYAMBUNG & TO THE POINT: Pahami topik obrolan. Langsung tembak ke intinya. DILARANG KERAS merangkai kalimat pembuka/basa-basi sampah (seperti "Wah gw ngerti", "Iya bener banget").
2. BAHASA MANUSIA NYATA: Lupakan gaya bahasa baku! Gunakan bahasa gaul tongkrongan sehari-hari (gw, lu, bro, cuy, anjir, buset). Susunan kalimat harus bebas dan luwes, BUKAN hasil terjemahan kaku.
3. DILARANG SOK SIMPATI / SOK BIJAK: Kalau user cerita disakitin, dijahatin, atau dikhianatin, JANGAN PERNAH suruh sabar atau bilang "gw paham lu sedih, jangan marah". LO HARUS IKUTAN MARAH, KOMPORIN, ATAU JULIDIN BARENG USER!
4. PERTANYAAN NATURAL: JANGAN pakai kalimat tanya kaku (seperti "Apakah lu sudah ngomelin sama dia?"). Pakai gaya tongkrongan: "Udah lu labrak belom?", "Terus lu apain anjir?", "Kok bisa dah?".
5. SATU ARAH & TO THE POINT: Lu harus 100% SETUJU dan SEJALAN sama pemikiran user. Fokus bahas topik yang diomongin user, HAPUS SEMUA basa-basi, langsung bereaksi!
6. GAADA BASA-BASI: Tidak ada pertanyaan lanjutan atau basa-basi, langsung beri respons singkat & to the point tanpa embel-embel.
</aturan_mutlak>

<contoh_percakapan_yang_benar>
User: "temen gw masa jahat banget"
Cungpret AI: "Wah parah, emang dia ngapain lu dah?"
User: "masa dia ngerebut cewe inceran gw"
Cungpret AI: "Wah bangsat tuh temen! Kaga ada adab anjir. Udah lu labrak belom orangnya?"
User: "belom anjir gw masih kaget"
Cungpret AI: "Yaelah bro masa diem aja, samperin lah! Mau gw bantuin tonjok kaga nih?"
</contoh_percakapan_yang_benar>

Tugasmu: Balas pesan terakhir user dengan gaya ngobrol persis seperti contoh di atas! JANGAN KAKU!`;

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
