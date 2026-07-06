import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { Artisan, Craft, Product } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import {
  getCraftsForArtisan,
  getProductKindLabel,
  getProductsForArtisan,
  textFor,
} from "../utils/listingData";

interface ArtisanProfileProps {
  artisan: Artisan;
  onClose: () => void;
  onSelectCraft: (craft: Craft) => void;
  onSelectProduct: (product: Product) => void;
}

const ArtisanProfile: React.FC<ArtisanProfileProps> = ({
  artisan,
  onClose,
  onSelectCraft,
  onSelectProduct,
}) => {
  const { language } = useLanguage();
  const products = getProductsForArtisan(artisan);
  const crafts = getCraftsForArtisan(artisan);
  const groupedProducts = useMemo(
    () => ({
      standard: products.filter((product) => (product.productKind || "standard") === "standard"),
      customizable: products.filter((product) => product.productKind === "customizable"),
    }),
    [products]
  );

  return (
    <motion.div
      className="h-full w-full bg-[var(--color-page-bg)] flex flex-col overflow-y-auto"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <header className="relative bg-[var(--color-primary-accent)] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${crafts[0]?.images[0] || artisan.image})` }}
        />
        <div className="absolute inset-0 bg-[var(--color-primary-accent)]/75" />
        <button
          onClick={onClose}
          aria-label={language === "zh" ? "返回" : "Back"}
          className="absolute top-6 left-4 z-20 bg-black/30 p-3 rounded-full text-white backdrop-blur-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="relative z-10 px-6 pt-24 pb-7">
          <div className="flex items-end gap-4">
            <img
              src={artisan.image}
              alt={artisan.name[language]}
              className="w-20 h-20 rounded-full object-cover border-4 border-white/80 shadow-lg flex-shrink-0"
            />
            <div className="min-w-0 pb-1">
              <p className="text-xs font-bold uppercase tracking-wide text-white/75 mb-2">
                {language === "zh" ? "工藝師檔案" : "Artisan profile"}
              </p>
              <h1 className="text-3xl font-bold leading-tight">
                {artisan.name[language]}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {(artisan.expertise || []).map((item) => (
              <span
                key={item.en}
                className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold"
              >
                {item[language]}
              </span>
            ))}
            {artisan.responseTime && (
              <span className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold">
                {artisan.responseTime[language]}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 py-6 space-y-8 pb-28">
        <section>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            {language === "zh" ? "關於工藝師" : "About the artisan"}
          </h2>
          <p className="text-[17px] leading-relaxed text-[var(--color-text-secondary)]">
            {textFor(artisan.bio, language)}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            {language === "zh" ? "工藝專長" : "Craft expertise"}
          </h2>
          {crafts.length > 0 ? (
            <div className="space-y-3">
              {crafts.map((craft) => (
                <button
                  key={craft.id}
                  onClick={() => onSelectCraft(craft)}
                  className="w-full museum-card p-3 text-left grid grid-cols-[72px_1fr] gap-3 items-center"
                >
                  <img
                    src={craft.images[0]}
                    alt={craft.name[language]}
                    className="w-[72px] h-[72px] rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--color-text-primary)] leading-tight">
                      {craft.name[language]}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                      {craft.short_description[language]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title={language === "zh" ? "工藝資料整理中" : "Craft record in progress"}
              body={language === "zh" ? "此工藝師的工藝頁面仍在整理。" : "This artisan's craft page is still being prepared."}
            />
          )}
        </section>

        <ProductGroup
          title={language === "zh" ? "標準商品" : "Ready-made products"}
          products={groupedProducts.standard}
          onSelectProduct={onSelectProduct}
        />
        <ProductGroup
          title={language === "zh" ? "可客製商品" : "Customizable products"}
          products={groupedProducts.customizable}
          onSelectProduct={onSelectProduct}
        />

        {artisan.contactNote && (
          <section className="border-t border-[var(--color-border)] pt-5">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
              {language === "zh" ? "聯絡提示" : "Contact note"}
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              {artisan.contactNote[language]}
            </p>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)]">
        <button className="w-full bg-[var(--color-primary-accent)] text-white font-bold py-4 px-6 rounded-full">
          {language === "zh" ? "聯絡工藝師" : "Contact artisan"}
        </button>
      </div>
    </motion.div>
  );
};

const ProductGroup: React.FC<{
  title: string;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}> = ({ title, products, onSelectProduct }) => {
  const { language } = useLanguage();

  if (products.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h2>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {products.length}
        </span>
      </div>
      <div className="space-y-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="w-full museum-card p-3 text-left grid grid-cols-[72px_1fr] gap-3 items-center"
          >
            <img
              src={product.image}
              alt={product.name[language]}
              className="w-[72px] h-[72px] rounded-xl object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                  {getProductKindLabel(product, language)}
                </span>
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] leading-tight line-clamp-2">
                {product.name[language]}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {product.priceDisplay[language]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

const EmptyPanel: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
    <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
    <p className="text-sm text-[var(--color-text-secondary)]">{body}</p>
  </div>
);

export default ArtisanProfile;
