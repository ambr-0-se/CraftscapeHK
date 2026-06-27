
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { AiCreation, FaceProfile, TryOnLook } from '../types';
import { CHEONGSAM_FACE_PRESETS } from '../constants';

interface AppContextType {
  favorites: Set<number>;
  aiCreations: AiCreation[];
  faceProfiles: FaceProfile[];
  activeFaceId: string | null;
  tryOnLooks: TryOnLook[];
  toggleFavorite: (id: number) => void;
  addAiCreation: (creation: Omit<AiCreation, 'id'>) => void;
  isFavorite: (id: number) => boolean;
  addFaceProfile: (face: Omit<FaceProfile, 'id' | 'createdAt'>) => string;
  setActiveFace: (faceId: string | null) => void;
  addTryOnLook: (look: Omit<TryOnLook, 'id' | 'createdAt'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [aiCreations, setAiCreations] = useState<AiCreation[]>([]);
  const [faceProfiles, setFaceProfiles] = useState<FaceProfile[]>(CHEONGSAM_FACE_PRESETS);
  const [activeFaceId, setActiveFaceId] = useState<string | null>(CHEONGSAM_FACE_PRESETS[0]?.id ?? null);
  const [tryOnLooks, setTryOnLooks] = useState<TryOnLook[]>([]);

  const toggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback((id: number) => {
    return favorites.has(id);
  }, [favorites]);

  const addAiCreation = useCallback((creation: Omit<AiCreation, 'id'>) => {
    const newCreation: AiCreation = {
      ...creation,
      id: new Date().toISOString()
    };
    setAiCreations(prev => [newCreation, ...prev]);
  }, []);

  const addFaceProfile = useCallback((face: Omit<FaceProfile, 'id' | 'createdAt'>) => {
    const id = `face-${Date.now()}`;
    const newFace: FaceProfile = {
      ...face,
      id,
      createdAt: new Date().toISOString(),
    };
    setFaceProfiles(prev => [newFace, ...prev.filter(existing => existing.id !== newFace.id)]);
    setActiveFaceId(id);
    return id;
  }, []);

  const setActiveFace = useCallback((faceId: string | null) => {
    setActiveFaceId(faceId);
  }, []);

  const addTryOnLook = useCallback((look: Omit<TryOnLook, 'id' | 'createdAt'>) => {
    const id = `tryon-${Date.now()}`;
    const newLook: TryOnLook = {
      ...look,
      id,
      createdAt: new Date().toISOString(),
    };
    setTryOnLooks(prev => [newLook, ...prev]);
  }, []);

  const value = {
    favorites,
    aiCreations,
    faceProfiles,
    activeFaceId,
    tryOnLooks,
    toggleFavorite,
    addAiCreation,
    isFavorite,
    addFaceProfile,
    setActiveFace,
    addTryOnLook,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
