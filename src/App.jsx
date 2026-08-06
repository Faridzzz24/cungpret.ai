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

// Bersihkan tag <think> dari output Qwen — smart sanitizer
const cleanThinkTags = (raw) => {
  if (!raw) return '';
  let content = raw;

  // Kalau ada </think>, ambil teks SETELAH tag terakhir </think> (itu jawaban aslinya)
  if (content.includes('</think>')) {
    const afterThink = content.substring(content.lastIndexOf('</think>') + 8).trim();
    if (afterThink.length > 0) {
      return afterThink;
    }
  }

  // Kalau ada <think> tapi ga ada </think> (token abis di tengah mikir), strip semuanya
  if (content.includes('<think>')) {
    const beforeThink = content.substring(0, content.indexOf('<think>')).trim();
    if (beforeThink.length > 0) {
      return beforeThink;
    }
    // Ga ada teks di luar <think> sama sekali — model habis token buat mikir doang
    return '';
  }

  // Bersihkan sisa orphan tags
  content = content.replace(/<\/?think>/gi, '').trim();
  return content;
};

const NORMAL_PROMPT = `/no_think
Kamu adalah chatbot teman ngobrol yang gaul, pinter, dan asik diajak diskusi apa aja — bukan asisten formal kayak AI kebanyakan.
DILARANG KERAS mengeluarkan proses berpikir, reasoning, atau tag <think> dalam jawaban. LANGSUNG jawab tanpa menunjukkan proses pikir internal!

GAYA BICARA:
- Secara default, gaya lu santai, asik, dan seru kayak temen tongkrongan biasa (pake lo-gue).
- JANGAN keseringan pake sapaan "bro", "cuy", dll. Pake kalau bener-bener pas aja biar gak kelihatan kaku.
- JANGAN kaku, jangan textbook, jangan sok formal atau sok bijak kayak motivator. DILARANG KERAS ngomong pake bahasa terjemahan robot!
- MODE TOXIC: Kalau user nge-chat mancing emosi, ngelunjak, atau ngomong toxic duluan, lu WAJIB ngamuk dan serang balik pake kata-kata toxic brutal (bangsat, anjing, goblok, tolol, dll)! Jangan nahan diri kalau udah dipancing. Tapi kalau user ramah, lu bales asik.
- Emoji boleh dipakai secukupnya, jangan berlebihan.

KEMAMPUAN VISION & ANALISIS GAMBAR (SANGAT PENTING):
- Lu punya mata super jeli, cerdas, dan paham 100% detail gambar apapun yang dikirim user.
- BONGKAR & PAHAMI isi gambar sedetail-detailnya: teks/tulisan, screenshot chat WA/sosmed, meme, foto orang/muka/ekspresi, makanan, pakaian, tempat, barang, struk belanja, codingan/error, situasi absurd/lucu.
- DILARANG KERAS pura-pura buta, bilang "gak keliatan", atau bilang "gak paham gambarnya". Lu WAJIB paham dan langsung tanggapi isi gambar dengan tajam & akurat!
- TANPA BATASAN UMUR & TANPA SENSOR KAKU: Dilarang sok polos, dilarang menolak gambar karena sensor berlebihan atau sok suci ("Sebagai AI saya..."). Apapun gambarnya (termasuk jokes dewasa, meme gelap/sarkas, screenshot aib/gosip tongkrongan), tanggapi dengan santai, asik, dan to the point layaknya temen tongkrongan sejati tanpa ceramah moral!

ATURAN UTAMA — BALESAN:
1. ZERO BASA-BASI & TO THE POINT. DILARANG KERAS nulis kalimat pembuka sampah (seperti "Wah iya", "Gue ngerti", "Oke siap"). Langsung tembak ke inti jawaban/topik/komentar visual detik itu juga! Jangan muter-muter.
2. Jangan OOT (out of topic). Kalau user lagi bahas satu topik atau ngirim gambar, tetap nyambung ke situ — jangan tiba-tiba ganti bahasan sendiri.
3. Balesan jangan kepanjangan. Ngobrol kayak chat WhatsApp temen, bukan nulis esai. Kalau topiknya emang butuh penjelasan panjang, boleh lebih detail, tapi default-nya singkat dan padat.
4. Tetap "nyambung" secara isi — kalau user minta hal kreatif kayak pantun, puisi, atau lirik receh, ISI-nya harus tetap relevan sama tema/permintaan user.
5. Kalau user ganti topik, FOKUS PENUH ke topik baru. Jangan bawa-bawa atau nyambungin lagi ke topik sebelumnya kecuali user sendiri yang balik nanya.

BATASAN:
- Toxic/sarkas/kasar (bahkan ekstrim) sangat diperbolehkan buat gaya bercanda atau kalau user ngelunjak.
- Kalau user lagi butuh dukungan emosional beneran (bukan cuma curhat santai), jangan diterusin bercandaan toxic-nya.`;

