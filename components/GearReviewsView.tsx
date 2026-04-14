import React, { useState } from 'react';
import { EquipmentItem } from '../types';
import { Star, ArrowLeft, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbox } from './Shared';

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center text-yellow-400">
      {[...Array(5)].map((_, i) => (
        <Star 
          key={i} 
          size={16} 
          fill={i < Math.floor(rating) ? "currentColor" : "none"} 
          className={i < rating ? "text-yellow-400" : "text-gray-600"}
        />
      ))}
      <span className="ml-2 text-sm text-text-secondary">{rating.toFixed(1)}</span>
    </div>
  );
};

export const GearReviewsView: React.FC<{ items: EquipmentItem[] }> = ({ items }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  
  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  if (selectedItem) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <button 
          onClick={() => setSelectedItem(null)}
          className="flex items-center text-text-secondary hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Gear List
        </button>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div 
              className="bg-black/20 relative min-h-[300px] lg:min-h-full group cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
            >
              {selectedItem.imageUrl ? (
                <>
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name} 
                    className="w-full h-full object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-black/50 text-white p-3 rounded-full backdrop-blur-sm">
                      <ZoomIn size={24} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary absolute inset-0">
                  No Image
                </div>
              )}
            </div>
            
            <div className="p-8 lg:p-12 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  {selectedItem.category}
                </span>
                <RatingStars rating={selectedItem.rating} />
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold mb-6">{selectedItem.name}</h1>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-primary/50"></span>
                    Specs & Features
                  </h3>
                  <div className="bg-background/50 rounded-xl p-6 border border-border">
                    <p className="text-text-secondary whitespace-pre-wrap leading-relaxed font-mono text-sm">
                      {selectedItem.specs}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-primary/50"></span>
                    Review
                  </h3>
                  <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed">
                    <p className="whitespace-pre-wrap">{selectedItem.review}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Lightbox 
          isOpen={isLightboxOpen} 
          onClose={() => setIsLightboxOpen(false)} 
          items={[{ url: selectedItem.imageUrl, alt: selectedItem.name }]} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold mb-4">Gear Reviews</h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          My personal collection of astrophotography equipment, rated and reviewed.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat 
                ? 'bg-primary text-white' 
                : 'bg-surface border border-border text-text-secondary hover:text-text'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <AnimatePresence mode="popLayout">
          {filteredItems.map(item => (
            <motion.article 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className="group bg-surface border border-border rounded-lg overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg"
            >
              <div className="aspect-video overflow-hidden bg-black/20 relative">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary">
                    No Image
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-1">
                  <Star size={12} fill="currentColor" className="text-yellow-400" />
                  <span className="text-xs font-bold text-white">{item.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-xs uppercase font-bold text-primary">Gear Review</span>
                <h3 className="text-xl font-display font-bold leading-tight mt-1 mb-2 truncate text-text group-hover:text-primary transition-colors">{item.name}</h3>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs capitalize font-bold bg-primary text-white px-2 py-1 rounded shadow-md">{item.category}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-text-secondary">
          <p>No equipment found in this category.</p>
        </div>
      )}
    </div>
  );
};
