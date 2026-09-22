import React, { useRef, useEffect } from 'react';
import type { Direction } from '../game/types';
import './Touchpad.css';
import { StorageService } from '../services/StorageService';

interface TouchpadProps {
  onMove: (dir: Direction) => void;
  levelId: number;
  equippedSkin: string;
}

export const Touchpad: React.FC<TouchpadProps> = ({ onMove, levelId, equippedSkin }) => {
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const storage = StorageService.getInstance();
  const tutorialSeen = storage.getTouchpadTutorialSeen();

  // Show tutorial if they haven't seen it and it's level 1
  const showTutorial = levelId === 1 && !tutorialSeen;

  useEffect(() => {
    // If they interact with it while the tutorial is showing, mark it as seen
    const markSeen = () => {
      if (showTutorial) {
        storage.setTouchpadTutorialSeen();
      }
    };
    
    // We attach this to document mouse/touch so any interaction clears it
    document.addEventListener('pointerdown', markSeen, { once: true });
    return () => document.removeEventListener('pointerdown', markSeen);
  }, [showTutorial, storage]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only care about primary pointer
    if (!e.isPrimary) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!e.isPrimary || !isDraggingRef.current || !touchStartRef.current) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isDraggingRef.current = false;

    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minSwipeDistance = 15; // Fairly sensitive on a small pad

    if (Math.max(absX, absY) > minSwipeDistance) {
      if (absX > absY) {
        onMove(deltaX > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onMove(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }

    touchStartRef.current = null;
  };

  // Prevent default drag behaviors
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault(); 
    }
  };

  return (
    <div 
      className={`touchpad-container skin-${equippedSkin}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerUp}
      role="button"
      aria-label="Swipe Touchpad"
    >
      {showTutorial && (
        <div className="tutorial-finger">👆</div>
      )}
    </div>
  );
};
