import React from 'react';
import { getGateById } from '../data/Gates';

interface GoalProps {
  isWon?: boolean;
  gateId?: string;
  gateState?: 'idle' | 'activating' | 'entering' | 'completed';
}

export const Goal: React.FC<GoalProps> = ({
  isWon = false,
  gateId = 'classic_gate',
  gateState = 'idle'
}) => {
  const gate = getGateById(gateId);
  const particleAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const isActivating = gateState === 'activating';
  const isEntering = gateState === 'entering';
  const isCompleted = gateState === 'completed' || isWon;

  const renderGateVisual = () => {
    switch (gateId) {
      case 'portal_gate':
        return (
          <div className="gate-art gate-portal-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1.5" strokeDasharray="4 3" className="portal-outer-ring" />
              <circle cx="20" cy="20" r="13" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="12 6" className="portal-mid-ring" />
              <circle cx="20" cy="20" r="8" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" strokeWidth="1.5" className="portal-inner-ring" />
              <circle cx="20" cy="20" r="4" fill="#f0abfc" className="portal-singularity" />
            </svg>
          </div>
        );

      case 'crystal_gate':
        return (
          <div className="gate-art gate-crystal-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.5" />
              {/* Prismatic Octahedron / Diamond */}
              <polygon points="20,4 33,17 20,36 7,17" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" strokeWidth="2" className="crystal-facet-outer" />
              <polygon points="20,8 29,18 20,30 11,18" fill="rgba(110, 231, 183, 0.35)" stroke="#6ee7b7" strokeWidth="1.5" className="crystal-facet-inner" />
              <polygon points="20,13 25,19 20,25 15,19" fill="#ecfdf5" className="crystal-core" />
            </svg>
          </div>
        );

      case 'energy_gate':
        return (
          <div className="gate-art gate-energy-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" strokeDasharray="2 4" className="energy-containment-1" />
              <circle cx="20" cy="20" r="14" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="8 4 2 4" className="energy-containment-2" />
              <path d="M14 20 L20 12 L19 19 L26 19 L20 28 L21 21 Z" fill="#67e8f9" className="energy-arc-glyph" />
            </svg>
          </div>
        );

      case 'galaxy_gate':
        return (
          <div className="gate-art gate-galaxy-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1.5" />
              <path d="M20 5 C28 5 35 12 35 20 C35 27 29 32 23 32 C17 32 12 28 12 22 C12 17 16 14 20 14 C23 14 25 16 25 19 C25 21 23 22 21 22" 
                fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" className="galaxy-spiral-1" />
              <circle cx="20" cy="20" r="5" fill="#f43f5e" className="galaxy-core-star" />
              <circle cx="29" cy="14" r="1.5" fill="#fff" className="galaxy-starlet-1" />
              <circle cx="11" cy="26" r="1.5" fill="#67e8f9" className="galaxy-starlet-2" />
            </svg>
          </div>
        );

      case 'flame_gate':
        return (
          <div className="gate-art gate-flame-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(249, 115, 22, 0.35)" strokeWidth="1.5" />
              {/* Solar Flare Corona */}
              <path d="M20 5 C25 12 32 15 32 24 C32 31 26 36 20 36 C14 36 8 31 8 24 C8 15 15 12 20 5 Z" 
                fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="1.5" className="flame-outer" />
              <path d="M20 11 C23 16 28 18 28 24 C28 29 24 33 20 33 C16 33 12 29 12 24 C12 18 17 16 20 11 Z" 
                fill="rgba(249, 115, 22, 0.6)" stroke="#f97316" strokeWidth="1.5" className="flame-inner" />
              <circle cx="20" cy="25" r="4" fill="#fef08a" className="flame-hearth" />
            </svg>
          </div>
        );

      case 'nature_gate':
        return (
          <div className="gate-art gate-nature-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="1.5" strokeDasharray="6 3" />
              {/* Botanical Rune Leaf Crest */}
              <path d="M20 6 C28 10 32 18 28 27 C24 32 16 32 12 27 C8 18 12 10 20 6 Z" fill="rgba(34, 197, 94, 0.25)" stroke="#22c55e" strokeWidth="2" className="nature-petal" />
              <circle cx="20" cy="20" r="7" fill="none" stroke="#86efac" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="3.5" fill="#4ade80" className="nature-seed" />
            </svg>
          </div>
        );

      case 'cyber_gate':
        return (
          <div className="gate-art gate-cyber-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              {/* Hexagonal cyber HUD */}
              <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" className="cyber-hex-outer" />
              <polygon points="20,9 30,15 30,25 20,31 10,25 10,15" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" className="cyber-hex-inner" />
              {/* Crosshair reticle */}
              <line x1="20" y1="12" x2="20" y2="28" stroke="#84cc16" strokeWidth="1.5" />
              <line x1="12" y1="20" x2="28" y2="20" stroke="#84cc16" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="3" fill="#a3e635" />
            </svg>
          </div>
        );

      case 'star_gate':
        return (
          <div className="gate-art gate-star-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1.5" strokeDasharray="4 2 8 2" className="stargate-ring" />
              {/* 8-pointed celestial star */}
              <polygon points="20,5 23,15 33,15 25,21 28,31 20,25 12,31 15,21 7,15 17,15" fill="rgba(245, 158, 11, 0.4)" stroke="#f59e0b" strokeWidth="1.5" className="stargate-star" />
              <circle cx="20" cy="20" r="4" fill="#fffbeb" className="stargate-core" />
            </svg>
          </div>
        );

      case 'void_gate':
        return (
          <div className="gate-art gate-void-art">
            <svg viewBox="0 0 40 40" className="gate-svg" width="100%" height="100%">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="1.5" />
              <circle cx="20" cy="20" r="13" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" className="void-event-horizon" />
              <circle cx="20" cy="20" r="8" fill="#0b0f19" stroke="#c084fc" strokeWidth="1.5" className="void-singularity" />
              <circle cx="20" cy="20" r="3" fill="#e0e7ff" className="void-quantum-core" />
            </svg>
          </div>
        );

      case 'classic_gate':
      default:
        return (
          <div className="gate-art gate-classic-art">
            <div className="goal-ring" />
            <div className="goal-core" />
          </div>
        );
    }
  };

  return (
    <div
      className={`goal-node gate-node gate-type-${gateId} ${
        isActivating ? 'gate-activating' : ''
      } ${isEntering ? 'gate-entering' : ''} ${
        isCompleted ? 'gate-completed goal-won' : ''
      }`}
      aria-label={`${gate.name} target`}
      style={{
        '--gate-theme': gate.themeColor,
        '--gate-accent': gate.accentColor
      } as React.CSSProperties}
    >
      {/* Outer High-Readability Boundary Rim */}
      <div className="gate-perimeter-rim" />

      {/* Bespoke Cosmetic Gate Artwork */}
      {renderGateVisual()}

      {/* 5-Stage Completion Effect: Radial Particle Trajectories & Shockwave */}
      {isCompleted && (
        <div className="goal-particles" aria-hidden="true">
          {particleAngles.map((angle, idx) => (
            <span
              key={idx}
              className="goal-particle gate-particle"
              style={{
                '--p-angle': `${angle}deg`,
                '--p-dist': `${30 + (idx % 2) * 14}px`,
                '--p-delay': `${(idx % 3) * 0.04}s`,
                '--p-color': idx % 2 === 0 ? gate.themeColor : gate.accentColor
              } as React.CSSProperties}
            />
          ))}
          <div
            className="goal-shockwave gate-shockwave"
            style={{
              borderColor: gate.accentColor
            }}
          />
        </div>
      )}
    </div>
  );
};