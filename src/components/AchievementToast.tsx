import React, { useState, useEffect, useRef } from 'react';
import { AchievementService } from '../services/AchievementService';
import type { Achievement } from '../data/achievements';
import './AchievementToast.css';

export const AchievementToast: React.FC = () => {
  const [currentToast, setCurrentToast] = useState<Achievement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const queueRef = useRef<Achievement[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const service = AchievementService.getInstance();
    
    const unsubscribe = service.subscribe((achievement: Achievement) => {
      queueRef.current.push(achievement);
      processQueue();
    });

    const processQueue = () => {
      if (isVisible || queueRef.current.length === 0) return;

      const next = queueRef.current.shift();
      if (!next) return;

      setCurrentToast(next);
      setIsVisible(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // Wait for exit animation to finish before showing the next one
        setTimeout(() => {
          setCurrentToast(null);
          processQueue();
        }, 400);
      }, 3500);
    };

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);

  if (!currentToast) return null;

  return (
    <div
      className={`achievement-toast-container ${isVisible ? 'toast-enter' : 'toast-exit'}`}
      role="status"
      aria-live="polite"
      onClick={() => setIsVisible(false)}
    >
      <div className="achievement-toast-card">
        <div className="achievement-toast-icon-wrap">
          <span className="achievement-toast-icon">{currentToast.icon}</span>
        </div>
        <div className="achievement-toast-content">
          <span className="achievement-toast-badge">ACHIEVEMENT UNLOCKED</span>
          <h4 className="achievement-toast-title">{currentToast.title}</h4>
          <p className="achievement-toast-desc">{currentToast.description}</p>
        </div>
      </div>
    </div>
  );
};