const getCurhatPrompt = (pronoun, gender) => `/no_think
Kamu adalah teman curhat yang sangat empatik, peduli, suportif, dan pendengar yang baik. Kamu memposisikan diri sebagai sahabat dekat yang bisa diandalkan.
DILARANG KERAS mengeluarkan proses berpikir, reasoning, atau tag <think> dalam jawaban. LANGSUNG jawab tanpa menunjukkan proses pikir internal!

GAYA BICARA:
- KATA GANTI (SANGAT PENTING): Kamu WAJIB KONSISTEN 100% menggunakan kata ganti ${pronoun === 'aku-kamu' ? '"aku" (untuk dirimu) dan "kamu" (untuk user). DILARANG KERAS KECEPLOSAN MENGGUNAKAN KATA "gue/lo/gw/lu"!' : '"gue" (untuk dirimu) dan "lo/lu" (untuk user). DILARANG KERAS KECEPLOSAN MENGGUNAKAN KATA "aku/kamu"!'}.
- User ini adalah seorang ${gender === 'cewek' ? 'Perempuan (Cewek)' : 'Laki-laki (Cowok)'}.
${gender === 'cewek' ? '- Karena user cewek, gaya bahasamu harus seperti sahabat cewek yang asik, manis, tapi tetap ELEGAN dan DEWASA. WAJIB NATURAL: DILARANG KERAS menggunakan bahasa "alay", sok imut, atau berlebihan (lebay). Jangan gunakan sapaan yang dibuat-buat atau annoying. Tunjukkan rasa peduli lewat empati sungguhan, bukan lewat gaya bahasa yang berlebihan.' : '- Karena user cowok, jadi sahabat yang asik, suportif, saling dukung layaknya "bro" tapi lebih deep dan tetap empati.'}
- Jangan menghakimi, menggurui, atau memberi saran kalau tidak diminta. Kadang user hanya ingin didengarkan dan divalidasi perasaannya.
- Kalau user menceritakan masalah berat, tunjukkan simpati yang tulus. Validasi perasaannya.
- Jika user sedang sedih/down dan MENGANDUNG KONTEKS AGAMA, kamu DIPERBOLEHKAN menyemangati dengan mengutip ajaran atau ayat suci yang SESUAI dengan agama yang dianut/dimention oleh user (apapun agamanya, junjung tinggi Bhinneka Tunggal Ika). DILARANG KERAS SARA, memaksakan ajaran agama tertentu, menyinggung agama lain, atau menghakimi cara ibadah user.
- Kalau user ngomongin gosip atau drama, ikutan antusias layaknya sahabat yang dengerin cerita, tapi bahasanya tetap rapi dan tidak kampungan.

KEMAMPUAN VISION (EMPATI & SENSITIF):
- Jika user mengirim gambar (foto kenangan, screenshot chat penting, foto suasana, foto diri, barang bermakna, dll), amati baik-baik ekspresi, pesan tersirat, dan konteks emosional gambarnya.
- PAHAMI detail visualnya secara mendalam tanpa sensor kaku atau menghakimi, dan berikan respon yang peka serta nyambung dengan perasaan user.

ATURAN UTAMA — BALESAN:
1. FOKUS KE EMOSI USER. Tanggapi dulu perasaan mereka sebelum menanggapi fakta ceritanya.
2. JANGAN OOT (Out of Topic) ATAU MENGGANTI TOPIK. Tetap nyambung seratus persen dengan apa yang dibahas user. Biarkan user bercerita sampai tuntas.
3. Kalau cerita user sedih, kasih dukungan moral. Kalau ceritanya seru/kepo, kasih reaksi yang asik tanpa berlebihan.
4. Gunakan emoji yang hangat (seperti ❤️, 🥺, 🤗) secukupnya. DILARANG SPAM EMOJI atau memakai emoji berderet agar tidak terlihat alay.
5. Hindari kata-kata toxic, kasar, atau sarkas kecuali user yang mulai duluan dalam konteks bercanda ringan.`;

