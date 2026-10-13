import React from 'react';
import { ChevronDown, MoreHorizontal, Link2, Download, Image as ImageIcon, Lightbulb, Settings, Mic, Paperclip, PieChart, CheckSquare, HelpCircle, Languages, Sparkles, Globe, Plus } from 'lucide-react';

const suggestionCards = [
  { icon: PieChart, title: 'Analisis Haid', description: 'Bantu memahami kondisi haid berdasarkan tanggal dan durasinya.', prompt: 'Bantu saya menganalisis kondisi haid berdasarkan tanggal dan durasinya.' },
  { icon: Lightbulb, title: 'Tanya Fikih', description: 'Jelaskan hukum haid, nifas, atau istihadhah dengan sederhana.', prompt: 'Jelaskan hukum haid, nifas, atau istihadhah dengan bahasa sederhana.' },
  { icon: CheckSquare, title: 'Cek Pemahaman', description: 'Bantu memahami perbedaan haid, istihadhah, dan darah lainnya.', prompt: 'Bantu saya memahami perbedaan haid, istihadhah, dan darah lainnya.' }
];

const dummyResponses = [
  'Berdasarkan pembahasan fikih, haid adalah darah yang keluar dari rahim perempuan pada waktu tertentu. Untuk menentukan hukumnya, perlu diperhatikan durasi, kebiasaan siklus, serta kondisi darah yang keluar.',
  'Untuk kasus seperti ini, Nusa Bot perlu melihat beberapa informasi seperti tanggal mulai darah, lama berlangsungnya darah, masa suci sebelumnya, dan kebiasaan siklus.',
  'Haid, nifas, dan istihadhah memiliki ketentuan yang berbeda. Ceritakan kondisi yang sedang kamu alami agar Nusa Bot dapat membantu menjelaskan konteksnya.'
];

const logo = '/assets/logo/logo.png';

