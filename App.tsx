
import React, { useState, useEffect, useCallback } from 'react';
import { User, Activity, Tier, Checkin, Notification, RepeatType } from './types';
import { store } from './services/store';
import { geminiService } from './services/geminiService';
import { Icons, TIER_CONFIG } from './constants';
import Layout from './components/Layout';
import ActivityCard from './components/ActivityCard';

const SuccessOverlay: React.FC<{ 
  user: User, 
  pointsGained: number, 
  previousPoints: number,
  onClose: () => void 
}> = ({ user, pointsGained, previousPoints, onClose }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const nextTier = user.tier === Tier.BRONZE ? Tier.SILVER : user.tier === Tier.SILVER ? Tier.GOLD : user.tier === Tier.GOLD ? Tier.PLATINUM : user.tier === Tier.PLATINUM ? Tier.DIAMOND : Tier.DIAMOND;
  const minPoints = TIER_CONFIG[user.tier].min;
  const nextPoints = TIER_CONFIG[nextTier].min;
  
  const startProgress = Math.min(100, Math.max(0, ((previousPoints - minPoints) / (nextPoints - minPoints)) * 100));
  const endProgress = Math.min(100, Math.max(0, ((user.points - minPoints) / (nextPoints - minPoints)) * 100));

  useEffect(() => {
    setAnimatedProgress(startProgress);
    const timer = setTimeout(() => setAnimatedProgress(endProgress), 100);
    const closeTimer = setTimeout(onClose, 4000);
    return () => {
        clearTimeout(timer);
        clearTimeout(closeTimer);
    };
  }, [startProgress, endProgress, onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center max-w-sm w-full animate-in zoom-in slide-in-from-bottom-12 duration-700 ease-out">
        <div className="relative mb-10">
           <div className="absolute inset-0 bg-indigo-500 rounded-[3rem] blur-[80px] opacity-30 animate-pulse"></div>
           <div className={`w-40 h-40 rounded-[3rem] border-4 flex items-center justify-center relative bg-slate-900 ${TIER_CONFIG[user.tier].border} shadow-2xl overflow-hidden group`}>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-[2000ms] ease-out opacity-40" style={{ height: `${animatedProgress}%` }}>
                <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 animate-pulse blur-md"></div>
              </div>
              <Icons.Trophy className={`w-20 h-20 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110 ${TIER_CONFIG[user.tier].color}`} />
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white font-black px-4 py-2 rounded-2xl shadow-xl animate-bounce z-20 border-4 border-slate-900">+{pointsGained}</div>
           </div>
        </div>
        <h3 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">Forged!</h3>
        <p className="text-slate-400 font-bold mb-10 tracking-wide uppercase">Rank Progress: <span className={TIER_CONFIG[user.tier].color}>{user.tier}</span></p>
        <div className="w-full space-y-4">
          <div className="flex justify-between items-end px-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span>{user.tier}</span>
            <span className="text-2xl text-white">{Math.round(animatedProgress)}%</span>
            <span>{nextTier}</span>
          </div>
          <div className="w-full h-5 bg-slate-900 rounded-full overflow-hidden border-2 border-slate-800 p-1">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-cyan-400 transition-all duration-[2000ms] ease-out shadow-[0_0_20px_rgba(99,102,241,0.6)]" style={{ width: `${animatedProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivation, setMotivation] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGained, setLastGained] = useState(0);
  const [prevPoints, setPrevPoints] = useState(0);

  const loadData = useCallback(async (userId: string) => {
    const updatedUser = await store.getCurrentUser();
    const users = await store.users.find({});
    setAllUsers(users);

    if (updatedUser) {
        setCurrentUser(updatedUser);
        const userActs = await store.getActivities(userId);
        const userChecks = await store.getCheckins(userId);
        const userNotifs = await store.getNotifications(userId);
        
        setActivities(userActs);
        setCheckins(userChecks);
        setNotifications(userNotifs);

        if (!motivation) {
            geminiService.getMotivationalQuote(updatedUser.tier).then(setMotivation);
        }
        if (userActs.length > 0 && aiSuggestions.length === 0) {
            geminiService.getHabitSuggestions(userActs.map(a => a.name)).then(setAiSuggestions);
        }
    }
    setLoading(false);
  }, [motivation, aiSuggestions.length]);

  const handleLogin = async (email: string) => {
    setLoading(true);
    const user = await store.login(email);
    setCurrentUser(user);
    await loadData(user._id);
  };

  const handleLogout = async () => {
    await store.logout();
    setCurrentUser(null);
  };

  const onCheckinPerformed = async (activityId: string, status: 'completed' | 'missed') => {
    if (!currentUser) return;
    const currentPointsBefore = currentUser.points;
    const gained = await store.performCheckin(activityId, currentUser._id, status);
    await loadData(currentUser._id);
    if (status === 'completed') {
      setPrevPoints(currentPointsBefore);
      setLastGained(gained);
      setShowSuccess(true);
    }
  };

  useEffect(() => {
    store.getCurrentUser().then(user => {
        if (user) {
            setCurrentUser(user);
            loadData(user._id);
        } else {
            setLoading(false);
        }
    });
  }, [loadData]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-indigo-600/30">
              <Icons.Fire className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic">FORGE</h1>
            <p className="text-slate-400 font-medium">Initialize accountability session.</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => handleLogin('alex@example.com')} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all">Alex (Silver Ally)</button>
            <button onClick={() => handleLogin('sarah@example.com')} className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all border border-slate-700">Sarah (Gold Ally)</button>
            <button onClick={() => handleLogin(`guest_${Date.now()}@forge.app`)} className="w-full py-4 text-indigo-400 hover:text-indigo-300 font-bold text-sm tracking-widest uppercase">Create Guest Identity</button>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u._id !== currentUser._id && 
    (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userPhoto={currentUser.photoURL}>
      {loading && !showSuccess ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="text-center">
             <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Connecting to NoSQL Forge</p>
             <p className="text-slate-600 text-xs mt-1 font-medium">Indexing collection: users...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div className="space-y-1">
                   <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Status: Online</h2>
                   <p className="text-indigo-400 font-bold italic opacity-80 leading-snug">"{motivation || 'Calibrating focus...'}"</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className={`px-5 py-3 rounded-2xl border transition-all duration-700 ${TIER_CONFIG[currentUser.tier].bg} ${TIER_CONFIG[currentUser.tier].border} flex flex-col items-center shadow-xl`}>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${TIER_CONFIG[currentUser.tier].color}`}>{currentUser.tier}</span>
                        <span className="text-2xl font-black text-white">{currentUser.points} <span className="text-xs font-normal text-slate-500 ml-1">pts</span></span>
                    </div>
                    <button className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all relative group shadow-lg">
                        <Icons.Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        {notifications.some(n => !n.read) && <span className="absolute top-3.5 right-3.5 w-3 h-3 bg-rose-500 border-2 border-slate-900 rounded-full animate-pulse"></span>}
                    </button>
                 </div>
               </header>

               <section>
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-bold text-slate-100 uppercase tracking-tighter italic">Active Forges</h3>
                   <div className="h-1 flex-1 mx-6 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-indigo-500/20"></div>
                   </div>
                   <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{activities.length} Habits</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {activities.map(activity => (
                     <ActivityCard 
                       key={activity._id} 
                       activity={activity} 
                       checkins={checkins} 
                       onCheckin={(status) => onCheckinPerformed(activity._id, status)}
                     />
                   ))}
                   <button onClick={() => setIsNewActivityModalOpen(true)} className="flex flex-col items-center justify-center p-10 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all group shadow-inner">
                     <Icons.Plus className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform" />
                     <span className="font-black uppercase tracking-widest text-xs">Initialize Activity</span>
                   </button>
                 </div>
               </section>

               {aiSuggestions.length > 0 && (
                 <section className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Icons.Sparkles className="w-24 h-24" />
                   </div>
                   <div className="flex items-center gap-3 mb-6 text-indigo-400 relative z-10">
                     <Icons.Sparkles className="w-6 h-6 animate-pulse" />
                     <h3 className="font-black text-xl italic uppercase tracking-tighter">AI Stratagem</h3>
                   </div>
                   <div className="flex flex-wrap gap-3 relative z-10">
                     {aiSuggestions.map((suggestion, i) => (
                       <button key={i} className="px-6 py-3 bg-slate-950/80 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95">
                         + {suggestion}
                       </button>
                     ))}
                   </div>
                 </section>
               )}
             </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Allies</h2>
                  <div className="relative flex-1 max-w-md">
                     <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                     <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text" 
                        placeholder="Search for allies by name..." 
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-xl"
                     />
                  </div>
               </div>

               {searchQuery && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in zoom-in-95 duration-300">
                    {filteredUsers.map(user => (
                       <div key={user._id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-4">
                             <img src={user.photoURL} alt={user.username} className="w-12 h-12 rounded-2xl bg-slate-800" />
                             <div>
                                <p className="font-black text-slate-100">{user.username}</p>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${TIER_CONFIG[user.tier].color}`}>{user.tier}</p>
                             </div>
                          </div>
                          <button onClick={() => store.sendFriendRequest(currentUser._id, user._id)} className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                             <Icons.Plus className="w-5 h-5" />
                          </button>
                       </div>
                    ))}
                    {filteredUsers.length === 0 && <p className="col-span-full text-center py-10 text-slate-600 font-bold italic">No allies found in collection.</p>}
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {allUsers.filter(u => currentUser.friends.includes(u._id)).map(friend => (
                    <div key={friend._id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 shadow-xl hover:shadow-indigo-500/5 transition-all">
                       <img src={friend.photoURL} alt={friend.username} className="w-14 h-14 rounded-2xl border border-slate-800 bg-slate-800 shadow-md" />
                       <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-100 truncate italic uppercase tracking-tighter">{friend.username}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${TIER_CONFIG[friend.tier].bg} ${TIER_CONFIG[friend.tier].color} uppercase tracking-widest`}>
                               {friend.tier}
                            </span>
                            <span className="text-[10px] text-slate-500 font-black">{friend.points} PTS</span>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>

               <div className="mt-12 bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
                    <h3 className="font-black text-2xl italic uppercase tracking-tighter">Leaderboard</h3>
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Live Sync</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                     {allUsers.sort((a,b) => b.points - a.points).map((u, i) => (
                        <div key={u._id} className="p-6 flex items-center gap-5 hover:bg-indigo-600/5 transition-colors">
                           <span className={`w-8 text-center font-black ${i === 0 ? 'text-yellow-500 text-3xl' : i === 1 ? 'text-slate-400 text-2xl' : i === 2 ? 'text-orange-400 text-xl' : 'text-slate-700'}`}>{i + 1}</span>
                           <img src={u.photoURL} alt={u.username} className="w-12 h-12 rounded-2xl shadow-xl bg-slate-800" />
                           <div className="flex-1">
                              <p className="font-black text-lg text-slate-100 italic uppercase tracking-tight">{u.username} {u._id === currentUser._id && <span className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded-lg ml-2 uppercase font-black tracking-tighter shadow-lg shadow-indigo-600/30">Self</span>}</p>
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${TIER_CONFIG[u.tier].color}`}>{u.tier}</p>
                           </div>
                           <div className="text-right">
                              <span className="font-black text-2xl text-white block">{u.points}</span>
                              <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Points</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ranks' && (
            <div className="space-y-12 animate-in fade-in duration-500">
               <div className="text-center">
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Forge Hierarchy</h2>
                  <p className="text-slate-500 font-medium tracking-wide">Amass points to ascend the tiers.</p>
               </div>

               <div className="relative p-10 bg-slate-900 border border-slate-800 rounded-[4rem] shadow-2xl overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>
                  <div className="relative flex flex-col items-center">
                     <div className={`w-44 h-44 rounded-[3.5rem] border-4 flex items-center justify-center mb-8 transition-all duration-1000 ${TIER_CONFIG[currentUser.tier].bg} ${TIER_CONFIG[currentUser.tier].border} relative overflow-hidden shadow-2xl`}>
                        <Icons.Trophy className={`w-24 h-24 relative z-10 transition-transform duration-700 group-hover:scale-110 ${TIER_CONFIG[currentUser.tier].color}`} />
                     </div>
                     <h3 className={`text-6xl font-black italic uppercase tracking-tighter ${TIER_CONFIG[currentUser.tier].color}`}>{currentUser.tier}</h3>
                     <p className="text-slate-400 font-black mt-2 tracking-[0.3em] uppercase text-xs">{currentUser.points} Accumulated Points</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {Object.entries(TIER_CONFIG).map(([key, config]) => (
                      <div key={key} className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center gap-3 transition-all duration-700 ${currentUser.tier === key ? 'bg-indigo-600 border-indigo-400 shadow-[0_20px_60px_rgba(79,70,229,0.3)] scale-110 z-10' : 'bg-slate-900 border-slate-800 opacity-20 grayscale'}`}>
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${currentUser.tier === key ? 'text-indigo-100' : 'text-slate-600'}`}>{key}</span>
                          <span className={`text-lg font-black ${currentUser.tier === key ? 'text-white' : 'text-slate-700'}`}>{config.min}</span>
                      </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
               <div className="flex flex-col items-center text-center">
                   <div className="relative mb-8 group">
                       <div className="absolute inset-0 bg-indigo-500 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                       <img src={currentUser.photoURL} alt="Me" className="w-40 h-40 rounded-[3rem] border-4 border-slate-800 shadow-2xl relative z-10 bg-slate-900" />
                       <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-indigo-600 border-4 border-slate-950 rounded-[1.5rem] flex items-center justify-center z-20 shadow-xl">
                           <Icons.Fire className="w-8 h-8 text-white" />
                       </div>
                   </div>
                   <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{currentUser.username}</h2>
                   <p className="text-slate-500 font-black mb-10 uppercase tracking-[0.3em] text-[10px]">{currentUser.email}</p>

                   <div className="grid grid-cols-2 gap-6 w-full">
                       <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl hover:border-orange-500/30 transition-all">
                           <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Current Heat</p>
                           <p className="text-5xl font-black text-orange-500 flex items-center justify-center gap-3 italic">
                               <Icons.Fire className="w-10 h-10" /> {currentUser.currentStreak}
                           </p>
                       </div>
                       <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl hover:border-indigo-500/30 transition-all">
                           <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Apex Streak</p>
                           <p className="text-5xl font-black text-indigo-400 italic">{currentUser.longestStreak}</p>
                       </div>
                   </div>
               </div>

               <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                   <h3 className="font-black text-2xl mb-8 italic uppercase tracking-tighter border-b border-slate-800 pb-4">Identity Logs</h3>
                   <div className="space-y-4">
                       <div className="flex justify-between items-center p-5 bg-slate-950/50 rounded-2xl border border-slate-800">
                           <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">Joined Forge</span>
                           <span className="font-black text-slate-200">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between items-center p-5 bg-slate-950/50 rounded-2xl border border-slate-800">
                           <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">System Status</span>
                           <span className="font-black text-emerald-400 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> ACTIVE</span>
                       </div>
                   </div>
               </div>

               <button onClick={handleLogout} className="w-full py-6 text-rose-500 font-black uppercase tracking-[0.3em] border-2 border-rose-500/20 hover:bg-rose-500/10 rounded-[2rem] transition-all active:scale-95 text-xs">Shutdown Session</button>
             </div>
          )}

          {activeTab === 'create' && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-md mx-auto animate-in slide-in-from-bottom-12 duration-1000">
                 <div className="w-32 h-32 bg-indigo-600/10 text-indigo-500 rounded-[3rem] flex items-center justify-center mb-10 border-4 border-indigo-600/20 shadow-[0_0_80px_rgba(79,70,229,0.15)]">
                    <Icons.Plus className="w-16 h-16" />
                 </div>
                 <h2 className="text-5xl font-black mb-4 italic tracking-tighter uppercase leading-none">Expand the Forge</h2>
                 <p className="text-slate-500 mb-12 font-bold text-sm tracking-wide leading-relaxed">Establish new protocols and habits. Consistency is the only metric that matters.</p>
                 <button 
                    onClick={() => setIsNewActivityModalOpen(true)}
                    className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-[0.3em] rounded-[2rem] shadow-[0_25px_60px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all active:scale-95 text-xs"
                 >
                    Initialize Protocol
                 </button>
              </div>
          )}
        </>
      )}

      {isNewActivityModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[3.5rem] shadow-2xl p-10 max-h-[95vh] overflow-y-auto animate-in zoom-in slide-in-from-bottom-8 duration-500">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Forge Protocol</h3>
                    <button onClick={() => setIsNewActivityModalOpen(false)} className="p-4 hover:bg-slate-800 rounded-3xl transition-all">
                        <Icons.X className="w-8 h-8" />
                    </button>
                </div>
                
                <form className="space-y-8" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    setLoading(true);
                    await store.createActivity({
                        name: formData.get('name') as string,
                        description: formData.get('description') as string,
                        createdBy: currentUser._id,
                        members: [currentUser._id],
                        repeatType: RepeatType.DAILY,
                        repeatDays: [0,1,2,3,4,5,6],
                        reminderTime: '08:00',
                        pointsReward: parseInt(formData.get('points') as string),
                        penaltyPoints: parseInt(formData.get('penalty') as string),
                    });
                    setIsNewActivityModalOpen(false);
                    await loadData(currentUser._id);
                }}>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Protocol Identifier</label>
                        <input name="name" required placeholder="Habit Designation..." className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-800 font-black text-lg" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Specifications</label>
                        <textarea name="description" rows={3} placeholder="Define rules of engagement..." className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-800 font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] ml-1">Reward Payload</label>
                            <div className="relative">
                                <Icons.Trophy className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-yellow-500" />
                                <input name="points" type="number" defaultValue={50} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 pl-16 focus:border-emerald-600 outline-none transition-all font-black text-xl text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] ml-1">Failure Penalty</label>
                            <div className="relative">
                                <Icons.X className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-rose-500" />
                                <input name="penalty" type="number" defaultValue={25} className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 pl-16 focus:border-rose-600 outline-none transition-all font-black text-xl text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="pt-6">
                        <button type="submit" disabled={loading} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl transition-all transform hover:-translate-y-1 text-xs">
                           {loading ? 'COMMITTING TO NO-SQL...' : 'INITIALIZE FORGE'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showSuccess && currentUser && (
        <SuccessOverlay 
          user={currentUser} 
          pointsGained={lastGained} 
          previousPoints={prevPoints}
          onClose={() => setShowSuccess(false)} 
        />
      )}
    </Layout>
  );
};

export default App;
