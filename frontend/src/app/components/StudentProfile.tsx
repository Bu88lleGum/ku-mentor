"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "../services/userService";

// Краткая информация о вакансии внутри отклика
interface VacancyInfo {
  id: number;
  title: string;
  employer?: {
    company_name: string;
  };
}

// Структура отклика студента, включая AI Match Score (вычисленный через эмбеддинги)
interface StudentApplication {
  id: number;
  vacancy_id: number;
  cover_letter: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string; // Основные статусы + fallback-строка
  match_score: number | null; // Процент соответствия от 0.0 до 1.0 (или null, если еще не посчитан)
  created_at: string; 
  vacancy?: VacancyInfo; // Данные подгружаются через joinedload на бэкенде
}

// Данные профиля студента после развертывания ("выпрямления") структуры бэкенда
interface UserProfile {
  username: string;
  email: string;
  gpa: number;
  interests: string[]; // Массив текстовых названий скиллов
}

// Запись из истории поиска для рекомендательной системы Mentor
interface SearchHistory {
  id: number;
  query_text: string;
  created_at: string;
}

// Курс, на который записан студент (Связующая таблица на бэкенде)
interface EnrolledCourse {
  id: number;
  course_id: number;
  course_name?: string; // Название подтягивается для отображения в UI
}

