import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import type { Craft } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { useAppContext } from "../contexts/AppContext";

interface ExploreCarouselProps {
  crafts: Craft[];
  onCardTap: (craft: Craft) => void;
  onActiveIndexChange?: (index: number) => void;
}

const ExploreCarousel: React.FC<ExploreCarouselProps> = ({
  crafts,
  onCardTap,
  onActiveIndexChange,
}) => {
  // Use visualViewport.height for accurate mobile height (address bar aware)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined"
      ? window.visualViewport?.height || window.innerHeight
      : 800
  );
  useEffect(() => {
    function handleResize() {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);
  const { language } = useLanguage();
  const { isFavorite, toggleFavorite } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openingCardId, setOpeningCardId] = useState<number | null>(null);
  const openTimeoutRef = useRef<number | null>(null);

  const SWIPE_THRESHOLD = 120;
  const SWIPE_UP_THRESHOLD = 80;
  const DIRECTION_LOCK_THRESHOLD = 12;
  const CARD_GAP = 240;

  const boundedIndex = useCallback(
    (next: number) => {
      if (next < 0) return 0;
      if (next > crafts.length - 1) return crafts.length - 1;
      return next;
    },
    [crafts.length]
  );

  const handleCardTap = useCallback(
    (craft: Craft) => {
      onCardTap(craft);
    },
    [onCardTap]
  );

  const handleOpenCraft = useCallback(
    (craft: Craft) => {
      if (openingCardId !== null) {
        return;
      }
      setOpeningCardId(craft.id);
      if (openTimeoutRef.current) {
        window.clearTimeout(openTimeoutRef.current);
      }
      openTimeoutRef.current = window.setTimeout(() => {
        handleCardTap(craft);
        setOpeningCardId(null);
        openTimeoutRef.current = null;
      }, 320);
    },
    [handleCardTap, openingCardId]
  );

  const handleNavigate = useCallback(
    (direction: 1 | -1) => {
      setCurrentIndex((prev) => boundedIndex(prev + direction));
    },
    [boundedIndex]
  );

  const cardPositions = useMemo(
    () => crafts.map((_craft, index) => index - currentIndex),
    [crafts, currentIndex]
  );

  const visibleCards = useMemo(() => {
    const items: { craft: Craft; index: number; position: number }[] = [];
    cardPositions.forEach((position, index) => {
      if (Math.abs(position) <= 1) {
        items.push({ craft: crafts[index], index, position });
      }
    });
    return items;
  }, [cardPositions, crafts]);

  const activeCraft = crafts[currentIndex];

  useEffect(() => {
    onActiveIndexChange?.(currentIndex);
  }, [currentIndex, onActiveIndexChange]);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        window.clearTimeout(openTimeoutRef.current);
      }
    };
  }, []);

  if (crafts.length === 0) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[20px]">
      {activeCraft && (
        <>
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center scale-110"
            style={{
              backgroundImage: `url(${activeCraft.images[0]})`,
              filter: "blur(40px) saturate(120%)",
              transform: "scale(1.1)",
            }}
          />
          <div className="absolute inset-0 -z-10 bg-[var(--color-bg)]/70 backdrop-blur-[60px]" />
        </>
      )}

      <div
        className="relative w-full flex items-center justify-center overflow-visible"
        style={{
          height: Math.round(
            viewportHeight * (viewportHeight < 700 ? 0.58 : 0.72)
          ),
        }}
      >
        <AnimatePresence initial={false}>
          {visibleCards.map(({ craft, index, position }) => {
            const isActive = position === 0;

            return (
              <ExploreCarouselCard
                key={craft.id}
                craft={craft}
                position={position}
                isActive={isActive}
                language={language}
                isFavorite={isFavorite(craft.id)}
                onToggleFavorite={toggleFavorite}
                onOpen={handleOpenCraft}
                onNavigate={handleNavigate}
                openingCardId={openingCardId}
                currentIndex={currentIndex}
                totalCrafts={crafts.length}
                swipeThreshold={SWIPE_THRESHOLD}
                swipeUpThreshold={SWIPE_UP_THRESHOLD}
                directionLockThreshold={DIRECTION_LOCK_THRESHOLD}
                cardGap={CARD_GAP}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExploreCarousel;

interface ExploreCarouselCardProps {
  craft: Craft;
  position: number;
  isActive: boolean;
  language: string;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onOpen: (craft: Craft) => void;
  onNavigate: (direction: 1 | -1) => void;
  openingCardId: number | null;
  currentIndex: number;
  totalCrafts: number;
  swipeThreshold: number;
  swipeUpThreshold: number;
  directionLockThreshold: number;
  cardGap: number;
}

const ExploreCarouselCard: React.FC<ExploreCarouselCardProps> = ({
  craft,
  position,
  isActive,
  language,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onNavigate,
  openingCardId,
  currentIndex,
  totalCrafts,
  swipeThreshold,
  swipeUpThreshold,
  directionLockThreshold,
  cardGap,
}) => {
  // Get viewportHeight from parent via window.visualViewport (for address bar aware sizing)
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined"
      ? window.visualViewport?.height || window.innerHeight
      : 800
  );
  useEffect(() => {
    function handleResize() {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);
  const [dragAxis, setDragAxis] = useState<"x" | "y" | null>(null);

  useEffect(() => {
    if (!isActive || openingCardId !== null) {
      setDragAxis(null);
    }
  }, [isActive, openingCardId]);

  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isActive || openingCardId !== null || dragAxis) {
        return;
      }
      const { offset } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);
      if (absX < directionLockThreshold && absY < directionLockThreshold) {
        return;
      }
      setDragAxis(absY > absX ? "y" : "x");
    },
    [directionLockThreshold, dragAxis, isActive, openingCardId]
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!isActive || openingCardId !== null) {
        setDragAxis(null);
        return;
      }

      const { offset, velocity } = info;
      const verticalTravel = offset.y;
      const horizontalTravel = offset.x;
      const absX = Math.abs(horizontalTravel);
      const absY = Math.abs(verticalTravel);
      const axis = dragAxis ?? (absY > absX ? "y" : "x");

      if (axis === "y") {
        const shouldOpen = verticalTravel < -swipeUpThreshold;
        setDragAxis(null);
        if (shouldOpen) {
          onOpen(craft);
        }
        return;
      }

      setDragAxis(null);

      const swipeLeft =
        horizontalTravel < -swipeThreshold || velocity.x < -1000;
      const swipeRight = horizontalTravel > swipeThreshold || velocity.x > 1000;

      if (swipeLeft && currentIndex < totalCrafts - 1) {
        onNavigate(1);
      } else if (swipeRight && currentIndex > 0) {
        onNavigate(-1);
      } else if (swipeRight && currentIndex === 0) {
        // Swipe right on first card to go to last card
        onNavigate(totalCrafts - 1);
      } else if (swipeLeft && currentIndex === totalCrafts - 1) {
        // Swipe left on last card to go to first card
        onNavigate(-(totalCrafts - 1));
      }
    },
    [
      craft,
      currentIndex,
      dragAxis,
      isActive,
      onNavigate,
      onOpen,
      openingCardId,
      swipeThreshold,
      swipeUpThreshold,
      totalCrafts,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setDragAxis(null);
  }, []);

  const handleToggleFavorite = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setDragAxis(null);
      onToggleFavorite(craft.id);
    },
    [craft.id, onToggleFavorite]
  );

  const handleOpenClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setDragAxis(null);
      onOpen(craft);
    },
    [craft, onOpen]
  );

  return (
    <motion.div
      className="absolute"
      style={{
        pointerEvents: isActive && openingCardId === null ? "auto" : "none",
        touchAction: isActive && openingCardId === null ? "none" : "auto",
      }}
      initial={{
        opacity: 0,
        scale: isActive ? 1.05 : 0.88,
        x: position * cardGap,
      }}
      animate={{
        x: position * cardGap,
        y: isActive && openingCardId === craft.id ? -180 : 0,
        scale: isActive ? 1.08 : 0.88,
        opacity: isActive ? 1 : 0.7,
        zIndex: 10 - Math.abs(position),
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={
        openingCardId === craft.id
          ? { duration: 0.32, ease: [0.4, 0, 0.2, 1] }
          : { duration: 0.45, ease: [0.45, 0.05, 0.55, 0.95] }
      }
      drag={isActive && openingCardId === null ? dragAxis ?? true : false}
      dragConstraints={
        isActive && openingCardId === null
          ? { top: -320, bottom: 0 }
          : undefined
      }
      dragElastic={0.22}
      dragMomentum={false}
      dragDirectionLock
      onDrag={isActive && openingCardId === null ? handleDrag : undefined}
      onDragEnd={handleDragEnd}
      onPointerCancel={handleDragCancel}
      onPointerLeave={handleDragCancel}
    >
      <div
        className={`w-[88vw] max-w-[360px] rounded-[18px] overflow-hidden bg-[var(--color-surface)] shadow-[0_24px_60px_rgba(0,0,0,0.35)]`}
        style={{
          touchAction: "none",
          height: Math.round(
            viewportHeight * (viewportHeight < 700 ? 0.54 : 0.68)
          ),
          maxHeight: viewportHeight < 700 ? 420 : 600,
        }}
      >
        <div className="relative w-full h-full" style={{ touchAction: "none" }}>
          <img
            src={craft.images[0]}
            alt={craft.name[language]}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 pr-20">
            <p className="text-sm font-semibold tracking-[0.3em] text-white/70 uppercase mb-3">
              {craft.artisan[language]}
            </p>
            <h2 className="text-[2.3rem] font-bold text-white leading-[1.1]">
              {craft.name[language]}
            </h2>
            {craft.short_description && (
              <p className="mt-4 text-sm text-white/75 leading-relaxed line-clamp-3">
                {craft.short_description[language]}
              </p>
            )}
          </div>
          <button
            type="button"
            data-no-drag
            className={`absolute top-6 right-6 z-10 p-3 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 ${
              isFavorite
                ? "bg-white text-[var(--color-button-cta)] hover:bg-white/90"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
            onClick={handleToggleFavorite}
            onPointerDownCapture={handleDragCancel}
            onPointerUpCapture={handleDragCancel}
            style={{ touchAction: "auto" }}
            aria-label={
              isFavorite
                ? language === "zh"
                  ? "移除收藏"
                  : "Remove from favorites"
                : language === "zh"
                ? "加入收藏"
                : "Add to favorites"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          </button>
          <motion.button
            type="button"
            data-no-drag
            className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-[var(--color-button-cta)] text-white flex items-center justify-center shadow-lg shadow-black/30"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onClick={handleOpenClick}
            onPointerDownCapture={handleDragCancel}
            onPointerUpCapture={handleDragCancel}
            style={{ touchAction: "auto" }}
            aria-label={
              language === "zh" ? "探索工藝詳情" : "View craft details"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
