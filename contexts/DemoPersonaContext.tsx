import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { ARTISANS } from '../constants';
import type { Artisan } from '../types';

export type DemoPersonaRole = 'customer' | 'artisan';

export interface DemoPersona {
  id: string;
  role: DemoPersonaRole;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  image: string;
  artisan?: Artisan;
}

interface DemoPersonaContextType {
  personas: DemoPersona[];
  activePersona: DemoPersona;
  activePersonaId: string;
  activeCustomerId: string | null;
  activeArtisanId: string | null;
  activeArtisan: Artisan | null;
  setActivePersonaId: (personaId: string) => void;
}

const DEMO_PERSONA_STORAGE_KEY = 'craftscape-demo-persona-id';
export const DEMO_CUSTOMER_ID = 'customer-demo';

const customerPersona: DemoPersona = {
  id: DEMO_CUSTOMER_ID,
  role: 'customer',
  label: { zh: '示範顧客', en: 'Demo customer' },
  description: {
    zh: '瀏覽、預約、購買及提交共創申請',
    en: 'Browses, books, buys, and submits co-creation requests',
  },
  image: '/user-avatar.jpg',
};

const toArtisanPersona = (artisan: Artisan): DemoPersona => ({
  id: `artisan-${artisan.id}`,
  role: 'artisan',
  label: artisan.name,
  description: artisan.expertise?.[0] ?? artisan.bio,
  image: artisan.image,
  artisan,
});

const getInitialPersonaId = (personas: DemoPersona[]) => {
  if (typeof window === 'undefined') {
    return DEMO_CUSTOMER_ID;
  }

  const stored = window.localStorage.getItem(DEMO_PERSONA_STORAGE_KEY);
  return stored && personas.some((persona) => persona.id === stored)
    ? stored
    : DEMO_CUSTOMER_ID;
};

const DemoPersonaContext = createContext<DemoPersonaContextType | undefined>(undefined);

export const DemoPersonaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const personas = useMemo(
    () => [customerPersona, ...ARTISANS.map(toArtisanPersona)],
    [],
  );
  const [activePersonaId, setActivePersonaIdState] = useState(() =>
    getInitialPersonaId(personas),
  );

  const setActivePersonaId = useCallback(
    (personaId: string) => {
      const nextId = personas.some((persona) => persona.id === personaId)
        ? personaId
        : DEMO_CUSTOMER_ID;
      setActivePersonaIdState(nextId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEMO_PERSONA_STORAGE_KEY, nextId);
      }
    },
    [personas],
  );

  const activePersona =
    personas.find((persona) => persona.id === activePersonaId) ?? customerPersona;
  const activeArtisan = activePersona.role === 'artisan' ? activePersona.artisan ?? null : null;

  const value: DemoPersonaContextType = {
    personas,
    activePersona,
    activePersonaId: activePersona.id,
    activeCustomerId: activePersona.role === 'customer' ? activePersona.id : null,
    activeArtisanId: activePersona.role === 'artisan' ? activePersona.id : null,
    activeArtisan,
    setActivePersonaId,
  };

  return (
    <DemoPersonaContext.Provider value={value}>
      {children}
    </DemoPersonaContext.Provider>
  );
};

export const useDemoPersona = () => {
  const context = useContext(DemoPersonaContext);
  if (!context) {
    throw new Error('useDemoPersona must be used within a DemoPersonaProvider');
  }
  return context;
};
