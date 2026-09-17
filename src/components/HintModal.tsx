import React, { useState } from 'react';
import { AdService } from '../services/AdService';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import './HintModal.css';

interface HintModalProps {
  onClose: () => void;
  onApplyHint: (level: 1 | 2 | 3) => void;
}

export const HintModal: React.FC<HintModalProps> = ({ onClose, onApplyHint }) => {
  const [adLoading, setAdLoading] = useState<number | null>(null);
  const [adError, setAdError] = useState<string | null>(null);
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();
  const adService = AdService.getInstance();

  const handleSelectHint = (level: 1 | 2 | 3) => {
    if (adLoading !== null) return;
    audio.playButton();
    haptics.button();

    // In dev mode, we can test ad logic, but if ads are totally disabled,
    // we bypass entirely for the sake of playability (if requested).
    // The AdService handles bypass logic if ads are disabled globally.
    setAdLoading(level);
    setAdError(null);

    adService.showRewardedHint(
      () => {
        // Success
        setAdLoading(null);
        onApplyHint(level);
        onClose();
      },
      () => {
        // Failure
        setAdLoading(null);
        setAdError('Ad unavailable. Please try again later.');
      }
    );
  };

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="hint-modal-title" aria-modal="true">
      <div className="modal-card hint-modal">
        <span className="modal-eyebrow" style={{ color: 'var(--accent-amber, #FBBF24)' }}>NEED HELP?</span>
        <h2 id="hint-modal-title" className="modal-title">Intelligent Hints</h2>
        <p className="modal-subtitle">Watch a short ad to reveal the path. Using hints will reduce your final score.</p>
        
        {adError && (
          <div className="ad-error-banner" role="alert" onClick={() => setAdError(null)}>
            {adError}
          </div>
        )}

        <div className="hint-options">
          <button 
            className="hint-option-btn" 
            disabled={adLoading !== null}
            onClick={() => handleSelectHint(1)}
          >
            <div className="hint-option-header">
              <span className="hint-option-title">Next Step</span>
              <span className="hint-option-penalty">-10% Points</span>
            </div>
            <div className="hint-option-desc">Highlights the immediate next correct tile. (Max 3 Stars)</div>
            {adLoading === 1 && <span className="hint-loading-text">Loading Ad...</span>}
          </button>

          <button 
            className="hint-option-btn" 
            disabled={adLoading !== null}
            onClick={() => handleSelectHint(2)}
          >
            <div className="hint-option-header">
              <span className="hint-option-title">Next Few Steps</span>
              <span className="hint-option-penalty">-25% Points</span>
            </div>
            <div className="hint-option-desc">Highlights the next 3 correct tiles. (Max 2 Stars)</div>
            {adLoading === 2 && <span className="hint-loading-text">Loading Ad...</span>}
          </button>

          <button 
            className="hint-option-btn" 
            disabled={adLoading !== null}
            onClick={() => handleSelectHint(3)}
          >
            <div className="hint-option-header">
              <span className="hint-option-title">Full Path</span>
              <span className="hint-option-penalty">-50% Points</span>
            </div>
            <div className="hint-option-desc">Reveals the complete solution to the goal. (Max 1 Star)</div>
            {adLoading === 3 && <span className="hint-loading-text">Loading Ad...</span>}
          </button>
        </div>

        <div className="modal-actions" style={{ marginTop: '16px', width: '100%' }}>
          <button 
            className="btn-secondary" 
            onClick={() => {
              if (adLoading !== null) return;
              audio.playButton();
              haptics.button();
              onClose();
            }}
            disabled={adLoading !== null}
            style={{ width: '100%' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
