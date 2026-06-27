import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { MessageThread, Product, ChatMessage } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

interface ArtisanChatroomProps {
  thread: MessageThread;
  product: Product;
  onClose: () => void;
}

const QUICK_TRANSLATIONS: Array<[RegExp, string]> = [
  [/你好/g, "Hello"],
  [/多謝晒?/g, "Thank you so much"],
  [/多謝/g, "Thank you"],
  [/麻煩/g, "Please"],
  [/報一報價錢/g, "Could you share the pricing"],
  [/可以/g, "Can"],
  [/唔會?/g, "Will it not"],
  [/唔/g, "not"],
  [/圖案/g, "pattern"],
  [/顏色/g, "colour"],
  [/柔和/g, "softer"],
  [/龍鳳呈祥/g, "dragon and phoenix motif"],
  [/幫到你/g, "help you"],
  [/換成/g, "switch to"],
  [/鴛鴦/g, "mandarin ducks"],
  [/價錢/g, "price"],
  [/今晚/g, "tonight"],
  [/樣板/g, "sample"],
  [/冇問題/g, "No problem"],
  [/霓虹燈/g, "neon sign"],
  [/唔同/g, "different"],
  [/收到/g, "Received"],
];

const buildEnglishTranslation = (
  text: string,
  fallbackPrefix: string
): string => {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  let result = trimmed;
  QUICK_TRANSLATIONS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  if (result === trimmed) {
    return `${fallbackPrefix} ${trimmed}`;
  }

  return result;
};

