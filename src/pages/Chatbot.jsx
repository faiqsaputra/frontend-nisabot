import React, { useState } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatMain from '../components/ChatMain';

export default function Chatbot() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [isResearch, setIsResearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewChat = () => {
    setMessages([]);
    setMessage('');
    setSidebarOpen(false);
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-[#FBF8F6] font-sans text-[#0F172A]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#F6E5E8] opacity-70 blur-[120px] animate-soft-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[#F6E5E8] opacity-60 blur-[120px] animate-soft-float-reverse" />
      <div className="pointer-events-none absolute left-[42%] top-[35%] h-[240px] w-[240px] rounded-full bg-[#F8EEE2] opacity-40 blur-[110px]" />

      <div className="relative z-10 grid h-full min-h-0 w-full grid-cols-1 gap-0 overflow-hidden p-2.5 sm:p-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-3 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-4 lg:p-4">
        <div className="relative z-30 min-h-0 min-w-0">
          <ChatSidebar
            search={search}
            setSearch={setSearch}
            onNewChat={handleNewChat}
            onSelectHistory={setMessage}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>

        <div className="relative z-10 min-h-0 min-w-0 h-full w-full overflow-hidden">
          <ChatMain
            message={message}
            setMessage={setMessage}
            messages={messages}
            setMessages={setMessages}
            isResearch={isResearch}
            setIsResearch={setIsResearch}
            isListening={isListening}
            setIsListening={setIsListening}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #EBC7D0;
          border-radius: 20px;
        }

        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #9B5265;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #EBC7D0 transparent;
        }

        .animate-soft-float {
          animation: softFloat 9s ease-in-out infinite;
        }

        .animate-soft-float-reverse {
          animation: softFloatReverse 11s ease-in-out infinite;
        }

        .animate-icon-float {
          animation: iconFloat 4s ease-in-out infinite;
        }

        .animate-message {
          animation: messageIn 0.4s ease-out both;
        }

        @keyframes softFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(25px, 18px, 0) scale(1.05);
          }
        }

        @keyframes softFloatReverse {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-20px, -25px, 0) scale(1.06);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-4px) rotate(2deg);
          }
        }

        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}} />
    </div>
  );
}