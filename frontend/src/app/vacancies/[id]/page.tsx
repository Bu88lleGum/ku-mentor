"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface Vacancy {
  id: number;
  title: string;
  description: string;
  location?: string;
  salary_range?: string;
  is_internship?: boolean;
  employer_id: number;
  created_at: string;
  employer: {
    company_name: string;
  };
}

export default function VacancyPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false); 
  const [hasApplied, setHasApplied] = useState(false); 

  useEffect(() => {
    const fetchVacancy = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // 1. Загружаем данные вакансии
        const response = await fetch(`http://127.0.0.1:8000/vacancy/${id}`);
        
        if (!response.ok) {
          setVacancy(null);
          return;
        }

        const data: Vacancy = await response.json();
        setVacancy(data);

        // ==========================================
        // БЕЗОПАСНЫЙ КОД ПРОВЕРКИ ЮЗЕРА:
        // ==========================================
        const savedUser = localStorage.getItem("user");
        if (savedUser && data) {
          try {
            if (savedUser.startsWith("{")) {
              const user = JSON.parse(savedUser);
              
              if (user.role === "employer" && user.id === data.employer_id) {
                setIsOwner(true); 
              } else {
                setIsOwner(false);
              }
            }
          } catch (parseError) {
            console.error("Ошибка парсинга localStorage['user']:", parseError);
            setIsOwner(false);
          }
        }

        // 2. Проверяем наличие отклика
        if (token && data) {
          const myAppsRes = await fetch(`http://127.0.0.1:8000/application/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (myAppsRes.ok) {
            const myApplications = await myAppsRes.json();
            const alreadyApplied = Array.isArray(myApplications) 
              ? myApplications.some((app: any) => app.vacancy_id === data.id)
              : false;
            setHasApplied(alreadyApplied);
          }
        }

      } catch (err) {
        console.error("Ошибка загрузки в useEffect:", err);
        setVacancy(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVacancy();
  }, [id]);

  // Скелетон на время загрузки
  if (loading) return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-white p-8 rounded-3xl border border-slate-100 animate-pulse space-y-6 mt-10">
        <div className="h-4 w-24 bg-slate-200 rounded-full"></div>
        <div className="h-10 w-2/3 bg-slate-200 rounded-xl"></div>
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg"></div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-slate-100 rounded"></div>
          <div className="h-4 w-full bg-slate-100 rounded"></div>
          <div className="h-4 w-4/5 bg-slate-100 rounded"></div>
        </div>
      </div>
    </div>
  );

  if (!vacancy) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold text-slate-500">⚠️ Вакансия не найдена</p>
      <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#05A4BA] text-white rounded-xl font-bold">
        На главную
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Кнопка назад */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#05A4BA] transition-colors mb-6 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Назад к списку
        </button>

        {/* Главная карточка */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-100/50 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#A9F4FF] to-[#05A4BA]" />

          {/* Шапка вакансии */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
              vacancy.is_internship ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              {vacancy.is_internship ? "Стажировка" : "Вакансия"}
            </span>
            
            <p className="text-xs text-slate-400 font-bold">
              Опубликовано: {new Date(vacancy.created_at).toLocaleDateString()}
            </p>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            {vacancy.title}
          </h1>

          {/* ССЫЛКА НА СТРАНИЦУ РАБОТОДАТЕЛЯ */}
          <Link 
            href={`/employer/${vacancy.employer_id}`}
            className="inline-flex items-center gap-2 mb-6 text-lg font-bold text-[#05A4BA] hover:text-[#1D869E] hover:underline transition-all group/link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#05A4BA] group-hover/link:text-[#1D869E] transition-colors">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>{vacancy.employer?.company_name || "Компания не указана"}</span>
          </Link>

          {/* Мета-данные */}
          <div className="flex flex-wrap gap-3 mb-8">
            {vacancy.location && (
              <span className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-1.5">
                📍 {vacancy.location}
              </span>
            )}
            {vacancy.salary_range && (
              <span className="bg-[#A9F4FF]/30 border border-[#A9F4FF]/60 px-4 py-2 rounded-xl text-[#1D869E] font-extrabold text-sm flex items-center gap-1.5">
                💰 {vacancy.salary_range}
              </span>
            )}
          </div>

          <hr className="border-slate-100 my-6" />

          {/* Описание */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              📝 Описание позиции
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line">
              {vacancy.description}
            </p>
          </div>

          <hr className="border-slate-100 my-8" />

          {/* Действия */}
          <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
            {isOwner ? (
              <button 
                onClick={() => router.push(`/vacancies/edit/${vacancy.id}`)}
                className="w-full sm:w-auto px-8 py-4 bg-[#05A4BA] text-white font-bold rounded-2xl hover:bg-[#1D869E] transition-all active:scale-95 shadow-lg shadow-cyan-100 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Редактировать вакансию
              </button>
            ) : (
              <button 
                onClick={() => {
                  if (!hasApplied) {
                    router.push(`/vacancies/${vacancy.id}/apply`);
                  }
                }}
                disabled={hasApplied}
                className={`w-full sm:w-auto px-8 py-4 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg
                  ${hasApplied 
                    ? "bg-emerald-500 text-white cursor-not-allowed shadow-emerald-100" 
                    : "bg-[#05A4BA] hover:bg-[#1D869E] text-white shadow-cyan-100"
                  }`}
              >
                {hasApplied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Вы откликнулись
                  </>
                ) : (
                  "Откликнуться на вакансию"
                )}
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}