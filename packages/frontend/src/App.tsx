import { ChatContainer } from './components/Chat/ChatContainer';
import { Sidebar } from './components/Sidebar/Sidebar';

function App() {
  return (
    <div className="h-full p-4">
      <div className="h-full flex gap-3">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-oscar-200/50 overflow-hidden">
          {/* Header */}
          <header className="flex-shrink-0 px-6 py-3.5 border-b border-oscar-100">
            <div className="flex items-center gap-2.5">
              <img src="/panda.png" alt="Oscar" className="w-7 h-7" />
              <h1 className="text-[15px] font-semibold text-oscar-800 tracking-tight">Oscar</h1>
            </div>
          </header>

          {/* Chat Area */}
          <main className="flex-1 min-h-0">
            <ChatContainer />
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
