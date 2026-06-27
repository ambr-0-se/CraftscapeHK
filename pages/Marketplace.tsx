

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProducts } from '../services/apiService';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const ProductCard: React.FC<{ product: Product, onSelect: () => void }> = ({ product, onSelect }) => {
    const { language } = useLanguage();
    return (
        <motion.button 
            onClick={onSelect} 
            className="w-full museum-card overflow-hidden text-left flex flex-row group p-4"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                <img 
                    src={product.image} 
                    alt={product.name[language]} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>
            <div className="flex-1 ml-4 flex flex-col justify-center">
                <h3 className="font-semibold text-base text-[var(--color-text-primary)] mb-1 leading-tight">
                    {product.name[language]}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2 truncate">
                    {product.artisan[language]}
                </p>
                <div className="flex items-center justify-between">
                    <p className="text-[var(--color-text-primary)] font-bold text-lg">
                        {product.priceDisplay[language]}
                    </p>
                    {product.priceSubDisplay && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            {product.priceSubDisplay[language]}
                        </p>
                    )}
                </div>
            </div>
        </motion.button>
    );
};


interface MarketplaceProps {
    onSelectProduct: (product: Product) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ onSelectProduct }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { language, t } = useLanguage();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await getProducts();
            setProducts(data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(product =>
            product.name[language].toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.artisan[language].toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, products, language]);


    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-bg)] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--color-bg)]/80 backdrop-blur-sm border-b border-[var(--color-border)] px-4 py-4">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    {t('marketplaceTitle')}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                    {t('marketplaceDesc')}
                </p>
            </div>

            {/* Search */}
            <div className="px-4 py-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('marketplaceSearchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-accent)] focus:border-transparent transition-all duration-200"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Vertical Product List */}
            <div className="flex-1 pb-24">
                {isLoading ? (
                    <div className="px-4 space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex space-x-4 p-4 bg-[var(--color-surface)] rounded-xl">
                                <div className="w-20 h-20 bg-[var(--color-secondary-accent)] rounded-lg animate-pulse"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-[var(--color-secondary-accent)] rounded w-3/4 animate-pulse"></div>
                                    <div className="h-3 bg-[var(--color-secondary-accent)] rounded w-1/2 animate-pulse"></div>
                                    <div className="h-3 bg-[var(--color-secondary-accent)] rounded w-1/4 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Vertical Product List (Events-style)
                    <div className="px-4 space-y-4">
                        {filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} onSelect={() => onSelectProduct(product)} />
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-[var(--color-text-secondary)] mb-2">{t('marketplaceNoProducts')}</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">{t('marketplaceNoProductsHint')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Marketplace;
