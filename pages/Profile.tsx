import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "../contexts/AppContext";
import { getCrafts } from "../services/apiService";
import ThemeToggle from "../components/ThemeToggle";
import { motion } from "framer-motion";
import type { Craft } from "../types";
import Spinner from "../components/Spinner";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

type ProfileTab = "favorites" | "creations" | "wardrobe";

const bentoLayoutClasses = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1024 1024"
    className="h-6 w-6 text-[var(--color-text-secondary)]"
    fill="currentColor"
  >
    <path d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357.12 357.12 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a351.616 351.616 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357.12 357.12 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zm-23.424 64H446.72l-36.352 113.088-24.512 11.968a294.113 294.113 0 0 0-34.816 20.096l-22.656 15.36-116.224-25.088-65.28 113.152 79.68 88.192-1.92 27.136a293.12 293.12 0 0 0 0 40.192l1.92 27.136-79.808 88.192 65.344 113.152 116.224-25.024 22.656 15.296a294.113 294.113 0 0 0 34.816 20.096l24.512 11.968L446.72 896h130.688l36.48-113.152 24.448-11.904a288.282 288.282 0 0 0 34.752-20.096l22.592-15.296 116.288 25.024 65.28-113.152-79.744-88.192 1.92-27.136a293.12 293.12 0 0 0 0-40.256l-1.92-27.136 79.808-88.128-65.344-113.152-116.288 24.96-22.592-15.232a287.616 287.616 0 0 0-34.752-20.096l-24.448-11.904L577.344 128zM512 320a192 192 0 1 1 0 384 192 192 0 0 1 0-384zm0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256z" />
  </svg>
);

