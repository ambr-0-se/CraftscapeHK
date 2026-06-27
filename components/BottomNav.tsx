import React from 'react';
import { motion } from 'framer-motion';
import { Tab } from '../enums';
import { useLanguage } from '../contexts/LanguageContext';

const NavItem: React.FC<{
  label: string;
  tab: Tab;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: (props: { isActive: boolean }) => React.ReactNode;
}> = ({ label, tab, activeTab, setActiveTab, children }) => {
  const isActive = activeTab === tab;
  return (
    <motion.button
      onClick={() => setActiveTab(tab)}
      className="flex flex-col items-center justify-center gap-1 w-full transition-all duration-300 pt-0 focus:outline-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className={`transition-all duration-200 select-none pointer-events-none ${isActive ? 'text-[var(--color-primary-accent)] opacity-100' : 'text-[var(--color-text-secondary)] opacity-80'}`}>
        {children({ isActive })}
      </div>
      <span className={`mt-1 text-xs font-medium leading-none transition-all duration-200 ${isActive ? 'text-[var(--color-primary-accent)] opacity-100' : 'text-[var(--color-text-secondary)] opacity-80'}`}>
        {label}
      </span>
    </motion.button>
  );
};

const BottomNav: React.FC<{ activeTab: Tab; setActiveTab: (tab: Tab) => void; }> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  return (
    <nav className="relative h-20 flex items-end px-4 pt-2 pb-2" style={{
      background: 'var(--color-nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--color-nav-border)',
      borderRadius: '16px 16px 0 0',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div className="flex-1 flex items-center gap-6 justify-start">
        <NavItem label={t('navPlay')} tab={Tab.Play} activeTab={activeTab} setActiveTab={setActiveTab}>
          {({ isActive }) => (
            <div className="w-7 h-7 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isActive ? 1.5 : 2}
                className="w-full h-full"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" />
              </svg>
            </div>
          )}
        </NavItem>
        <NavItem label={t('navMarketplace')} tab={Tab.Marketplace} activeTab={activeTab} setActiveTab={setActiveTab}>
          {({ isActive }) => (
            <div className="w-7 h-7 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 1.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 11V14C3.5 17.7712 3.5 19.6569 4.67157 20.8284C5.84315 22 7.72876 22 11.5 22H12.5C16.2712 22 18.1569 22 19.3284 20.8284C20.5 19.6569 20.5 17.7712 20.5 14V11" />
                <path d="M9.4998 2H14.4998L15.1515 8.51737C15.338 10.382 13.8737 12 11.9998 12C10.1259 12 8.6616 10.382 8.84806 8.51737L9.4998 2Z" />
                <path d="M3.32975 5.35133C3.50783 4.46093 3.59687 4.01573 3.77791 3.65484C4.15938 2.89439 4.84579 2.33168 5.66628 2.10675C6.05567 2 6.50969 2 7.41771 2H9.50002L8.77549 9.24527C8.61911 10.8091 7.30318 12 5.73155 12C3.8011 12 2.35324 10.2339 2.73183 8.34093L3.32975 5.35133Z" />
                <path d="M20.6703 5.35133C20.4922 4.46093 20.4031 4.01573 20.2221 3.65484C19.8406 2.89439 19.1542 2.33168 18.3337 2.10675C17.9443 2 17.4903 2 16.5823 2H14.5L15.2245 9.24527C15.3809 10.8091 16.6968 12 18.2685 12C20.1989 12 21.6468 10.2339 21.2682 8.34093L20.6703 5.35133Z" />
                <path d="M9.5 21.5V18.5C9.5 17.5654 9.5 17.0981 9.70096 16.75C9.83261 16.522 10.022 16.3326 10.25 16.201C10.5981 16 11.0654 16 12 16C12.9346 16 13.4019 16 13.75 16.201C13.978 16.3326 14.1674 16.522 14.299 16.75C14.5 17.0981 14.5 17.5654 14.5 18.5V21.5" />
              </svg>
            </div>
          )}
        </NavItem>
      </div>

      <div className="flex-shrink-0 flex justify-center px-6">
        <motion.button
          onClick={() => setActiveTab(Tab.Explore)}
          aria-label="Open Explore"
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === Tab.Explore ? 'bg-[var(--color-primary-accent)] text-white shadow-[0_12px_36px_rgba(5,58,106,0.25)]' : 'bg-[var(--color-surface)] text-[var(--color-primary-accent)] shadow-none border-2 border-[var(--color-primary-accent)]'}`}
          style={{
            border: activeTab === Tab.Explore ? '3px solid var(--color-bg)' : undefined
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </motion.button>
      </div>

      <div className="flex-1 flex items-center gap-6 justify-end">
        <NavItem label={t('navEvents')} tab={Tab.Events} activeTab={activeTab} setActiveTab={setActiveTab}>
          {({ isActive }) => (
            <div className="w-7 h-7 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 1.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z" />
              </svg>
            </div>
          )}
        </NavItem>
        <NavItem label={t('navProfile')} tab={Tab.Profile} activeTab={activeTab} setActiveTab={setActiveTab}>
          {() => (
            <div className="w-7 h-7 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
          )}
        </NavItem>
      </div>
    </nav>
  );
};

export default BottomNav;
