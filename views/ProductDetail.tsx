import React, { useState } from "react";
import type { Product } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import {
  getAvailabilityLabel,
  getProductActionHint,
  getPurchaseCtaLabel,
} from "../utils/listingData";

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
  onContact: () => void;
  onViewArtisan?: () => void;
  onAiGen?: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onClose,
  onContact,
  onViewArtisan,
  onAiGen,
}) => {
  const { language, t } = useLanguage();
  const [intentVisible, setIntentVisible] = useState(false);
  const isCustomizable = product.productKind === "customizable";
  const primaryActionLabel = getPurchaseCtaLabel(product, language);
  const descriptionLabel = isCustomizable
    ? language === "zh" ? "客製說明" : "Customization details"
    : language === "zh" ? "商品說明" : "Description";

  const handlePrimaryAction = () => {
    if (isCustomizable && onAiGen) {
      onAiGen();
      return;
    }

    setIntentVisible(true);
  };

  return (
    <div className="h-full w-full bg-[var(--color-page-bg)]">
      <div className="overflow-y-auto max-h-full pb-36">
        <header className="relative">
          <img
            src={product.image}
            alt={product.name[language]}
            className="w-full h-[340px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-page-bg)] via-black/25 to-transparent" />
          <button
            onClick={onClose}
            aria-label={language === "zh" ? "返回" : "Back"}
            className="absolute top-6 left-4 bg-black/35 p-3 rounded-full text-white backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-sm">
              {product.name[language]}
            </h1>
            <p className="text-base text-white/90 font-semibold mt-2">
              {product.artisan[language]}
            </p>
          </div>
        </header>

        <div className="px-5 pt-6 pb-10 space-y-7 text-[var(--color-text-primary)]">
          <section>
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
              {descriptionLabel}
            </p>
            <p className="text-[17px] leading-relaxed text-[var(--color-text-primary)] whitespace-pre-line">
              {product.full_description[language]}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">
              {language === "zh" ? "商品資料" : "Product information"}
            </h2>
            <div className="border-t border-[var(--color-border)]">
              <DetailLine
                label={language === "zh" ? "價格" : "Price"}
                value={product.priceDisplay[language]}
                supportingValue={product.priceSubDisplay?.[language]}
              />
              <DetailLine
                label={language === "zh" ? "狀態" : "Status"}
                value={getAvailabilityLabel(product, language)}
              />
              <DetailLine
                label={language === "zh" ? "材料與工藝" : "Material and craft"}
                value={
                  product.materialDisplay?.[language] ||
                  (language === "zh" ? "由工藝師按作品確認。" : "Confirmed by the artisan for this piece.")
                }
              />
              <DetailLine
                label={language === "zh" ? "交付方式" : "Fulfilment"}
                value={
                  product.fulfillmentDisplay?.[language] ||
                  (language === "zh" ? "由工藝師確認取貨或配送方式。" : "Pickup or delivery will be confirmed by the artisan.")
                }
              />
              <DetailLine
                label={language === "zh" ? "下一步" : "Next step"}
                value={getProductActionHint(product, language)}
              />
            </div>
          </section>

          {onViewArtisan && (
            <button
              onClick={onViewArtisan}
              className="w-full py-4 border-y border-[var(--color-border)] text-left flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">
                  {language === "zh" ? "工藝師" : "Artisan"}
                </p>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                  {product.artisan[language]}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {language === "zh" ? "查看檔案、作品與回覆方式" : "View profile, work, and response details"}
                </p>
              </div>
              <span className="text-2xl text-[var(--color-primary-accent)]">→</span>
            </button>
          )}

          {intentVisible && (
            <section className="border border-[var(--color-success)] rounded-2xl p-4 bg-[var(--color-surface)]">
              <h3 className="font-bold mb-2">
                {isCustomizable
                  ? language === "zh" ? "訂製查詢已準備" : "Custom request prepared"
                  : language === "zh" ? "購買意向已準備" : "Purchase intent prepared"}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {language === "zh"
                  ? "商品、價格與工藝師資料已保留，待付款或訂單流程接上後即可繼續。"
                  : "Product, price, and artisan context are preserved for the order or payment flow once connected."}
              </p>
            </section>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] p-4">
        <button
          onClick={handlePrimaryAction}
          className="w-full bg-[var(--color-button-cta)] text-white text-center font-bold py-4 px-6 rounded-full"
        >
          {primaryActionLabel}
        </button>
        <button
          onClick={onContact}
          className="w-full mt-3 text-[var(--color-primary-accent)] text-center font-bold py-2"
        >
          {t("productDetailButton")}
        </button>
      </div>
    </div>
  );
};

const DetailLine: React.FC<{
  label: string;
  value: string;
  supportingValue?: string;
}> = ({ label, value, supportingValue }) => (
  <div className="grid grid-cols-[104px_1fr] gap-4 py-4 border-b border-[var(--color-border)]">
    <p className="text-sm font-bold text-[var(--color-text-secondary)]">
      {label}
    </p>
    <div>
      <p className="text-[16px] leading-relaxed text-[var(--color-text-primary)]">
        {value}
      </p>
      {supportingValue && (
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mt-1">
          {supportingValue}
        </p>
      )}
    </div>
  </div>
);

export default ProductDetail;
