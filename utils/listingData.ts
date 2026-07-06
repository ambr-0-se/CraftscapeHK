import { ARTISANS, CRAFTS, PRODUCTS } from "../constants";
import type { Artisan, Craft, LocalizedString, Product } from "../types";

export type LanguageCode = keyof LocalizedString;

export function textFor(value: LocalizedString | string | undefined, language: LanguageCode): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[language] || value.en || value.zh;
}

export function namesMatch(left: LocalizedString, right: LocalizedString): boolean {
  return left.zh === right.zh || left.en === right.en;
}

export function getArtisanForCraft(craft: Craft): Artisan | undefined {
  return ARTISANS.find(
    (artisan) => artisan.craftIds.includes(craft.id) || namesMatch(artisan.name, craft.artisan)
  );
}

export function getArtisanForProduct(product: Product): Artisan | undefined {
  if (product.artisanId) {
    return ARTISANS.find((artisan) => artisan.id === product.artisanId);
  }

  return ARTISANS.find((artisan) => namesMatch(artisan.name, product.artisan));
}

export function getProductsForArtisan(artisan: Artisan): Product[] {
  return PRODUCTS.filter(
    (product) => product.artisanId === artisan.id || namesMatch(product.artisan, artisan.name)
  );
}

export function getCraftsForArtisan(artisan: Artisan): Craft[] {
  return CRAFTS.filter((craft) => artisan.craftIds.includes(craft.id) || namesMatch(craft.artisan, artisan.name));
}

export function getAvailabilityLabel(product: Product, language: LanguageCode): string {
  const labels: Record<NonNullable<Product["availability"]>, LocalizedString> = {
    available: { zh: "現貨", en: "Available" },
    made_to_order: { zh: "接單製作", en: "Made to order" },
    quote_only: { zh: "需報價", en: "Quote required" },
    sold_out: { zh: "暫時售罄", en: "Sold out" },
  };

  return textFor(labels[product.availability || "available"], language);
}

export function getPurchaseCtaLabel(product: Product, language: LanguageCode): string {
  if (product.productKind === "customizable") {
    if (product.customizationMode === "quote") {
      return language === "zh" ? "查詢訂製" : "Request custom quote";
    }

    return language === "zh" ? "開始客製設計" : "Start custom design";
  }

  if (product.availability === "quote_only" || product.price <= 0) {
    return language === "zh" ? "查詢報價" : "Request quote";
  }

  if (product.availability === "made_to_order") {
    return language === "zh" ? "訂製此作品" : "Order this piece";
  }

  return language === "zh" ? "購買此作品" : "Purchase piece";
}

export function getProductKindLabel(product: Product, language: LanguageCode): string {
  if (product.productKind === "customizable") {
    return language === "zh" ? "可客製" : "Customizable";
  }

  return language === "zh" ? "標準商品" : "Ready-made";
}

export function getProductActionHint(product: Product, language: LanguageCode): string {
  if (product.productKind === "customizable") {
    return language === "zh"
      ? "開啟此工藝的 AI Studio 草擬概念，再交由師傅審視。"
      : "Open AI Studio for this craft, draft a concept, then send it for artisan review.";
  }

  return language === "zh" ? "固定價格作品，可保留商品與價格資料進入購買流程。" : "Fixed-price piece, ready to carry product and price into purchase.";
}