const ArtisanChatroom: React.FC<ArtisanChatroomProps> = ({
  thread,
  product,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const [viewMode, setViewMode] = useState<"translated" | "original">(
    "translated"
  );
  const initialMessages = useMemo<ChatMessage[]>(() => {
    if (thread.messages && thread.messages.length > 0) {
      return thread.messages;
    }

    return [
      {
        id: `${thread.id}-initial`,
        sender: "customer",
        originalText: thread.lastMessage,
        translatedText: thread.lastMessage,
        language: "zh",
        timestamp: thread.timestamp,
      },
    ];
  }, [thread]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [draftTranslation, setDraftTranslation] = useState("");

  useEffect(() => {
    setMessages(
      thread.messages && thread.messages.length > 0
        ? thread.messages
        : [
            {
              id: `${thread.id}-initial`,
              sender: "customer",
              originalText: thread.lastMessage,
              translatedText: thread.lastMessage,
              language: "zh",
              timestamp: thread.timestamp,
            },
          ]
    );
    setDraft("");
    setDraftTranslation("");
  }, [thread]);

  const getLanguageLabel = useCallback(
    (code: "en" | "zh") =>
      code === "en" ? t("languageEnglish") : t("languageChinese"),
    [t]
  );

  const computeDisplayContent = useCallback(
    (message: ChatMessage) => {
      const originalLabel = t("artisanChatroomOriginalLabel", {
        language: getLanguageLabel(message.language),
      });
      const alternateLanguage = message.language === "en" ? "zh" : "en";
      const translatedLabel = t("artisanChatroomTranslatedLabel", {
        language: getLanguageLabel(alternateLanguage),
      });

      if (viewMode === "translated") {
        if (message.language === "en" && message.translatedText) {
          return {
            primaryText: message.translatedText,
            secondary: { label: originalLabel, text: message.originalText },
          };
        }

        if (message.translatedText) {
          return {
            primaryText: message.originalText,
            secondary: { label: translatedLabel, text: message.translatedText },
          };
        }

        return { primaryText: message.originalText };
      }

      // Original mode
      if (message.translatedText) {
        return {
          primaryText: message.originalText,
          secondary: { label: translatedLabel, text: message.translatedText },
        };
      }

      return { primaryText: message.originalText };
    },
    [getLanguageLabel, t, viewMode]
  );

  const renderRichElements = useCallback(
    (text: string, options?: { textClass?: string; imageClass?: string }) => {
      const { textClass = "", imageClass = "" } = options ?? {};
      const segments: Array<
        | { type: "text"; value: string }
        | { type: "image"; src: string; alt: string }
      > = [];
      const imageRegex = /<image\s+([^>]+?)\s*\/>/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = imageRegex.exec(text)) !== null) {
        const preceding = text.slice(lastIndex, match.index);
        if (preceding.trim().length > 0) {
          segments.push({ type: "text", value: preceding });
        }
        const attrs = match[1];
        const src = attrs.match(/src="([^"]+)"/)?.[1] ?? "";
        const alt = attrs.match(/alt="([^"]*)"/)?.[1] ?? "";
        if (src) {
          segments.push({ type: "image", src, alt });
        }
        lastIndex = imageRegex.lastIndex;
      }

      const trailing = text.slice(lastIndex);
      if (trailing.trim().length > 0 || segments.length === 0) {
        segments.push({ type: "text", value: trailing });
      }

      return segments
        .map((segment, index) => {
          if (segment.type === "image") {
            return (
              <img
                key={`img-${index}-${segment.src}`}
                src={segment.src}
                alt={segment.alt || "attachment"}
                className={`w-full rounded-xl object-cover border border-[var(--color-border)] ${imageClass}`.trim()}
              />
            );
          }

          if (segment.value.trim().length === 0) {
            return null;
          }

          return (
            <p
              key={`text-${index}`}
              className={`whitespace-pre-line leading-relaxed ${textClass}`.trim()}
            >
              {segment.value}
            </p>
          );
        })
        .filter((node): node is React.ReactNode => node !== null);
    },
    []
  );

  const renderSystemMessage = useCallback(
    (
      text: string,
      timestamp: string,
      secondary?: { label: string; text: string }
    ) => {
      const trimmed = text.trim();
      const match = trimmed.match(
        /<system(?:\s+class="([^"]+)")?>([\s\S]*)<\/system>/i
      );
      const systemClass = match?.[1] ?? "";
      const body = match?.[2]?.trim() ?? trimmed;
      const palette =
        systemClass === "payment-alert"
          ? "bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-200 text-emerald-900 border border-emerald-400 shadow-[0_12px_32px_rgba(16,185,129,0.25)]"
          : "bg-[var(--color-secondary-accent)]/40 text-[var(--color-text-primary)] border border-[var(--color-border)]";
      const secondaryBody = secondary
        ? secondary.text
            .replace(
              /<system[^>]*>([\s\S]*)<\/system>/i,
              (_, inner) => inner?.trim() ?? ""
            )
            .trim()
        : "";
      const showSecondary =
        !!secondary && secondaryBody.length > 0 && secondaryBody !== body;

      return (
        <div className="flex justify-center">
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-center space-y-2 ${palette}`}
          >
            <div className="text-sm font-semibold whitespace-pre-line">
              {body}
            </div>
            {showSecondary && (
              <div className="text-xs opacity-70 whitespace-pre-line">
                <span className="block font-semibold uppercase tracking-wide mb-1">
                  {secondary?.label}
                </span>
                {secondaryBody}
              </div>
            )}
            <span className="text-xs opacity-60 block">{timestamp}</span>
          </div>
        </div>
      );
    },
    []
  );

  const isSendDisabled = draft.trim().length === 0;

  const handleDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft(value);
      setDraftTranslation(
        buildEnglishTranslation(
          value,
          t("artisanChatroomAutoTranslationFallback")
        )
      );
    },
    [t]
  );

  const handleSend = useCallback(
    (
      event:
        | React.FormEvent<HTMLFormElement>
        | React.MouseEvent<HTMLButtonElement>
    ) => {
      event.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) {
        return;
      }

      const englishVersion = buildEnglishTranslation(
        trimmed,
        t("artisanChatroomAutoTranslationFallback")
      );
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const newMessage: ChatMessage = {
        id: `artisan-${Date.now()}`,
        sender: "artisan",
        originalText: trimmed,
        translatedText: englishVersion,
        language: "zh",
        timestamp,
      };

      setMessages((prev) => [...prev, newMessage]);
      setDraft("");
      setDraftTranslation("");
    },
    [draft, t]
  );

  const translationToggle = (
    <div className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-secondary-accent)]/60 p-1 border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setViewMode("translated")}
        className={`px-4 py-1 text-xs font-medium rounded-full transition-colors ${
          viewMode === "translated"
            ? "bg-[var(--color-primary-accent)] text-white"
            : "text-[var(--color-text-secondary)]"
        }`}
      >
        {t("artisanChatroomShowTranslated")}
      </button>
      <button
        type="button"
        onClick={() => setViewMode("original")}
        className={`px-4 py-1 text-xs font-medium rounded-full transition-colors ${
          viewMode === "original"
            ? "bg-[var(--color-primary-accent)] text-white"
            : "text-[var(--color-text-secondary)]"
        }`}
      >
        {t("artisanChatroomShowOriginal")}
      </button>
    </div>
  );

  return (
    <div className="h-full w-full bg-[var(--color-bg)] flex flex-col">
      <header className="flex items-center justify-between p-4 flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md">
        <div className="text-left">
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">
            {t("chatroomWith", { name: thread.customerName })}
          </h1>
        </div>
        <button
          onClick={onClose}
          className="bg-[var(--color-surface)] p-2 rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)]"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center space-x-3">
          <img
            src={product.image}
            alt={product.name[language]}
            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
          />
          <div>
            <p className="font-semibold text-[var(--color-text-secondary)] text-sm">
              {t("artisanChatroomProductInquiry")}
            </p>
            <p className="font-bold text-[var(--color-text-primary)]">
              {product.name[language]}
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">{translationToggle}</div>
      </div>

      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map((message) => {
          const isArtisan = message.sender === "artisan";
          const { primaryText, secondary } = computeDisplayContent(message);
          const showAutoTranslatedBadge =
            message.language === "en" && viewMode === "translated";
          const trimmedPrimary = primaryText.trim();
          const isSystemMessage = trimmedPrimary.startsWith("<system");

          if (isSystemMessage) {
            return (
              <div key={message.id}>
                {renderSystemMessage(
                  trimmedPrimary,
                  message.timestamp,
                  secondary ?? undefined
                )}
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isArtisan ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[70%] space-y-1">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isArtisan
                      ? "bg-[var(--color-primary-accent)] text-white"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide mb-1">
                    <span className="opacity-70">
                      {isArtisan
                        ? t("artisanChatroomYouLabel")
                        : message.sender === "customer"
                        ? t("artisanChatroomCustomerLabel")
                        : ""}
                    </span>
                    {showAutoTranslatedBadge && (
                      <span
                        className={`font-semibold ${
                          isArtisan
                            ? "text-white/80"
                            : "text-[var(--color-primary-accent)]"
                        }`}
                      >
                        {t("artisanChatroomAutoTranslatedTag")}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {renderRichElements(primaryText, {
                      textClass: "text-sm",
                      imageClass: isArtisan ? "border-white/30" : "",
                    })}
                  </div>
                  {secondary &&
                    secondary.text.trim() !== primaryText.trim() && (
                      <div
                        className={`mt-2 ${
                          isArtisan
                            ? "text-white/80"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <span className="font-semibold text-[10px] uppercase tracking-wide block mb-1">
                          {secondary.label}
                        </span>
                        <div className="space-y-2">
                          {renderRichElements(secondary.text, {
                            textClass: "text-xs",
                            imageClass: isArtisan ? "border-white/30" : "",
                          })}
                        </div>
                      </div>
                    )}
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] block text-right">
                  {message.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="fixed bottom-0 left-0 w-full z-30 p-4 bg-[var(--color-surface)]/70 backdrop-blur-xl border-t border-[var(--color-border)] space-y-2"
        style={{
          background: "var(--color-nav-bg, var(--color-surface))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--color-nav-border, var(--color-border))",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
        onSubmit={handleSend}
      >
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={draft}
            onChange={handleDraftChange}
            placeholder={t("chatroomPlaceholder")}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
          />
          <button
            type="submit"
            className="bg-[var(--color-primary-accent)] text-white p-3 rounded-full flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSendDisabled}
          >
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
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        </div>
        {draftTranslation && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t("artisanChatroomAutoTranslateNotice")}{" "}
            <span className="text-[var(--color-primary-accent)] font-medium">
              {draftTranslation}
            </span>
          </p>
        )}
      </form>
    </div>
  );
};

export default ArtisanChatroom;
