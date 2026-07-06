import React, { useState, useCallback, useEffect } from "react";
import BottomNav from "./components/BottomNav";
import ArtisanBottomNav from "./components/ArtisanBottomNav";
import Explore from "./pages/Explore";
import Marketplace from "./pages/Marketplace";
import Events from "./pages/Events";
import Profile from "./pages/Profile";
import Play from "./pages/Play";
import CraftDetail from "./views/CraftDetail";
import AiStudio from "./views/AiStudio";
import EventDetail from "./views/EventDetail";
import ProductDetail from "./views/ProductDetail";
import Chatroom from "./views/Chatroom";
import ArtisanProfile from "./views/ArtisanProfile";
import TextLab from "./pages/TextLab";
import CheckoutView from "./views/CheckoutView";
import OrderConfirmation from "./views/OrderConfirmation";
import { Tab, View, ArtisanTab, ArtisanView } from "./enums";
import type {
  Artisan,
  CheckoutIntent,
  Craft,
  Event,
  Product,
  MessageThread,
} from "./types";
import type {
  CheckoutSessionResultContract,
  CustomerOrderHistoryEntryContract,
  OrderContract,
} from "./shared/contracts";
import { cancelCheckoutOrder, getCheckoutOrder } from "./services/apiService";
import type { ProfileTab } from "./pages/Profile";
import { AnimatePresence, motion } from "framer-motion";
import { CRAFTS, PRODUCTS } from "./constants";
import OnboardingGuide from "./components/OnboardingGuide";
import { useLanguage } from "./contexts/LanguageContext";
import { useDemoPersona } from "./contexts/DemoPersonaContext";
import {
  getArtisanForCraft,
  getArtisanForProduct,
} from "./utils/listingData";

// Artisan Pages
import Dashboard from "./pages/artisan/Dashboard";
import ProductManagement from "./pages/artisan/ProductManagement";
import OrderManagement from "./pages/artisan/OrderManagement";
import ArtisanSettings from "./pages/artisan/ArtisanSettings";
import Messages from "./pages/artisan/Messages";
import ArtisanChatroom from "./views/ArtisanChatroom";

