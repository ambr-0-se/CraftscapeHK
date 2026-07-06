import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MESSAGE_THREAD_CONTEXT_TYPE_LABELS,
  MessageSenderRole,
  MessageThreadContextType,
  MessageType,
} from "../shared/contracts";
import type { LanguageCode, SendChatMessageInputContract } from "../shared/contracts";
import type { Artisan, ChatMessage, Craft, MessageThread, Product } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import {
  ensureMessageThread,
  sendMessageRest,
  subscribeToThread,
} from "../services/messagingService";

interface ChatroomProps {
  product?: Product;
  craft?: Craft;
  artisan?: Artisan;
  customerId: string;
  artisanId?: string;
  onClose: () => void;
}

type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";

const mergeMessages = (
  current: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] => {
  const getKey = (message: ChatMessage) => message.clientMutationId || message.id;
  const map = new Map(current.map((message) => [getKey(message), message]));
  incoming.forEach((message) => map.set(getKey(message), message));
  return Array.from(map.values()).sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
  );
};

const connectionCopy: Record<ConnectionState, { en: string; zh: string }> = {
  connecting: { en: "Connecting to artisan chat", zh: "正在連接師傅訊息" },
  connected: { en: "Live conversation", zh: "即時對話已連線" },
  reconnecting: { en: "Reconnecting, draft kept", zh: "重新連線中，草稿已保留" },
  offline: { en: "Offline, messages will retry", zh: "離線中，訊息會稍後重試" },
  error: { en: "Connection issue, REST fallback ready", zh: "連線異常，可用備援發送" },
};

const buildLocalThread = (
  context: ChatContext,
  customerId: string,
  artisanId: string
): MessageThread => ({
  id: `local-${context.contextType}-${context.contextId}`,
  customerId,
  artisanId,
  customerName: "Craftscape customer",
  lastMessage: "",
  lastMessagePreview: "",
  lastMessageAt: new Date().toISOString(),
  timestamp: "",
  unread: false,
  unreadCount: 0,
  avatar: context.image,
  contextType: context.contextType,
  contextId: context.contextId,
  contextLabel: context.contextLabel,
  productId: context.productId,
  messages: [],
});

type ChatContext = {
  artisanName: string;
  artisanId: string;
  contextType: MessageThreadContextType;
  contextId: string;
  contextLabel: string;
  image: string;
  productId?: number;
};

const isLocalThread = (threadId: string) => threadId.startsWith("local-");

const toArtisanUserId = (id?: number) => (id ? `artisan-${id}` : "artisan-1");

