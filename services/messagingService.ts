import { io, Socket } from 'socket.io-client';
import type {
  CreateMessageThreadInputContract,
  SendChatMessageInputContract,
} from '../shared/contracts';
import { authService } from './authService';
import type { ChatMessage, MessageThread } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_BASE_URL || deriveSocketBaseUrl(API_BASE_URL);

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

type ThreadSubscription = {
  socket: Socket;
  send: (message: SendChatMessageInputContract) => void;
  disconnect: () => void;
};

type ThreadUpdatesSubscription = {
  socket: Socket;
  disconnect: () => void;
};

function deriveSocketBaseUrl(apiBaseUrl: string): string {
  if (/^https?:\/\//.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }

  return window.location.origin;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  const token = authService.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function ensureMessageThread(
  input: CreateMessageThreadInputContract,
): Promise<MessageThread> {
  return apiRequest<MessageThread>('/messages/threads', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function sendMessageRest(
  threadId: string,
  message: SendChatMessageInputContract,
): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/messages/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify(message),
  });
}

export async function replayMessages(
  threadId: string,
  afterSequence = 0,
): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(
    `/messages/${threadId}/messages?afterSequence=${afterSequence}`,
  );
}

export function subscribeToThread(
  threadId: string,
  options: {
    afterSequence?: number;
    onMessage: (message: ChatMessage) => void;
    onReplay?: (messages: ChatMessage[]) => void;
    onConnectionChange?: (state: ConnectionState) => void;
  },
): ThreadSubscription {
  options.onConnectionChange?.('connecting');
  let latestSequence = options.afterSequence ?? 0;
  const socket = io(SOCKET_BASE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 5000,
    auth: {
      token: authService.getToken(),
    },
  });

  socket.on('connect', () => {
    options.onConnectionChange?.('connected');
    socket.emit('thread:join', {
      threadId,
      afterSequence: latestSequence,
    });
  });
  socket.io.on('reconnect_attempt', () => {
    options.onConnectionChange?.('reconnecting');
  });
  socket.on('disconnect', () => {
    options.onConnectionChange?.('offline');
  });
  socket.on('connect_error', () => {
    options.onConnectionChange?.('error');
  });
  socket.on('thread:replay', (payload: { threadId: string; messages: ChatMessage[] }) => {
    if (payload.threadId === threadId) {
      latestSequence = Math.max(
        latestSequence,
        ...payload.messages.map((message) => message.sequence ?? 0),
      );
      options.onReplay?.(payload.messages);
    }
  });
  socket.on('message:new', (payload: { threadId: string; message: ChatMessage }) => {
    if (payload.threadId === threadId) {
      latestSequence = Math.max(latestSequence, payload.message.sequence ?? 0);
      options.onMessage(payload.message);
    }
  });

  return {
    socket,
    send: (message: SendChatMessageInputContract) => {
      socket.emit('message:send', { threadId, message });
    },
    disconnect: () => {
      socket.emit('thread:leave', { threadId });
      socket.disconnect();
    },
  };
}

export function subscribeToThreadUpdates(options: {
  onThreadUpdated: (payload: { threadId: string; message?: ChatMessage }) => void;
  onConnectionChange?: (state: ConnectionState) => void;
}): ThreadUpdatesSubscription {
  options.onConnectionChange?.('connecting');
  const socket = io(SOCKET_BASE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 5000,
    auth: {
      token: authService.getToken(),
    },
  });

  socket.on('connect', () => {
    options.onConnectionChange?.('connected');
  });
  socket.io.on('reconnect_attempt', () => {
    options.onConnectionChange?.('reconnecting');
  });
  socket.on('disconnect', () => {
    options.onConnectionChange?.('offline');
  });
  socket.on('connect_error', () => {
    options.onConnectionChange?.('error');
  });
  socket.on('thread:updated', options.onThreadUpdated);

  return {
    socket,
    disconnect: () => {
      socket.off('thread:updated', options.onThreadUpdated);
      socket.disconnect();
    },
  };
}
