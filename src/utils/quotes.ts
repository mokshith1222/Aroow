/**
 * Motivational Quotes System
 * Deterministically selects a motivational quote based on the level ID and player outcome.
 */

const CATEGORIES = {
  // Category A - Starting/Tutorial
  A: [
    "Your first challenge begins.",
    "Take your first step toward mastery.",
    "Every expert starts with one move.",
    "Your puzzle journey starts here.",
    "Learn the mechanics. Master the board.",
    "A simple path to start.",
    "Get comfortable. The real challenge comes later.",
    "Every grandmaster was once a beginner.",
    "Find the shortest route right from the start.",
    "Observe. Think. Move."
  ],
  // Category B - Early Levels
  B: [
    "You're learning the board. Now sharpen your path.",
    "Every move teaches you something new.",
    "Think ahead and keep moving.",
    "The arrow only goes where you tell it to.",
    "A solid foundation builds perfect runs.",
    "Don't just clear it. Optimize it.",
    "Visualize the finish line.",
    "Every obstacle is a stepping stone.",
    "Keep your eyes on the target.",
    "Smooth and steady finds the best route.",
    "Look for the hidden efficiency.",
    "Trust your instincts, but verify your path."
  ],
  // Category C - Medium Levels
  C: [
    "The easy routes are disappearing. Think smarter.",
    "Your instincts got you here. Strategy takes you further.",
    "Every turn matters now.",
    "Don't rush the arrow. Master the path.",
    "Find the path others miss.",
    "Challenge your route. Challenge yourself.",
    "Precision beats speed.",
    "One better route is waiting to be discovered.",
    "Think less about the destination. Master every move.",
    "The shortest path is waiting for you.",
    "Small improvements create perfect runs.",
    "Your moves tell the story. Make every one count.",
    "Every puzzle teaches you something. Use it.",
    "A good run is nice. A perfect run is better."
  ],
  // Category D - Hard Levels
  D: [
    "One careless move can change everything.",
    "Think twice. Move once.",
    "Precision is your greatest weapon.",
    "The shortest route won't reveal itself easily.",
    "Master the pattern. Own the level.",
    "Think. Plan. Move. Conquer.",
    "Don't follow the obvious path. Find the perfect one.",
    "Every obstacle is part of the solution.",
    "The board has a secret. Can you find it?",
    "Your next move could change everything.",
    "Stay focused. The perfect route exists.",
    "Challenge accepted. Now beat your target.",
    "Complexity is just simplicity waiting to be unraveled.",
    "Only the focused mind finds the true optimal.",
    "Calculate carefully. The margin for error is shrinking."
  ],
  // Category E - Advanced Levels
  E: [
    "Welcome to the territory of true precision.",
    "Only careful planning will reveal the path.",
    "Your next move must have a reason.",
    "Mastery begins where guessing ends.",
    "Every move has a purpose. Find yours.",
    "Three stars are earned by precision.",
    "Great players don't just finish. They optimize.",
    "Level cleared. Skill tested. Next challenge.",
    "Three stars are waiting for precision.",
    "Your journey continues. The next puzzle awaits.",
    "A masterpiece of pathfinding is required.",
    "Leave nothing to chance.",
    "The optimal path is hidden in plain sight.",
    "Solve the maze in your mind first.",
    "True skill is finding the shortest path when it's hidden."
  ],
  // Category F - Very High Levels
  F: [
    "You've come this far. Now prove your mastery.",
    "The board is harder. Your thinking must be sharper.",
    "Every move matters.",
    "Only the best route will survive this challenge.",
    "Grandmaster territory. Every move must count.",
    "You've mastered hundreds of paths. Now solve the impossible-looking one.",
    "The board won't give you the answer. Earn it.",
    "Only precision remains.",
    "Your experience brought you here. Your strategy will take you further.",
    "The line between success and failure is one move.",
    "Flawless execution is the only way.",
    "Nothing is impossible for the master pathfinder.",
    "An elegant solution to a chaotic board.",
    "Focus. Breathe. Optimize.",
    "This is what you trained for."
  ],
  // Category G - Perfect Score (3 stars)
  G: [
    "You found the perfect route.",
    "That was flawless.",
    "Every move was exactly where it needed to be.",
    "Perfect path. Perfect execution.",
    "You didn't just win. You mastered it.",
    "Optimal efficiency achieved.",
    "A masterclass in pathfinding.",
    "Not a single wasted move.",
    "You solved it the way it was meant to be solved.",
    "Absolute perfection.",
    "That is how a champion plays.",
    "The solver couldn't have done it better.",
    "An undeniably perfect run.",
    "Flawless logic. Flawless execution.",
    "You saw the matrix on this one."
  ],
  // Category H - Missed Target (1 or 2 stars)
  H: [
    "You cleared it. Now chase perfection.",
    "Victory achieved. Can you do it in fewer moves?",
    "You're close. Find the hidden shortcut.",
    "Good run. Now optimize it.",
    "The finish is yours. The perfect route is next.",
    "Level cleared. Can you find a shorter route?",
    "Only a few moves away from perfection!",
    "You survived, but the optimal path is still out there.",
    "Well done. Now try it with fewer steps.",
    "A safe route taken. Now take the efficient one.",
    "Finished? Now beat your own record.",
    "Your path can be better. Find it.",
    "Can you turn this win into a perfect score?",
    "One better route is waiting to be discovered."
  ],
  // Category I - Retry / Failed
  I: [
    "One more attempt. One better decision.",
    "Now you know the board. Use that knowledge.",
    "Your next run can be better.",
    "Reset your strategy, not your determination.",
    "Try again. Think differently.",
    "Your next attempt could be your perfect run.",
    "One more try. One fewer move.",
    "Your best run may be one attempt away.",
    "Failure is just data for your next run.",
    "The optimal path is still waiting.",
    "Breathe. Reset. Conquer.",
    "Analyze your mistake and optimize.",
    "A wrong move is just a lesson learned."
  ]
};

/**
 * Get a deterministic quote for a given level and outcome.
 *
 * @param levelId The ID of the level
 * @param stars The number of stars earned (0 if failed/retry, or -1 for pre-level)
 * @returns A motivational string
 */
export function getMotivationalQuote(levelId: number, stars: number = -1): string {
  let pool: string[] = [];

  if (stars === 3) {
    pool = CATEGORIES.G;
  } else if (stars === 1 || stars === 2) {
    pool = CATEGORIES.H;
  } else if (stars === 0) {
    pool = CATEGORIES.I;
  } else {
    // Before the level starts
    if (levelId <= 25) pool = CATEGORIES.A.concat(CATEGORIES.B);
    else if (levelId <= 75) pool = CATEGORIES.C;
    else if (levelId <= 150) pool = CATEGORIES.D;
    else if (levelId <= 250) pool = CATEGORIES.E;
    else pool = CATEGORIES.F;
  }

  if (!pool || pool.length === 0) {
    return "Every move has a purpose. Find yours.";
  }

  // Use a predictable pseudo-random index so the same level/star combo always gives the same quote
  const seed = levelId * 31 + (stars >= 0 ? stars : 99) * 17;
  const index = seed % pool.length;
  
  return pool[index];
}
