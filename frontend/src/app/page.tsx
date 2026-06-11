'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { fetchUserProfile } from "./services/userService";
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import HeaderPage from './components/header';
import { EntityRecommendationList, UnifiedEntity } from './components/EntityRecomendationList';
import { BookOpen, Briefcase, Search, Sparkles } from 'lucide-react';
import { TopMatchRecommendationList } from './components/TopMatchRecommendationList';

interface SearchResult {
  id: number;
  title: string;
  description: string;
  location?: string;
  salary_range?: string;
  is_internship?: boolean;
}

export default function Home() {
  const searchParams = useSearchParams();
  const [warning, setWarning] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestLoading, setLatestLoading] = useState(false); // Отдельный лоадер для новинок

  const [currentMode, setCurrentMode] = useState<"course" | "vacancy">("course");

  const [recommendations, setRecommendations] = useState<UnifiedEntity[]>([]);
  const [latestCourses, setLatestCourses] = useState<UnifiedEntity[]>([]); // Стейт для последних курсов
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]); 
  const [isSearching, setIsSearching] = useState(false);

  const [topMatches, setTopMatches] = useState<UnifiedEntity[]>([]);
  const [topMatchesLoading, setTopMatchesLoading] = useState(false);

  // 2. Добавляем функцию загрузки ТОП-5 мэтчей
  const loadTopMatches = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return; // Так как это подборка по интересам, нужен токен

    setTopMatchesLoading(true);
    try {
      // Представим, что бэкенд отдает именно пересечение новинок и интересов
      const response = await fetch(`http://127.0.0.1:8000/course/personalized-trending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setTopMatches(Array.isArray(data) ? data.slice(0, 5) : (data.results?.slice(0, 5) || []));
    } catch (error) {
      console.error("Ошибка при загрузке топ-мэтчей:", error);
      setTopMatches([]);
    } finally {
      setTopMatchesLoading(false);
    }
  }, []);



  // 1. ЗАГРУЗКА ПЕРСОНАЛЬНЫХ РЕКОМЕНДАЦИЙ
  const loadDefaultRecommendations = useCallback(async (mode: "course" | "vacancy") => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const endpoint = mode === "course" ? "/course/recommendations" : "/vacancies/recommendations";
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        setIsAuth(false);
        return;
      }

      const data = await response.json();
      setRecommendations(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Ошибка при загрузке рекомендаций:", error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ДОБАВЛЕНО: ЗАГРУЗКА ПОСЛЕДНИХ КУРСОВ (НОВИНОК)
  const loadLatestCourses = useCallback(async () => {
    setLatestLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/course/latest`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setLatestCourses(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Ошибка при загрузке последних курсов:", error);
      setLatestCourses([]);
    } finally {
      setLatestLoading(false);
    }
  }, []);

  // Синхронизация вкладок
  useEffect(() => {
    setQuery('');
    setWarning('');
    setSearchResults([]);
    setIsSearching(false);
    
    if (isAuth) {
      loadDefaultRecommendations(currentMode);
      // Запускаем только на вкладке курсов при авторизации
      if (currentMode === "course") {
        loadTopMatches();
      }
    } else {
      setRecommendations([]);
      setTopMatches([]);
    }

    if (currentMode === "course") {
      loadLatestCourses();
    }
  }, [currentMode, isAuth, loadDefaultRecommendations, loadLatestCourses, loadTopMatches]);

  // 2. ВЫПОЛНЕНИЕ ПОИСКА
  const executeSearch = useCallback(async (searchQuery: string, mode: "course" | "vacancy") => {
    if (searchQuery.trim().length < 3) {
      setWarning('Запрос должен содержать минимум 3 буквы');
      return;
    }

    setLoading(true);
    setWarning('');
    setIsSearching(true);

    try {
      const token = localStorage.getItem("token");
      const endpoint = mode === "course" ? "/recommend/" : "/recommend/vacancy";
      
      const response = await fetch(`http://127.0.0.1:8000${endpoint}?user_query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.status === 401) {
        setIsAuth(false);
        return;
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        const autoFoundArray = Object.values(data).find(val => Array.isArray(val));
        setSearchResults(Array.isArray(autoFoundArray) ? (autoFoundArray as SearchResult[]) : []);
      }
    } catch (error) {
      console.error("Ошибка соединения:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('');

    if (query.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      await loadDefaultRecommendations(currentMode);
      if (currentMode === "course") {
        await loadLatestCourses();
        await loadTopMatches(); // <-- Перезапрашиваем при очистке поиска
      }
      return;
    }

    if (query.trim().length < 3) {
      setWarning('Запрос должен содержать минимум 3 буквы');
      return;
    }
    
    await executeSearch(query, currentMode);
  };

  const handleToggleFavourite = async (id: number, isCurrentlyFavourited: boolean): Promise<boolean> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    // Выбираем правильный префикс в зависимости от режима (курсы или вакансии)
    // Убедитесь, что эти пути совпадают с роутерами FastAPI (например, /courses или /vacancies)
    const entityPath = currentMode === "course" ? "course" : "vacancy";
    
    // ОПРЕДЕЛЯЕМ МЕТОД: если уже в избранном — отправляем DELETE для удаления, иначе POST для добавления
    const HTTPMethod = isCurrentlyFavourited ? 'DELETE' : 'POST';

    const response = await fetch(`http://127.0.0.1:8000/${entityPath}/${id}/favourite`, {
      method: HTTPMethod,
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) {
      console.error(`Бэкенд вернул ошибку ${response.status} при попытке ${HTTPMethod}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Ошибка сети при переключении избранного:", error);
    return false;
  }
};

  useEffect(() => {
    const token = localStorage.getItem("token");
    const checkAuth = async () => {
      if (!token) return;
      try {
        await fetchUserProfile(); 
        setIsAuth(true);
        loadDefaultRecommendations(currentMode);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuth(false);
        window.dispatchEvent(new CustomEvent("show-toast", { 
          detail: "Сессия истекла. Пожалуйста, войдите в аккаунт снова." 
        }));
      }
    };
    checkAuth();
  }, [currentMode, loadDefaultRecommendations]);

  useEffect(() => {
    const queryFromUrl = searchParams.get('query');
    if (queryFromUrl && isAuth) {
      setQuery(queryFromUrl);
      executeSearch(queryFromUrl, currentMode);
    }
  }, [searchParams, isAuth, executeSearch]);
  
  const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse shadow-sm h-[200px] flex flex-col justify-between">
      <div>
        <div className="flex justify-between mb-4">
          <div className="h-5 w-2/3 bg-slate-200 rounded-lg"></div>
          <div className="h-5 w-14 bg-slate-100 rounded-full"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full bg-slate-100 rounded"></div>
          <div className="h-3.5 w-5/6 bg-slate-100 rounded"></div>
        </div>
      </div>
      <div className="h-8 w-24 bg-slate-200 rounded-xl align-self-end self-end"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <HeaderPage isAuth={isAuth} />
      
      <header className="relative pt-16 pb-28 bg-gradient-to-br from-[#A9F4FF] via-[#05A4BA] to-[#1D869E]">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold text-white my-14 tracking-tight">KU Mentor</h1>
          <p className="text-xl text-[#A9F4FF] max-w-3xl mx-auto px-4 font-medium opacity-90">
            {currentMode === "course" 
              ? "Твой персональный ИИ-секретарь: найди курс по смыслу, а не по буквам."
              : "Найди идеальное место работы: умный поиск вакансий и стажировок."
            }
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 -mt-14 relative z-10">
        
        {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
        <div className="flex justify-start mb-3 ml-1">
          <div className="bg-slate-900/10 backdrop-blur-sm p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setCurrentMode("course")}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                currentMode === "course"
                  ? "bg-white text-[#1D869E] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Курсы
            </button>
            <button
              onClick={() => setCurrentMode("vacancy")}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                currentMode === "vacancy"
                  ? "bg-white text-[#1D869E] shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Вакансии
            </button>
          </div>
        </div>

        {/* Поисковая панель */}
        <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
          {!isAuth && (
            <div className="m-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
              <span className="text-amber-600 text-base">🔒</span>
              <p className="text-amber-800 text-xs font-semibold">
                Пожалуйста, <Link href="/login" className="underline font-bold hover:text-amber-900">войдите в систему</Link>, чтобы активировать подбор рекомендаций.
              </p>
            </div>
          )}

          <form onSubmit={handleSearch} className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text"
              disabled={!isAuth}
              className={`w-full py-4.5 pl-12 pr-36 text-base rounded-xl transition-all duration-200 ${
                !isAuth 
                  ? "bg-slate-50 cursor-not-allowed text-slate-400 placeholder-slate-400" 
                  : "bg-white text-slate-900 outline-none placeholder-slate-400 focus:bg-slate-50/40"
              }`}
              placeholder={isAuth ? `Опиши запрос или оставь пустым для вывода рекомендаций (${currentMode === 'course' ? 'курсы' : 'вакансии'})...` : "Поиск доступен только после входа"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            <button 
              type="submit"
              disabled={!isAuth || loading}
              className={`absolute right-2 top-2 bottom-2 px-8 text-xs font-extrabold rounded-xl transition-all ${
                !isAuth 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-[#05A4BA] hover:bg-[#1D869E] text-white shadow-md shadow-cyan-100/60 active:scale-95 disabled:opacity-50"
              }`}
            >
              {loading ? '...' : 'Найти'}
            </button>
          </form>

          {warning && (
            <div className="m-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-pulse">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-700 text-xs font-semibold">{warning}</p>
            </div>
          )}
        </div>

        {/* Сетка скелетонов */}
        {(loading || latestLoading) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10">
            {[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Скелетон для топ-матчей во всю ширину */}
        {topMatchesLoading && !loading && (
          <div className="space-y-5 mt-10">
            {[1, 2].map((i) => (
              <div key={i} className="w-full h-[180px] bg-white p-8 rounded-2xl border border-slate-100 animate-pulse shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
                  <div className="h-6 w-1/2 bg-slate-200 rounded"></div>
                  <div className="h-3 w-full bg-slate-100 rounded"></div>
                  <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
                </div>
                <div className="h-9 w-32 bg-slate-200 rounded-xl self-end"></div>
              </div>
            ))}
          </div>
        )}

        {/* Контентная зона */}
        <div className="mt-10 pb-20">
          <AnimatePresence mode="wait">
            
            {/* СЦЕНАРИЙ А: ДЕФОЛТНЫЙ ВЫВОД (НЕ ПОИСК) */}
{!isSearching && !loading && (
  <motion.div
    key={`default-lists-${currentMode}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25 }}
    className="space-y-14" // Слегка увеличили отступ между секциями
  >

    {/* ЛЕНТА 1: ТОП-5 Умных Новинок по интересам (Карусель со стрелками) */}
    {currentMode === "course" && isAuth && topMatches.length > 0 && (
      <TopMatchRecommendationList 
        items={topMatches}
        onToggleFavourite={handleToggleFavourite}
      />
    )}

    {/* ЛЕНТА 2: Персональные рекомендации */}
    {isAuth && recommendations.length > 0 && (
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4 px-1 flex items-center gap-2">
          <span>🎯</span> Специально для вас ({currentMode === "course" ? "курсы" : "вакансии"})
        </h2>
        <EntityRecommendationList 
          items={recommendations} 
          type={currentMode === "course" ? "course" : "vacancy"} 
          onToggleFavourite={handleToggleFavourite}
        />
      </div>
    )}

    {/* ЛЕНТА 3: Новинки платформы (Общие) */}
    {currentMode === "course" && latestCourses.length > 0 && (
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4 px-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          Новинки платформы
        </h2>
        <EntityRecommendationList 
          items={latestCourses} 
          type="course" 
          onToggleFavourite={handleToggleFavourite}
        />
      </div>
    )}
  </motion.div>
)}
            {/* СЦЕНАРИЙ Б: ВЫДАЧА РЕЗУЛЬТАТОВ ПОИСКА */}
            {isSearching && !loading && (
              <motion.div
                key={`search-${currentMode}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-lg font-bold text-slate-700 mb-6 px-1">
                  🔍 Результаты поиска по запросу «{query}»
                </h2>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchResults.map((item: SearchResult, i: number) => (
                      <div
                        key={`${item.id}-${i}`}
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-l-4 hover:border-l-[#05A4BA] group relative flex flex-col justify-between h-[220px]"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#1D869E] transition-colors leading-snug line-clamp-1">
                              {item.title}
                            </h3>
                            
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                              currentMode === "course" ? "bg-[#A9F4FF] text-[#1D869E]" : (item.is_internship ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")
                            }`}>
                              {currentMode === "course" ? "Курс" : (item.is_internship ? "Стажировка" : "Вакансия")}
                            </span>
                          </div>

                          {currentMode === "vacancy" && (item.location || item.salary_range) && (
                            <div className="flex gap-3 text-xs text-slate-400 font-bold mb-3">
                              {item.location && <span className="truncate">📍 {item.location}</span>}
                              {item.salary_range && <span className="whitespace-nowrap">💰 {item.salary_range}</span>}
                            </div>
                          )}
                          
                          <p className="text-slate-500 leading-relaxed text-sm line-clamp-3">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Link 
                            href={currentMode === "course" ? `/course/${item.id}` : `/vacancies/${item.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#05A4BA] text-white text-xs font-bold rounded-xl hover:bg-[#1D869E] active:scale-95 transition-all"
                          >
                            Подробнее
                            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-cyan-100">
                    <p className="text-slate-400 text-sm font-medium">По текстовому запросу ничего не найдено.</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}