
import React from 'react';
import { Activity, Checkin } from '../types';
import { Icons } from '../constants';

interface ActivityCardProps {
  activity: Activity;
  checkins: Checkin[];
  onCheckin: (status: 'completed' | 'missed') => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, checkins, onCheckin }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayCheckin = checkins.find(c => c.activityId === activity._id && c.date === today);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-5 rounded-2xl hover:border-slate-600 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{activity.name}</h3>
          <p className="text-sm text-slate-400 line-clamp-1">{activity.description}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-700">
           <Icons.Fire className="w-4 h-4 text-orange-500" />
           <span className="text-xs font-bold text-orange-500">12</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-6">
        <div className="flex items-center gap-1">
          <Icons.Users className="w-3.5 h-3.5" />
          <span>{activity.members.length} participants</span>
        </div>
        <div className="flex items-center gap-1">
          <Icons.Trophy className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-yellow-500">+{activity.pointsReward} pts</span>
        </div>
      </div>

      {todayCheckin ? (
        <div className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold ${
          todayCheckin.status === 'completed' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {todayCheckin.status === 'completed' ? (
            <><Icons.Check className="w-5 h-5" /> Completed</>
          ) : (
            <><Icons.X className="w-5 h-5" /> Missed Today</>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onCheckin('completed')}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
          >
            <Icons.Check className="w-5 h-5" />
            Done
          </button>
          <button
            onClick={() => onCheckin('missed')}
            className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-rose-600 text-white rounded-xl font-bold transition-all"
          >
            <Icons.X className="w-5 h-5" />
            Miss
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