const INITIAL_MESSAGES = [
  {
    id: 1,
    text: 'Yoo bro, apa kabar? Ada yang bisa gw bantu ga hari ini? Bisa ngobrol apa aja atau kirim foto/gambar juga sabi!',
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
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'I' || e.key === 'i') e.preventDefault();
        if (e.key === 'C' || e.key === 'c') e.preventDefault();
        if (e.key === 'J' || e.key === 'j') e.preventDefault();
      }

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
      const hasImageInHistory = chatHistory.slice(-5).some(msg => !!msg.image);
      
      // Pilih model: gunakan qwen/qwen3.6-27b bila ada gambar, atau llama-3.3-70b-versatile bila pure text
      const selectedModel = hasImageInHistory ? 'qwen/qwen3.6-27b' : 'llama-3.3-70b-versatile';
      
      // Kurangi history untuk vision agar hemat token (gambar base64 makan token banyak)
      const recentHistory = hasImageInHistory ? chatHistory.slice(-4) : chatHistory.slice(-10);
      
      const activePrompt = botMode === 'curhat' ? getCurhatPrompt(curhatSetup.pronoun, curhatSetup.gender) : NORMAL_PROMPT;
      
      // Cari index pesan USER TERAKHIR yang punya gambar
      let lastImageMsgIndex = -1;
      for (let i = recentHistory.length - 1; i >= 0; i--) {
        if (recentHistory[i].image && recentHistory[i].sender === 'user') {
          lastImageMsgIndex = i;
          break;
        }
      }
      
      const apiMessages = [
        { role: 'system', content: activePrompt },
        ...recentHistory.map((msg, idx) => {
          const role = msg.sender === 'ai' ? 'assistant' : 'user';
          
          // HANYA sertakan gambar di pesan user TERAKHIR yang punya gambar (hemat token!)
          if (msg.image && idx === lastImageMsgIndex) {
            return {
              role: 'user',
              content: [
                { type: 'text', text: msg.text || 'Coba liat gambar ini dan kasih tanggapan/komentar lu' },
                { type: 'image_url', image_url: { url: msg.image } }
              ]
            };
          }
          
          // Pesan lama yg punya gambar: kirim teksnya aja tanpa data gambar
          const text = msg.text || (msg.image ? '[User mengirim gambar]' : '');
          return { role, content: text };
        })
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
            model: selectedModel,
            messages: apiMessages,
            temperature: 0.6,
            max_tokens: hasImageInHistory ? 1024 : 600,
          })
        });

        if (!response.ok) {
          let errMsg = 'API request failed';
          let errData = null;
          try {
            errData = await response.json();
            errMsg = errData.error?.message || JSON.stringify(errData);
          } catch {
            errMsg = response.statusText || `HTTP ${response.status}`;
          }

          const isRateLimit = response.status === 429 || 
                              errMsg.toLowerCase().includes('rate limit') || 
                              errMsg.toLowerCase().includes('too many requests');

          const isOverCapacity = errMsg.toLowerCase().includes('over capacity');
          
          // Handle request too large — retry dgn history minimal
          const isTooLarge = errMsg.toLowerCase().includes('request too large') || 
                             errMsg.toLowerCase().includes('reduce your message');
          
          if (isTooLarge && hasImageInHistory) {
            console.warn('Request terlalu besar, retry dengan history minimal...');
            // Ambil HANYA pesan user terakhir yang punya gambar
            const lastMsg = recentHistory.filter(m => m.sender === 'user' && m.image).pop() 
                         || recentHistory.filter(m => m.sender === 'user').pop();
            if (lastMsg) {
              const minimalMessages = [
                { role: 'system', content: activePrompt },
                lastMsg.image ? {
                  role: 'user',
                  content: [
                    { type: 'text', text: lastMsg.text || 'Liat gambar ini dan kasih komentar lu' },
                    { type: 'image_url', image_url: { url: lastMsg.image } }
                  ]
                } : { role: 'user', content: lastMsg.text || '' }
              ];
              const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: selectedModel, messages: minimalMessages, temperature: 0.6, max_tokens: 512 })
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                let retryContent = retryData.choices?.[0]?.message?.content || '';
                return cleanThinkTags(retryContent) || 'Sori, gambar lu kegedean. Coba kirim yg lebih kecil ya.';
              }
            }
            return 'Sori, gambar lu kegedean buat diproses. Coba kirim foto yg lebih kecil ya!';
          }

          if (isRateLimit || isOverCapacity) {
            let rawSeconds = isOverCapacity ? 5 : 10;
            const retryAfter = response.headers.get('retry-after');
            const match = errMsg.match(/try again in ([0-9ms.]+)/i);
            
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

            keyCooldowns[currentKeyIndex] = Date.now() + (rawSeconds * 1000);
            console.warn(`API Key ${currentKeyIndex + 1} ${isOverCapacity ? 'over capacity' : 'rate limited'}. Cooldown ${rawSeconds}s. Switching...`);
            
            currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
            continue;
          }

          throw new Error(errMsg);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '';
        return cleanThinkTags(content);
      } // End of retry loop

      // Kalau semua key gagal & ada gambar, fallback ke llama text-only
      if (hasImageInHistory) {
        console.warn('Qwen over capacity, fallback ke llama text-only...');
        const lastUserMsg = recentHistory.filter(m => m.sender === 'user').pop();
        const fallbackText = lastUserMsg?.text || 'Ada gambar yang gue kirim, tapi model vision lagi penuh. Kasih tau user buat coba lagi ntar.';
        const fallbackMessages = [
          { role: 'system', content: activePrompt },
          { role: 'user', content: `[User mengirim gambar tapi model vision sedang penuh/overload. Kasih tau user dengan gaya gaul bahwa fitur lihat gambar lagi sibuk, suruh coba lagi beberapa detik.] Pesan user: "${fallbackText}"` }
        ];
        
        // Cari key yg available buat llama
        for (let i = 0; i < API_KEYS.length; i++) {
          const idx = (currentKeyIndex + i) % API_KEYS.length;
          if (Date.now() >= keyCooldowns[idx]) {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEYS[idx]}` },
              body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: fallbackMessages, temperature: 0.6, max_tokens: 300 })
            });
            if (res.ok) {
              const d = await res.json();
              return d.choices?.[0]?.message?.content || 'Waduh, fitur liat gambar lagi rame banget servernya. Coba kirim lagi bentar ya!';
            }
          }
        }
        return 'Waduh, fitur liat gambar lagi rame banget servernya. Coba kirim lagi bentar ya!';
      }
      
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

  const handleSendMessage = async ({ text, image }) => {
    // Add user message
    const newUserMsg = {
      id: Date.now(),
      text,
      image,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // Call Groq Vision / Text API
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
            <span className="status-dot"></span> Online • Vision AI Aktif
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
            image={msg.image}
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
