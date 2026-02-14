
import { User, Activity, Checkin, Notification, Tier, RepeatType } from '../types';

/**
 * MongoDB-style Collection class with support for operators ($set, $inc, $push)
 */
class Collection<T extends { _id: string }> {
  private key: string;

  constructor(collectionName: string) {
    this.key = `forge_mongo_${collectionName}`;
  }

  private getAll(): T[] {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  private saveAll(data: T[]) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  /**
   * MongoDB-standard find()
   */
  async find(query: any = {}): Promise<T[]> {
    await new Promise(r => setTimeout(r, 120)); // Simulate database fetch latency
    const all = this.getAll();
    return all.filter(item => {
      for (const key in query) {
        const queryVal = query[key];
        const itemVal = (item as any)[key];

        // Handle $in operator
        if (queryVal && typeof queryVal === 'object' && '$in' in queryVal) {
          if (!queryVal.$in.includes(itemVal)) return false;
          continue;
        }

        // Handle array membership (standard Mongo behavior for arrays)
        if (Array.isArray(itemVal)) {
          if (!itemVal.includes(queryVal)) return false;
          continue;
        }

        // Exact match
        if (itemVal !== queryVal) return false;
      }
      return true;
    }).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async findOne(query: any): Promise<T | null> {
    const results = await this.find(query);
    return results[0] || null;
  }

  // Fix: Cast to unknown first to allow conversion of generic T when structure is guaranteed
  async insertOne(doc: Omit<T, '_id'>): Promise<T> {
    const all = this.getAll();
    const newDoc = { 
      ...doc, 
      _id: `obj_${Math.random().toString(36).substr(2, 12)}`,
      createdAt: Date.now() 
    } as unknown as T;
    all.push(newDoc);
    this.saveAll(all);
    return newDoc;
  }

  /**
   * MongoDB-standard updateOne() with $set, $inc, $push support
   */
  async updateOne(query: any, update: any): Promise<boolean> {
    const all = this.getAll();
    const index = all.findIndex(item => {
      for (const key in query) {
        if ((item as any)[key] !== query[key]) return false;
      }
      return true;
    });

    if (index === -1) return false;
    const doc = all[index] as any;

    if (update.$set) {
      Object.assign(doc, update.$set);
    }
    if (update.$inc) {
      for (const key in update.$inc) {
        doc[key] = (doc[key] || 0) + update.$inc[key];
      }
    }
    if (update.$push) {
      for (const key in update.$push) {
        if (!Array.isArray(doc[key])) doc[key] = [];
        doc[key].push(update.$push[key]);
      }
    }
    if (update.$pull) {
      for (const key in update.$pull) {
        if (Array.isArray(doc[key])) {
          doc[key] = doc[key].filter((val: any) => val !== update.$pull[key]);
        }
      }
    }

    // Fallback for direct update
    if (!update.$set && !update.$inc && !update.$push && !update.$pull) {
      Object.assign(doc, update);
    }

    all[index] = doc;
    this.saveAll(all);
    return true;
  }

  async bulkWrite(docs: T[]): Promise<void> {
    this.saveAll(docs);
  }

  async count(): Promise<number> {
    return this.getAll().length;
  }
}

const SESSION_KEY = 'forge_session_user_id';

class MongoDatabase {
  users = new Collection<User>('users');
  activities = new Collection<Activity>('activities');
  checkins = new Collection<Checkin>('checkins');
  notifications = new Collection<Notification>('notifications');

  async seedIfEmpty() {
    const count = await this.users.count();
    if (count === 0) {
      const initialUsers: User[] = [
        {
          _id: 'user_1',
          username: 'alex_growth',
          email: 'alex@example.com',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          points: 1250,
          tier: Tier.SILVER,
          friends: ['user_2'],
          pendingRequests: [],
          createdAt: Date.now() - 86400000 * 10,
          currentStreak: 12,
          longestStreak: 45,
        },
        {
          _id: 'user_2',
          username: 'sarah_strive',
          email: 'sarah@example.com',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          points: 2100,
          tier: Tier.GOLD,
          friends: ['user_1'],
          pendingRequests: [],
          createdAt: Date.now() - 86400000 * 20,
          currentStreak: 25,
          longestStreak: 25,
        }
      ];
      await this.users.bulkWrite(initialUsers);
      
      await this.activities.insertOne({
        name: 'Deep Work Session',
        description: '90 minutes of focused coding or design.',
        createdBy: 'user_1',
        members: ['user_1', 'user_2'],
        rules: 'No phone, no social media.',
        repeatType: RepeatType.DAILY,
        repeatDays: [1, 2, 3, 4, 5],
        reminderTime: '09:00',
        pointsReward: 75,
        penaltyPoints: 40,
        startDate: Date.now(),
      });
    }
  }

  async getCurrentUser(): Promise<User | null> {
    await this.seedIfEmpty();
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return await this.users.findOne({ _id: userId });
  }

  async login(email: string): Promise<User> {
    await this.seedIfEmpty();
    let user = await this.users.findOne({ email });
    if (!user) {
      user = await this.users.insertOne({
        username: email.split('@')[0],
        email,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        points: 0,
        tier: Tier.BRONZE,
        friends: [],
        pendingRequests: [],
        createdAt: Date.now(),
        currentStreak: 0,
        longestStreak: 0,
      });
    }
    localStorage.setItem(SESSION_KEY, user._id);
    return user;
  }

  async logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  async getActivities(userId: string): Promise<Activity[]> {
    return await this.activities.find({ members: userId });
  }

  // Added missing helper method for App.tsx
  async getCheckins(userId: string): Promise<Checkin[]> {
    return await this.checkins.find({ userId });
  }

  // Added missing helper method for App.tsx
  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.notifications.find({ userId });
  }

  // Added missing helper method for App.tsx to create activities with mandatory fields
  async createActivity(activity: any): Promise<Activity> {
    if (!activity.startDate) activity.startDate = Date.now();
    if (!activity.rules) activity.rules = "Standard focus protocol.";
    return await this.activities.insertOne(activity);
  }

  async performCheckin(activityId: string, userId: string, status: 'completed' | 'missed'): Promise<number> {
    const activity = await this.activities.findOne({ _id: activityId });
    const user = await this.users.findOne({ _id: userId });
    
    if (!activity || !user) return 0;

    const pointsChange = status === 'completed' ? activity.pointsReward : -activity.penaltyPoints;

    // 1. Create Checkin document
    await this.checkins.insertOne({
      activityId,
      userId,
      date: new Date().toISOString().split('T')[0],
      status,
      pointsChange
    });

    // 2. Update User using NoSQL operators
    const newPoints = Math.max(0, user.points + pointsChange);
    let newTier = Tier.BRONZE;
    if (newPoints >= 8000) newTier = Tier.DIAMOND;
    else if (newPoints >= 4000) newTier = Tier.PLATINUM;
    else if (newPoints >= 1500) newTier = Tier.GOLD;
    else if (newPoints >= 500) newTier = Tier.SILVER;

    await this.users.updateOne({ _id: userId }, {
      $set: { tier: newTier },
      $inc: { points: pointsChange, currentStreak: status === 'completed' ? 1 : -user.currentStreak }
    });

    return pointsChange;
  }

  async sendFriendRequest(fromId: string, toId: string) {
    await this.users.updateOne({ _id: toId }, {
      $push: { pendingRequests: fromId }
    });
    await this.notifications.insertOne({
      userId: toId,
      type: 'friend_request',
      title: 'New Ally Request',
      message: 'Someone wants to forge habits with you.',
      read: false,
      createdAt: Date.now()
    });
  }
}

export const store = new MongoDatabase();