export default function App() {
  // Fix mobile viewport height bug: set --app-vh to window.innerHeight
  React.useEffect(() => {
    function setVhVar() {
      document.documentElement.style.setProperty(
        "--app-vh",
        window.innerHeight + "px"
      );
    }
    setVhVar();
    window.addEventListener("resize", setVhVar);
    window.addEventListener("orientationchange", setVhVar);
    return () => {
      window.removeEventListener("resize", setVhVar);
      window.removeEventListener("orientationchange", setVhVar);
    };
  }, []);
  const [isArtisanMode, setIsArtisanMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Explore);
  const [activeArtisanTab, setActiveArtisanTab] = useState<ArtisanTab>(
    ArtisanTab.Dashboard
  );

  // User view management
  const [currentView, setCurrentView] = useState<View>(View.Explore);
  const [selectedCraft, setSelectedCraft] = useState<Craft | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
  const [artisanReturnView, setArtisanReturnView] = useState<View>(View.Explore);
  const [aiStudioReturnView, setAiStudioReturnView] = useState<View>(View.CraftDetail);

  // Checkout & order confirmation (Objectives 8/9)
  const [checkoutIntent, setCheckoutIntent] = useState<CheckoutIntent | null>(null);
  const [confirmationEntry, setConfirmationEntry] =
    useState<CustomerOrderHistoryEntryContract | null>(null);
  const [confirmationHint, setConfirmationHint] = useState<
    "success" | "cancelled" | undefined
  >(undefined);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab | undefined>(
    undefined
  );
  const [profileOrdersNotice, setProfileOrdersNotice] = useState<string | undefined>(
    undefined
  );
  const [profileTabRequest, setProfileTabRequest] = useState(0);
  const [onboardingSessionKey, setOnboardingSessionKey] = useState(0);

  // Artisan view management
  const [currentArtisanView, setCurrentArtisanView] = useState<ArtisanView>(
    ArtisanView.List
  );
  const [selectedMessageThread, setSelectedMessageThread] =
    useState<MessageThread | null>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return localStorage.getItem("hasSeenOnboarding") !== "true";
  });
  const { language, t } = useLanguage();
  const { activeArtisanId, activePersonaId } = useDemoPersona();

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    setShowOnboarding(hasSeen !== "true");
  }, []);

  const handleCloseOnboarding = useCallback(() => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  }, []);

  const handleReopenOnboarding = useCallback(() => {
    setOnboardingSessionKey((key) => key + 1);
    setShowOnboarding(true);
  }, []);

  const openProfileTab = useCallback((tab: ProfileTab, notice?: string) => {
    setProfileOrdersNotice(notice);
    setProfileInitialTab(tab);
    setProfileTabRequest((request) => request + 1);
    setActiveTab(Tab.Profile);
    setCurrentView(View.Explore);
  }, []);

  // Handle the Stripe Checkout return redirect (?checkout=success|cancelled&orderId=…)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get("checkout");
    const orderId = params.get("orderId");
    if (!checkoutParam || !orderId) {
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    getCheckoutOrder(orderId)
      .then((entry) => {
        setConfirmationHint(checkoutParam === "success" ? "success" : "cancelled");
        setConfirmationEntry(entry);
        setCurrentView(View.OrderConfirmation);
      })
      .catch((error) => {
        console.error("Failed to load order after Stripe redirect:", error);
        openProfileTab("orders", t("checkoutReturnError"));
      });
  }, [openProfileTab, t]);

  const handleStartCheckout = useCallback((intent: CheckoutIntent) => {
    setCheckoutIntent(intent);
    setCurrentView(View.Checkout);
  }, []);

  const handleCheckoutClose = useCallback(() => {
    setCurrentView(
      checkoutIntent?.kind === "workshop"
        ? View.EventDetail
        : checkoutIntent?.kind === "product"
          ? View.ProductDetail
          : View.Explore
    );
    setCheckoutIntent(null);
  }, [checkoutIntent]);

  const handleCheckoutComplete = useCallback(
    (result: CheckoutSessionResultContract) => {
      setConfirmationEntry({ order: result.order, booking: result.booking });
      setConfirmationHint(undefined);
      setCheckoutIntent(null);
      setCurrentView(View.OrderConfirmation);
    },
    []
  );

  const handleConfirmationClose = useCallback(() => {
    setConfirmationEntry(null);
    setConfirmationHint(undefined);
    setCurrentView(View.Explore);
  }, []);

  const handleViewOrders = useCallback(() => {
    setConfirmationEntry(null);
    setConfirmationHint(undefined);
    openProfileTab("orders");
  }, [openProfileTab]);

  const handleConfirmationRetry = useCallback(
    (order: OrderContract) => {
      setConfirmationEntry(null);
      setConfirmationHint(undefined);
      handleStartCheckout({ kind: "retry", order });
    },
    [handleStartCheckout]
  );

  const handleConfirmationCancelOrder = useCallback(async (order: OrderContract) => {
    const entry = await cancelCheckoutOrder(order.id);
    setConfirmationHint(undefined);
    setConfirmationEntry(entry);
  }, []);

  const toggleArtisanMode = useCallback(() => {
    setIsArtisanMode((prev) => {
      if (!prev) {
        if (!activeArtisanId) {
          setActiveTab(Tab.Profile);
          return false;
        }
        setActiveArtisanTab(ArtisanTab.Dashboard);
      } else {
        setActiveTab(Tab.Explore);
      }
      return !prev;
    });
  }, [activeArtisanId]);

  const handleCloseDetail = useCallback(() => {
    setCurrentView(View.Explore);
    setTimeout(() => {
      setSelectedCraft(null);
      setSelectedEvent(null);
      setSelectedProduct(null);
      setSelectedArtisan(null);
    }, 300);
  }, []);

  const handleShowCraftDetails = useCallback((craft: Craft) => {
    setSelectedCraft(craft);
    setCurrentView(View.CraftDetail);
  }, []);

  const handleShowEventDetails = useCallback((event: Event) => {
    setSelectedEvent(event);
    setCurrentView(View.EventDetail);
  }, []);

  const handleShowProductDetails = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView(View.ProductDetail);
  }, []);

  const handleShowArtisanProfile = useCallback(
    (artisan: Artisan, returnView = currentView) => {
      setSelectedArtisan(artisan);
      setArtisanReturnView(returnView);
      setCurrentView(View.ArtisanProfile);
    },
    [currentView]
  );

  const handleShowCraftArtisan = useCallback(() => {
    if (!selectedCraft) return;
    const artisan = getArtisanForCraft(selectedCraft);
    if (artisan) {
      handleShowArtisanProfile(artisan, View.CraftDetail);
    }
  }, [handleShowArtisanProfile, selectedCraft]);

  const handleShowProductArtisan = useCallback(() => {
    if (!selectedProduct) return;
    const artisan = getArtisanForProduct(selectedProduct);
    if (artisan) {
      handleShowArtisanProfile(artisan, View.ProductDetail);
    }
  }, [handleShowArtisanProfile, selectedProduct]);

  const handleStartCreation = useCallback(() => {
    if (selectedCraft) {
      setAiStudioReturnView(View.CraftDetail);
      setCurrentView(View.AiStudio);
    }
  }, [selectedCraft]);

  const handleOpenChatroom = useCallback(() => {
    if (selectedProduct || selectedCraft || selectedArtisan) {
      setCurrentView(View.Chatroom);
    }
  }, [selectedArtisan, selectedCraft, selectedProduct]);

  const handleContactArtisanProfile = useCallback((artisan: Artisan) => {
    setSelectedArtisan(artisan);
    setCurrentView(View.Chatroom);
  }, []);

  const handleCloseStudio = useCallback(
    () => setCurrentView(aiStudioReturnView),
    [aiStudioReturnView]
  );
  const handleCloseProductDetail = useCallback(
    () => setCurrentView(View.Explore),
    []
  );
  const handleCloseChatroom = useCallback(() => {
    if (selectedProduct) {
      setCurrentView(View.ProductDetail);
      return;
    }
    if (selectedCraft) {
      setCurrentView(View.CraftDetail);
      return;
    }
    if (selectedArtisan) {
      setCurrentView(View.ArtisanProfile);
      return;
    }
    setCurrentView(View.Explore);
  }, [selectedArtisan, selectedCraft, selectedProduct]);

  const handleCloseArtisanProfile = useCallback(() => {
    setCurrentView(artisanReturnView);
  }, [artisanReturnView]);

  const handleSelectCraftFromArtisan = useCallback((craft: Craft) => {
    setSelectedCraft(craft);
    setCurrentView(View.CraftDetail);
  }, []);

  const handleSelectProductFromArtisan = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView(View.ProductDetail);
  }, []);

  const handleOpenTextLab = useCallback(() => {
    if (selectedProduct) {
      setCurrentView(View.TextLab);
    }
  }, [selectedProduct]);

  const handleOpenProductCustomization = useCallback(() => {
    if (!selectedProduct) return;

    if (selectedProduct.productKind === "customizable" && selectedProduct.craftId) {
      const craft = CRAFTS.find((item) => item.id === selectedProduct.craftId);
      if (craft) {
        setSelectedCraft(craft);
        setAiStudioReturnView(View.ProductDetail);
        setCurrentView(View.AiStudio);
        return;
      }
    }
  }, [selectedProduct]);

  const handleOpenCraftTextLab = useCallback(() => {
    if (selectedCraft) {
      setCurrentView(View.TextLab);
    }
  }, [selectedCraft]);

  const handleCloseTextLab = useCallback(() => {
    if (selectedProduct) {
      setCurrentView(View.ProductDetail);
    } else if (selectedCraft) {
      setCurrentView(View.CraftDetail);
    }
  }, [selectedProduct, selectedCraft]);

  // Artisan view handlers
  const handleSelectMessageThread = useCallback((thread: MessageThread) => {
    setSelectedMessageThread(thread);
    setCurrentArtisanView(ArtisanView.Chatroom);
  }, []);

  const handleCloseArtisanChatroom = useCallback(() => {
    setCurrentArtisanView(ArtisanView.List);
    setTimeout(() => {
      setSelectedMessageThread(null);
    }, 300);
  }, []);

  const selectedThreadProduct = selectedMessageThread
    ? PRODUCTS.find((p) => p.id === selectedMessageThread.productId)
    : null;
  const selectedChatArtisan =
    selectedProduct
      ? getArtisanForProduct(selectedProduct)
      : selectedCraft
      ? getArtisanForCraft(selectedCraft)
      : selectedArtisan;
  const selectedChatArtisanId = selectedChatArtisan
    ? `artisan-${selectedChatArtisan.id}`
    : undefined;

  const renderUserPage = () => {
    switch (activeTab) {
      case Tab.Explore:
        return <Explore onShowDetails={handleShowCraftDetails} />;
      case Tab.Marketplace:
        return <Marketplace onSelectProduct={handleShowProductDetails} />;
      case Tab.Events:
        return <Events onSelectEvent={handleShowEventDetails} />;
      case Tab.Play:
        return <Play />;
      case Tab.Profile:
        return (
          <Profile
            onToggleArtisanMode={toggleArtisanMode}
            onReopenOnboarding={handleReopenOnboarding}
            onStartCheckout={handleStartCheckout}
            initialTab={profileInitialTab}
            tabRequestId={profileTabRequest}
            ordersNotice={profileOrdersNotice}
          />
        );
      default:
        return <Explore onShowDetails={handleShowCraftDetails} />;
    }
  };

  const renderArtisanPage = () => {
    switch (activeArtisanTab) {
      case ArtisanTab.Dashboard:
        return <Dashboard setActiveTab={setActiveArtisanTab} />;
      case ArtisanTab.Products:
        return <ProductManagement />;
      case ArtisanTab.Orders:
        return <OrderManagement />;
      case ArtisanTab.Messages:
        return <Messages onSelectThread={handleSelectMessageThread} />;
      case ArtisanTab.Settings:
        return <ArtisanSettings onToggleArtisanMode={toggleArtisanMode} />;
      default:
        return <Dashboard setActiveTab={setActiveArtisanTab} />;
    }
  };

  const isExploreView = currentView === View.Explore;

  return (
    <div
      className="w-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] font-sans antialiased flex flex-col max-w-lg mx-auto ios-shadow border border-[var(--color-border)]"
      style={{ minHeight: "var(--app-vh, 100vh)" }}
    >
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingGuide
            key={`onboarding-${onboardingSessionKey}`}
            onClose={handleCloseOnboarding}
          />
        )}
      </AnimatePresence>
      <main className="flex-grow relative">
        {isArtisanMode ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeArtisanTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderArtisanPage()}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {currentArtisanView === ArtisanView.Chatroom &&
                selectedMessageThread && (
                  <motion.div
                    key="artisan-chatroom"
                    className="absolute inset-0 z-30"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <ArtisanChatroom
                      thread={selectedMessageThread}
                      product={selectedThreadProduct ?? undefined}
                      onClose={handleCloseArtisanChatroom}
                    />
                  </motion.div>
                )}
            </AnimatePresence>
          </>
        ) : (
          <>
            <div
              className={`transition-transform duration-300 pb-24 ${
                !isExploreView
                  ? "transform scale-95 opacity-50"
                  : "transform scale-100 opacity-100"
              }`}
            >
              {renderUserPage()}
            </div>

            {/* Fixed bottom chrome: BottomNav (with integrated center action) */}
            {(() => {
              const showPrimaryChrome = !isArtisanMode && isExploreView;
              if (!showPrimaryChrome) return null;
              return (
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[60] pointer-events-none">
                  <div className="w-full pointer-events-auto">
                    <BottomNav
                      activeTab={activeTab}
                      setActiveTab={(tab) => {
                        if (activeTab !== tab || currentView !== View.Explore) {
                          setCurrentView(View.Explore);
                          setSelectedEvent(null);
                          setSelectedCraft(null);
                          setSelectedProduct(null);
                          setSelectedArtisan(null);
                          setActiveTab(tab);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            <AnimatePresence>
              {currentView === View.CraftDetail && selectedCraft && (
                <motion.div
                  key="craft-detail"
                  className="absolute inset-0 z-20"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <CraftDetail
                    craft={selectedCraft}
                    onClose={handleCloseDetail}
                    onStartCreation={handleStartCreation}
                    onContactArtisan={handleOpenChatroom}
                    onStartTextLab={handleOpenCraftTextLab}
                    onViewArtisan={handleShowCraftArtisan}
                  />
                </motion.div>
              )}

              {currentView === View.EventDetail && selectedEvent && (
                <motion.div
                  key="event-detail"
                  className="absolute inset-0 z-20"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <EventDetail
                    event={selectedEvent}
                    onClose={handleCloseDetail}
                    onStartCheckout={handleStartCheckout}
                  />
                </motion.div>
              )}

              {currentView === View.ProductDetail && selectedProduct && (
                <motion.div
                  key="product-detail"
                  className="absolute inset-0 z-20"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <ProductDetail
                    product={selectedProduct}
                    onClose={handleCloseProductDetail}
                    onContact={handleOpenChatroom}
                    onAiGen={handleOpenProductCustomization}
                    onPurchase={() =>
                      handleStartCheckout({
                        kind: "product",
                        product: selectedProduct,
                        quantity: 1,
                      })
                    }
                    onViewArtisan={
                      getArtisanForProduct(selectedProduct)
                        ? handleShowProductArtisan
                        : undefined
                    }
                  />
                </motion.div>
              )}

              {currentView === View.ArtisanProfile && selectedArtisan && (
                <motion.div
                  key="artisan-profile"
                  className="absolute inset-0 z-[25]"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <ArtisanProfile
                    artisan={selectedArtisan}
                    onClose={handleCloseArtisanProfile}
                    onSelectCraft={handleSelectCraftFromArtisan}
                    onSelectProduct={handleSelectProductFromArtisan}
                    onContactArtisan={handleContactArtisanProfile}
                  />
                </motion.div>
              )}

              {currentView === View.AiStudio && selectedCraft && (
                <motion.div
                  key="ai-studio"
                  className="absolute inset-0 z-30"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <AiStudio craft={selectedCraft} onClose={handleCloseStudio} />
                </motion.div>
              )}

              {currentView === View.Chatroom && (selectedProduct || selectedCraft || selectedArtisan) && (
                <motion.div
                  key="chatroom"
                  className="absolute inset-0 z-30"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Chatroom
                    product={selectedProduct ?? undefined}
                    craft={selectedProduct ? undefined : selectedCraft ?? undefined}
                    artisan={!selectedProduct && !selectedCraft ? selectedArtisan ?? undefined : undefined}
                    customerId={activePersonaId}
                    artisanId={selectedChatArtisanId}
                    onClose={handleCloseChatroom}
                  />
                </motion.div>
              )}

              {currentView === View.Checkout && checkoutIntent && (
                <motion.div
                  key="checkout"
                  className="absolute inset-0 z-40"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <CheckoutView
                    intent={checkoutIntent}
                    onClose={handleCheckoutClose}
                    onComplete={handleCheckoutComplete}
                  />
                </motion.div>
              )}

              {currentView === View.OrderConfirmation && confirmationEntry && (
                <motion.div
                  key="order-confirmation"
                  className="absolute inset-0 z-40"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <OrderConfirmation
                    entry={confirmationEntry}
                    hint={confirmationHint}
                    onViewOrders={handleViewOrders}
                    onRetry={handleConfirmationRetry}
                    onCancelOrder={handleConfirmationCancelOrder}
                    onClose={handleConfirmationClose}
                  />
                </motion.div>
              )}

              {currentView === View.TextLab &&
                (selectedProduct || selectedCraft) && (
                  <motion.div
                    key="text-lab"
                    className="absolute inset-0 z-30"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {selectedProduct ? (
                      <TextLab
                        product={selectedProduct}
                        onClose={handleCloseTextLab}
                      />
                    ) : selectedCraft ? (
                      <TextLab
                        craft={selectedCraft}
                        onClose={handleCloseTextLab}
                      />
                    ) : null}
                  </motion.div>
                )}
            </AnimatePresence>
          </>
        )}
      </main>

      {isArtisanMode ? (
        <ArtisanBottomNav
          activeTab={activeArtisanTab}
          setActiveTab={setActiveArtisanTab}
        />
      ) : null}
    </div>
  );
}