export default function StudentProfile() {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // Массив выбранных пользователем навыков (чистые строки)
  const [allAvailableSkills, setAllAvailableSkills] = useState<{id: number, name: string}[]>([]); // Полный глобальный список скиллов
  const [isSaving, setIsSaving] = useState(false); // Статус UI при сохранении тегов в БД
  const [message, setMessage] = useState(""); // Сообщение об успешном сохранении или ошибке
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]); // Курсы студента
  const [applications, setApplications] = useState<StudentApplication[]>([]); // Отклики студента

  const router = useRouter();

  // Хук для первичного агрегирования всех данных с сервера при монтировании компонента
  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // 1. ЗАГРУЗКА И МАППИНГ ПРОФИЛЯ СТУДЕНТА
        const data = await fetchUserProfile();
        if (data) {
          // Выпрямляем вложенную структуру `data.student_profile` в плоский объект для UI
          const flattenedData: UserProfile = {
            username: data.username,
            email: data.email,
            gpa: data.student_profile?.gpa ?? 0,
            interests: data.student_profile?.interests ?? []
          };
          setUserData(flattenedData);
          setSelectedTags(flattenedData.interests); // Синхронизируем стейт выбранных тегов с БД
        }
        
        // 2. ЗАГРУЗКА ВСЕХ ДОСТУПНЫХ СКИЛЛОВ ДЛЯ ВЫБОРА (Теги интересов)
        const skillsResponse = await fetch("http://127.0.0.1:8000/skill/");
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setAllAvailableSkills(skillsData);
        }

        // 3. ЗАГРУЗКА КУРСОВ ТЕКУЩЕГО СТУДЕНТА
        const coursesResponse = await fetch("http://127.0.0.1:8000/studentcource/my-courses", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (coursesResponse.ok) {
          const myCoursesData = await coursesResponse.json();
          setEnrolledCourses(myCoursesData);
        }

        // 4. ЗАГРУЗКА ОТКЛИКОВ НА ВАКАНСИИ
        const appsResponse = await fetch("http://127.0.0.1:8000/application/my", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (appsResponse.ok) {
          const appsData = await appsResponse.json();
          
          // Отладочный лог в консоли — позволяет проверить структуру связей (vacancy, employer)
          console.log("Данные откликов с бэкенда:", appsData);
          
          setApplications(appsData);
        }

        // 5. ЗАГРУЗКА И ДЕДУПЛИКАЦИЯ ИСТОРИИ ПОИСКА
        const historyResponse = await fetch("http://127.0.0.1:8000/searchhistory/history", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          
          // Метод reduce фильтрует дубликаты поисковых фраз, оставляя только уникальные запросы в UI
          const uniqueHistory = historyData.reduce((acc: SearchHistory[], current: SearchHistory) => {
            const x = acc.find(item => item.query_text === current.query_text);
            if (!x) return acc.concat([current]);
            return acc;
          }, []); 
          setSearchHistory(uniqueHistory);
        }

      } catch (err) {
        console.error("Ошибка при загрузке профиля:", err);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [router]);


  /**
   * Функция переключения тегов интересов (добавить / удалить локально в стейте)
   */
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };


  /**
   * Сохранение выбранных интересов и навыков на бэкенд (Запрос PATCH)
   */
  const saveInterests = async () => {
    setIsSaving(true);
    setMessage("");

    // Маппим строковые теги в массив ID, сопоставляя их со списком allAvailableSkills для Pydantic-схемы бэка
    const selectedSkillIds = allAvailableSkills
      .filter(skill => selectedTags.includes(skill.name))
      .map(skill => skill.id);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/users/complete-student", {
        method: "PATCH", 
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          gpa: userData?.gpa || 0,
          interests: selectedTags, // Отправляем как строковые массивы (для текстового поиска/отображения)
          skill_ids: selectedSkillIds // Отправляем как ID (для связей Many-to-Many в БД)
        }), 
      });
      if (response.ok) setMessage("Изменения сохранены!");
    } catch (err) {
      setMessage("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };


  /**
   * Возвращает CSS-классы Tailwind в зависимости от статуса отклика (UI-хелпер)
   */
  const getStatusStyles = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-amber-50 text-amber-700 border-amber-200"; // Статус PENDING или дефолтный
    }
  };


  /**
   * Локализация статусов отклика для русскоязычного интерфейса
   */
  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED": return "Принят";
      case "REJECTED": return "Отказ";
      default: return "На рассмотрении";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Карточка основной информации */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 bg-[#1D869E] rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-inner">
              {userData?.username?.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{userData?.username}</h1>
              <p className="text-slate-500 text-sm mb-3">{userData?.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <div className="bg-[#A9F4FF]/30 px-3 py-1 rounded-lg text-[#1D869E] text-xs font-bold border border-[#A9F4FF]/50">
                  GPA: {userData?.gpa}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Блок интересов */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Мои интересы</h2>
              <p className="text-sm text-slate-500 mb-6">Выберите направления, чтобы Mentor подобрал курсы.</p>
            </div>
            <button
              onClick={saveInterests}
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                isSaving 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-[#A9F4FF] text-[#1D869E] hover:bg-[#1D869E] hover:text-white active:scale-95 shadow-sm"
              }`}>
              {isSaving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>

          {message && (
            <p className={`text-xs font-bold mb-4 ${message.includes("Ошибка") ? "text-red-500" : "text-emerald-500"}`}>
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {allAvailableSkills.map(skill => {
              const isSelected = selectedTags.includes(skill.name); 
              return (
                <button
                  key={skill.id}
                  onClick={() => toggleTag(skill.name)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isSelected 
                      ? "bg-[#05A4BA] text-white shadow-md shadow-cyan-100" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                  }`}
                >
                  {skill.name} {isSelected ? "✕" : "+"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Блок ОТКЛИКОВ НА ВАКАНСИИ */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Мои отклики</h2>
            <p className="text-sm text-slate-500">Статус отправленных заявок на вакансии и стажировки</p>
          </div>

          <div className="space-y-4">
            {applications.length > 0 ? (
              applications.map((app) => {
                // Извлекаем данные с поддержкой различных вариантов названий полей с бэка
                const vacancyTitle = app.vacancy?.title || (app as any).vacancy_title || `Вакансия #${app.vacancy_id}`;
                const companyName = app.vacancy?.employer?.company_name || (app as any).company_name || "Компания загружается...";

                return (
                  <div 
                    key={app.id} 
                    onClick={() => router.push(`/vacancies/${app.vacancy_id}`)}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50/60 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 group-hover:text-[#05A4BA] transition-colors">
                        {vacancyTitle}
                      </h4>
                      <p className="text-xs font-semibold text-[#1D869E]">
                        {companyName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Отправлено: {new Date(app.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {app.match_score !== null && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block">AI Совпадение</span>
                          <span className="text-sm font-black text-[#05A4BA]">{Math.round(app.match_score * 100)}%</span>
                        </div>
                      )}
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getStatusStyles(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400 italic py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Вы ещё не отправляли заявки на вакансии.
              </p>
            )}
          </div>
        </div>

        {/* Сетка действий (История поиска и Курсы) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Блок истории поиска */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900 text-lg">История поиска</h3>
              <p className="text-sm text-slate-400 font-medium">Ваши последние запросы</p>
            </div>
            <div className="space-y-3">
              {searchHistory.length > 0 ? (
                searchHistory.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(`/?query=${encodeURIComponent(item.query_text)}`)}
                    className="w-full flex justify-between items-center p-3 bg-slate-50 rounded-2xl hover:bg-[#A9F4FF]/20 hover:ring-1 hover:ring-[#A9F4FF] transition-all group"
                  >
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-[#1D869E] truncate max-w-[180px]">
                      {item.query_text}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      <svg className="w-4 h-4 text-[#05A4BA] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">История пока пуста</p>
              )}
            </div>
          </div>

          {/* Блок "Мои курсы" */}
          <div className="bg-white border border-[#A9F4FF] rounded-3xl p-6 shadow-sm flex flex-col justify-between items-start w-full">
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">Мои курсы</h3>
                <span className="bg-[#A9F4FF] text-[#1D869E] text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                  {enrolledCourses.length} Активно
                </span>
              </div>
              
              <div className="space-y-3 mb-6 w-full">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.slice(0, 3).map((course) => (
                    <button 
                      key={course.id} 
                      onClick={() => router.push(`/course/${course.course_id}`)}
                      className="w-full flex items-center gap-3 p-3 bg-[#A9F4FF]/10 hover:bg-[#A9F4FF]/20 rounded-2xl border border-[#A9F4FF]/30 transition-all text-left cursor-pointer group/course"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#05A4BA] group-hover/course:scale-125 transition-transform" />
                      <span className="text-sm font-semibold text-slate-700 group-hover/course:text-[#1D869E] truncate flex-1 transition-colors">
                        {course.course_name ? course.course_name : `Курс #${course.course_id}`}
                      </span>
                      <svg className="w-4 h-4 text-[#05A4BA] opacity-0 group-hover/course:opacity-100 group-hover/course:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic py-2 text-center">Вы еще не записались на курсы</p>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-[#05A4BA] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1D869E] transition-all shadow-lg shadow-cyan-100 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/xl" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Вернуться к поиску
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}