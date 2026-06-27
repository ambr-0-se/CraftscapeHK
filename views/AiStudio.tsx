import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { Craft, TranslationOption, FaceProfile } from "../types";
import { motion } from "framer-motion";
import { useAppContext } from "../contexts/AppContext";
import {
  generateCraftImage,
  generateTryOnImage,
} from "../services/geminiService";
import { getMahjongTranslationSuggestions } from "../services/translationService";
import { useLanguage } from "../contexts/LanguageContext";

interface AiStudioProps {
  craft: Craft;
  onClose: () => void;
}

const SPECIAL_TRANSLATION_IMAGES: Record<string, string> = {
  海莉: "/images/presets/hailey.png",
  港大: "/images/presets/hku.png",
};

const SPECIAL_TRANSLATION_IMAGE_FITS: Record<string, "contain" | "cover"> = {
  海莉: "cover",
  港大: "cover",
};

const SPECIAL_IMAGE_DELAY_MS = 2000;
const PATTERN_PRESET_DELAY_MS = 2500;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const AiStudio: React.FC<AiStudioProps> = ({ craft, onClose }) => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageFit, setGeneratedImageFit] = useState<
    "contain" | "cover"
  >("contain");
  const [patternDraftImage, setPatternDraftImage] = useState<string | null>(
    null
  );
  const [patternDraftImageFit, setPatternDraftImageFit] = useState<
    "contain" | "cover"
  >("contain");
  const [patternDraftFailed, setPatternDraftFailed] = useState(false);
  const [isPatternDraftLoading, setIsPatternDraftLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationOptions, setTranslationOptions] = useState<
    TranslationOption[]
  >([]);
  const [selectedTranslation, setSelectedTranslation] =
    useState<TranslationOption | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [lastUsedPrompt, setLastUsedPrompt] = useState("");
  const [lastOriginalPrompt, setLastOriginalPrompt] = useState("");
  const [recentlyUsedTranslation, setRecentlyUsedTranslation] =
    useState<TranslationOption | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [shouldShowContactCTA, setShouldShowContactCTA] = useState(false);
  const [studioMode, setStudioMode] = useState<"concept" | "try-on">("concept");
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [isFaceUploading, setIsFaceUploading] = useState(false);
  const [faceUploadError, setFaceUploadError] = useState<string | null>(null);
  const [lastConceptCheongsamImage, setLastConceptCheongsamImage] = useState<
    string | null
  >(null);
  const [lastConceptPrompt, setLastConceptPrompt] = useState<string>("");
  const faceFileInputRef = useRef<HTMLInputElement | null>(null);
  const faceCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [showFaceUploadOptions, setShowFaceUploadOptions] = useState(false);
  const {
    addAiCreation,
    faceProfiles,
    activeFaceId,
    addFaceProfile,
    setActiveFace,
    addTryOnLook,
  } = useAppContext();
  const { language, t } = useLanguage();
  const isCheongsamCraft = craft.name.en.toLowerCase().includes("cheongsam");
  const isMahjongCraft =
    craft.category === "mahjong" ||
    craft.name.en.toLowerCase().includes("mahjong");
  const requiresTranslation = language === "en" && isMahjongCraft;
  const translationStrategyLabels = useMemo(
    () => ({
      phonetic: t("aiStudioTranslationStrategyPhonetic"),
      meaning: t("aiStudioTranslationStrategyMeaning"),
      mixed: t("aiStudioTranslationStrategyMixed"),
    }),
    [t]
  );

  useEffect(() => {
    setTranslationOptions([]);
    setSelectedTranslation(null);
    setTranslationError(null);
    setIsTranslating(false);
    setRecentlyUsedTranslation(null);
    setShouldShowContactCTA(false);
  }, [requiresTranslation, craft.id]);

  useEffect(() => {
    if (isCheongsamCraft) {
      if (!selectedFaceId && activeFaceId) {
        setSelectedFaceId(activeFaceId);
      }
    } else {
      setStudioMode("concept");
      setSelectedFaceId(null);
    }
  }, [isCheongsamCraft, activeFaceId, selectedFaceId]);

  useEffect(() => {
    if (!isCheongsamCraft) {
      return;
    }
    setSelectedFaceId(activeFaceId);
  }, [activeFaceId, isCheongsamCraft]);

  const selectedFace = useMemo(
    () =>
      selectedFaceId
        ? faceProfiles.find((face) => face.id === selectedFaceId) ?? null
        : null,
    [faceProfiles, selectedFaceId]
  );

  const isTryOnMode = isCheongsamCraft && studioMode === "try-on";
  useEffect(() => {
    if (isTryOnMode) {
      setPatternDraftImage(null);
      setPatternDraftImageFit("contain");
      setPatternDraftFailed(false);
      setIsPatternDraftLoading(false);
    }
  }, [isTryOnMode]);

  const handleSelectTranslation = useCallback((option: TranslationOption) => {
    setSelectedTranslation(option);
    setError(null);
  }, []);

  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value);
      setShouldShowContactCTA(false);
      if (requiresTranslation) {
        setTranslationOptions([]);
        setSelectedTranslation(null);
        setTranslationError(null);
        setRecentlyUsedTranslation(null);
      }
    },
    [requiresTranslation]
  );

  const handleFaceSelect = useCallback(
    (faceId: string) => {
      setSelectedFaceId(faceId);
      setActiveFace(faceId);
      setFaceUploadError(null);
    },
    [setActiveFace]
  );

  const handleTriggerFaceUpload = useCallback(() => {
    setShowFaceUploadOptions(true);
  }, []);

  const handleFaceUploadOption = (option: "camera" | "library") => {
    setShowFaceUploadOptions(false);
    if (option === "camera") {
      faceCameraInputRef.current?.click();
    } else {
      faceFileInputRef.current?.click();
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
          setFaceUploadError(t("aiStudioFaceUploadError"));
          setIsFaceUploading(false);
          return;
        }
        const label =
          file.name.replace(/\.[^/.]+$/, "") || t("aiStudioUploadedFaceLabel");
        const newId = addFaceProfile({
          label,
          imageUrl,
          source: "upload",
        });
        setSelectedFaceId(newId);
        setIsFaceUploading(false);
        event.target.value = "";
      };
      reader.onerror = () => {
        setFaceUploadError(t("aiStudioFaceUploadError"));
        setIsFaceUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [addFaceProfile, t]
  );

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !isTryOnMode) {
      setError(t("aiStudioErrorPrompt"));
      return;
    }
    if (isTryOnMode && !selectedFace) {
      setError(t("aiStudioTryOnFaceRequired"));
      return;
    }

    setError(null);
    setShouldShowContactCTA(false);

    if (requiresTranslation && !isTryOnMode) {
      setLastOriginalPrompt(trimmedPrompt);
      if (!translationOptions.length) {
        setIsTranslating(true);
        setTranslationError(null);
        try {
          const options = await getMahjongTranslationSuggestions(trimmedPrompt);
          if (!options.length) {
            setTranslationError(t("aiStudioTranslationNoResult"));
          } else {
            setTranslationOptions(options);
            setSelectedTranslation(options[0]);
          }
        } catch (err) {
          console.error(err);
          setTranslationError(t("aiStudioTranslationError"));
        } finally {
          setIsTranslating(false);
        }
        return;
      }

      if (!selectedTranslation) {
        setError(t("aiStudioTranslationSelectInstruction"));
        return;
      }
    } else if (!isTryOnMode) {
      setLastOriginalPrompt(trimmedPrompt);
    }

    const effectivePrompt = (() => {
      if (requiresTranslation && selectedTranslation) {
        return selectedTranslation.chinese;
      }
      return trimmedPrompt;
    })();

    const modelPrompt = (() => {
      if (requiresTranslation && selectedTranslation) {
        return `${selectedTranslation.chinese} (${selectedTranslation.pronunciation}) — ${selectedTranslation.explanation}`;
      }
      if (isCheongsamCraft && !isTryOnMode) {
        return [
          "Generate a standalone cheongsam product shot.",
          "Focus solely on the garment on a neutral mannequin or hanger.",
          "Exclude hands, artisans, sewing scenes, or background props.",
          `Design inspiration: ${effectivePrompt}`,
        ].join("\n");
      }
      // Default prompt for other crafts
      return effectivePrompt;
    })();

    console.log("=== AI Image Generation Prompt ===");
    console.log("Craft:", craft.name[language]);
    console.log("Mode:", isTryOnMode ? "Try-On" : "Concept");
    console.log("Full Model Prompt:");
    console.log(modelPrompt);
    console.log("===================================");

    setIsLoading(true);
    setTranslationError(null);
    setGeneratedImage(null);
    setGeneratedImageFit("contain");
    setPatternDraftImage(null);
    setPatternDraftImageFit("contain");
    setPatternDraftFailed(false);
    setIsPatternDraftLoading(false);
    setLastUsedPrompt(effectivePrompt);

    try {
      const promptContainsDragon = trimmedPrompt
        .toLowerCase()
        .includes("dragon");
      const specialTranslationKey =
        requiresTranslation && selectedTranslation && !isTryOnMode
          ? selectedTranslation.chinese
          : null;
      const specialImageUrl = specialTranslationKey
        ? SPECIAL_TRANSLATION_IMAGES[specialTranslationKey]
        : undefined;
      const specialImageFit = specialTranslationKey
        ? SPECIAL_TRANSLATION_IMAGE_FITS[specialTranslationKey]
        : undefined;
      const shouldGeneratePatternDraft = isCheongsamCraft && !isTryOnMode;

      let imageUrl: string;
      let imageFit: "contain" | "cover" = "contain";
      let patternImageUrl: string | null = null;
      let patternImageFit: "contain" | "cover" = "contain";

      // Check for hardcoded dragon try-on image (only for default face)
      const isDefaultFace = selectedFace?.id === "1";
      if (
        isTryOnMode &&
        isCheongsamCraft &&
        promptContainsDragon &&
        isDefaultFace
      ) {
        await sleep(SPECIAL_IMAGE_DELAY_MS);
        imageUrl = "/images/presets/dragon_tryon.png";
      } else if (!isTryOnMode && isCheongsamCraft && promptContainsDragon) {
        // Hardcoded dragon concept image
        await sleep(SPECIAL_IMAGE_DELAY_MS);
        imageUrl = "/images/presets/dragon.jpeg";
        // Save for potential reuse in try-on
        setLastConceptCheongsamImage(imageUrl);
        setLastConceptPrompt(trimmedPrompt);
        if (shouldGeneratePatternDraft) {
          patternImageUrl = "/images/presets/dragon_draft.png";
          patternImageFit = "contain";
        }
      } else if (specialImageUrl) {
        await sleep(SPECIAL_IMAGE_DELAY_MS);
        imageUrl = specialImageUrl;
        if (specialImageFit) {
          imageFit = specialImageFit;
        }
      } else if (isTryOnMode && selectedFace) {
        // Check if we can reuse the concept cheongsam image
        const canReuseConceptImage =
          lastConceptCheongsamImage &&
          lastConceptPrompt === trimmedPrompt &&
          !lastConceptCheongsamImage.includes("/presets/"); // Don't reuse hardcoded images

        // Use the new try-on service for all other try-on requests
        imageUrl = await generateTryOnImage(
          craft.name[language],
          selectedFace.imageUrl,
          trimmedPrompt,
          canReuseConceptImage ? lastConceptCheongsamImage : undefined
        );
      } else {
        imageUrl = await generateCraftImage(craft.name[language], modelPrompt);

        // Save concept cheongsam image for potential reuse in try-on mode
        if (isCheongsamCraft && !isTryOnMode) {
          setLastConceptCheongsamImage(imageUrl);
          setLastConceptPrompt(trimmedPrompt);
        }
      }

      setGeneratedImage(imageUrl);
      setGeneratedImageFit(imageFit);
      setShouldShowContactCTA(!isTryOnMode);
      setRecentlyUsedTranslation(
        requiresTranslation && selectedTranslation
          ? { ...selectedTranslation }
          : null
      );
      setIsLoading(false);

      if (isTryOnMode && selectedFace) {
        addTryOnLook({
          craftId: craft.id,
          craftName: craft.name[language],
          imageUrl,
          faceId: selectedFace.id,
          faceLabel: selectedFace.label[language],
          prompt: trimmedPrompt,
          mode: "cheongsam",
        });
      } else {
        addAiCreation({
          craftId: craft.id,
          craftName: craft.name[language],
          prompt: effectivePrompt,
          imageUrl,
        });
      }

      if (shouldGeneratePatternDraft) {
        if (patternImageUrl) {
          setPatternDraftFailed(false);
          setPatternDraftImage(null);
          setIsPatternDraftLoading(true);
          setTimeout(() => {
            setPatternDraftImage(patternImageUrl);
            setPatternDraftImageFit(patternImageFit);
            setIsPatternDraftLoading(false);
          }, PATTERN_PRESET_DELAY_MS);
        } else {
          setIsPatternDraftLoading(true);
          try {
            const inspirationSource = [
              trimmedPrompt,
              requiresTranslation && selectedTranslation
                ? selectedTranslation.chinese
                : "",
              requiresTranslation && selectedTranslation
                ? selectedTranslation.explanation
                : "",
            ]
              .filter(Boolean)
              .join(" / ");
            const patternPrompt = [
              "Create a scanned version pattern draft image, breaking down each parts of the clothes, handdrawn by designer of this clothes",
              `Pattern inspiration: ${inspirationSource || craft.name.en}.`,
              "Use the attached reference image as a visual guide for the pattern details.",
              "Render the draft as a flat scanned sheet with light paper texture, clear inked annotations, and no extra objects.",
            ].join("\n");
            const generatedPattern = await generateCraftImage(
              `${craft.name[language]} pattern draft`,
              patternPrompt,
              imageUrl // Pass the generated cheongsam image as reference
            );
            setPatternDraftImage(generatedPattern);
            setPatternDraftImageFit("contain");
            setPatternDraftFailed(false);
          } catch (patternError) {
            console.error(patternError);
            setPatternDraftFailed(true);
          } finally {
            setIsPatternDraftLoading(false);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("aiStudioErrorGeneric"));
    } finally {
      setIsLoading(false);
    }
  }, [
    prompt,
    requiresTranslation,
    translationOptions,
    selectedTranslation,
    craft,
    language,
    addAiCreation,
    getMahjongTranslationSuggestions,
    isTryOnMode,
    isCheongsamCraft,
    selectedFace,
    t,
    addTryOnLook,
  ]);

  const handleOpenContact = useCallback(() => {
    setContactName("");
    setContactEmail("");
    let messageTemplate = recentlyUsedTranslation
      ? t("aiStudioContactMessageTemplateTranslated", {
          artisan: craft.artisan[language],
          translation: recentlyUsedTranslation.chinese,
          original: lastOriginalPrompt || prompt,
        })
      : t("aiStudioContactMessageTemplate", {
          artisan: craft.artisan[language],
          prompt: lastUsedPrompt || prompt,
        });
    if (patternDraftImage) {
      messageTemplate = `${messageTemplate}\n\n${t(
        "aiStudioContactPatternDraftNote"
      )}`;
    }
    setContactMessage(messageTemplate);
    setContactSuccess(false);
    setIsSubmittingContact(false);
    setIsContactOpen(true);
  }, [
    craft,
    language,
    lastUsedPrompt,
    prompt,
    recentlyUsedTranslation,
    lastOriginalPrompt,
    patternDraftImage,
    t,
  ]);

  const handleCloseContact = useCallback(() => {
    setIsContactOpen(false);
  }, []);

  const handleSubmitContact = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmittingContact || contactSuccess) {
        return;
      }
      setIsSubmittingContact(true);
      setTimeout(() => {
        setIsSubmittingContact(false);
        setContactSuccess(true);
      }, 600);
    },
    [contactSuccess, isSubmittingContact]
  );

  const disableGenerate =
    isLoading ||
    isTranslating ||
    (!isTryOnMode && !prompt.trim()) ||
    (isTryOnMode && !selectedFace);
  const generateButtonLabel = isLoading
    ? t("aiStudioGenerating")
    : isTryOnMode
    ? t("aiStudioTryOnGenerate")
    : requiresTranslation && translationOptions.length
    ? t("aiStudioGenerateWithTranslation", {
        translation:
          selectedTranslation?.chinese ?? t("aiStudioTranslationLabelFallback"),
      })
    : t("aiStudioGenerate");

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
        duration: 0.4,
      }}
    >
      {/* Museum-style Header */}
      <header className="flex items-center justify-between p-6 flex-shrink-0 border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-bg)] to-transparent">
        <div className="text-left">
          <motion.h1
            className="text-3xl font-bold text-[var(--color-text-primary)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {t("aiStudioTitle")}
          </motion.h1>
          <motion.p
            className="text-sm text-[var(--color-text-secondary)] mt-1"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Create with {craft.name[language]}
          </motion.p>
        </div>
        <motion.button
          onClick={onClose}
          className="bg-[var(--color-surface)] p-3 rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-accent)] transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </motion.button>
      </header>

      {/* Minimalist Workspace */}
      <motion.div className="flex-grow p-6 flex flex-col space-y-6">
        {isCheongsamCraft && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {t("aiStudioModeLabel")}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {isTryOnMode
                    ? t("aiStudioTryOnIntro")
                    : t("aiStudioConceptModeHint")}
                </p>
              </div>
              <div className="inline-flex bg-[var(--color-secondary-accent)]/80 border border-[var(--color-border)] rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setStudioMode("concept")}
                  className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                    studioMode === "concept"
                      ? "bg-[var(--color-primary-accent)] text-white"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {t("aiStudioModeConcept")}
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode("try-on")}
                  className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                    studioMode === "try-on"
                      ? "bg-[var(--color-primary-accent)] text-white"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {t("aiStudioModeTryOn")}
                </button>
              </div>
            </div>

            {isTryOnMode && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerFaceUpload}
                    className="px-4 py-2 rounded-full border border-dashed border-[var(--color-primary-accent)] text-[var(--color-primary-accent)] text-sm font-medium hover:bg-[var(--color-primary-accent)]/10 transition-colors disabled:opacity-50"
                    disabled={isFaceUploading}
                  >
                    {isFaceUploading
                      ? t("aiStudioFaceUploading")
                      : t("aiStudioFaceUpload")}
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
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {t("aiStudioBananaModelHint")}
                  </p>
                </div>

                <input
                  ref={faceFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFaceUpload}
                />
                <input
                  ref={faceCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFaceUpload}
                />

                {faceUploadError && (
                  <p className="text-xs text-[var(--color-error)]">
                    {faceUploadError}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {faceProfiles.map((face) => {
                    const isActive = face.id === selectedFaceId;
                    return (
                      <button
                        key={face.id}
                        type="button"
                        onClick={() => handleFaceSelect(face.id)}
                        className={`group border rounded-xl overflow-hidden text-left transition-transform duration-200 ${
                          isActive
                            ? "border-[var(--color-primary-accent)] scale-[1.02]"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary-accent)]/60"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={face.imageUrl}
                            alt={face.label[language]}
                            className="h-28 w-full object-cover"
                          />
                          {isActive && (
                            <span className="absolute top-2 right-2 bg-[var(--color-primary-accent)] text-white text-xs px-2 py-0.5 rounded-full">
                              {t("aiStudioFaceSelectedTag")}
                            </span>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {face.label[language]}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {face.source === "preset"
                              ? t("aiStudioFacePresetLabel")
                              : t("aiStudioFaceUploadedLabel")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedFace && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-secondary-accent)]/40 p-3">
                    <img
                      src={selectedFace.imageUrl}
                      alt={selectedFace.label[language]}
                      className="w-14 h-14 rounded-full object-cover border border-[var(--color-border)]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {t("aiStudioFaceActiveLabel", {
                          label: selectedFace.label[language],
                        })}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {t("aiStudioFaceActiveHelper")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Museum-style Canvas Area */}
        <motion.div
          className="w-full h-[65vh] bg-[var(--color-surface)] rounded-2xl flex items-center justify-center border border-[var(--color-border)] relative overflow-hidden"
          style={{
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          {isLoading && (
            <motion.div
              className="flex flex-col items-center gap-6 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="relative w-16 h-16"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              >
                <span className="absolute inset-0 rounded-full border-4 border-[var(--color-primary-accent)]/30" />
                <span className="absolute inset-1 rounded-full border-4 border-transparent border-t-[var(--color-primary-accent)]" />
              </motion.div>

              <div className="space-y-1">
                <motion.p
                  className="text-base font-semibold text-[var(--color-text-primary)]"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                >
                  {t("aiStudioLoading")}
                </motion.p>
                <motion.p
                  className="text-sm text-[var(--color-text-secondary)]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 3.1, repeat: Infinity, delay: 0.5 }}
                >
                  {t("aiStudioGenerating")}
                </motion.p>
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div
              className="text-center p-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-[var(--color-error)] text-base">{error}</p>
            </motion.div>
          )}
          {generatedImage && (
            <motion.img
              src={generatedImage}
              alt="AI generated craft"
              className={`w-full h-full ${
                generatedImageFit === "cover"
                  ? "object-cover"
                  : "object-contain"
              } rounded-2xl`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          {!isLoading && !generatedImage && !error && (
            <motion.div
              className="text-center text-[var(--color-text-secondary)] p-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-20 h-20 bg-[var(--color-secondary-accent)] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  style={{ stroke: "var(--color-text-inactive)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">{t("aiStudioPlaceholder")}</p>
              <p className="text-sm mt-2 opacity-70">
                {t("aiStudioPlaceholderSubtitle")}
              </p>
            </motion.div>
          )}
        </motion.div>

        {isCheongsamCraft &&
          !isTryOnMode &&
          (isPatternDraftLoading ||
            patternDraftImage ||
            patternDraftFailed) && (
            <motion.div
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 280,
                damping: 28,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t("aiStudioPatternDraftTitle")}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {t("aiStudioPatternDraftSubtitle")}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {t("aiStudioPatternDraftBadge")}
                </span>
              </div>
              {isPatternDraftLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-[var(--color-text-secondary)]">
                  <motion.div
                    className="relative w-12 h-12"
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.4,
                      ease: "linear",
                    }}
                  >
                    <span className="absolute inset-0 rounded-full border-4 border-[var(--color-primary-accent)]/25" />
                    <span className="absolute inset-1 rounded-full border-4 border-transparent border-t-[var(--color-primary-accent)]" />
                  </motion.div>
                  <p className="text-sm font-medium">
                    {t("aiStudioPatternDraftLoading")}
                  </p>
                </div>
              )}
              {!isPatternDraftLoading && patternDraftImage && (
                <motion.img
                  src={patternDraftImage}
                  alt={t("aiStudioPatternDraftAlt")}
                  className={`w-full ${
                    patternDraftImageFit === "cover"
                      ? "object-cover"
                      : "object-contain"
                  } rounded-xl border border-[var(--color-border)]`}
                  style={{ maxHeight: "70vh" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                />
              )}
              {!isPatternDraftLoading &&
                !patternDraftImage &&
                patternDraftFailed && (
                  <p className="text-xs text-[var(--color-error)]">
                    {t("aiStudioPatternDraftError")}
                  </p>
                )}
            </motion.div>
          )}

        {requiresTranslation &&
          (isTranslating ||
            translationOptions.length > 0 ||
            translationError) && (
            <div className="bg-[var(--color-surface)] p-4 rounded-xl mt-4 border border-[var(--color-border)] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {t("aiStudioTranslationTitle")}
                  </h3>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {t("aiStudioTranslationSubtitle")}
                  </p>
                  {(lastOriginalPrompt || prompt) && (
                    <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
                      {t("aiStudioTranslationOriginalLabel", {
                        original: lastOriginalPrompt || prompt,
                      })}
                    </p>
                  )}
                </div>
                {isTranslating && (
                  <div className="flex flex-col items-center justify-center gap-2 text-[12px] text-[var(--color-primary-accent)] ml-auto self-center w-48 max-w-[60%]">
                    <span className="w-full">
                      {t("aiStudioTranslationLoading")}
                    </span>
                    <motion.span
                      className="relative block h-2 w-full overflow-hidden rounded-full bg-[var(--color-primary-accent)]/15"
                      initial={false}
                    >
                      <motion.span
                        className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-primary-accent)]"
                        animate={{ x: ["-40%", "120%"] }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </motion.span>
                  </div>
                )}
              </div>

              {translationOptions.length > 0 && (
                <div className="space-y-3">
                  {translationOptions.map((option) => {
                    const isActive = selectedTranslation?.id === option.id;
                    const strategyLabel =
                      translationStrategyLabels[option.strategy] ||
                      translationStrategyLabels.mixed;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectTranslation(option)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                          isActive
                            ? "border-[var(--color-primary-accent)] bg-[var(--color-primary-accent)]/10"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary-accent)]/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                            {option.chinese}
                          </span>
                          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-primary-accent)]">
                            {strategyLabel}
                          </span>
                        </div>
                        {option.pronunciation && (
                          <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                            {t("aiStudioTranslationOptionPronunciation", {
                              pronunciation: option.pronunciation,
                            })}
                          </p>
                        )}
                        <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 leading-snug">
                          {option.explanation}
                        </p>
                      </button>
                    );
                  })}
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    {t("aiStudioTranslationUsePromptHint")}
                  </p>
                </div>
              )}

              {translationError && (
                <p className="text-[13px] text-[var(--color-error)]">
                  {translationError}
                </p>
              )}
            </div>
          )}

        {shouldShowContactCTA && generatedImage && (
          <div className="bg-[var(--color-surface)] p-4 rounded-xl text-center mt-4 border border-[var(--color-border)] ios-shadow">
            <h3 className="text-[17px] font-semibold text-[var(--color-primary-accent)]">
              {t("aiStudioCtaTitle")}
            </h3>
            <button
              onClick={handleOpenContact}
              className="mt-2 bg-[var(--color-primary-accent)] text-white font-semibold py-2 px-5 rounded-full text-[15px] hover:opacity-80 transition-colors"
            >
              {t("aiStudioCtaButton")}
            </button>
          </div>
        )}

        <div className="mt-4">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={
              isTryOnMode
                ? t("aiStudioTryOnPromptPlaceholder")
                : t("aiStudioInputPlaceholder")
            }
            rows={3}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleGenerate}
            disabled={disableGenerate}
            className="w-full mt-2 bg-[var(--color-primary-accent)] text-white font-bold py-4 px-6 rounded-full transition-all duration-300 hover:scale-105 disabled:bg-[var(--color-secondary-accent)] disabled:cursor-not-allowed disabled:scale-100"
          >
            {generateButtonLabel}
          </button>
        </div>
      </motion.div>

      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-2xl">
            <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {t("aiStudioContactTitle", {
                    artisan: craft.artisan[language],
                  })}
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                  {t("aiStudioContactSubtitle")}
                </p>
              </div>
              <button
                onClick={handleCloseContact}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {contactSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">
                  {t("aiStudioContactSuccessTitle")}
                </h3>
                <p className="text-[14px] text-[var(--color-text-secondary)]">
                  {t("aiStudioContactSuccessDescription", {
                    artisan: craft.artisan[language],
                  })}
                </p>
                <button
                  onClick={handleCloseContact}
                  className="w-full bg-[var(--color-primary-accent)] text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-colors"
                >
                  {t("aiStudioContactClose")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="p-6 space-y-5">
                <div className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  {(generatedImage || patternDraftImage) && (
                    <div className="flex gap-2">
                      {generatedImage && (
                        <img
                          src={generatedImage}
                          alt={t("aiStudioContactPromptThumbnailAlt")}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      )}
                      {patternDraftImage && (
                        <img
                          src={patternDraftImage}
                          alt={t("aiStudioPatternDraftAlt")}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                      {t("aiStudioContactPromptLabel")}
                    </p>
                    <p className="text-[14px] text-[var(--color-text-primary)] mt-1 leading-snug">
                      {lastUsedPrompt || prompt}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-[var(--color-text-secondary)]">
                    {t("aiStudioContactNameLabel")}
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    required
                    placeholder={t("aiStudioContactNamePlaceholder")}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-3 px-4 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-[var(--color-text-secondary)]">
                    {t("aiStudioContactEmailLabel")}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-3 px-4 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-[var(--color-text-secondary)]">
                    {t("aiStudioContactMessageLabel")}
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(event) => setContactMessage(event.target.value)}
                    rows={4}
                    required
                    placeholder={t("aiStudioContactMessagePlaceholder")}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-3 px-4 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="w-full bg-[var(--color-primary-accent)] text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingContact
                    ? t("aiStudioContactSubmitting")
                    : t("aiStudioContactSubmit")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AiStudio;
