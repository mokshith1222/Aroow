import React, { useState } from 'react';
import { StorageService } from '../services/StorageService';
import { AudioService } from '../services/AudioService';
import { HapticService } from '../services/HapticService';
import { UNIFIED_COSMETICS, getCosmeticById } from '../data/InventoryRegistry';
import type { CosmeticCategory, CosmeticItem } from '../data/InventoryTypes';
import { Goal } from './Goal';

interface ShopScreenProps {
  onBack: () => void;
  initialMode?: ViewMode;
  initialTab?: CosmeticCategory | 'ALL';
  previewTheme?: string | null;
  onPreviewTheme?: (themeId: string | null) => void;
  previewBackground?: string | null;
  onPreviewBackground?: (bgId: string | null) => void;
}

type ViewMode = 'SHOP' | 'INVENTORY';

export const ShopScreen: React.FC<ShopScreenProps> = ({
  onBack,
  initialMode = 'SHOP',
  initialTab = 'ALL',
  previewTheme = null,
  onPreviewTheme,
  previewBackground = null,
  onPreviewBackground
}) => {
  const storage = StorageService.getInstance();
  const audio = AudioService.getInstance();
  const haptics = HapticService.getInstance();

  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory | 'ALL'>(initialTab);
  const [points, setPoints] = useState<number>(storage.getCurrentPoints());

  // Current loadout
  const [equippedChars, setEquippedChars] = useState<string>(storage.getEquippedCharacter());
  const [equippedGates, setEquippedGates] = useState<string>(storage.getEquippedGate());
  const [equippedBackgrounds, setEquippedBackgrounds] = useState<string>(storage.getEquippedBackground());
  const [equippedThemes, setEquippedThemes] = useState<string>(storage.getEquippedTheme());

  // Owned tracking version to trigger re-renders on purchases/equips
  const [ownedVersion, setOwnedVersion] = useState<number>(0);

  const getEquippedId = (category: CosmeticCategory): string => {
    switch (category) {
      case 'CHARACTERS': return equippedChars;
      case 'GATES': return equippedGates;
      case 'BACKGROUNDS': return equippedBackgrounds;
      case 'THEMES': return equippedThemes;
    }
  };

  const handleEquip = (item: CosmeticItem) => {
    if (storage.isOwned(item.category, item.id)) {
      audio.playButton();
      haptics.light();
      storage.equipItem(item.category, item.id);
      
      switch (item.category) {
        case 'CHARACTERS': setEquippedChars(item.id); break;
        case 'GATES': setEquippedGates(item.id); break;
        case 'BACKGROUNDS': 
          setEquippedBackgrounds(item.id);
          if (onPreviewBackground) onPreviewBackground(null);
          break;
        case 'THEMES': 
          setEquippedThemes(item.id);
          if (onPreviewTheme) onPreviewTheme(null);
          break;
      }
      setOwnedVersion(v => v + 1);
    }
  };

  const handlePurchase = (item: CosmeticItem) => {
    if (points >= item.price && !storage.isOwned(item.category, item.id)) {
      audio.playWin();
      haptics.win();
      const success = storage.unlockItem(item.category, item.id, item.price);
      if (success) {
        setPoints(storage.getCurrentPoints());
        setOwnedVersion(v => v + 1);
      }
    } else {
      haptics.invalid();
    }
  };

  const handlePreview = (item: CosmeticItem) => {
    audio.playButton();
    haptics.light();
    if (item.category === 'THEMES' && onPreviewTheme) {
      onPreviewTheme(previewTheme === item.id ? null : item.id);
    } else if (item.category === 'BACKGROUNDS' && onPreviewBackground) {
      onPreviewBackground(previewBackground === item.id ? null : item.id);
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return '#c084fc';
      case 'Epic': return '#f59e0b';
      case 'Rare': return '#38bdf8';
      case 'Uncommon': return '#34d399';
      case 'Common':
      default: return '#94a3b8';
    }
  };

  // Filter items based on current view mode and selected category
  const filteredItems = UNIFIED_COSMETICS.filter(item => {
    const categoryMatch = selectedCategory === 'ALL' || item.category === selectedCategory;
    if (!categoryMatch) return false;
    if (viewMode === 'INVENTORY') {
      return storage.isOwned(item.category, item.id);
    }
    return true;
  });

  // Calculate inventory collection stats
  const totalItemsCount = UNIFIED_COSMETICS.length;
  const ownedCount = UNIFIED_COSMETICS.filter(i => storage.isOwned(i.category, i.id)).length;

  const equippedCharItem = getCosmeticById(equippedChars);
  const equippedGateItem = getCosmeticById(equippedGates);
  const equippedBgItem = getCosmeticById(equippedBackgrounds);
  const equippedThemeItem = getCosmeticById(equippedThemes);

  return (
    <div className="screen-container shop-screen" key={ownedVersion}>
      {/* Settings / Screen Header */}
      <div className="settings-header">
        <button
          className="btn-icon"
          onClick={() => {
            audio.playButton();
            haptics.button();
            if (onPreviewTheme) onPreviewTheme(null);
            if (onPreviewBackground) onPreviewBackground(null);
            onBack();
          }}
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="settings-title">{viewMode === 'SHOP' ? 'COSMETIC SHOP' : 'INVENTORY'}</h1>
        <div className="shop-points" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
          <span className="star-char" style={{marginRight: '6px'}}>💎</span>
          <span>{points}</span>
        </div>
      </div>

      {/* Mode Switcher: SHOP vs INVENTORY */}
      <div style={{
        display: 'flex',
        padding: '0 20px 10px',
        gap: '8px'
      }}>
        <button
          className={`shop-tab-btn ${viewMode === 'SHOP' ? 'active' : ''}`}
          style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '13px' }}
          onClick={() => {
            audio.playButton();
            haptics.light();
            setViewMode('SHOP');
          }}
        >
          🛒 SHOP
        </button>
        <button
          className={`shop-tab-btn ${viewMode === 'INVENTORY' ? 'active' : ''}`}
          style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '13px' }}
          onClick={() => {
            audio.playButton();
            haptics.light();
            setViewMode('INVENTORY');
          }}
        >
          🎒 INVENTORY ({ownedCount}/{totalItemsCount})
        </button>
      </div>

      {/* EQUIPPED LOADOUT SHOWCASE BAR */}
      <div style={{
        margin: '0 20px 12px',
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '12px 14px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
            ⚡ EQUIPPED LOADOUT
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Tap slot to filter
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}>
          {/* Slot 1: Character */}
          <div
            onClick={() => setSelectedCategory('CHARACTERS')}
            style={{
              background: selectedCategory === 'CHARACTERS' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-surface-elevated)',
              border: selectedCategory === 'CHARACTERS' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px', height: '22px', display: 'flex', alignItems: 'center' }}>
              {equippedCharItem?.id === 'classic_arrow' ? '➔' : (equippedCharItem?.icon || '➔')}
            </span>
            <span style={{ fontSize: '9px', fontWeight: '600', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {equippedCharItem?.name || 'Arrow'}
            </span>
          </div>

          {/* Slot 2: Gate */}
          <div
            onClick={() => setSelectedCategory('GATES')}
            style={{
              background: selectedCategory === 'GATES' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-surface-elevated)',
              border: selectedCategory === 'GATES' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px', height: '22px', display: 'flex', alignItems: 'center' }}>
              {equippedGateItem?.icon || '⌖'}
            </span>
            <span style={{ fontSize: '9px', fontWeight: '600', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {equippedGateItem?.name || 'Gate'}
            </span>
          </div>

          {/* Slot 3: Background */}
          <div
            onClick={() => setSelectedCategory('BACKGROUNDS')}
            style={{
              background: selectedCategory === 'BACKGROUNDS' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-surface-elevated)',
              border: selectedCategory === 'BACKGROUNDS' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px', height: '22px', display: 'flex', alignItems: 'center' }}>
              {equippedBgItem?.icon || '◫'}
            </span>
            <span style={{ fontSize: '9px', fontWeight: '600', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {equippedBgItem?.name || 'Clean'}
            </span>
          </div>

          {/* Slot 4: Theme */}
          <div
            onClick={() => setSelectedCategory('THEMES')}
            style={{
              background: selectedCategory === 'THEMES' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-surface-elevated)',
              border: selectedCategory === 'THEMES' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              margin: '4px 0',
              background: equippedThemeItem?.themeColor || '#00e5ff',
              boxShadow: `0 0 6px ${equippedThemeItem?.themeColor || '#00e5ff'}`
            }} />
            <span style={{ fontSize: '9px', fontWeight: '600', marginTop: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {equippedThemeItem?.name || 'Classic'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Preview Banner (Theme or Background) */}
      {(previewTheme || previewBackground) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--accent-primary-dim)',
          border: '1px solid var(--accent-primary)',
          borderRadius: '12px',
          padding: '8px 16px',
          margin: '0 20px 10px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <span>
            Previewing: <strong>
              {previewTheme ? getCosmeticById(previewTheme)?.name : getCosmeticById(previewBackground!)?.name}
            </strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
              onClick={() => {
                if (onPreviewTheme) onPreviewTheme(null);
                if (onPreviewBackground) onPreviewBackground(null);
              }}
            >
              Reset
            </button>
            {previewTheme && storage.isOwned('THEMES', previewTheme) && (
              <button
                className="btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
                onClick={() => {
                  const item = getCosmeticById(previewTheme);
                  if (item) handleEquip(item);
                }}
              >
                Equip
              </button>
            )}
            {previewBackground && storage.isOwned('BACKGROUNDS', previewBackground) && (
              <button
                className="btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
                onClick={() => {
                  const item = getCosmeticById(previewBackground);
                  if (item) handleEquip(item);
                }}
              >
                Equip
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="shop-tabs-nav" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '0 16px 12px',
        flexWrap: 'wrap'
      }}>
        {(['ALL', 'CHARACTERS', 'GATES', 'BACKGROUNDS', 'THEMES'] as const).map(cat => (
          <button
            key={cat}
            className={`shop-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '11px' }}
            onClick={() => {
              audio.playButton();
              haptics.light();
              setSelectedCategory(cat);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* UNIFIED COSMETICS GRID */}
      {filteredItems.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '36px', marginBottom: '12px' }}>📦</span>
          <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 6px' }}>No items found in this section.</p>
          <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>
            {viewMode === 'INVENTORY' ? 'Unlock new items in the Shop to add them to your inventory!' : 'Check back for future unlocks!'}
          </p>
        </div>
      ) : (
        <div className="shop-grid" style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '14px', 
          padding: '4px 20px 24px', 
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 220px)'
        }}>
          {filteredItems.map(item => {
            const isOwned = storage.isOwned(item.category, item.id);
            const isEquipped = getEquippedId(item.category) === item.id;
            const isPreviewing = (item.category === 'THEMES' && previewTheme === item.id) ||
                                (item.category === 'BACKGROUNDS' && previewBackground === item.id);
            const canAfford = points >= item.price;

            return (
              <div
                key={item.id}
                className={`shop-item ${isEquipped ? 'equipped' : ''}`}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: '16px',
                  padding: '14px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: isEquipped 
                    ? '2px solid var(--accent-gold)' 
                    : isPreviewing 
                      ? '2px dashed var(--accent-primary)' 
                      : '2px solid var(--border-subtle)',
                  boxShadow: isEquipped ? '0 0 16px rgba(234, 179, 8, 0.25)' : 'none',
                  opacity: (!isOwned && !canAfford) ? 0.75 : 1,
                  position: 'relative',
                  transition: 'transform 0.15s ease, border-color 0.2s ease'
                }}
              >
                {/* Category Micro-tag */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  fontSize: '9px',
                  letterSpacing: '0.04em',
                  opacity: 0.6,
                  fontWeight: '600'
                }}>
                  {item.category}
                </div>

                {/* VISUAL PREVIEW BASED ON CATEGORY */}
                <div style={{
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '10px 0 8px',
                  width: '100%'
                }}>
                  {item.category === 'CHARACTERS' && (
                    <div style={{ fontSize: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.id === 'classic_arrow' ? (
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        item.icon
                      )}
                    </div>
                  )}

                  {item.category === 'GATES' && (
                    <div style={{
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '10px',
                      border: `1px solid ${item.themeColor || 'var(--accent-primary)'}33`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <Goal gateId={item.id} isWon={false} />
                    </div>
                  )}

                  {item.category === 'BACKGROUNDS' && (
                    <div className={`bg-pattern-${item.id}`} style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-active)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: 'var(--accent-primary)',
                      background: 'var(--bg-surface-elevated)'
                    }}>
                      {item.icon}
                    </div>
                  )}

                  {item.category === 'THEMES' && item.metadata?.colors && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: item.metadata.colors.bg,
                      padding: '8px 10px',
                      borderRadius: '20px',
                      border: `1px solid ${item.metadata.colors.accent}44`,
                      boxShadow: `0 2px 8px ${item.metadata.colors.accent}22`
                    }}>
                      <span title="Surface" style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.metadata.colors.surface, border: '1px solid var(--border-active)' }} />
                      <span title="Cell" style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.metadata.colors.cell, border: '1px solid var(--border-active)' }} />
                      <span title="Wall" style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.metadata.colors.wall, border: '1px solid var(--border-active)' }} />
                      <span title="Accent" style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.metadata.colors.accent, boxShadow: `0 0 6px ${item.metadata.colors.accent}` }} />
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px', textAlign: 'center' }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: getRarityBadgeColor(item.rarity),
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}>
                  {item.rarity}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  marginBottom: '10px',
                  minHeight: '26px',
                  lineHeight: '1.3'
                }}>
                  {item.description}
                </div>

                {/* Preview Button for Themes & Backgrounds */}
                {(item.category === 'THEMES' || item.category === 'BACKGROUNDS') && (
                  <button
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      marginBottom: '6px',
                      padding: '5px 0',
                      fontSize: '10px',
                      borderColor: isPreviewing ? 'var(--accent-primary)' : undefined,
                      color: isPreviewing ? 'var(--accent-primary)' : undefined
                    }}
                    onClick={() => handlePreview(item)}
                  >
                    {isPreviewing ? 'PREVIEWING' : 'PREVIEW'}
                  </button>
                )}

                {/* Action Buttons: EQUIPPED / EQUIP / BUY */}
                {isEquipped ? (
                  <button className="btn-secondary" style={{width: '100%', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)', fontSize: '11px', padding: '6px 0'}} disabled>
                    EQUIPPED
                  </button>
                ) : isOwned ? (
                  <button className="btn-primary" style={{width: '100%', fontSize: '11px', padding: '6px 0'}} onClick={() => handleEquip(item)}>
                    EQUIP
                  </button>
                ) : (
                  <button 
                    className={canAfford ? "btn-primary" : "btn-secondary"} 
                    style={{width: '100%', opacity: canAfford ? 1 : 0.5, fontSize: '11px', padding: '6px 0'}} 
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford}
                  >
                    💎 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
