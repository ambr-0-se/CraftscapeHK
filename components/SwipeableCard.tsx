import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, PanInfo } from 'framer-motion';
import type { Craft } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';

interface SwipeableCardProps {
  craft: Craft;
  index: number;
  totalCards: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  craft,
  index,
  totalCards,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  isTop
}) => {
  const { language } = useLanguage();
  const { toggleFavorite, isFavorite } = useAppContext();
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Spring physics for smooth animations
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  
  // Transform values for rotation and scale
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const scale = useTransform(y, [0, -200], [1, 1.05]);
  const opacity = useTransform(x, [-250, 0, 250], [0, 1, 0]);
  
  // Scale for depth effect (next cards are smaller)
  const cardScale = useTransform(
    springX,
    [-300, 0, 300],
    [0.8, 1, 0.8]
  );
  
  // Z-index based on position
  const zIndex = totalCards - index;
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const velocity = info.velocity.x;
    
    if (info.offset.x > swipeThreshold || velocity > 500) {
      // Swipe right - like
      springX.set(300);
      setTimeout(() => {
        onSwipeRight();
      }, 200);
    } else if (info.offset.x < -swipeThreshold || velocity < -500) {
      // Swipe left - skip
      springX.set(-300);
      setTimeout(() => {
        onSwipeLeft();
      }, 200);
    } else {
      // Return to center
      springX.set(0);
      springY.set(0);
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(craft.id);
  };

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{
        x: springX,
        y: springY,
        rotate,
        scale: isTop ? scale : cardScale,
        opacity: isTop ? 1 : 0.8,
        zIndex
      }}
      drag={isTop}
      dragDirectionLock={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={{ cursor: "grabbing" }}
      onClick={isTop ? onTap : undefined}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        delay: index * 0.1 
      }}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[var(--color-surface)] ios-shadow">
        {/* Full-bleed Hero Image */}
        <div className="relative w-full h-full">
          <img 
            src={craft.images[0]} 
            alt={craft.name[language]} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Heart Button */}
          <button 
            onClick={handleHeartClick}
            className={`absolute top-4 right-4 backdrop-blur-sm p-3 rounded-full transition-all duration-200 hover:scale-110 ${
              isFavorite(craft.id)
                ? 'bg-white/90 text-[var(--color-button-cta)] hover:bg-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            aria-label={isFavorite(craft.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill={isFavorite(craft.id) ? 'currentColor' : 'none'} 
              className="w-6 h-6" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        </div>
        
        {/* Fixed Height Content Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6" style={{ maxHeight: '120px' }}>
          <h2 className="text-2xl font-bold text-white mb-2 leading-tight" style={{ 
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {craft.name[language]}
          </h2>
          <p className="text-lg text-white/90 mb-1" style={{ 
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {craft.artisan[language]}
          </p>
        </div>
        
        {/* Info Arrow - Bottom Right */}
        <div className="absolute bottom-6 right-6">
          <div className="w-10 h-10 bg-[var(--color-primary-accent)] rounded-full flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeableCard;