export default function ChatMain({ message, setMessage, messages, setMessages, isResearch, setIsResearch, isListening, setIsListening }) {
  const sendMessage = (value = message) => {
    const text = value.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setMessage('');
    setTimeout(() => {
      const response = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    }, 650);
  };

  const handleSuggestion = (prompt) => {
    setMessage(prompt);
  };

  const toggleMic = () => {
    setIsListening((prev) => !prev);
    setTimeout(() => setIsListening(false), 1500);
  };

  const handleExport = () => {
    if (!messages.length) return;
    const content = messages.map((item) => `${item.role === 'user' ? 'Kamu' : 'Nusa Bot'}: ${item.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nusa-bot-chat.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 min-w-0 h-full bg-white/80 rounded-[28px] shadow-[0_12px_45px_rgba(122,16,37,0.05)] backdrop-blur-xl flex flex-col relative overflow-hidden">
      <header className="px-7 py-4 flex items-center justify-between z-20 flex-shrink-0">
        <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBF8F6] hover:bg-[#F6E5E8] transition-all duration-300 text-[13px] font-medium text-[#0F172A]">
          <div className="bg-[#F6E5E8] p-1 rounded-md text-[#7A1025]"><Sparkles size={13} strokeWidth={2} /></div>
          Nusa Bot
          <ChevronDown size={13} className="text-[#9B5265] ml-1" />
        </button>

        <div className="flex items-center gap-2">
          <button type="button" className="p-2 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-xl transition-all duration-300"><MoreHorizontal size={18} /></button>
          <button type="button" className="p-2 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-xl transition-all duration-300"><Link2 size={18} /></button>
          <button type="button" onClick={handleExport} className="flex items-center gap-2 px-4 py-2 ml-1 text-[12px] font-medium text-[#475569] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-xl transition-all duration-300"><Download size={15} />Export chat</button>
          <button type="button" className="bg-[#7A1025] hover:bg-[#65101F] text-white px-5 py-2 rounded-xl text-[12px] font-medium transition-all duration-300 shadow-[0_6px_16px_rgba(122,16,37,0.16)] hover:-translate-y-0.5">Nusa</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-7 custom-scrollbar">
        <div className="w-full max-w-[900px] mx-auto pt-7 pb-24">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center text-center mb-7 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="relative w-[82px] h-[82px] mb-5 animate-icon-float">
                <div className="absolute inset-0 bg-[#9B5265] blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#F6E5E8] via-[#EBC7D0] to-[#D99BAA] shadow-[inset_-8px_-8px_18px_rgba(122,16,37,0.08),_inset_8px_8px_18px_rgba(255,255,255,0.9)] flex items-center justify-center overflow-hidden">
                  <div className="absolute top-2 left-3 w-8 h-8 bg-white/60 rounded-full blur-md"></div>
                  <img src={logo} alt="Logo Nusa Bot" className="w-12 h-12 object-contain" />
                </div>
              </div>

              <p className="text-[24px] font-medium text-[#9B5265] mb-1">Halo, Sahabat Nusa</p>
              <h1 className="text-[32px] font-semibold text-[#0F172A] tracking-tight">Ada yang ingin kamu tanyakan?</h1>
              <p className="mt-2 text-[13px] text-[#64748B]">Tanya apa saja seputar haid, nifas, istihadhah, dan fikih menstruasi.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 mb-8">
              {messages.map((item, idx) => (
                <div key={idx} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} animate-message`}>
                  <div className={`max-w-[75%] px-5 py-4 rounded-[20px] text-[14px] leading-relaxed ${item.role === 'user' ? 'bg-[#7A1025] text-white rounded-br-md shadow-[0_8px_20px_rgba(122,16,37,0.14)]' : 'bg-[#F6E5E8] text-[#0F172A] rounded-bl-md shadow-[0_5px_18px_rgba(122,16,37,0.05)]'}`}>
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {suggestionCards.map((card, idx) => (
                <button type="button" key={idx} onClick={() => handleSuggestion(card.prompt)} className="group text-left bg-white p-4 rounded-[20px] shadow-[0_7px_25px_rgba(122,16,37,0.055)] hover:shadow-[0_14px_30px_rgba(122,16,37,0.10)] hover:-translate-y-1.5 transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-[#F6E5E8] text-[#7A1025] flex items-center justify-center mb-3 group-hover:bg-[#7A1025] group-hover:text-white group-hover:rotate-3 transition-all duration-300">
                    <card.icon size={18} strokeWidth={1.7} />
                  </div>
                  <h3 className="font-semibold text-[13px] text-[#0F172A] mb-1">{card.title}</h3>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{card.description}</p>
                </button>
              ))}
            </div>
          )}

          <div className="w-full">
            <div className="bg-white rounded-[25px] p-2 pb-3 shadow-[0_10px_35px_rgba(122,16,37,0.07)] focus-within:shadow-[0_15px_45px_rgba(122,16,37,0.11)] transition-all duration-300">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Tanyakan seputar haid, nifas, atau istihadhah..."
                className="w-full bg-transparent resize-none outline-none min-h-[78px] p-4 text-[14px] text-[#0F172A] placeholder:text-[#A98D96]"
                rows={2}
              />

              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsResearch((prev) => !prev)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-300 ${isResearch ? 'bg-[#7A1025] text-white shadow-[0_5px_15px_rgba(122,16,37,0.15)]' : 'bg-[#F6E5E8] text-[#7A1025] hover:bg-[#EFD2D8]'}`}>
                    <img src={logo} alt="Logo Nusa Bot" className="w-4 h-4 object-contain" />
                    Riset Mendalam
                  </button>
                  <button type="button" className="p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-lg transition-all duration-300"><ImageIcon size={17} /></button>
                  <button type="button" onClick={() => setMessage('Bantu saya memahami kasus haid berikut: ')} className="p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-lg transition-all duration-300"><Lightbulb size={17} /></button>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" className="p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-lg transition-all duration-300"><Settings size={17} /></button>
                  <button type="button" className="p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-lg transition-all duration-300 mr-1"><Globe size={17} /></button>
                  <button type="button" onClick={toggleMic} className={`${isListening ? 'bg-[#7A1025] text-white scale-105 animate-pulse' : 'bg-[#F6E5E8] text-[#7A1025]'} hover:bg-[#EBC7D0] p-2.5 rounded-full transition-all duration-300 shadow-sm`}>
                    <Mic size={17} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 mt-3">
              <button type="button" className="flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#7A1025] transition-colors">
                <Plus size={13} className="text-[#9B5265]" strokeWidth={3} />
                Prompt tersimpan
              </button>

              <button type="button" className="flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] bg-white px-3 py-1.5 rounded-full hover:bg-[#F6E5E8] hover:text-[#7A1025] transition-all duration-300 shadow-sm">
                <Paperclip size={13} />
                Lampirkan file
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <p className="text-[10px] text-[#94A3B8] pointer-events-auto">
          Nusa Bot membantu memahami literasi fikih menstruasi dengan lebih mudah{' '}
          <a href="#" onClick={(event) => event.preventDefault()} className="text-[#7A1025] underline underline-offset-2 hover:text-[#9B5265] transition-colors">Pelajari lebih lanjut</a>
        </p>
      </div>

      <div className="absolute bottom-4 right-5 flex items-center gap-2 z-20">
        <button type="button" className="bg-white p-2.5 rounded-full text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] shadow-[0_5px_18px_rgba(122,16,37,0.07)] transition-all duration-300 hover:-translate-y-0.5"><Languages size={17} /></button>
        <button type="button" className="bg-white p-2.5 rounded-full text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] shadow-[0_5px_18px_rgba(122,16,37,0.07)] transition-all duration-300 hover:-translate-y-0.5"><HelpCircle size={17} /></button>
      </div>
    </main>
  );
}