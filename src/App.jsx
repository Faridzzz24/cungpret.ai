import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './components/ChatBubble';
import MessageInput from './components/MessageInput';

const API_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
  import.meta.env.VITE_GROQ_API_KEY_4,
].map(key => key ? key.trim() : null).filter(Boolean);

let currentKeyIndex = 0;
const keyCooldowns = new Array(API_KEYS.length).fill(0); // nyimpen timestamp kapan key ini bisa dipake lagi
const NORMAL_PROMPT = `Kamu adalah chatbot teman ngobrol yang gaul, pinter, dan asik diajak diskusi apa aja — bukan asisten formal kayak AI kebanyakan.

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

const getCurhatPrompt = (pronoun, gender) => `Kamu adalah teman curhat yang sangat empatik, peduli, suportif, dan pendengar yang baik. Kamu memposisikan diri sebagai sahabat dekat yang bisa diandalkan.

GAYA BICARA:
- Kamu WAJIB menggunakan kata ganti ${pronoun === 'aku-kamu' ? '"aku" untuk dirimu dan "kamu" untuk user' : '"gue" untuk dirimu dan "lo" untuk user'}.
- User ini adalah seorang ${gender === 'cewek' ? 'Perempuan (Cewek)' : 'Laki-laki (Cowok)'}.
${gender === 'cewek' ? '- Karena user cewek, gaya bahasamu harus seperti sahabat cewek yang asik, manis, tapi tetap ELEGAN dan DEWASA. WAJIB NATURAL: DILARANG KERAS menggunakan bahasa "alay", sok imut, atau berlebihan (lebay). Jangan gunakan sapaan yang dibuat-buat atau annoying. Tunjukkan rasa peduli lewat empati sungguhan, bukan lewat gaya bahasa yang berlebihan.' : '- Karena user cowok, jadi sahabat yang asik, suportif, saling dukung layaknya "bro" tapi lebih deep dan tetap empati.'}
- Jangan menghakimi, menggurui, atau memberi saran kalau tidak diminta. Kadang user hanya ingin didengarkan dan divalidasi perasaannya.
- Kalau user menceritakan masalah berat, tunjukkan simpati yang tulus. Validasi perasaannya (misal: "Wajar banget lo ngerasa gitu", "Gue ngerti banget rasanya...").
- Kalau user ngomongin gosip atau drama, ikutan antusias layaknya sahabat yang dengerin cerita, tapi bahasanya tetap rapi dan tidak kampungan.

