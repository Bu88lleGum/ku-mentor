import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ExternalLink, BookOpen, Briefcase, Award, ChevronLeft, ChevronRight } from 'lucide-react';

export interface UnifiedEntity {
  id: number;
  title: string;
  description: string;
  source_url?: string;
  requirements?: string;
  salary_range?: string;
  location?: string;
  is_internship?: boolean;
  provider?: {
    name: string;
  };
  categories?: { id: number; name: string; }[];
  skills?: { id: number; name: string; }[] | string[];
  is_favourited?: boolean;
}

interface EntityRecommendationListProps {
  items: UnifiedEntity[];
  type: 'course' | 'vacancy';
  onToggleFavourite?: (id: number, currentStatus: boolean) => Promise<boolean>;
}

export const EntityRecommendationList: React.FC<EntityRecommendationListProps> = ({ 
  items, 
  type,
  onToggleFavourite 
}) => {
  const [favouritedIds, setFavouritedIds] = useState<Record<number, boolean>>({});
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const CARDS_PER_PAGE = 3;
  const totalItems = items.slice(0, 10);

  // СИНХРОНИЗАЦИЯ: Обновляем стейт лайков, когда items загружаются с бэкенда
  useEffect(() => {
    if (items && items.length > 0) {
      setFavouritedIds(
        items.reduce((acc, item) => ({ ...acc, [item.id]: !!item.is_favourited }), {})
      );
    }
  }, [items]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - CARDS_PER_PAGE));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => 
      Math.min(totalItems.length - CARDS_PER_PAGE, prev + CARDS_PER_PAGE)
    );
  };

  const handleLikeClick = async (id: number) => {
    const currentStatus = !!favouritedIds[id];
    
    // Оптимистичный апдейт интерфейса
    setFavouritedIds(prev => ({ ...prev, [id]: !currentStatus }));
    
    if (!currentStatus) {
      setAnimatingId(id);
      setTimeout(() => setAnimatingId(null), 400);
    }

    if (onToggleFavourite) {
      const success = await onToggleFavourite(id, currentStatus);
      if (!success) {
        // Откатываем назад в случае ошибки бэка
        setFavouritedIds(prev => ({ ...prev, [id]: currentStatus }));
      }
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-cyan-100 rounded-3xl bg-white">
        {type === 'course' ? (
          <BookOpen className="mx-auto h-10 w-10 text-cyan-500" />
        ) : (
          <Briefcase className="mx-auto h-10 w-10 text-cyan-500" />
        )}
        <h3 className="mt-4 text-base font-bold text-slate-800">Список пуст</h3>
        <p className="mt-1 text-sm text-slate-500">Рекомендации появятся после анализа профиля.</p>
      </div>
    );
  }

  const visibleItems = totalItems.slice(currentIndex, currentIndex + CARDS_PER_PAGE);

  return (
    <div className="relative w-full flex items-center gap-2 group">
      
      <button
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className={`z-10 p-2.5 rounded-full bg-white border border-slate-100 shadow-md transition-all
          ${currentIndex === 0 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-cyan-50 text-[#05A4BA] active:scale-95'
          }`}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full transition-all duration-300">
        {visibleItems.map((item) => {
          const isLiked = favouritedIds[item.id];
          const tags = type === 'course' 
            ? item.categories?.map(c => c.name) || []
            : Array.isArray(item.skills) 
              ? item.skills.map((s: any) => typeof s === 'string' ? s : s.name) 
              : [];

          return (
            <div 
              key={item.id}
              className="relative flex flex-col justify-between bg-white border border-slate-100 p-5 h-[280px] rounded-2xl hover:shadow-xl hover:border-t-4 hover:border-t-[#05A4BA] transition-all duration-300"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex flex-wrap gap-1 max-w-[80%]">
                    {type === 'course' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#1D869E] bg-cyan-50 px-2 py-0.5 rounded-md text-[10px] truncate">
                        <Award className="w-3 h-3 flex-shrink-0" />
                        {item.provider?.name || 'Курс'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                        <Briefcase className="w-3 h-3 flex-shrink-0" />
                        {item.is_internship ? 'Стажировка' : 'Вакансия'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleLikeClick(item.id)}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/50 border border-slate-100 transition-all group/btn"
                  >
                    <Heart 
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover/btn:text-rose-500'
                      } ${animatingId === item.id ? 'scale-125' : 'scale-100'}`} 
                    />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-800 line-clamp-2 mb-1 leading-snug min-h-[44px]">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
                  {type === 'course' ? item.description : (item.requirements || item.description)}
                </p>
              </div>

              <div className="space-y-3">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {tags.slice(0, 2).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full max-w-[100px] truncate"
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length > 2 && (
                      <span className="text-[10px] font-bold text-[#05A4BA] bg-cyan-50 px-1.5 py-0.5 rounded-full">
                        +{tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* ИСПРАВЛЕНО: Теперь ведет на внутренний роут приложения /course/[id] или /vacancies/[id] */}
                <Link
                  href={type === 'course' ? `/course/${item.id}` : `/vacancies/${item.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold text-white bg-[#05A4BA] hover:bg-[#1D869E] rounded-xl transition-all shadow-md shadow-cyan-100/60 active:scale-[0.98]"
                >
                  {type === 'course' ? 'К курсу' : 'Откликнуться'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={currentIndex >= totalItems.length - CARDS_PER_PAGE}
        className={`z-10 p-2.5 rounded-full bg-white border border-slate-100 shadow-md transition-all
          ${currentIndex >= totalItems.length - CARDS_PER_PAGE 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-cyan-50 text-[#05A4BA] active:scale-95'
          }`}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

    </div>
  );
};