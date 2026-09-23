export type NotificationType = 'unfinished' | 'daily' | 'comeback' | 'achievement' | 'stage';

export interface NotificationCopy {
  title: string;
  body: string;
}

const UNFINISHED_MESSAGES = [
  { title: "Still thinking about Level {id}?", body: "Your puzzle isn't going to solve itself." },
  { title: "Level {id} is still waiting. 👀", body: "Got another move in you?" },
  { title: "You left something unfinished.", body: "Level {id} knows. 😏" },
  { title: "One puzzle. One comeback.", body: "Level {id} is waiting." },
  { title: "Your arrow stopped.", body: "Your brain doesn't have to." },
  { title: "Think you can crack Level {id} now?", body: "Give it another shot." },
  { title: "Hey… Level {id} called. 📞", body: "It wants a rematch." },
  { title: "We need to talk about Level {id}. 👀", body: "That puzzle is still unsolved." },
  { title: "You really left Level {id} like that? 😭", body: "Come back and finish it." },
  { title: "Level {id} wasn't ready for you.", body: "Or maybe you weren't ready for Level {id}. 👀" },
  { title: "Your move.", body: "Level {id} is waiting." },
  { title: "{id} is waiting.", body: "Make your move." },
  { title: "One more attempt?", body: "Level {id} awaits." },
  { title: "Think. Move. Solve.", body: "Level {id} is still open." }
];

const DAILY_MESSAGES = [
  { title: "Today's puzzle just dropped. 🧩", body: "Your move." },
  { title: "New day. New puzzle.", body: "Can you solve it?" },
  { title: "Your daily challenge is waiting.", body: "Don't let today's puzzle beat you." },
  { title: "A fresh puzzle awaits.", body: "Think you can crack it?" },
  { title: "Today has one puzzle with your name on it. 👀", body: "Can you beat the clock?" },
  { title: "3 minutes? 5 minutes?", body: "Today's puzzle is ready." },
  { title: "Your daily brain workout is here. 🧠", body: "Time to stretch those neurons." },
  { title: "One puzzle. One day. One chance.", body: "Make it count." },
  { title: "Today's puzzle is ready 🧩", body: "Can you solve today's Aroow challenge?" }
];

const COMEBACK_MESSAGES = [
  { title: "Aroow misses you. 👀", body: "Your puzzles don't, though." },
  { title: "It's been a while.", body: "Ready for another move?" },
  { title: "Your arrow is getting impatient. ➡️", body: "Come back for another puzzle." },
  { title: "Remember Aroow? 🧩", body: "Your next challenge is waiting." },
  { title: "We saved your puzzles.", body: "All you have to do is return." },
  { title: "Your brain has unfinished business.", body: "Aroow is ready when you are." },
  { title: "One more puzzle?", body: "You know you want to. 👀" }
];

const ACHIEVEMENT_MESSAGES = [
  { title: "Well played. 🏆", body: "You just unlocked {title}." },
  { title: "Achievement unlocked!", body: "{title} is yours." },
  { title: "Look who's making progress. 👀", body: "You unlocked {title}." },
  { title: "Another one for the collection. ⭐", body: "Achievement unlocked: {title}." },
  { title: "You earned it. 🏆", body: "{title} unlocked." }
];

const STAGE_MESSAGES = [
  { title: "You broke through. 🔓", body: "A new stage is waiting." },
  { title: "New territory unlocked. 🗺️", body: "Ready for what's next? ({title})" },
  { title: "You've earned your next challenge.", body: "The {title} stage is open." },
  { title: "Think the last stage was hard? 👀", body: "The next one is waiting." },
  { title: "Aroow just got harder. 🔥", body: "New stage unlocked: {title}." }
];

const HISTORY_KEY = 'aroow_notif_copy_history';

export class NotificationCopyService {
  private static instance: NotificationCopyService;
  private history: Record<string, number> = {};

  private constructor() {
    this.loadHistory();
  }

  public static getInstance(): NotificationCopyService {
    if (!this.instance) {
      this.instance = new NotificationCopyService();
    }
    return this.instance;
  }

  private loadHistory() {
    try {
      const stored = window.localStorage?.getItem(HISTORY_KEY);
      if (stored) this.history = JSON.parse(stored);
    } catch { /* ignore */ }
  }

  private saveHistory() {
    try {
      window.localStorage?.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch { /* ignore */ }
  }

  private getVariant(type: NotificationType, pool: Array<{title: string, body: string}>, params: Record<string, string> = {}): NotificationCopy {
    const lastIdx = this.history[type] ?? -1;
    
    // Pick a random index that is not the last index (unless pool size is 1)
    let nextIdx = 0;
    if (pool.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * pool.length);
      } while (nextIdx === lastIdx);
    }

    this.history[type] = nextIdx;
    this.saveHistory();

    const selected = pool[nextIdx];
    let title = selected.title;
    let body = selected.body;

    // Interpolate params (e.g. {id}, {title})
    for (const [key, val] of Object.entries(params)) {
      title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }

    return { title, body };
  }

  public getUnfinishedMessage(levelId: number): NotificationCopy {
    // Treat level < 1 as endless mode
    const idStr = levelId > 0 ? levelId.toString() : "Endless Mode";
    return this.getVariant('unfinished', UNFINISHED_MESSAGES, { id: idStr });
  }

  public getDailyMessage(): NotificationCopy {
    return this.getVariant('daily', DAILY_MESSAGES);
  }

  public getComebackMessage(): NotificationCopy {
    return this.getVariant('comeback', COMEBACK_MESSAGES);
  }

  public getAchievementMessage(achievementTitle: string): NotificationCopy {
    return this.getVariant('achievement', ACHIEVEMENT_MESSAGES, { title: achievementTitle });
  }

  public getStageMessage(stageTitle: string): NotificationCopy {
    return this.getVariant('stage', STAGE_MESSAGES, { title: stageTitle });
  }
}
