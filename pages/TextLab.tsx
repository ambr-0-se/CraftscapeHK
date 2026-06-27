import React, { useState, useCallback, useMemo, useEffect } from "react";
import type {
  Craft,
  Product,
  AiLayout,
  CanvasElement,
  GlyphName,
} from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { useCanvasState } from "../hooks/useTextLabCanvasState";
import AiDraftModal from "../components/TextLabAiDraftModal";
import Canvas from "../components/TextLabCanvas";
import GlyphLibrary from "../components/TextLabGlyphLibrary";
import Toolbar from "../components/TextLabToolbar";
import { generateDrafts } from "../services/textLabGeminiService";
import { GLYPH_LIBRARY } from "../constants";

interface TextLabProps {
  craft?: Craft;
  product?: Product;
  onClose: () => void;
}

const TextLab: React.FC<TextLabProps> = ({ craft, product, onClose }) => {
  const { language } = useLanguage();

  const {
    elements,
    setElements,
    selectedElementId,
    setSelectedElementId,
    undo,
    redo,
    canUndo,
    canRedo,
    updateElement,
    addElement,
    duplicateSelected,
    deleteSelected,
    clearCanvas,
    bringForward,
    sendBackward,
  } = useCanvasState();

  const [fontWeight, setFontWeight] = useState(900);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<AiLayout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [lastUsedPrompt, setLastUsedPrompt] = useState("");

  const glyphMap = useMemo(
    () => new Map(GLYPH_LIBRARY.map((g) => [g.glyph, g.name])),
    []
  );

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return elements.find((el) => el.id === selectedElementId) ?? null;
  }, [elements, selectedElementId]);

  useEffect(() => {
    if (!selectedElement) return;
    const nextWeight = selectedElement.fontWeight;
    setFontWeight((current) => (current === nextWeight ? current : nextWeight));
  }, [selectedElement?.id, selectedElement?.fontWeight]);

  const currentFontWeight = selectedElement?.fontWeight ?? fontWeight;

  const handleFontWeightChange = useCallback(
    (newWeight: number) => {
      if (selectedElement) {
        updateElement(selectedElement.id, { fontWeight: newWeight });
      }
      setFontWeight(newWeight);
    },
    [selectedElement, updateElement]
  );

  const handleToggleMirror = useCallback(() => {
    if (!selectedElementId) return;
    const element = elements.find((el) => el.id === selectedElementId);
    if (!element) return;
    updateElement(selectedElementId, { isMirror: !element.isMirror });
  }, [selectedElementId, elements, updateElement]);

  const handleToggleOutline = useCallback(() => {
    if (!selectedElementId) return;
    const element = elements.find((el) => el.id === selectedElementId);
    if (!element) return;
    updateElement(selectedElementId, { isOutline: !element.isOutline });
  }, [selectedElementId, elements, updateElement]);
  const handleRequestClear = useCallback(() => {
    if (elements.length === 0) return;
    setIsClearConfirmOpen(true);
  }, [elements.length]);

  const handleConfirmClear = useCallback(() => {
    clearCanvas();
    setFontWeight(900);
    setIsClearConfirmOpen(false);
  }, [clearCanvas]);

  const handleCancelClear = useCallback(() => {
    setIsClearConfirmOpen(false);
  }, []);

  const handleGenerateDrafts = useCallback(async () => {
    if (!prompt.trim()) {
      setError(
        language === "zh"
          ? "請輸入一個概念或詞語。"
          : "Please enter a concept or word."
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    setLastUsedPrompt(prompt);
    try {
      const result = await generateDrafts(prompt);
      setDrafts(result);
      setIsModalOpen(true);
    } catch (e) {
      setError(
        language === "zh"
          ? "生成草稿失敗，請重試。"
          : "Failed to generate drafts. Please try again."
      );
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, language]);

  const handleSelectDraft = (layout: AiLayout) => {
    const newElements: CanvasElement[] = layout.elements.map((el, index) => ({
      ...el,
      id: `${Date.now()}-${index}`,
      char: glyphMap.get(el.glyph) || "?",
      zIndex: index,
      isMirror: el.isMirror ?? false,
      isOutline: el.isOutline ?? false,
    }));
    setElements(newElements);
    setIsModalOpen(false);
  };

  const handleGlyphActivate = useCallback(
    (glyph: GlyphName, char: string) => {
      const centerX = 150;
      const centerY = 150;
      const spread = 18;
      const index = elements.length;
      const ring = Math.floor(index / 6);
      const angle = (index % 6) * (Math.PI / 3);
      const offsetRadius = ring * spread + spread;
      const targetX = centerX + Math.cos(angle) * offsetRadius;
      const targetY = centerY + Math.sin(angle) * offsetRadius;
      const clamp = (value: number) => Math.min(285, Math.max(15, value));
      addElement(glyph, char, clamp(targetX), clamp(targetY));
      setIsLibraryCollapsed(true);
    },
    [elements, addElement, setIsLibraryCollapsed]
  );

  const handleExport = (format: "svg" | "pdf") => {
    const canvas = document.getElementById("canvas-svg");
    if (!canvas) return;

    let svgString = new XMLSerializer().serializeToString(canvas);

    if (format === "svg") {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "typography-stamp.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert(
        language === "zh"
          ? "PDF 匯出功能即將推出！"
          : "PDF export is a planned feature!"
      );
    }
  };

  const handleContactArtisan = useCallback(() => {
    setContactName("");
    setContactEmail("");
    const artisanName =
      craft?.artisan?.[language] || (language === "zh" ? "工藝師" : "Artisan");
    const messageTemplate =
      language === "zh"
        ? `師傅您好，我剛剛創作了這個印章設計：「${
            lastUsedPrompt || prompt
          }」，想和您討論實體化的可能性。`
        : `Hello ${artisanName}, I just created this seal design: "${
            lastUsedPrompt || prompt
          }". Could we explore making a real piece together?`;
    setContactMessage(messageTemplate);
    setContactSuccess(false);
    setIsSubmittingContact(false);
    setIsContactOpen(true);
  }, [craft, language, lastUsedPrompt, prompt]);

  const handleCloseContact = useCallback(() => {
    setIsContactOpen(false);
  }, []);

  const handleSubmitContact = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmittingContact || contactSuccess) {
        return;
      }
      setIsSubmittingContact(true);
      setTimeout(() => {
        setIsSubmittingContact(false);
        setContactSuccess(true);
      }, 600);
    },
    [contactSuccess, isSubmittingContact]
  );

  const handleDebugExport = useCallback(() => {
    // Export canvas elements in the format matching Gemini AI response
    const exportData = {
      elements: elements.map((el) => ({
        glyph: el.glyph,
        x: el.x,
        y: el.y,
        scale: el.scale,
        rotation: el.rotation,
        fontWeight: el.fontWeight,
        ...(el.isMirror && { isMirror: true }),
        ...(el.isOutline && { isOutline: true }),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    console.log("[Text Lab - Canvas Debug Export]", jsonString);

    // Copy to clipboard
    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        alert(
          language === "zh"
            ? "畫布狀態已複製到剪貼簿並記錄到控制台！"
            : "Canvas state copied to clipboard and logged to console!"
        );
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        alert(
          language === "zh"
            ? "已記錄到控制台（無法複製到剪貼簿）"
            : "Logged to console (failed to copy to clipboard)"
        );
      });
  }, [elements, language]);

  const handleDebugImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson);

      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        throw new Error("Invalid format: missing 'elements' array");
      }

      const newElements: CanvasElement[] = parsed.elements.map(
        (el: any, index: number) => {
          if (
            !el.glyph ||
            typeof el.x !== "number" ||
            typeof el.y !== "number"
          ) {
            throw new Error(`Invalid element at index ${index}`);
          }

          return {
            id: `${Date.now()}-${index}`,
            glyph: el.glyph,
            char: glyphMap.get(el.glyph) || "?",
            x: el.x,
            y: el.y,
            scale: el.scale ?? 1,
            rotation: el.rotation ?? 0,
            fontWeight: el.fontWeight ?? 900,
            zIndex: index,
            isMirror: el.isMirror ?? false,
            isOutline: el.isOutline ?? false,
          };
        }
      );

      setElements(newElements);
      setIsImportModalOpen(false);
      setImportJson("");
      console.log(
        "[Text Lab - Canvas Debug Import]",
        `Imported ${newElements.length} elements`
      );
    } catch (error) {
      console.error("[Text Lab - Canvas Debug Import] Error:", error);
      alert(
        language === "zh"
          ? `匯入失敗：${
              error instanceof Error ? error.message : "無效的 JSON 格式"
            }`
          : `Import failed: ${
              error instanceof Error ? error.message : "Invalid JSON format"
            }`
      );
    }
  }, [importJson, glyphMap, setElements, language]);

  const handleTitleClick = useCallback(() => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);

    if (newCount >= 10) {
      setShowDebugButtons(true);
      console.log("[Text Lab] Debug mode activated!");
    }

    // Reset counter after 2 seconds of inactivity
    setTimeout(() => {
      setTitleClickCount(0);
    }, 2000);
  }, [titleClickCount]);

  return (
    <div className="relative min-h-screen bg-[var(--color-page-bg)] text-[var(--color-text-primary)] flex flex-col font-sans antialiased transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between p-4 border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface)] shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-secondary-accent)] rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <svg
            className="w-8 h-8 text-[var(--color-primary-accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13" />
            <path d="M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z" />
            <path d="M5 22h14" />
          </svg>
          <h1
            className="text-xl font-bold tracking-tight cursor-pointer select-none"
            onClick={handleTitleClick}
            title={showDebugButtons ? "Debug mode active" : ""}
          >
            {language === "zh" ? "文字實驗室" : "Text Lab"}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-2 md:p-4 flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Left Panel */}
          <div className="lg:w-1/4 xl:w-1/5 flex flex-col gap-4">
            {/* AI Composition Panel */}
            <div className="p-4 bg-[var(--color-surface)] rounded-lg shadow-md flex-shrink-0 border border-[var(--color-border)]">
              <h2 className="font-bold mb-2">
                {language === "zh" ? "AI 構圖" : "AI Composition"}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                {language === "zh"
                  ? "輸入一個詞語或概念（例如：龍、香港、❤️）。"
                  : "Enter a word or concept (e.g., 'Dragon', '香港', '❤️')."}
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    language === "zh" ? "您的概念..." : "Your concept here..."
                  }
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                />
                <button
                  onClick={handleGenerateDrafts}
                  disabled={isLoading}
                  className="w-full px-4 py-2 font-semibold text-white bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading
                    ? language === "zh"
                      ? "生成中..."
                      : "Generating..."
                    : language === "zh"
                    ? "生成草稿"
                    : "Generate Drafts"}
                </button>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
            </div>

            {/* Glyph Library */}
            <GlyphLibrary
              isCollapsed={isLibraryCollapsed}
              setIsCollapsed={setIsLibraryCollapsed}
              onGlyphActivate={handleGlyphActivate}
            />
          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Toolbar */}
            <Toolbar
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              duplicateSelected={duplicateSelected}
              deleteSelected={deleteSelected}
              canModifySelection={!!selectedElementId}
              bringForward={bringForward}
              sendBackward={sendBackward}
              canBringForward={!!selectedElementId}
              canSendBackward={!!selectedElementId}
              isMirror={selectedElement?.isMirror ?? false}
              toggleMirror={handleToggleMirror}
              isOutline={selectedElement?.isOutline ?? false}
              toggleOutline={handleToggleOutline}
              fontWeight={currentFontWeight}
              onFontWeightChange={handleFontWeightChange}
            />

            {/* Canvas */}
            <Canvas
              elements={elements}
              selectedElementId={selectedElementId}
              setSelectedElementId={setSelectedElementId}
              updateElement={updateElement}
              addElement={addElement}
            />

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleExport("svg")}
                  className="px-4 py-2 text-sm font-semibold bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-accent)] rounded-md transition-colors"
                >
                  {language === "zh" ? "匯出 SVG" : "Export SVG"}
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="px-4 py-2 text-sm font-semibold bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-accent)] rounded-md transition-colors"
                >
                  {language === "zh" ? "匯出 PDF" : "Export PDF"}
                </button>
                {/* Debug buttons - only in development mode and after 10 title clicks */}
                {import.meta.env.MODE !== "production" && showDebugButtons && (
                  <>
                    <button
                      onClick={handleDebugExport}
                      disabled={elements.length === 0}
                      className="px-4 py-2 text-sm font-semibold bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 rounded-md transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                      title="Debug: Export canvas state to console and clipboard"
                    >
                      🐛 {language === "zh" ? "除錯匯出" : "Debug Export"}
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-4 py-2 text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 rounded-md transition-colors"
                      title="Debug: Import canvas state from JSON"
                    >
                      📥 {language === "zh" ? "除錯匯入" : "Debug Import"}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={handleRequestClear}
                disabled={elements.length === 0}
                className="ml-auto px-4 py-2 text-sm font-semibold rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {language === "zh" ? "清空畫布" : "Clear Canvas"}
              </button>
            </div>

            {/* Contact Artisan Button */}
            <div className="bg-[var(--color-surface)] p-4 rounded-xl text-center mt-4 border border-[var(--color-border)]">
              <h3 className="text-[17px] font-semibold text-[var(--color-primary-accent)]">
                {language === "zh" ? "喜歡您的設計？" : "Love your design?"}
              </h3>
              <button
                onClick={handleContactArtisan}
                className="mt-2 bg-[var(--color-primary-accent)] text-white font-semibold py-2 px-5 rounded-full text-[15px] hover:opacity-80 transition-colors"
              >
                {language === "zh" ? "聯繫工藝師" : "Contact Artisan"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* AI Draft Modal */}
      {isModalOpen && (
        <AiDraftModal
          drafts={drafts}
          onSelect={handleSelectDraft}
          onClose={() => setIsModalOpen(false)}
          glyphMap={glyphMap}
          language={language}
        />
      )}

      {isClearConfirmOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl p-6"
          >
            <h3 className="text-lg font-semibold mb-2">
              {language === "zh" ? "清空畫布？" : "Clear canvas?"}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              {language === "zh"
                ? "此操作會移除所有元素，且無法復原。確定要繼續嗎？"
                : "This will remove all elements and cannot be undone. Are you sure you want to continue?"}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelClear}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-accent)] transition-colors"
              >
                {language === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {language === "zh" ? "清空" : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Import Modal - only in development mode and after 10 title clicks */}
      {import.meta.env.MODE !== "production" &&
        showDebugButtons &&
        isImportModalOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-2xl rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-2">
                🐛 {language === "zh" ? "除錯匯入 JSON" : "Debug Import JSON"}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {language === "zh"
                  ? "貼上 JSON 格式的畫布數據以載入元素："
                  : "Paste JSON format canvas data to load elements:"}
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`{\n  "elements": [\n    {\n      "glyph": "gong",\n      "x": 150,\n      "y": 180,\n      "scale": 1.2,\n      "rotation": 0,\n      "fontWeight": 600\n    }\n  ]\n}`}
                className="w-full h-64 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportJson("");
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-accent)] transition-colors"
                >
                  {language === "zh" ? "取消" : "Cancel"}
                </button>
                <button
                  onClick={handleDebugImport}
                  disabled={!importJson.trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {language === "zh" ? "匯入" : "Import"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Contact Artisan Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-2xl">
            <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]">
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {language === "zh"
                    ? `聯繫${craft?.artisan?.[language] || "工藝師"}`
                    : `Contact ${craft?.artisan?.[language] || "Artisan"}`}
                </h2>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                  {language === "zh"
                    ? "分享您的印章設計理念，讓工藝師為您提供專業建議。"
                    : "Share your seal design concept and let the artisan guide the next steps."}
                </p>
              </div>
              <button
                onClick={handleCloseContact}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
            </div>

            {contactSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-accent)]/10 text-[var(--color-primary-accent)]">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                    {language === "zh" ? "訊息已發送！" : "Message sent!"}
                  </h3>
                  <p className="text-[14px] text-[var(--color-text-secondary)] mt-2">
                    {language === "zh"
                      ? `${
                          craft?.artisan?.[language] || "工藝師"
                        }將盡快回覆討論細節。`
                      : `${
                          craft?.artisan?.[language] || "Artisan"
                        } will reply soon to discuss details.`}
                  </p>
                </div>
                <button
                  onClick={handleCloseContact}
                  className="w-full mt-4 bg-[var(--color-primary-accent)] text-white font-semibold py-2.5 px-5 rounded-full text-[15px] hover:opacity-80 transition-opacity"
                >
                  {language === "zh" ? "返回" : "Back to studio"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="p-5 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5">
                      {language === "zh" ? "您的姓名" : "Your name"}
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={
                        language === "zh" ? "輸入您的姓名" : "Enter your name"
                      }
                      required
                      className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[14px] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5">
                      {language === "zh" ? "電子郵件" : "Email"}
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[14px] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5">
                      {language === "zh"
                        ? "給工藝師的訊息"
                        : "Message to the artisan"}
                    </label>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder={
                        language === "zh"
                          ? "告訴工藝師您對這個設計的想法..."
                          : "Tell the artisan what excites you about this concept..."
                      }
                      required
                      rows={5}
                      className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[14px] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] resize-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="w-full bg-[var(--color-primary-accent)] text-white font-semibold py-2.5 px-5 rounded-full text-[15px] hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingContact
                    ? language === "zh"
                      ? "發送中..."
                      : "Sending..."
                    : language === "zh"
                    ? "發送查詢"
                    : "Send inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextLab;