const Chatroom: React.FC<ChatroomProps> = ({
  product,
  craft,
  artisan,
  customerId,
  artisanId,
  onClose,
}) => {
  const { language, t } = useLanguage();
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [viewMode, setViewMode] = useState<"translated" | "original">(
    "translated"
  );
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof subscribeToThread> | null>(
    null
  );
  const pendingOutboundRef = useRef<SendChatMessageInputContract[]>([]);
  const chatContext = useMemo<ChatContext>(() => {
    if (product) {
      return {
        artisanName: product.artisan[language],
        artisanId: artisanId ?? toArtisanUserId(product.artisanId),
        contextType: MessageThreadContextType.Product,
        contextId: String(product.id),
        contextLabel: product.name[language],
        image: product.image,
        productId: product.id,
      };
    }

    if (craft) {
      return {
        artisanName: craft.artisan[language],
        artisanId: artisanId ?? "artisan-1",
        contextType: MessageThreadContextType.Craft,
        contextId: String(craft.id),
        contextLabel: craft.name[language],
        image: craft.images[0],
      };
    }

    if (artisan) {
      return {
        artisanName: artisan.name[language],
        artisanId: artisanId ?? toArtisanUserId(artisan.id),
        contextType: MessageThreadContextType.Craft,
        contextId: `artisan-profile-${artisan.id}`,
        contextLabel: artisan.name[language],
        image: artisan.image,
      };
    }

    return {
      artisanName: t("artisanChatroomContextFallback"),
      artisanId: artisanId ?? "artisan-1",
      contextType: MessageThreadContextType.CoCreationRequest,
      contextId: "general",
      contextLabel: t("artisanChatroomContextFallback"),
      image: "",
    };
  }, [artisan, artisanId, craft, language, product, t]);

  useEffect(() => {
    let isActive = true;
    const localThread = buildLocalThread(chatContext, customerId, chatContext.artisanId);
    setThread(localThread);
    setMessages([]);
    setError(null);
    setConnectionState("connecting");

    const bootThread = async () => {
      try {
        const ensured = await ensureMessageThread({
          contextType: chatContext.contextType,
          contextId: chatContext.contextId,
          contextLabel: chatContext.contextLabel,
          productId: chatContext.productId,
          customerId,
          artisanId: chatContext.artisanId,
          customerName: "Craftscape customer",
        });
        if (!isActive) return;
        setThread(ensured);
        setMessages((current) => mergeMessages(current, ensured.messages ?? []));

        const afterSequence = Math.max(
          0,
          ...(ensured.messages ?? []).map((message) => message.sequence ?? 0)
        );
        subscriptionRef.current?.disconnect();
        subscriptionRef.current = subscribeToThread(ensured.id, {
          afterSequence,
          onConnectionChange: setConnectionState,
          onReplay: (incoming) => {
            setMessages((current) => mergeMessages(current, incoming));
          },
          onMessage: (message) => {
            setMessages((current) => mergeMessages(current, [message]));
          },
        });

        const pending = [...pendingOutboundRef.current];
        pendingOutboundRef.current = [];
        for (const payload of pending) {
          try {
            const saved = await sendMessageRest(ensured.id, payload);
            if (!isActive) return;
            setMessages((current) => mergeMessages(current, [saved]));
          } catch (err) {
            pendingOutboundRef.current.push(payload);
            setError(t("chatroomSendError"));
          }
        }
        if (pendingOutboundRef.current.length === 0) {
          setError(null);
        }
      } catch (err) {
        console.error("Failed to open message thread:", err);
        if (isActive) {
          setThread(localThread);
          setMessages([]);
          setError(t("chatroomOfflineDraftNotice"));
          setConnectionState("error");
        }
      }
    };

    bootThread();

    return () => {
      isActive = false;
      subscriptionRef.current?.disconnect();
      subscriptionRef.current = null;
    };
  }, [chatContext, customerId, t]);

  const latestSequence = useMemo(
    () => Math.max(0, ...messages.map((message) => message.sequence ?? 0)),
    [messages]
  );

  const displayMessages = messages.length
    ? messages
    : [
        {
          id: "empty-helper",
          sender: "system" as const,
          senderRole: MessageSenderRole.System,
          originalText: t("chatroomEmptyThread"),
          language: language === "zh" ? "zh" : "en",
          timestamp: "",
        },
      ];

  const getDisplayText = useCallback(
    (message: ChatMessage) => {
      if (viewMode === "translated" && message.translatedText) {
        return {
          primary: message.translatedText,
          secondary: message.originalText,
        };
      }
      return {
        primary: message.originalText,
        secondary: message.translatedText,
      };
    },
    [viewMode]
  );

  const handleSend = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed || !thread) return;

      const clientMutationId = `customer-${Date.now()}`;
      const sourceLanguage: LanguageCode = language === "zh" ? "zh" : "en";
      const targetLanguage: LanguageCode = language === "zh" ? "en" : "zh";
      const optimistic: ChatMessage = {
        id: clientMutationId,
        threadId: thread.id,
        sequence: latestSequence + 1,
        sender: "customer",
        senderRole: MessageSenderRole.Customer,
        type: MessageType.Text,
        originalText: trimmed,
        sourceLanguage,
        targetLanguage,
        language: sourceLanguage === "zh" ? "zh" : "en",
        timestamp: t("chatroomSending"),
        clientMutationId,
      };

      setMessages((current) => mergeMessages(current, [optimistic]));
      setDraft("");

      const payload: SendChatMessageInputContract = {
        senderRole: MessageSenderRole.Customer,
        type: MessageType.Text,
        originalText: trimmed,
        sourceLanguage,
        targetLanguage,
        clientMutationId,
      };

      try {
        if (isLocalThread(thread.id)) {
          pendingOutboundRef.current.push(payload);
          setError(t("chatroomOfflineDraftNotice"));
        } else if (subscriptionRef.current?.socket.connected) {
          subscriptionRef.current.send(payload);
        } else {
          const saved = await sendMessageRest(thread.id, payload);
          setMessages((current) => mergeMessages(current, [saved]));
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        setError(t("chatroomSendError"));
      }
    },
    [draft, language, latestSequence, t, thread]
  );

  return (
    <div className="relative h-full w-full bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <header className="flex items-start justify-between p-4 flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
        <div className="text-left pr-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-red)]">
            {MESSAGE_THREAD_CONTEXT_TYPE_LABELS[chatContext.contextType][language]}
          </p>
          <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] leading-tight">
            {t("chatroomWith", { name: chatContext.artisanName })}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {chatContext.contextLabel}
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-[var(--color-surface)] p-2 rounded-full text-[var(--color-text-primary)] border border-[var(--color-border)]"
          aria-label={t("chatroomClose")}
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
        <div className="flex items-center gap-3">
          <img
            src={chatContext.image}
            alt={chatContext.contextLabel}
            className="h-12 w-12 rounded-xl object-cover border border-[var(--color-border)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {thread?.contextLabel || chatContext.contextLabel}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {connectionCopy[connectionState][language]}
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <div className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-secondary-accent)]/10 p-1 border border-[var(--color-border)]">
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
        </div>
        {error && (
          <p className="mt-3 rounded-xl border border-[var(--color-accent-red-light)] bg-[var(--color-accent-red)]/10 px-3 py-2 text-sm text-[var(--color-text-red)]">
            {error}
          </p>
        )}
      </div>

      <div className="flex-grow p-4 pb-32 space-y-4 overflow-y-auto">
        {displayMessages.map((message) => {
          const isMine = message.sender === "customer";
          const isSystem = message.sender === "system";
          const { primary, secondary } = getDisplayText(message);
          return (
            <div
              key={message.id}
              className={`flex ${
                isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                  isSystem
                    ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-center text-[var(--color-text-secondary)]"
                    : isMine
                    ? "bg-[var(--color-primary-accent)] text-white"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {primary}
                </p>
                {secondary && secondary !== primary && !isSystem && (
                  <p
                    className={`mt-2 border-t pt-2 text-xs leading-relaxed whitespace-pre-line ${
                      isMine
                        ? "border-white/25 text-white/80"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {secondary}
                  </p>
                )}
                {message.timestamp && (
                  <span
                    className={`mt-2 block text-[11px] ${
                      isMine ? "text-white/70" : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {message.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-[var(--color-surface)]/80 backdrop-blur-xl border-t border-[var(--color-border)]"
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
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("chatroomPlaceholder")}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
          />
          <button
            type="submit"
            className="bg-[var(--color-primary-accent)] text-white p-3 rounded-full flex-shrink-0 disabled:opacity-50"
            disabled={!draft.trim() || !thread}
            aria-label={t("chatroomSend")}
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
      </form>
    </div>
  );
};

export default Chatroom;
