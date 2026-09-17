import React, { useEffect, useState } from 'react';

interface LivesProps {
  lives: number;
  maxLives: number;
}

export const Lives: React.FC<LivesProps> = ({ lives, maxLives }) => {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  // Trigger subtle micro-animation when a life is lost
  useEffect(() => {
    if (lives < maxLives && lives >= 0) {
      setAnimatingIndex(lives);
      const timer = setTimeout(() => setAnimatingIndex(null), 350);
      return () => clearTimeout(timer);
    }
  }, [lives, maxLives]);

  return (
    <div
      className="lives-indicator"
      role="status"
      aria-label={`${lives} of ${maxLives} chances remaining`}
      title={`${lives} chances remaining`}
    >
      {Array.from({ length: maxLives }).map((_, i) => {
        const isFilled = i < lives;
        const isAnimating = i === animatingIndex;

        return (
          <span
            key={i}
            className={`heart-pip ${isFilled ? 'heart-alive' : 'heart-spent'} ${
              isAnimating ? 'heart-lost-pop' : ''
            }`}
            aria-hidden="true"
          >
            {isFilled ? '♥' : '♡'}
          </span>
        );
      })}
    </div>
  );
};