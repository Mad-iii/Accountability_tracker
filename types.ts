
export enum Tier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond'
}

export interface User {
  _id: string;
  username: string;
  email: string;
  photoURL: string;
  points: number;
  tier: Tier;
  friends: string[]; // userIds
  pendingRequests: string[]; // userIds
  createdAt: number;
  currentStreak: number;
  longestStreak: number;
}

export enum RepeatType {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  CUSTOM = 'Custom'
}

export interface Activity {
  _id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[]; // userIds
  rules: string;
  repeatType: RepeatType;
  repeatDays: number[]; // 0-6
  reminderTime: string; // "HH:mm"
  pointsReward: number;
  penaltyPoints: number;
  createdAt: number;
  startDate: number;
  endDate?: number;
}

export interface Checkin {
  _id: string;
  activityId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'missed';
  pointsChange: number;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'invite' | 'friend_request' | 'reminder' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: number;
}
