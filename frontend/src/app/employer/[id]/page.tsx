"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// Краткая карточка вакансии, привязанная к работодателю
interface Vacancy {
  id: number;
  title: string;
  description: string;
  location?: string; // Опциональное поле (может прийти null или отсутствовать)
  salary_range?: string; // Опциональное поле
  is_internship: boolean; // Флаг стажировки для отображения специального бейджа
  created_at: string;
}

// Публичный профиль работодателя, включающий массив его активных вакансий
interface EmployerProfile {
  id: number;
  company_name: string;
  industry: string | null; // Разрешаем null, если отрасль не заполнена в БД
  region: string | null; // Разрешаем null, если регион не указан
  vacancies: Vacancy[]; // Вложенный массив вакансий (связь один-ко-многим на бэкенде)
}



export default function EmployerPage() {
  // useParams() вытаскивает динамический [id] компании из URL-адреса страницы (например, /employer/12)
  const { id } = useParams();
  const router = useRouter();

  // Состояния для хранения профиля и контроля процесса загрузки
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // useEffect отслеживает изменение [id] в URL. Если ID меняется, запускается перезагрузка данных
  useEffect(() => {
    const fetchEmployerData = async () => {
      if (!id) return; // Защита: если ID еще не распарсился, ничего не делаем

      try {
        setLoading(true);

        // Публичный GET-запрос (без токена Authorization!). Любой студент или гость может увидеть этот профиль.
        const response = await fetch(`http://127.0.0.1:8000/employer/${id}`);

        if (!response.ok) {
          // Если бэкенд вернул 404 или 500, сбрасываем состояние в null
          setEmployer(null);
          return;
        }

        // Парсим очищенные данные, которые вернула схема Pydantic
        const data: EmployerProfile = await response.json();
        setEmployer(data);
      } catch (err) {
        console.error("Ошибка при загрузке данных работодателя:", err);
        setEmployer(null);
      } finally {
        // Выключаем режим загрузки при любом исходе запроса
        setLoading(false);
      }
    };

    fetchEmployerData();
  }, [id]); // Массив зависимостей: хук сработает при первой загрузке и при смене ID работодателя



  // ЭКРАН ЗАГРУЗКИ: ОТРИСОВКА СКЕЛЕТОНОВ (Skeleton Loaders)
  if (loading) return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-4xl space-y-6 mt-10">
        {/* Скелетон шапки компании */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 animate-pulse space-y-4">
          <div className="h-12 w-2/3 bg-slate-200 rounded-xl"></div>
          <div className="flex gap-3">
            <div className="h-6 w-32 bg-slate-100 rounded-lg"></div>
            <div className="h-6 w-32 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
        {/* Скелетон списка вакансий */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-24 w-full bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
          <div className="h-24 w-full bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  // ОБРАБОТКА ОШИБКИ: РАБОТОДАТЕЛЬ НЕ НАЙДЕН (Empty/404 State)
  if (!employer) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-bold text-slate-500">⚠️ Профиль работодателя не найден</p>
      <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#05A4BA] text-white rounded-xl font-bold">
        На главную
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Кнопка Назад */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-[#05A4BA] transition-colors mb-6 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Назад
        </button>

        {/* Профиль компании карточка */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-100/50 relative overflow-hidden mb-10"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#A9F4FF] to-[#05A4BA]" />

          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-[#A9F4FF]/20 text-[#05A4BA] rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Профиль работодателя</p>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {employer.company_name}
              </h1>
            </div>
          </div>

          {/* Теги характеристик */}
          <div className="flex flex-wrap gap-3 mt-6">
            <span className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-600 font-bold text-sm flex items-center gap-1.5">
              💼 Индустрия: {employer.industry || "Не указана"}
            </span>
            <span className="bg-[#A9F4FF]/30 border border-[#A9F4FF]/60 px-4 py-2 rounded-xl text-[#1D869E] font-extrabold text-sm flex items-center gap-1.5">
              📍 Регион: {employer.region || "Не указан"}
            </span>
            <span className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-500 font-bold text-sm">
              📋 Активных вакансий: {employer.vacancies.length}
            </span>
          </div>
        </motion.div>

        {/* Блок со списком вакансий */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            🚀 Открытые вакансии компании
          </h2>

          {employer.vacancies.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium">
              На данный момент у компании нет открытых вакансий.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {employer.vacancies.map((vacancy, index) => (
                <motion.div
                  key={vacancy.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        vacancy.is_internship ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {vacancy.is_internship ? "Стажировка" : "Работа"}
                      </span>
                      <p className="text-xs text-slate-400 font-bold">
                        {new Date(vacancy.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#05A4BA] transition-colors">
                      {vacancy.title}
                    </h3>
                    <div className="flex gap-4 text-sm font-semibold text-slate-500">
                      {vacancy.location && <span>📍 {vacancy.location}</span>}
                      {vacancy.salary_range && <span className="text-[#1D869E] font-bold">💰 {vacancy.salary_range}</span>}
                    </div>
                  </div>

                  <Link 
                    href={`/vacancies/${vacancy.id}`}
                    className="w-full md:w-auto px-5 py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl group-hover:bg-[#05A4BA] group-hover:text-white transition-colors text-center text-sm"
                  >
                    Подробнее
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}