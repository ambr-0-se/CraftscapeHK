import React from 'react';
import { motion } from 'framer-motion';
import type { Craft } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Fix: Define CraftDetailProps interface
interface CraftDetailProps {
  craft: Craft;
  onClose: () => void;
  onStartCreation: () => void;
  onStartTextLab?: () => void;
}

const CraftDetail: React.FC<CraftDetailProps> = ({ craft, onClose, onStartCreation, onStartTextLab }) => {
  const { language, t } = useLanguage();
  const isLetterpress = craft.category === 'letterpress';

  return (
    <motion.div 
      className="h-full w-full bg-[var(--color-bg)] flex flex-col overflow-y-auto"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.4 
      }}
    >
      {/* Museum-style Hero Section */}
      <header className="relative h-96 flex-shrink-0">
        <img 
          src={craft.images[0]} 
          alt={craft.name[language]} 
          className="w-full h-full object-cover"
        />
        {/* Semi-transparent black overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
        {/* Gradient overlay for smooth transition to page background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] from-0% via-black/10 via-25% to-transparent to-40%"></div>
        
        {/* Close Button */}
        <motion.button 
          onClick={onClose} 
          className="absolute top-6 left-4 bg-black/30 p-3 rounded-full text-white backdrop-blur-md hover:bg-black/40 transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
        
        {/* Museum-style Title Section */}
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <motion.h1 
            className="text-4xl font-bold text-white mb-3 leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {craft.name[language]}
          </motion.h1>
          <motion.p 
            className="text-xl text-white/90 font-medium mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {craft.artisan[language]}
          </motion.p>
          <motion.p 
            className="text-sm text-white/70"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
          </motion.p>
        </div>
      </header>
      
      {/* Content Section */}
      <div className="flex-grow px-6 py-8 space-y-8 text-[var(--color-text-primary)] pb-24">
        {/* Introduction */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            {t('craftDetailIntro')}
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
            {craft.full_description[language]}
          </p>
        </motion.section>

        {/* Museum-style CTA Section */}
        <motion.div 
          className="bg-[var(--color-surface)] p-8 text-center rounded-2xl border border-[var(--color-border)]"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="w-16 h-16 bg-[var(--color-primary-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎨</span>
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            {t('craftDetailCtaTitle')}
          </h3>
          <p className="text-base text-[var(--color-text-secondary)] mb-8 leading-relaxed">
            {isLetterpress 
              ? (language === 'zh' 
                  ? '使用我們的 AI 工具設計您的專屬活字印刷作品，結合傳統工藝與現代創意。' 
                  : 'Use our AI tools to design your custom letterpress text layout, combining traditional craftsmanship with modern creativity.')
              : t('craftDetailCtaDesc')
            }
          </p>
          <motion.button 
            onClick={isLetterpress && onStartTextLab ? onStartTextLab : onStartCreation}
            className="bg-[var(--color-primary-accent)] text-white font-bold py-4 px-12 rounded-full text-lg transition-all duration-200 hover:shadow-xl hover:shadow-[var(--color-primary-accent)]/30"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('craftDetailCtaButton')}
          </motion.button>
        </motion.div>

        {/* History Section */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            {t('craftDetailHistory')}
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
            {craft.history[language]}
          </p>
        </motion.section>

        {/* Story Section */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            {t('craftDetailStory')}
          </h2>
          <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
            {craft.story[language]}
          </p>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default CraftDetail;
