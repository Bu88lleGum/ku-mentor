'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface CourseDetail {
  id: number;
  provider_id: number;
  title: string;
  description: string;
  sourceUrl: string | null;
}

export default function CourseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.id;
  const backQuery = searchParams.get('fromQuery') || '';

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния для записи
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Состояния для избранного
  const [isFavourite, setIsFavourite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Выносим базовый URL бэкенда для удобства
  const API_BASE = "http://127.0.0.1:8000";

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem("token");
        // Загружаем данные курса
        const courseRes = await fetch(`${API_BASE}/course/?skip=${Number(courseId) - 1}&limit=1`);
        const courseData = await courseRes.json();
        const currentCourse = Array.isArray(courseData) ? courseData[0] : courseData;
        
        setCourse(currentCourse);

        if (token && currentCourse) {
          // 1. Проверяем, не записан ли уже пользователь на этот курс
          const myCoursesRes = await fetch(`${API_BASE}/studentcource/my-courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const myCourses = await myCoursesRes.json();
          const alreadyEnrolled = Array.isArray(myCourses) 
            ? myCourses.some((c: any) => c.course_id === currentCourse.id)
            : false;
          setIsEnrolled(alreadyEnrolled);

          // 2. Проверяем, находится ли курс в избранном (напрямую к бэкенду)
          // Если в бэкенде префикс роутера "/courses", замени на /courses/me/...
          const favsRes = await fetch(`${API_BASE}/courses/me/favourite-courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (favsRes.ok) {
            const favCourses = await favsRes.json();
            const alreadyFav = Array.isArray(favCourses)
              ? favCourses.some((fav: any) => fav.id === currentCourse.id)
              : false;
            setIsFavourite(alreadyFav);
          }
        }
      } catch (err) {
        console.error("Ошибка при инициализации данных курса:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchDetail();
  }, [courseId]);

  // Хэндлер переключения избранного
  const toggleFavourite = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!course || favLoading) return;

    try {
      setFavLoading(true);

      // Идем напрямую к бэкенду. 
      // Если в FastAPI @router настроен как "/course" (в единственном числе), оставляем так.
      const res = await fetch(`${API_BASE}/course/${course.id}/favourite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        setIsFavourite(!isFavourite);
      } else {
        console.error("Сервер вернул ошибку при переключении избранного:", res.status);
      }
    } catch (error) {
      console.error("Ошибка при изменении статуса избранного курса:", error);
    } finally {
      setFavLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course?.id) {
      console.error("ID курса не найден в стейте");
      return;
    }

    setIsEnrolling(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_BASE}/studentcource/my-courses`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.trim()}`
        },
        body: JSON.stringify({
          course_id: Number(course.id),
          status: "interested"
        })
      });

      if (response.status === 422) {
        const errorDetail = await response.json();
        console.table(errorDetail.detail);
        throw new Error("Ошибка валидации данных на сервере (422)");
      }

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`Ошибка сервера: ${response.status} - ${errorMsg}`);
      }

      const result = await response.json();
      setIsEnrolled(true);
      console.log("Успешно добавлено:", result);

    } catch (err: any) {
      console.error("Детали ошибки POST:", err);
      alert(err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#05A4BA]"></div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 text-slate-600">
      <p className="text-xl font-medium">Курс не найден</p>
      <Link href="/" className="text-[#05A4BA] font-bold">На главную</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href={`/?query=${encodeURIComponent(backQuery)}`}
          className="inline-flex items-center gap-2 text-[#05A4BA] font-bold mb-8 hover:text-[#1D869E] transition-all group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Назад к поиску
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
        >
          {/* Градиентная шапка курса */}
          <div className="bg-gradient-to-r from-[#05A4BA] to-[#1D869E] p-8 sm:p-12 text-white relative">
            <div className="flex justify-between items-start gap-4 mb-6">
              <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full uppercase inline-block">
                ID Провайдера: {course.provider_id}
              </span>

              {/* КНОПКА ФАВОРИТОВ (ЗАКЛАДКА) */}
              <button
                type="button"
                onClick={toggleFavourite}
                disabled={favLoading}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center ${
                  isFavourite 
                    ? "bg-red-500/20 border-red-400 text-red-200 hover:bg-red-500/30" 
                    : "bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20"
                }`}
                title={isFavourite ? "Убрать из избранного" : "Добавить в избранное"}
              >
                {favLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill={isFavourite ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">{course.title}</h1>
          </div>

          <div className="p-8 sm:p-12 space-y-8">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Описание курса</h2>
              <p className="text-slate-700 text-xl leading-relaxed">{course.description}</p>
            </div>

            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleEnroll}
                disabled={isEnrolling || isEnrolled}
                className={`flex-1 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                  isEnrolled 
                    ? "bg-emerald-500 text-white shadow-emerald-100 cursor-default" 
                    : "bg-[#05A4BA] text-white shadow-cyan-100 hover:bg-[#1D869E]"
                }`}
              >
                {isEnrolling ? (
                   <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isEnrolled ? (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Вы записаны
                  </>
                ) : (
                  "Записаться на курс"
                )}
              </button>

              {course.sourceUrl && (
                <a 
                  href={course.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-lg border border-slate-200 hover:bg-slate-100 text-center transition-all"
                >
                  Перейти к источнику
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}