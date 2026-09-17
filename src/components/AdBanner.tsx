import React, { useEffect, useState } from 'react';
import { AdService } from '../services/AdService';
import './AdBanner.css';

interface AdBannerProps {
  /** Whether to render the banner. Defaults to true. */
  visible?: boolean;
}

/**
 * AdBanner — Optional non-intrusive banner ad placeholder.
 * Rendered ONLY on non-gameplay screens (HomeScreen, LevelSelect).
 * On web: renders a styled placeholder with "SPONSORED" tag.
 * On native: a Capacitor banner ad occupies this slot.
 * Respects ads-disabled flag — renders nothing when ads are off.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ visible = true }) => {
  const adService = AdService.getInstance();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible || !adService.isEnabled()) {
      setShow(false);
      return;
    }
    // Slight delay to avoid flash during navigation transitions
    const timer = setTimeout(() => setShow(true), 300);
    adService.showBannerAd();
    return () => {
      clearTimeout(timer);
      adService.hideBannerAd();
    };
  }, [visible, adService]);

  if (!show) return null;

  return (
    <div className="ad-banner-container" role="complementary" aria-label="Advertisement">
      <div className="ad-banner-inner">
        <span className="ad-banner-tag">SPONSORED</span>
        <div className="ad-banner-content">
          <div className="ad-banner-placeholder-text">
            Advertisement
          </div>
        </div>
      </div>
    </div>
  );
};
