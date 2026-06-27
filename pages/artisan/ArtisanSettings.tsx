import React from 'react';
import ThemeToggle from '../../components/ThemeToggle';
import { useLanguage } from '../../contexts/LanguageContext';

interface ArtisanSettingsProps {
    onToggleArtisanMode: () => void;
}

const ArtisanSettings: React.FC<ArtisanSettingsProps> = ({ onToggleArtisanMode }) => {
    const { t } = useLanguage();

    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
            <header className="p-6 pt-10">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <img
                            src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=400&auto=format&fit=crop"
                            alt="Master Wong portrait"
                            className="w-20 h-20 rounded-full border-2 border-[var(--color-primary-accent)] object-cover"
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{t('artisanNameZhang')}</h1>
                            <p className="text-[17px] text-[var(--color-text-secondary)]">{t('artisanSettingsBio')}</p>
                        </div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <div className="flex-grow p-6 space-y-3">
                 <button
                    onClick={onToggleArtisanMode}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-center font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:bg-[var(--color-secondary-accent)] text-[var(--color-text-primary)]"
                >
                    {t('artisanSettingsSwitchToUser')}
                </button>
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                    <button className="w-full text-left p-4 font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border)]">{t('artisanSettingsAccount')}</button>
                    <button className="w-full text-left p-4 font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border)]">{t('artisanSettingsPayout')}</button>
                    <button className="w-full text-left p-4 font-semibold text-[var(--color-text-primary)]">{t('artisanSettingsNotifications')}</button>
                </div>
                 <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                    <button className="w-full text-left p-4 font-semibold text-[var(--color-error)]">{t('artisanSettingsLogout')}</button>
                </div>
            </div>
        </div>
    );
};

export default ArtisanSettings;
