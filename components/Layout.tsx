
import React from 'react';
import { Icons } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userPhoto?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userPhoto }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Icons.Home },
    { id: 'friends', label: 'Friends', icon: Icons.Users },
    { id: 'create', label: 'Forge', icon: Icons.Plus },
    { id: 'ranks', label: 'Ranks', icon: Icons.Trophy },
    { id: 'profile', label: 'Profile', icon: Icons.Fire },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 md:pl-64">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FORGE</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-800">
           <div className="flex items-center gap-3">
             <img src={userPhoto || 'https://picsum.photos/100'} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-700" />
             <div className="overflow-hidden">
               <p className="text-sm font-medium text-slate-200 truncate">Settings & Account</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-8 pb-12">
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-4 z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <tab.icon className={`w-6 h-6 ${tab.id === 'create' ? 'w-8 h-8 -mt-2 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg shadow-indigo-500/40' : ''}`} />
            {tab.id !== 'create' && <span className="text-[10px] mt-1 font-medium">{tab.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
