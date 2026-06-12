"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchUserProfile } from "@/src/app/services/userService";

interface StudentProfile {
  username: string;
  email: string;
  gpa: number;
  interests: string[];
}

interface DetailedApplication {
  id: number;
  vacancy_id: number;
  vacancy_title?: string;
  cover_letter: string | null;
  status: string;
  match_score: number | null;
  created_at: string;
  student?: StudentProfile; 
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  
  const vacancyId = params.id;
  const applicationId = params.applicationId;

  const [application, setApplication] = useState<DetailedApplication | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  
  const [userRole, setUserRole] = useState<"EMPLOYER" | "STUDENT" | null>(null);

  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // 1. Надежно определяем роль пользователя через бэкенд-сервис
        const user = await fetchUserProfile();
        let detectedRole: "EMPLOYER" | "STUDENT" = "STUDENT";

        if (user) {
          if (user.role) {
            detectedRole = user.role.toUpperCase() as "EMPLOYER" | "STUDENT";
          } else if (user.employer_profile !== null && user.employer_profile !== undefined) {
            detectedRole = "EMPLOYER";
          }
        }
        setUserRole(detectedRole);

        // 2. Загружаем данные самого отклика
        const response = await fetch(`http://127.0.0.1:8000/application/${applicationId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setApplication(data);
        } else {
          console.error("Не удалось загрузить детали отклика");
        }
      } catch (error) {
        console.error("Ошибка при инициализации страницы:", error);
      } finally {
        loading && setLoading(false);
      }
    };

    if (applicationId) {
      initPage();
    }
  }, [applicationId]);

  // ИСПРАВЛЕНО: принимаем и отправляем статус в нижнем регистре ('accepted' | 'rejected')
  const handleUpdateStatus = async (targetStatus: "accepted" | "rejected") => {
    if (userRole !== "EMPLOYER") {
      setMessage("Ошибка: только работодатель может менять статус заявки.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      const token = localStorage.getItem("token");

      const response = await fetch(`http://127.0.0.1:8000/application/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus }) // Отправка в нижнем регистре
      });

      if (response.ok) {
        // Обновляем локальный стейт тем значением, которое засинкали с бэком
        setApplication(prev => prev ? { ...prev, status: targetStatus } : null);
        setMessage(targetStatus === "accepted" ? "Кандидат успешно принят!" : "Отклонено.");
      } else {
        setMessage("Ошибка при обновлении статуса на сервере (422 или 500).");
      }
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
      setMessage("Ошибка соединения с сервером.");
    } finally {
      setSubmitting(false);
    }
  };

  // Безопасное приведение к регистру для стилей бейджей
  const getStatusBadgeClass = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "accepted" || s.includes("accept")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected" || s.includes("reject")) return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "accepted" || s.includes("accept")) return "Принят";
    if (s === "rejected" || s.includes("reject")) return "Отказ";
    return "На рассмотрении";
  };

  const isPendingStatus = (status: string) => {
    const s = status?.toLowerCase() || "";
    return s === "pending" || (!s.includes("accept") && !s.includes("reject"));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#05A4BA]"></div>
    </div>
  );

  if (!application) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
      <p className="text-lg italic">Заявка не найдена или у вас нет к ней доступа.</p>
      <button onClick={() => router.back()} className="mt-4 text-[#05A4BA] font-bold hover:underline">Назад</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Кнопка назад */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Назад
        </button>

        {/* Главная карточка: Студент */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusBadgeClass(application.status)}`}>
                {getStatusLabel(application.status)}
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-2">
                {userRole === "STUDENT" ? "Ваша заявка" : (application.student?.username || "Кандидат")}
              </h1>
              {userRole === "EMPLOYER" && (
                <p className="text-sm text-slate-400 font-medium">{application.student?.email}</p>
              )}
            </div>

            {userRole === "EMPLOYER" && application.match_score !== null && (
              <div className="bg-[#A9F4FF]/20 border border-[#A9F4FF]/60 p-4 rounded-2xl text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider font-black text-slate-400 block">AI Совпадение</span>
                <span className="text-xl font-black text-[#05A4BA]">{Math.round(application.match_score * 100)}%</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Вакансия</span>
              <p className="text-sm font-bold text-slate-800">{application.vacancy_title || `ID Вакансии: ${vacancyId}`}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase">Академический GPA</span>
              <p className="text-sm font-bold text-slate-800">⭐ {application.student?.gpa ?? "Не указан"}</p>
            </div>
          </div>
        </div>

        {/* Карточка: Интересы и навыки студента */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {userRole === "STUDENT" ? "Ваши навыки и интересы" : "Навыки и интересы кандидата"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {application.student?.interests && application.student.interests.length > 0 ? (
              application.student.interests.map((interest, idx) => (
                <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  {interest}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400 italic">Навыки не указаны.</p>
            )}
          </div>
        </div>

        {/* Карточка: Сопроводительное письмо */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Сопроводительное письмо</h3>
          {application.cover_letter ? (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-5 rounded-2xl border border-slate-100 whitespace-pre-line font-medium">
              "{application.cover_letter}"
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 text-center">
              Сопроводительное письмо отсутствует.
            </p>
          )}
        </div>

        {/* 🔐 ПАНЕЛЬ ДЕЙСТВИЙ РАБОТОДАТЕЛЯ: Принять / Отклонить */}
        {userRole === "EMPLOYER" && isPendingStatus(application.status) && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-slate-900">Примите решение по отклику</h4>
              <p className="text-xs text-slate-400 font-medium">Студент получит уведомление об изменении статуса</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleUpdateStatus("rejected")} // Изменено на нижний регистр
                disabled={submitting}
                className="flex-1 sm:flex-none px-6 py-3 border border-rose-200 text-rose-600 font-bold rounded-2xl text-sm bg-rose-50/50 hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Отклонить
              </button>
              <button
                onClick={() => handleUpdateStatus("accepted")} // Изменено на нижний регистр
                disabled={submitting}
                className="flex-1 sm:flex-none px-6 py-3 bg-[#05A4BA] text-white font-bold rounded-2xl text-sm hover:bg-[#1D869E] transition-all shadow-lg shadow-cyan-100 active:scale-95 disabled:opacity-50"
              >
                Принять на работу
              </button>
            </div>
          </div>
        )}

        {/* 🎓 ПАНЕЛЬ ДЕЙСТВИЙ СТУДЕНТА */}
        {userRole === "STUDENT" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="text-center sm:text-left">
              {isPendingStatus(application.status) ? (
                <>
                  <h4 className="font-bold text-amber-800">⏳ Ожидание ответа</h4>
                  <p className="text-xs text-amber-600/80 font-medium">Ваша заявка находится на рассмотрении у работодателя.</p>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-slate-900">Решение принято</h4>
                  <p className="text-xs text-slate-400 font-medium">Текущий статус вашей заявки: {getStatusLabel(application.status)}</p>
                </>
              )}
            </div>

            <button
              onClick={() => router.push("/profile")}
              className="w-full sm:w-auto text-center px-6 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-2xl text-sm transition-all active:scale-95 layout-button"
            >
              Перейти в профиль
            </button>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-2xl border text-center text-sm font-bold ${
            message.includes("успешно") || message.includes("принят") || message.includes("Принят")
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {message}
          </div>
        )}

      </div>
    </div>
  );
}