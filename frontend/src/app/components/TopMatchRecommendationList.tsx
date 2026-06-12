'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UnifiedEntity } from './EntityRecomendationList'
import { ArrowRight, ArrowLeft, Star, Heart, Briefcase, Award, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopMatchProps {
  items: UnifiedEntity[];
  type: 'course' | 'vacancy';
  onToggleFavourite?: (id: number, isCurrentlyFavourited: boolean) => Promise<boolean>;
}

export function TopMatchRecommendationList({ items, type, onToggleFavourite }: TopMatchProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favouritedIds, setFavouritedIds] = useState<Record<number, boolean>>({});
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const displayItems = items.slice(0, 5);
  const isCourse = type === 'course';

  // Сбрасываем индекс строго при смене типа ИЛИ изменении пула элементов
  useEffect(() => {
    setCurrentIndex(0);
  }, [type, items]);

  // Синхронизируем состояние избранного
  useEffect(() => {
    if (displayItems.length > 0) {
      setFavouritedIds(
        displayItems.reduce((acc, item) => ({ ...acc, [item.id]: !!item.is_favourited }), {})
      );
    }
  }, [items]);

  if (displayItems.length === 0) return null;

  // Безопасный перехват индекса (защита от вылета за пределы нового массива)
  const safeIndex = currentIndex >= displayItems.length ? 0 : currentIndex;
  const currentItem = displayItems[safeIndex];

  // ИСПРАВЛЕННАЯ ВАЛИДАЦИЯ: 
  // Курс не может быть стажировкой. Вакансия не должна иметь объект provider.
  // Завязываться на обязательное наличие provider для курса опасно, если бэк его не прислал.
  const isDataMismatch = isCourse 
    ? !!currentItem?.is_internship 
    : !currentItem?.is_internship && !!currentItem?.provider;

  if (isDataMismatch && items.length > 0) {
    // Ждем, пока пропсы и стейт синхронизируются после переключения вкладки
    return null; 
  }
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === displayItems.length - 1 ? 0 : prev + 1));
  };

  const handleLikeClick = async (id: number) => {
    const currentStatus = !!favouritedIds[id];
    setFavouritedIds(prev => ({ ...prev, [id]: !currentStatus }));
    
    if (!currentStatus) {
      setAnimatingId(id);
      setTimeout(() => setAnimatingId(null), 400);
    }

    if (onToggleFavourite) {
      const success = await onToggleFavourite(id, currentStatus);
      if (!success) {
        setFavouritedIds(prev => ({ ...prev, [id]: currentStatus }));
      }
    }
  };

  const isLiked = favouritedIds[currentItem.id];
  const frontendPath = isCourse ? 'course' : 'vacancies';
  const actionButtonText = isCourse ? 'Начать обучение' : 'Откликнуться';

  return (
    <div className="space-y-4">
      {/* Шапка карусели */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <span>🔥</span> {isCourse ? 'Новинки по вашим интересам' : 'Лучшие вакансии под ваш стек'}
        </h2>
        
        {/* Панель управления */}
        {displayItems.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-sm border border-slate-200/40"
              title="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <span className="text-[11px] font-extrabold text-slate-500 min-w-[36px] text-center select-none tracking-tight">
              {safeIndex + 1} / {displayItems.length}
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

      {/* Интерактивная карточка */}
      <div className="relative overflow-hidden min-h-[240px] md:min-h-[200px] bg-white rounded-2xl border border-slate-100 shadow-sm flex">
        <AnimatePresence mode="wait">
          <motion.div
            // ВАЖНО: Хеш ключа теперь явно включает в себя тип, чтобы AnimatePresence 
            // понимал, что старую карточку нужно полностью размонтировать без сохранения стейта контента
            key={`top-slide-${type}-${currentItem.id}-${safeIndex}`}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
            {/* Левая часть: Описание и Метаданные */}
            <div className="space-y-3 flex-1 max-w-3xl w-full">
              <div className="flex flex-wrap items-center gap-2">
                {isCourse ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#1D869E] bg-cyan-50 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                    <Award className="w-3 h-3" />
                    {currentItem.provider?.name || 'Курс'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                    <Briefcase className="w-3 h-3" />
                    {currentItem.is_internship ? 'Стажировка' : 'Вакансия'}
                  </span>
                )}
                
                <span className="bg-amber-500 text-white font-extrabold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-amber-500/10">
                  <Star className="w-3 h-3 fill-white" />
                  Матч #{safeIndex + 1}
                </span>

                {!isCourse && currentItem.salary_range && (
                  <span className="text-emerald-600 text-[10px] font-extrabold bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    💰 {currentItem.salary_range}
                  </span>
                )}
                {!isCourse && currentItem.location && (
                  <span className="text-slate-500 text-[10px] font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {currentItem.location}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-800 transition-colors leading-snug line-clamp-1">
                {currentItem.title}
              </h3>
              
              <p className="text-slate-500 text-sm leading-relaxed font-medium line-clamp-3 md:line-clamp-4">
                {isCourse ? currentItem.description : (currentItem.requirements || currentItem.description)}
              </p>
            </div>

            {/* Правая часть: Управление + Кнопка действия */}
            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto border-t border-slate-50 md:border-none pt-4 md:pt-0 justify-between md:justify-end">
              <button
                onClick={() => handleLikeClick(currentItem.id)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 border border-slate-100 transition-all group/btn shrink-0"
                title={isLiked ? "Убрать из избранного" : "В избранное"}
              >
                <Heart 
                  className={`w-4 h-4 transition-all duration-200 ${
                    isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-500'
                  } ${animatingId === currentItem.id ? 'scale-125' : 'scale-100'}`} 
                />
              </button>

              <Link
                href={`/${frontendPath}/${currentItem.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#05A4BA] hover:bg-[#1D869E] text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-100/60 flex-1 md:flex-initial justify-center group"
              >
                {actionButtonText}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}