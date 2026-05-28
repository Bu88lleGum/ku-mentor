'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { fetchUserProfile } from "./services/userService";
import { useSearchParams } from 'next/navigation';
import { motion } from "framer-motion";
import HeaderPage from './components/header';

// Универсальный интерфейс для результата поиска (и курс, и вакансия)
interface SearchResult {
  id: number;
  title: string;
  description: string;
  location?: string;        // Для вакансий
  salary_range?: string;    // Для вакансий
  is_internship?: boolean;  // Для вакансий
}

export default function Home() {
  const searchParams = useSearchParams();
  const [warning, setWarning] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<"courses" | "vacancies">("courses");

  // Очищаем старые результаты при переключении режима поиска
  useEffect(() => {
    setResults([]);
    setWarning('');
  }, [searchMode]);

  const executeSearch = useCallback(async (searchQuery: string, currentMode: "courses" | "vacancies") => {
    if (searchQuery.trim().length < 3) {
      setWarning('Запрос должен содержать минимум 3 буквы');
      return;
    }

    setLoading(true);
    setWarning('');

    try {
      const token = localStorage.getItem("token");
      
      // Выбираем правильный эндпоинт бэкенда в зависимости от режима
      const endpoint = currentMode === "courses" ? "/recommend/" : "/recommend/vacancies";
      
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
      
      // Разбор ответа (как массивов, так и объектов со свойством results)
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        const autoFoundArray = Object.values(data).find(val => Array.isArray(val));
        setResults(Array.isArray(autoFoundArray) ? (autoFoundArray as SearchResult[]) : []);
      }
    } catch (error) {
      console.error("Ошибка соединения:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('');

    if (query.trim().length < 3) {
      setWarning('Запрос должен содержать минимум 3 буквы');
      setResults([]);
      return;
    }
    
    // Вызываем общую функцию поиска, передавая текущий режим
    await executeSearch(query, searchMode);
  };

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    const checkAuth = async () => {
      if (!token) return;
      try {
        await fetchUserProfile(); 
        setIsAuth(true);
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
  }, []);

  // Логика подхвата запроса из URL
  useEffect(() => {
    const queryFromUrl = searchParams.get('query');
    if (queryFromUrl && isAuth) {
      setQuery(queryFromUrl);
      executeSearch(queryFromUrl, searchMode);
    }
  }, [searchParams, isAuth, executeSearch]);
  
  const CardSkeleton = () => (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 animate-pulse mt-6">
      <div className="flex justify-between mb-4">
        <div className="h-8 w-1/3 bg-slate-200 rounded-lg"></div>
        <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-slate-100 rounded"></div>
        <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <HeaderPage 
        searchMode={searchMode} 
        setSearchMode={setSearchMode} 
        isAuth={isAuth} 
      />
      
      {/* Хэдер с градиентом */}
      <header className="relative pt-16 pb-20 bg-gradient-to-br from-[#A9F4FF] via-[#05A4BA] to-[#1D869E]">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold text-white my-24 tracking-tight">KU Mentor</h1>
          <p className="text-xl text-[#A9F4FF] max-w-2xl mx-auto px-4">
            {searchMode === "courses" 
              ? "Твой персональный ИИ-секретарь: найди курс по смыслу, а не по буквам."
              : "Найди идеальное место работы: умный поиск вакансий и стажировок."
            }
          </p>
        </div>
      </header>

      {/* Поисковый контейнер */}
      <main className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 -mt-10 relative z-10">
    
          {!isAuth && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
              <span className="text-amber-600 text-lg">🔒</span>
              <p className="text-amber-800 text-sm font-medium">Пожалуйста, <Link href="/login" className="underline font-bold hover:text-amber-900">войдите в систему</Link>
                , чтобы воспользоваться ИИ-поиском {searchMode === "courses" ? "курсов" : "вакансий"}.
              </p>
            </div>
          )}

          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text"
              disabled={!isAuth}
              className={`w-full p-6 text-lg rounded-2xl shadow-xl transition-all
                ${!isAuth 
                  ? "bg-gray-100 cursor-not-allowed text-gray-400 placeholder-gray-400" 
                  : "bg-white text-black outline-none focus:ring-4 focus:ring-cyan-100 shadow-blue-100/50"
                }`}
              placeholder={isAuth 
                ? (searchMode === "courses" ? "Опиши, чему ты хочешь научиться..." : "Какую вакансию или стажировку ты ищешь?") 
                : "Поиск доступен только после входа"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
    
            <button 
              type="submit"
              disabled={!isAuth || loading}
              className={`absolute right-3 top-3 bottom-3 px-8 font-bold rounded-xl transition-all 
                ${!isAuth 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : "bg-[#05A4BA] hover:bg-[#1D869E] text-white shadow-lg active:scale-95 disabled:opacity-50"
                }`}
            >
              {loading ? '...' : 'Найти'}
            </button>
          </form>

          {warning && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-pulse">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-700 text-sm font-medium">{warning}</p>
            </div>
          )}
        </div>

        {/* Скелетоны при загрузке */}
        {loading && (
          <div className="space-y-6 mt-4">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
          </div>
        )}
        
        {/* Блок Вывода Результатов */}
        <div className="mt-10 pb-20">
          {results && results.length > 0 ? (
            <div className="relative space-y-6">
              {results.map((item: SearchResult, i: number) => (
                <div
                  key={`${item.id}-${i}`}
                  className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:border-l-4 hover:border-l-[#05A4BA] group"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800 group-hover:text-[#1D869E] transition-colors">
                          {item.title}
                        </h3>
                        {/* Дополнительные мета-данные для вакансий */}
                        {searchMode === "vacancies" && (item.location || item.salary_range) && (
                          <div className="flex gap-4 text-sm text-slate-400 font-semibold mt-1">
                            {item.location && <span>📍 {item.location}</span>}
                            {item.salary_range && <span>💰 {item.salary_range}</span>}
                          </div>
                        )}
                      </div>
                      
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                        searchMode === "courses" 
                          ? "bg-[#A9F4FF] text-[#1D869E]" 
                          : (item.is_internship ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")
                      }`}>
                        {searchMode === "courses" 
                          ? "Курс" 
                          : (item.is_internship ? "Стажировка" : "Вакансия")
                        }
                      </span>
                    </div>
                    
                    <p className="text-[#2A8DA4] leading-relaxed text-lg mb-8 line-clamp-3">
                      {item.description}
                    </p>

                    <div className="flex justify-end">
                      <Link 
                        // Динамический переход: либо на страницу курса, либо на вакансию
                        href={searchMode === "courses" ? `/course/${item.id}` : `/vacancies/${item.id}`}
                        className="flex items-center gap-2 px-6 py-3 bg-[#05A4BA] text-white font-bold rounded-2xl hover:bg-[#1D869E] active:scale-95 transition-all shadow-lg shadow-cyan-100"
                      >
                        Подробнее
                        <svg 
                          className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          ) : (
            !loading && query && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#A9F4FF]">
                <p className="text-[#05A4BA] text-xl font-medium">Ничего не найдено.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}