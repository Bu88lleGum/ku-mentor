'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnifiedEntity } from './EntityRecomendationList';
import { ArrowRight, ArrowLeft, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopMatchProps {
  items: UnifiedEntity[];
  onToggleFavourite: (id: number, isCurrentlyFavourited: boolean) => Promise<boolean>;
}

export function TopMatchRecommendationList({ items, onToggleFavourite }: TopMatchProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayItems = items.slice(0, 5);

  if (displayItems.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === displayItems.length - 1 ? 0 : prev + 1));
  };

  const currentItem = displayItems[currentIndex];

  return (
    <div className="space-y-4">
      {/* Шапка карусели: Название ленты + Навигационные стрелки */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <span>🔥</span> Новинки по вашим интересам
        </h2>
        
        {/* Панель управления (показываем только если элементов больше одного) */}
        {displayItems.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-sm border border-slate-200/40"
              title="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            {/* Индикатор слайдов (например: 1 / 5) */}
            <span className="text-[11px] font-extrabold text-slate-500 min-w-[36px] text-center select-none tracking-tight">
              {currentIndex + 1} / {displayItems.length}
            </span>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-sm border border-slate-200/40"
              title="Вперед"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Интерактивная карточка с анимацией смены слайда */}
      <div className="relative overflow-hidden min-h-[220px] md:min-h-[200px] bg-white rounded-2xl border border-slate-100 shadow-sm flex">
        <AnimatePresence mode="wait">
          <motion.div
            key={`top-slide-${currentItem.id}-${currentIndex}`}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            {/* Левая часть: Описание */}
            <div className="space-y-3 flex-1 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[#05A4BA] text-[10px] font-extrabold uppercase tracking-widest bg-cyan-50 px-2.5 py-1 rounded-md">
                  Идеальное совпадение
                </span>
                
                <span className="bg-amber-500 text-white font-extrabold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-amber-500/10">
                  <Star className="w-3 h-3 fill-white" />
                  Топ #{currentIndex + 1}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-800 transition-colors leading-snug line-clamp-1">
                {currentItem.title}
              </h3>
              
              {/* Описание расширено до 5 строк для красивой верстки */}
              <p className="text-slate-500 text-sm leading-relaxed font-medium line-clamp-5">
                {currentItem.description}
              </p>
            </div>

            {/* Правая часть: Кнопка действия */}
            <div className="flex items-center justify-end shrink-0 w-full md:w-auto border-t border-slate-50 md:border-none pt-4 md:pt-0">
              <Link
                href={`/course/${currentItem.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#05A4BA] hover:bg-[#1D869E] text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-100/60 w-full md:w-auto justify-center group"
              >
                Начать обучение
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}