"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Course {
  id: number;
  title: string;
  description: string;
  sourceUrl?: string;
}

interface Vacancy {
  id: number;
  title: string;
  description: string;
  requirements?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FavouritesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"courses" | "vacancies">("courses");
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAuthToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      const timeoutId = setTimeout(() => controller.abort(), 4000); 

      try {
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [coursesRes, vacanciesRes] = await Promise.all([
          fetch(`${BASE_URL}/users/me/favourite-courses`, { headers, signal: controller.signal }),
          fetch(`${BASE_URL}/users/me/favourite-vacancies`, { headers, signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        if (coursesRes.status === 401 || vacanciesRes.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(Array.isArray(coursesData) ? coursesData : []);
        }
        
        if (vacanciesRes.ok) {
          const vacanciesData = await vacanciesRes.json();
          setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
        }

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn("Запрос был отменен (таймаут или уход со страницы).");
        } else {
          console.error("Ошибка при загрузке избранного:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort(); 
  }, [router, getAuthToken]);

  // ОБНОВЛЕННЫЙ МЕТОД УДАЛЕНИЯ ИЗ ИЗБРАННОГО (Универсальный DELETE)
  const handleRemoveFavourite = async (id: number, type: "courses" | "vacancies") => {
    const token = getAuthToken();
    if (!token) return;

    // Формируем эндпоинт в зависимости от типа (в единственном числе, как на бэкенде)
    const singularType = type === "courses" ? "course" : "vacancy";
    const endpoint = `/${singularType}/${id}/favourite`;
    
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "DELETE", // Теперь оба эндпоинта используют честный DELETE
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      // Бэкенд возвращает 204 No Content при успешном DELETE
      if (res.ok || res.status === 204) {
        if (type === "courses") {
          setCourses(prev => prev.filter(c => c.id !== id));
        } else {
          setVacancies(prev => prev.filter(v => v.id !== id));
        }
      } else {
        console.error(`Сервер вернул ошибку ${res.status} при удалении из избранного.`);
      }
    } catch (error) {
      console.error("Не удалось удалить из избранного:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ЗАГОЛОВОК И НАВИГАЦИЯ НАЗАД */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button 
              type="button"
              onClick={() => router.push("/")}
              className="text-xs font-black text-slate-400 hover:text-[#05A4BA] transition-colors mb-2 flex items-center gap-1"
            >
              ← На главную
            </button>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Избранные закладки</h1>
          </div>

          {/* ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК */}
          <div className="bg-slate-100 p-1 rounded-2xl flex relative items-center cursor-pointer select-none">
            <motion.div
              className="absolute bg-[#05A4BA] rounded-[12px] h-[calc(100%-8px)]"
              layoutId="activeFavouritesTabIndicator" 
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: activeTab === "courses" ? "100px" : "110px",
                left: activeTab === "courses" ? "4px" : "104px",
              }}
            />
            <button
              type="button"
              onClick={() => setActiveTab("courses")}
              className={`relative z-10 px-4 py-2 text-xs font-black rounded-xl transition-colors duration-200 w-[100px] text-center ${
                activeTab === "courses" ? "text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Курсы
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vacancies")}
              className={`relative z-10 px-4 py-2 text-xs font-black rounded-xl transition-colors duration-200 w-[110px] text-center ${
                activeTab === "vacancies" ? "text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Вакансии
            </button>
          </div>
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ */}
        {isLoading ? (
          <div className="w-full h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#05A4BA] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              
              {activeTab === "courses" && (
                courses.length > 0 ? (
                  courses.map((course) => (
                    <motion.div
                      key={`course-${course.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: -100 }}
                      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">{course.title}</h3>
                        <p className="text-slate-500 text-xs line-clamp-3 mb-4">{course.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-2">
                        {course.sourceUrl && (
                          <a 
                            href={course.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-black text-[#05A4BA] hover:underline"
                          >
                            Перейти к курсу →
                          </a>
                        )}
                        <button 
                          type="button"
                          onClick={() => handleRemoveFavourite(course.id, "courses")}
                          className="text-xs font-bold text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm col-span-2 text-center py-12">У вас пока нет сохраненных курсов.</p>
                )
              )}

              {activeTab === "vacancies" && (
                vacancies.length > 0 ? (
                  vacancies.map((vacancy) => (
                    <motion.div
                      key={`vacancy-${vacancy.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, x: 100 }}
                      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">{vacancy.title}</h3>
                        <p className="text-slate-500 text-xs line-clamp-3 mb-4">{vacancy.description}</p>
                        {vacancy.requirements && (
                          <div className="text-[11px] bg-slate-50 p-2 rounded-xl text-slate-600 border border-slate-100">
                            <strong>Требования:</strong> {vacancy.requirements}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <button 
                          type="button"
                          onClick={() => router.push(`/vacancies/${vacancy.id}`)}
                          className="text-xs font-black text-[#05A4BA] hover:underline"
                        >
                          Подробнее →
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleRemoveFavourite(vacancy.id, "vacancies")}
                          className="text-xs font-bold text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm col-span-2 text-center py-12">У вас пока нет сохраненных вакансий.</p>
                )
              )}

            </AnimatePresence>
          </div>
        )}
        
      </div>
    </div>
  );
}