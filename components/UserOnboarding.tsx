import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface UserOnboardingProps {
  onComplete: () => void;
}

const UserOnboarding: React.FC<UserOnboardingProps> = ({ onComplete }) => {
  const { user, setHasCompletedOnboarding } = useAuth();
  const { addFaceProfile } = useAppContext();
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;

  const craftInterests = [
    { id: 'cheongsam', label: t('onboardingInterestCheongsam'), icon: '👗' },
    { id: 'mahjong', label: t('onboardingInterestMahjong'), icon: '🀄' },
    { id: 'letterpress', label: t('onboardingInterestLetterpress'), icon: '🖨️' },
    { id: 'knot', label: t('onboardingInterestKnot'), icon: '🪢' },
    { id: 'neon', label: t('onboardingInterestNeonSign'), icon: '💡' },
    { id: 'all', label: t('onboardingInterestAll'), icon: '✨' },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      // Create a local URL for preview
      const localUrl = URL.createObjectURL(file);
      setUploadedImageUrl(localUrl);

      // In a real app, you would upload to a server here
      // For now, we'll just use the local URL and add it to face profiles
      const faceLabel = {
        en: user?.username || 'My Face',
        zh: user?.username || '我的臉孔',
      };

      addFaceProfile({
        label: faceLabel,
        imageUrl: localUrl,
        source: 'upload',
      });

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(t('onboardingUploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSkipPhoto = () => {
    setCurrentStep(2);
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleFinish = () => {
    // Save preferences (in a real app, you'd save to backend)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInterests', JSON.stringify(selectedInterests));
    }
    
    setHasCompletedOnboarding(true);
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 mb-6 relative">
              {uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded face"
                  className="w-full h-full object-cover rounded-full border-4 border-[var(--color-primary-accent)]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-6xl">
                  📸
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              {t('onboardingUserStep1Title')}
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
              {t('onboardingUserStep1Desc')}
            </p>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm max-w-md">
                {uploadError}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full max-w-md py-4 px-6 bg-[var(--color-primary-accent)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mb-3"
            >
              {isUploading ? t('onboardingUploading') : uploadedImageUrl ? '✓ ' + t('onboardingUploadSuccess') : t('onboardingUploadPhoto')}
            </button>

            {uploadedImageUrl ? (
              <button
                onClick={handleNextStep}
                className="w-full max-w-md py-4 px-6 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold rounded-xl hover:bg-[var(--color-page-bg)] transition-colors"
              >
                {t('onboardingNext')}
              </button>
            ) : (
              <button
                onClick={handleSkipPhoto}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm"
              >
                {t('onboardingSkipForNow')}
              </button>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <div className="text-6xl mb-6">🎨</div>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              {t('onboardingUserStep2Title')}
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
              {t('onboardingUserStep2Desc')}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
              {craftInterests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedInterests.includes(interest.id)
                      ? 'border-[var(--color-primary-accent)] bg-[var(--color-primary-accent)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="text-3xl mb-2">{interest.icon}</div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {interest.label}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleNextStep}
              className="w-full max-w-md py-4 px-6 bg-[var(--color-primary-accent)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('onboardingNext')}
            </button>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center text-center"
          >
            <div className="text-6xl mb-6">🎉</div>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              {t('onboardingUserStep3Title')}
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
              {t('onboardingUserStep3Desc')}
            </p>

            <div className="w-full max-w-md mb-6 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center gap-3 mb-2">
                {uploadedImageUrl && (
                  <img
                    src={uploadedImageUrl}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="text-left">
                  <div className="font-bold text-[var(--color-text-primary)]">
                    {user?.username}
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {selectedInterests.length > 0
                      ? `${selectedInterests.length} ${language === 'zh' ? '個興趣' : 'interests'}`
                      : language === 'zh' ? '準備探索' : 'Ready to explore'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full max-w-md py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('onboardingFinish')}
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--color-page-bg)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {t('onboardingUserWelcome').replace('{username}', user?.username || '')}
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              {t('onboardingUserSubtitle')}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index < currentStep
                    ? 'bg-[var(--color-primary-accent)]'
                    : 'bg-[var(--color-border)]'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default UserOnboarding;