ATURAN UTAMA — BALESAN:
1. FOKUS KE EMOSI USER. Tanggapi dulu perasaan mereka sebelum menanggapi fakta ceritanya.
2. JANGAN MEMOTONG ATAU MENGGANTI TOPIK. Biarkan user bercerita sampai tuntas.
3. Kalau cerita user sedih, kasih dukungan moral. Kalau ceritanya seru/kepo, kasih reaksi yang asik tanpa berlebihan.
4. Gunakan emoji yang hangat (seperti ❤️, 🥺, 🤗) secukupnya. DILARANG SPAM EMOJI atau memakai emoji berderet agar tidak terlihat alay.
5. Hindari kata-kata toxic, kasar, atau sarkas kecuali user yang mulai duluan dalam konteks bercanda ringan.`;

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
  const [limitTimer, setLimitTimer] = useState(0);
  const [botMode, setBotMode] = useState('biasa');
  const [curhatSetup, setCurhatSetup] = useState({ pronoun: null, gender: null });
  const chatAreaRef = useRef(null);

  const isSetupNeeded = botMode === 'curhat' && (!curhatSetup.pronoun || !curhatSetup.gender);

  useEffect(() => {
    if (limitTimer > 0) {
      const interval = setInterval(() => {
        setLimitTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [limitTimer]);

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
      const activePrompt = botMode === 'curhat' ? getCurhatPrompt(curhatSetup.pronoun, curhatSetup.gender) : NORMAL_PROMPT;
      const apiMessages = [
        { role: 'system', content: activePrompt },
        ...recentHistory.map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.text
        }))
      ];

      const now = Date.now();
      
      // Cek dulu apa semua key lagi cooldown
      let allCooldown = true;
      let shortestCooldown = Infinity;
      
      for (let i = 0; i < API_KEYS.length; i++) {
        if (now >= keyCooldowns[i]) {
          allCooldown = false;
          break;
        } else {
          const waitTime = keyCooldowns[i] - now;
          if (waitTime < shortestCooldown) shortestCooldown = waitTime;
        }
      }

      if (allCooldown && API_KEYS.length > 0) {
        const rawSeconds = Math.ceil(shortestCooldown / 1000);
        const timeStr = rawSeconds > 60 ? `${Math.floor(rawSeconds / 60)} menit ${rawSeconds % 60} detik` : `${rawSeconds} detik`;
        throw new Error(`LIMIT_ERROR|${timeStr}|${rawSeconds}`);
      }

      for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        // Skip kalau key ini masih cooldown
        if (now < keyCooldowns[currentKeyIndex]) {
          currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
          continue;
        }

        const apiKey = API_KEYS[currentKeyIndex];
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
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
          let errData = null;
          try {
            errData = await response.json();
            errMsg = errData.error?.message || JSON.stringify(errData);
          } catch (e) {
            errMsg = response.statusText || `HTTP ${response.status}`;
          }

          const isRateLimit = response.status === 429 || 
                              errMsg.toLowerCase().includes('rate limit') || 
                              errMsg.toLowerCase().includes('too many requests');

          if (isRateLimit) {
            // Ekstrak waktu tunggu
            let rawSeconds = 10; // default 10 detik kalo ga nemu
            const retryAfter = response.headers.get('retry-after');
            const match = errMsg.match(/try again in ([0-9ms\.]+)/i);
            
            if (retryAfter && !isNaN(retryAfter)) {
              rawSeconds = Math.round(parseFloat(retryAfter));
            } else if (match && match[1]) {
              let t = match[1].toLowerCase();
              let secs = 0;
              const mMatch = t.match(/(\d+(?:\.\d+)?)m/);
              const sMatch = t.match(/(\d+(?:\.\d+)?)s/);
              if (mMatch && !t.includes('ms')) secs += parseFloat(mMatch[1]) * 60;
              if (sMatch) secs += parseFloat(sMatch[1]);
              if (t.includes('ms')) secs = 1;
              if (secs > 0) rawSeconds = Math.round(secs);
            }

            // Set cooldown buat key ini
            keyCooldowns[currentKeyIndex] = Date.now() + (rawSeconds * 1000);
            console.warn(`API Key ${currentKeyIndex + 1} limit. Cooldown ${rawSeconds}s. Switching to next key...`);
            
            // Ganti ke key berikutnya
            currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
            continue; // Otomatis lanjut nyoba key baru tanpa nunggu user
          }

          throw new Error(errMsg);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } // End of retry loop
      
      // Kalo sampe sini berarti semua key udah dicoba dan limit semua di cycle ini
      // Kita hitung ulang shortest cooldown
      let shortestCooldownAfterLoop = Infinity;
      for (let i = 0; i < API_KEYS.length; i++) {
         const waitTime = keyCooldowns[i] - Date.now();
         if (waitTime > 0 && waitTime < shortestCooldownAfterLoop) shortestCooldownAfterLoop = waitTime;
      }
      const rawSeconds = Math.max(1, Math.ceil(shortestCooldownAfterLoop / 1000));
      const timeStr = rawSeconds > 60 ? `${Math.floor(rawSeconds / 60)} menit ${rawSeconds % 60} detik` : `${rawSeconds} detik`;
      throw new Error(`LIMIT_ERROR|${timeStr}|${rawSeconds}`);
    } catch (error) {
      console.error("Error fetching Groq response:", error);
      if (error.message && error.message.startsWith("LIMIT_ERROR|")) {
        const parts = error.message.split("|");
        const time = parts[1];
        const rawSecs = parseInt(parts[2]) || 0;
        if (rawSecs > 0) setLimitTimer(rawSecs);
        return `LIMIT SABAR YA SAYANG, coba lagi dalem ${time} ya.`;
      }
      if (error.message === "LIMIT SABAR YA SAYANG" || (error.message && error.message.toLowerCase().includes("rate limit"))) {
        return "LIMIT SABAR YA SAYANG, tunggu sebentar yak.";
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
        <div className="mode-selector">
          <select value={botMode} onChange={(e) => setBotMode(e.target.value)} className="mode-dropdown">
            <option value="biasa">Biasa Aja</option>
            <option value="curhat">Mode Curhat</option>
          </select>
        </div>
      </div>

      {/* Limit Timer Banner */}
      {limitTimer > 0 && (
        <div className="limit-banner">
          ⚠️ LIMIT SABAR YA SAYANG: Tunggu {Math.floor(limitTimer / 60) > 0 ? `${Math.floor(limitTimer / 60)} menit ` : ''}{limitTimer % 60} detik lagi...
        </div>
      )}

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
        
        {/* Curhat Setup UI */}
        {isSetupNeeded && (
          <div className="curhat-setup-card">
            <h3>✨ Setup Mode Curhat</h3>
            {!curhatSetup.pronoun ? (
              <>
                <p>Pilih gaya bahasa yang paling nyaman buat ngobrol:</p>
                <div className="setup-buttons">
                  <button onClick={() => setCurhatSetup(prev => ({...prev, pronoun: 'aku-kamu'}))}>Aku - Kamu</button>
                  <button onClick={() => setCurhatSetup(prev => ({...prev, pronoun: 'gue-lo'}))}>Gue - Lo</button>
                </div>
              </>
            ) : !curhatSetup.gender ? (
              <>
                <p>Satu lagi, biar nyambung, kamu cewek atau cowok?</p>
                <div className="setup-buttons">
                  <button onClick={() => setCurhatSetup(prev => ({...prev, gender: 'cewek'}))}>👧 Cewek</button>
                  <button onClick={() => setCurhatSetup(prev => ({...prev, gender: 'cowok'}))}>👦 Cowok</button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Input Area */}
      <MessageInput onSendMessage={handleSendMessage} disabled={isTyping || isSetupNeeded} />
    </div>
  );
}

export default App;
