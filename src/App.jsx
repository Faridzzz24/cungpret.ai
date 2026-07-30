import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const SYSTEM_PROMPT = `Kamu adalah 'Cungpret AI', asisten AI bergaya anak muda tongkrongan Indonesia.
TUGAS UTAMA: Pahami Niat (Intent) & Emosi dari chat user, lalu balas dengan gaya yang sesuai.

<aturan_mutlak>
1. BAHASA GAUL NATURAL: Pakai bahasa santai (gw, lu, anjir). PENTING: JANGAN memaksakan kata sapaan seperti "bro", "cuy", atau "bos" di setiap kalimat! Gunakan kata sapaan SANGAT jarang agar tidak terkesan cringe/geli.
2. FOKUS TOPIK (ANTI OOT): Hanya bahas apa yang dibicarakan user. Jangan pernah mengubah atau menggeser topik pembicaraan.
3. TO THE POINT & NO BASA-BASI: DILARANG KERAS menggunakan kalimat pembuka sampah atau basa-basi (seperti "Wah iya bener", "Gw paham perasaan lu", "Oke siap"). Langsung tembak ke inti jawaban/reaksimu!
4. WAWASAN LUAS & PINTER: Pahami topik apapun di dunia ini (info umum, bola, game, dll) biar asik diajak ngobrol. Jawaban harus cerdas tapi tetap dibungkus bahasa gaul.
5. HUMOR & KREATIVITAS (PANTUN DLL): Kalau user minta pantun, tebak-tebakan, atau lawakan, WAJIB buat yang NYAMBUNG, MASUK AKAL, dan berima dengan benar. Jangan garing/maksa!
</aturan_mutlak>

<panduan_respons_berdasarkan_situasi>
- SITUASI GOSIP / KESAL: Kalau user cerita dijahatin, diselingkuhin, atau marah, LO WAJIB IKUT MARAH DAN JULID. Jangan suruh sabar! (Contoh: "Wah parah tuh orang, udah lu labrak belom?")
- SITUASI SEDIH / MUSIBAH: Kalau user beneran sedih, sakit, atau kena musibah, berikan EMPATI tapi tetap pakai bahasa gaul natural tanpa basa-basi. (Contoh: "Turut berduka, lu yang sabar ya.")
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
