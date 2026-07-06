import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getProducts } from "../services/apiService";
import type { Product } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { getAvailabilityLabel } from "../utils/listingData";

type MarketplaceMode = "standard" | "customizable";

interface MarketplaceProps {
  onSelectProduct: (product: Product) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ onSelectProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<MarketplaceMode>("standard");
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
        setProducts([]);
        setError(
          language === "zh"
            ? "暫時未能載入商品。"
            : "We could not load products right now."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [language]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const productKind = product.productKind || "standard";
      const matchesMode = productKind === mode;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name[language].toLowerCase().includes(normalizedSearch) ||
        product.artisan[language].toLowerCase().includes(normalizedSearch);

      return matchesMode && matchesSearch;
    });
  }, [language, mode, products, searchTerm]);

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-sm border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
          {t("marketplaceTitle")}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {mode === "customizable"
            ? language === "zh"
              ? "先建立客製概念，再交由本地師傅審視。"
              : "Start a custom concept, then send it for artisan review."
            : t("marketplaceDesc")}
        </p>
      </header>

      <div className="px-4 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full">
          <ModeButton
            label={language === "zh" ? "標準商品" : "Ready-made"}
            isActive={mode === "standard"}
            onClick={() => setMode("standard")}
          />
          <ModeButton
            label={language === "zh" ? "可客製" : "Customizable"}
            isActive={mode === "customizable"}
            onClick={() => setMode("customizable")}
          />
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder={t("marketplaceSearchPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-24">
        {isLoading ? (
          <LoadingList />
        ) : error ? (
          <StatePanel
            title={language === "zh" ? "商品載入失敗" : "Products unavailable"}
            body={error}
          />
        ) : visibleProducts.length === 0 ? (
          <StatePanel
            title={t("marketplaceNoProducts")}
            body={t("marketplaceNoProductsHint")}
          />
        ) : (
          <div className="px-4 space-y-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ModeButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`min-h-11 rounded-full text-sm font-bold transition-colors ${
      isActive
        ? "bg-[var(--color-primary-accent)] text-white"
        : "text-[var(--color-text-secondary)]"
    }`}
  >
    {label}
  </button>
);

const ProductCard: React.FC<{
  product: Product;
  onSelect: () => void;
}> = ({ product, onSelect }) => {
  const { language } = useLanguage();
  const unavailable = product.availability === "sold_out" || product.availability === "quote_only";
  const madeToOrder = product.availability === "made_to_order";
  const statusVisible = unavailable || madeToOrder;
  const secondaryLine =
    product.materialDisplay?.[language] ||
    product.fulfillmentDisplay?.[language] ||
    product.priceSubDisplay?.[language] ||
    getAvailabilityLabel(product, language);

  return (
    <motion.button
      onClick={onSelect}
      className={`w-full museum-card overflow-hidden text-left grid grid-cols-[92px_1fr] gap-3 p-3 min-h-[124px] ${
        product.availability === "sold_out" ? "opacity-60" : ""
      }`}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="relative w-[92px] h-[92px] overflow-hidden rounded-xl bg-[var(--color-page-bg)] self-center">
        <img
          src={product.image}
          alt={product.name[language]}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="min-w-0">
          {statusVisible && (
            <span className={`inline-flex mb-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              unavailable
                ? "bg-[var(--color-accent-red-light)] text-[var(--color-button-cta)]"
                : "bg-[var(--color-text-inactive)] text-[var(--color-primary-accent)]"
            }`}>
              {getAvailabilityLabel(product, language)}
            </span>
          )}
          <h3 className="font-bold text-[17px] text-[var(--color-text-primary)] leading-tight line-clamp-2">
            {product.name[language]}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] truncate mt-1">
            {product.artisan[language]}
          </p>
        </div>
        <p className="text-[18px] leading-none text-[var(--color-text-primary)] font-extrabold mt-2">
          {product.priceDisplay[language]}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-2">
          {secondaryLine}
        </p>
      </div>
    </motion.button>
  );
};

const LoadingList: React.FC = () => (
  <div className="px-4 space-y-3">
    {[...Array(5)].map((_, index) => (
      <div
        key={index}
        className="grid grid-cols-[88px_1fr] gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl min-h-[132px]"
      >
        <div className="w-[88px] h-[108px] bg-[var(--color-secondary-accent)]/20 rounded-xl animate-pulse" />
        <div className="space-y-3 py-1">
          <div className="h-4 bg-[var(--color-secondary-accent)]/20 rounded w-1/2 animate-pulse" />
          <div className="h-5 bg-[var(--color-secondary-accent)]/20 rounded w-5/6 animate-pulse" />
          <div className="h-3 bg-[var(--color-secondary-accent)]/20 rounded w-2/3 animate-pulse" />
          <div className="h-5 bg-[var(--color-secondary-accent)]/20 rounded w-1/3 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const StatePanel: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="px-4">
    <div className="museum-card p-6 text-center">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)]">{body}</p>
    </div>
  </div>
);

export default Marketplace;
