export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  category: 'progression' | 'mastery' | 'challenge';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Complete first level.',
    icon: '🎯',
    target: 1,
    category: 'progression',
  },
  {
    id: 'getting_started',
    title: 'Getting Started',
    description: 'Complete 10 levels.',
    icon: '🚀',
    target: 10,
    category: 'progression',
  },
  {
    id: 'puzzle_master',
    title: 'Puzzle Master',
    description: 'Complete 100 levels.',
    icon: '🧩',
    target: 100,
    category: 'progression',
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Complete 250 levels.',
    icon: '⭐',
    target: 250,
    category: 'progression',
  },
  {
    id: 'grandmaster',
    title: 'Grandmaster',
    description: 'Complete 500 levels.',
    icon: '👑',
    target: 500,
    category: 'progression',
  },
  {
    id: 'perfect_player',
    title: 'Perfect Player',
    description: 'Get 50 three-star completions.',
    icon: '🌟',
    target: 50,
    category: 'mastery',
  },
  {
    id: 'untouchable',
    title: 'Untouchable',
    description: 'Complete 10 levels without losing a life.',
    icon: '🛡️',
    target: 10,
    category: 'challenge',
  },
  {
    id: 'speed_runner',
    title: 'Speed Runner',
    description: 'Complete a level under its target time.',
    icon: '⚡',
    target: 1,
    category: 'challenge',
  },
  {
    id: 'no_help_needed',
    title: 'No Help Needed',
    description: 'Complete 50 levels without hints.',
    icon: '🧠',
    target: 50,
    category: 'mastery',
  },
  {
    id: 'daily_player',
    title: 'Daily Player',
    description: 'Complete 7 daily challenges.',
    icon: '📅',
    target: 7,
    category: 'progression',
  },
];

export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};
