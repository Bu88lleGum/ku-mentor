'use client';

import { useParams, useSearchParams } from 'next/navigation';
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
  const courseId = params.id;
  const backQuery = searchParams.get('fromQuery') || '';

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния для записи
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem("token");
        // Загружаем данные курса
        const courseRes = await fetch(`http://127.0.0.1:8000/course/?skip=${Number(courseId) - 1}&limit=1`);
        const courseData = await courseRes.json();
        const currentCourse = Array.isArray(courseData) ? courseData[0] : courseData;
        
        setCourse(currentCourse);

        

        // Проверяем, не записан ли уже пользователь на этот курс
        if (token && currentCourse) {
          const myCoursesRes = await fetch(`http://127.0.0.1:8000/studentcource/my-courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const myCourses = await myCoursesRes.json();
          // Проверяем наличие course_id в списке моих курсов
          const alreadyEnrolled = Array.isArray(myCourses) 
            ? myCourses.some((c: any) => c.course_id === currentCourse.id)
            : false;
          setIsEnrolled(alreadyEnrolled);
          
        }
      } catch (err) {
        console.error("Ошибка:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) fetchDetail();
  }, [courseId]);

const handleEnroll = async () => {
  if (!course?.id) {
    console.error("ID курса не найден в стейте");
    return;
  }

  setIsEnrolling(true);
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`http://127.0.0.1:8000/studentcource/my-courses`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json', // Добавь это
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.trim()}` // Убираем лишние пробелы в токене
      },
      body: JSON.stringify({
        course_id: Number(course.id),
        status: "interested"
      })
    });

    // Если ошибка 422 — значит бэкенд не принял формат данных
    if (response.status === 422) {
      const errorDetail = await response.json();
      console.table(errorDetail.detail); // Покажет в консоли, какое именно поле не подошло
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
          <div className="bg-gradient-to-r from-[#05A4BA] to-[#1D869E] p-8 sm:p-12 text-white">
            <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full uppercase mb-6 inline-block">
              ID Провайдера: {course.provider_id}
            </span>
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