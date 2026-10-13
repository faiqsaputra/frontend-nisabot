import React from 'react';
import { Plus, Search, Command, Globe, Library, Files, History, LogOut, MoreHorizontal, Sparkles, X } from 'lucide-react';

const historyData = {
  today: ['Apa perbedaan darah haid dan istihadhah?', 'Berapa lama batas maksimal masa haid?', 'Bagaimana cara menghitung masa suci?'],
  yesterday: ['Apa hukum shalat saat keluar flek?', 'Bagaimana hukum puasa ketika haid?'],
  sevenDays: ['Apa saja tanda-tanda selesai haid?', 'Bagaimana cara mandi wajib setelah haid?', 'Apa perbedaan haid, nifas, dan istihadhah?', 'Bolehkah membaca Al-Quran saat haid?', 'Bagaimana menghitung siklus haid tidak teratur?']
};

const navigationLinks = [
  { icon: Globe, label: 'Eksplorasi' },
  { icon: Library, label: 'Materi' },
  { icon: Files, label: 'Sumber' },
  { icon: History, label: 'Riwayat' }
];

const logo = "/assets/logo/logo.png";

export default function ChatSidebar({ search, setSearch, onNewChat, onSelectHistory, sidebarOpen, setSidebarOpen }) {
  const filteredHistory = (items) => {
    if (!search.trim()) return items;
    return items.filter((item) => item.toLowerCase().includes(search.toLowerCase()));
  };

  const renderHistory = (title, items) => (
    <div className="mb-6">
      <h3 className="px-1 mb-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9B5265]">{title}</h3>
      <ul className="space-y-1">
        {filteredHistory(items).map((item, idx) => (
          <li key={idx}>
            <button type="button" onClick={() => onSelectHistory(item)} className="w-full px-2.5 py-2 text-left text-[11px] sm:text-[12px] leading-relaxed text-[#475569] rounded-xl truncate hover:text-[#7A1025] hover:bg-[#F6E5E8]/60 transition-all duration-200">
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-[#0F172A]/20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>

      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] sm:w-[290px] md:relative md:z-auto md:w-[240px] lg:w-[270px] h-full min-h-0 flex-shrink-0 bg-white/95 md:bg-white/75 rounded-r-[28px] md:rounded-[28px] shadow-[0_12px_45px_rgba(122,16,37,0.08)] md:shadow-[0_12px_45px_rgba(122,16,37,0.055)] backdrop-blur-xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-[105%] md:translate-x-0'}`}>

        <div className="px-4 sm:px-5 pt-5 sm:pt-6 pb-4 sm:pb-5 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-2xl bg-[#F6E5E8] text-[#7A1025] flex items-center justify-center shadow-[0_6px_18px_rgba(122,16,37,0.08)] animate-icon-float">
                <img src={logo} alt="Logo Nusa Bot" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] sm:text-[17px] font-semibold tracking-tight text-[#7A1025]">Nusa Bot</span>
                <span className="text-[9px] sm:text-[10px] text-[#9B5265] truncate">Sahabat Belajar Ibadah</span>
              </div>
            </div>

            <button type="button" onClick={() => setSidebarOpen(false)} className="p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-xl transition-all duration-300 md:hidden">
              <X size={18} />
            </button>

            <button type="button" className="hidden md:block p-1.5 text-[#9B5265] hover:text-[#7A1025] hover:bg-[#F6E5E8] rounded-xl transition-all duration-300 hover:rotate-90">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="px-3.5 sm:px-4 mb-4 sm:mb-5 flex-shrink-0">
          <button type="button" onClick={onNewChat} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 text-[12px] sm:text-sm font-medium text-white bg-[#7A1025] rounded-2xl shadow-[0_8px_20px_rgba(122,16,37,0.18)] hover:bg-[#65101F] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300">
            <Plus size={15} sm-size={16} />
            Chat baru
          </button>
        </div>

        <div className="px-3.5 sm:px-4 mb-4 sm:mb-5 flex-shrink-0">
          <div className="relative flex items-center bg-[#FBF8F6] rounded-2xl shadow-[inset_0_0_0_1px_rgba(122,16,37,0.035)] focus-within:bg-white focus-within:shadow-[0_8px_25px_rgba(122,16,37,0.07)] transition-all duration-300">
            <Search size={15} className="ml-3 flex-shrink-0 text-[#9B5265]" />
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari percakapan" className="w-full min-w-0 bg-transparent px-2 py-2.5 text-[12px] sm:text-[13px] text-[#0F172A] outline-none placeholder:text-[#B89AA2]" />
            <div className="mr-2 flex flex-shrink-0 items-center justify-center rounded-md bg-white p-1 shadow-sm">
              <Command size={11} className="text-[#9B5265]" />
            </div>
          </div>
        </div>

        <nav className="px-2.5 sm:px-3 mb-4 sm:mb-5 flex-shrink-0">
          {navigationLinks.map((link, idx) => (
            <a key={idx} href="#" onClick={(event) => event.preventDefault()} className="group flex items-center gap-3 px-3 py-2.5 text-[12px] sm:text-[13px] font-medium text-[#475569] rounded-xl hover:text-[#7A1025] hover:bg-[#F6E5E8]/70 hover:translate-x-1 transition-all duration-300">
              <link.icon size={15} className="flex-shrink-0 text-[#9B5265] group-hover:text-[#7A1025] group-hover:scale-110 transition-all duration-300" strokeWidth={1.8} />
              <span className="truncate">{link.label}</span>
            </a>
          ))}
        </nav>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3.5 sm:px-4 custom-scrollbar overscroll-contain">
          {renderHistory('Hari ini', historyData.today)}
          {renderHistory('Kemarin', historyData.yesterday)}
          {renderHistory('7 hari terakhir', historyData.sevenDays)}
        </div>

        <div className="p-3.5 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 bg-[#FBF8F6] rounded-2xl p-2.5 shadow-[0_5px_18px_rgba(122,16,37,0.045)] hover:bg-white transition-all duration-300">
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nusa" alt="Pengguna Nusa Bot" className="w-8 h-8 flex-shrink-0 rounded-full bg-[#F6E5E8] object-cover" />
              <div className="flex flex-col min-w-0 truncate">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[#0F172A] truncate">Pengguna Nusa</span>
                <span className="text-[9px] sm:text-[10px] text-[#9B5265] truncate">pengguna@nusabot.id</span>
              </div>
            </div>

            <button type="button" className="p-1 flex-shrink-0 text-[#9B5265] hover:text-[#7A1025] transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}