interface ProfileProps {
  onToggleArtisanMode: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onToggleArtisanMode }) => {
  const {
    favorites,
    aiCreations,
    faceProfiles,
    setActiveFace,
    activeFaceId,
    addFaceProfile,
    tryOnLooks,
  } = useAppContext();
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>("favorites");
  const [allCrafts, setAllCrafts] = useState<Craft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [faceUploadError, setFaceUploadError] = useState<string | null>(null);
  const [isFaceUploading, setIsFaceUploading] = useState(false);
  const faceUploadInputRef = useRef<HTMLInputElement | null>(null);
  const faceCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [showFaceUploadOptions, setShowFaceUploadOptions] = useState(false);

  useEffect(() => {
    if (activeTab === "favorites") {
      setIsLoading(true);
      getCrafts().then((data) => {
        setAllCrafts(data);
        setIsLoading(false);
      });
    }
  }, [activeTab]);

  const favoriteCrafts = allCrafts.filter((craft) => favorites.has(craft.id));
  const tabs = [
    { id: "favorites", label: t("profileTabFavorites") },
    { id: "creations", label: t("profileTabCreations") },
    { id: "wardrobe", label: t("profileTabWardrobe") },
  ];

  const handleTriggerFaceUpload = useCallback(() => {
    setShowFaceUploadOptions(true);
  }, []);

  const handleFaceUploadOption = (option: "camera" | "library") => {
    setShowFaceUploadOptions(false);
    if (option === "camera") {
      faceCameraInputRef.current?.click();
    } else {
      faceUploadInputRef.current?.click();
    }
  };

  const handleFaceUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setIsFaceUploading(true);
      setFaceUploadError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = typeof reader.result === "string" ? reader.result : "";
        if (!imageUrl) {
          setFaceUploadError(t("profileWardrobeUploadError"));
          setIsFaceUploading(false);
          return;
        }
        const labelText =
          file.name.replace(/\.[^/.]+$/, "") ||
          t("profileWardrobeUploadFallback");
        addFaceProfile({
          label: { zh: labelText, en: labelText },
          imageUrl,
          source: "upload",
        });
        setIsFaceUploading(false);
        event.target.value = "";
      };
      reader.onerror = () => {
        setFaceUploadError(t("profileWardrobeUploadError"));
        setIsFaceUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [addFaceProfile, t]
  );

  const handleFaceActivate = useCallback(
    (faceId: string) => {
      setActiveFace(faceId);
      setFaceUploadError(null);
    },
    [setActiveFace]
  );

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
      {/* Museum-style Header */}
      <header className="px-4 py-6 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src="/user-avatar.jpg"
                alt="User Avatar"
                className="w-16 h-16 rounded-full border-2 border-[var(--color-primary-accent)] object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-primary-accent)] rounded-full border-2 border-[var(--color-bg)]"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                {t("profileTitle")}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t("profileStats", {
                  favorites: favorites.size,
                  creations: aiCreations.length,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              className="w-10 h-10 rounded-full p-2 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-200 hover:bg-[var(--color-secondary-accent)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SettingsIcon />
            </motion.button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Museum-style Sections */}
      <div className="px-4 py-6 space-y-6">
        {/* Artisan Mode Toggle */}
        <motion.button
          onClick={onToggleArtisanMode}
          className="w-full museum-card p-4 text-center font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-primary-accent)]/10"
          style={{
            color:
              theme === "dark"
                ? "var(--color-text-secondary)"
                : "var(--color-primary-accent)",
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{t("profileSwitchToArtisan")}</span>
          </div>
        </motion.button>

        {/* Language Setting */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wide">
            {t("profileLanguageSetting")}
          </h2>
          <div className="relative flex bg-[var(--color-button-bg)] p-1 rounded-xl">
            <button
              onClick={() => setLanguage("zh")}
              className={`relative w-full py-3 rounded-lg text-sm font-semibold transition-colors duration-300 z-10 ${
                language === "zh" ? "" : "text-[var(--color-text-inactive)]"
              }`}
              style={
                language === "zh"
                  ? {
                      color:
                        theme === "dark"
                          ? "var(--color-text-secondary)"
                          : "var(--color-text-red)",
                    }
                  : undefined
              }
            >
              {language === "zh" && (
                <motion.div
                  layoutId="languageBubble"
                  className="absolute inset-0 bg-[var(--color-surface)] rounded-lg ios-shadow"
                  style={{ borderRadius: "0.5rem" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative">繁體中文</span>
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`relative w-full py-3 rounded-lg text-sm font-semibold transition-colors duration-300 z-10 ${
                language === "en" ? "" : "text-[var(--color-text-inactive)]"
              }`}
              style={
                language === "en"
                  ? {
                      color:
                        theme === "dark"
                          ? "var(--color-text-secondary)"
                          : "var(--color-text-red)",
                    }
                  : undefined
              }
            >
              {language === "en" && (
                <motion.div
                  layoutId="languageBubble"
                  className="absolute inset-0 bg-[var(--color-surface)] rounded-lg ios-shadow"
                  style={{ borderRadius: "0.5rem" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative">English</span>
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div>
          <div className="relative flex bg-[var(--color-button-bg)] p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`relative w-full py-3 rounded-lg text-sm font-semibold transition-colors duration-300 z-10 ${
                  activeTab === tab.id
                    ? ""
                    : "text-[var(--color-text-inactive)]"
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        color:
                          theme === "dark"
                            ? "var(--color-text-secondary)"
                            : "var(--color-text-red)",
                      }
                    : undefined
                }
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="profileTabBubble"
                    className="absolute inset-0 bg-[var(--color-surface)] rounded-lg ios-shadow"
                    style={{ borderRadius: "0.5rem" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Museum-style Content */}
      <div className="flex-grow px-4 pb-24">
        {activeTab === "favorites" &&
          (isLoading ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-2 grid-flow-dense auto-rows-fr gap-4">
              {favoriteCrafts.length > 0 ? (
                favoriteCrafts.map((craft, index) => (
                  <motion.div
                    key={craft.id}
                    className={`${
                      bentoLayoutClasses[index % bentoLayoutClasses.length]
                    } museum-card overflow-hidden aspect-square group`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <img
                      src={craft.images[0]}
                      alt={craft.name[language]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12">
                  <p className="text-[var(--color-text-secondary)] mb-2">
                    {t("profileFavoritesEmpty")}
                  </p>
                </div>
              )}
            </div>
          ))}
        {activeTab === "creations" && (
          <div className="grid grid-cols-2 gap-4">
            {aiCreations.map((creation) => (
              <motion.div
                key={creation.id}
                className="museum-card overflow-hidden group"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={creation.imageUrl}
                    alt={creation.prompt}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-[var(--color-primary-accent)] mb-1">
                    {creation.craftName}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">
                    {creation.prompt}
                  </p>
                </div>
              </motion.div>
            ))}
            {aiCreations.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-[var(--color-text-secondary)] mb-2">
                  {t("profileCreationsEmpty")}
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === "wardrobe" && (
          <div className="space-y-6">
            <div className="museum-card p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {t("profileWardrobeFacesTitle")}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {t("profileWardrobeFacesSubtitle")}
                  </p>
                </div>
                <button
                  onClick={handleTriggerFaceUpload}
                  className="px-4 py-2 rounded-full border border-[var(--color-primary-accent)] text-[var(--color-primary-accent)] text-sm font-medium hover:bg-[var(--color-primary-accent)]/10 transition-colors disabled:opacity-50"
                  disabled={isFaceUploading}
                  type="button"
                >
                  {isFaceUploading
                    ? t("profileWardrobeUploading")
                    : t("profileWardrobeUploadButton")}
                </button>
                {showFaceUploadOptions && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-72 flex flex-col gap-3">
                      <button
                        className="w-full py-2 rounded-lg bg-[var(--color-primary-accent)] text-white font-semibold text-base hover:opacity-90"
                        onClick={() => handleFaceUploadOption("camera")}
                      >
                        {language === "zh" ? "拍照" : "Take Photo"}
                      </button>
                      <button
                        className="w-full py-2 rounded-lg bg-[var(--color-surface)] text-[var(--color-primary-accent)] font-semibold text-base border border-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent)]/10"
                        onClick={() => handleFaceUploadOption("library")}
                      >
                        {language === "zh"
                          ? "從相簿選擇"
                          : "Choose from Library"}
                      </button>
                      <button
                        className="w-full py-2 rounded-lg text-[var(--color-text-secondary)] font-medium text-base hover:bg-gray-100"
                        onClick={() => setShowFaceUploadOptions(false)}
                      >
                        {language === "zh" ? "取消" : "Cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={faceUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFaceUpload}
              />
              <input
                ref={faceCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFaceUpload}
              />
              {faceUploadError && (
                <p className="text-xs text-[var(--color-error)]">
                  {faceUploadError}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {faceProfiles.map((face) => {
                  const isActive = face.id === activeFaceId;
                  return (
                    <button
                      key={face.id}
                      type="button"
                      onClick={() => handleFaceActivate(face.id)}
                      className={`border rounded-xl overflow-hidden text-left transition-all duration-200 ${
                        isActive
                          ? "border-[var(--color-primary-accent)] shadow-lg shadow-[var(--color-primary-accent)]/20 scale-[1.01]"
                          : "border-[var(--color-border)] hover:border-[var(--color-primary-accent)]/60"
                      }`}
                    >
                      <img
                        src={face.imageUrl}
                        alt={
                          typeof face.label === "string"
                            ? face.label
                            : face.label[language]
                        }
                        className="w-full h-32 object-cover"
                      />
                      <div className="px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {typeof face.label === "string"
                              ? face.label
                              : face.label[language]}
                          </p>
                          <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                            {face.source === "preset"
                              ? t("profileWardrobeFacePreset")
                              : t("profileWardrobeFaceUploaded")}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {isActive
                            ? t("profileWardrobeFaceActive")
                            : t("profileWardrobeFaceUse")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!faceProfiles.length && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t("profileWardrobeFacesEmpty")}
                </p>
              )}
            </div>

            <div className="museum-card p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t("profileWardrobeTryOnsTitle")}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t("profileWardrobeTryOnsSubtitle")}
                </p>
              </div>
              {tryOnLooks.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tryOnLooks.map((look) => (
                    <div
                      key={look.id}
                      className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]"
                    >
                      <img
                        src={look.imageUrl}
                        alt={look.craftName}
                        className="w-full h-56 object-cover"
                      />
                      <div className="p-3 space-y-1">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {look.craftName}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("profileWardrobeTryOnsFace", {
                            face: look.faceLabel,
                          })}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)]">
                          {new Date(look.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t("profileWardrobeTryOnsEmpty")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
