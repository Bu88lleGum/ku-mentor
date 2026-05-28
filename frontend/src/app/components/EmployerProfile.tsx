"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "../services/userService";
import Link from "next/link";

// Интерфейсы для типизации данных
// Структура данных профиля работодателя, включая вложенные поля компании
interface EmployerProfile {
  username: string;
  email: string;
  company_name?: string;
  region?: string;
  industry?: string;
}

// Описание объекта вакансии, созданной этим работодателем
interface Vacancy {
  id: number;
  title: string;
  status: "active" | "closed";
  applications_count: number;
  created_at: string;
}

// Описание объекта входящего отклика от студента (маппинг схемы IncomingApplicationRead)
interface Application {
  id: number;
  vacancy_id: number;
  student_name: string;
  vacancy_title: string;
  status: string;
  cover_letter_preview?: string; // Поле с бэкенда
  created_at: string;
}


/**
 * Получает детальную информацию о конкретной вакансии по её ID.
 * param id - Уникальный идентификатор вакансии
 */
const fetchVacancyById = async (id: number) => {
  try {
    const token = localStorage.getItem("token");
    
    const response = await fetch(`http://127.0.0.1:8000/vacancy/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`Вакансия с ID ${id} не найдена на сервере.`);
        return null;
      }
      throw new Error(`Ошибка сервера: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Ошибка при получении вакансии:", error);
    return null;
  }
};


export default function EmployerProfilePage() {
  const [userData, setUserData] = useState<EmployerProfile | null>(null); // Данные текущего шефа/компании
  const [vacancies, setVacancies] = useState<Vacancy[]>([]); // Список опубликованных вакансий
  const [applications, setApplications] = useState<Application[]>([]); // Список входящих откликов от студентов
  const [loading, setLoading] = useState<boolean>(true); // Индикатор загрузки (Skeleton/Spinner)
  const router = useRouter();

  // Хук useEffect для первичной загрузки всех данных при инициализации страницы
  useEffect(() => {
    const getEmployerData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        // 1. Запрос на получение базового профиля пользователя и информации о компании
        const data = await fetchUserProfile(); // Предполагается, что эта функция импортирована извне
        if (data) {
          // Маппим данные с бэкенда в плоскую структуру интерфейса EmployerProfile
          setUserData({
            username: data.username,
            email: data.email,
            company_name: data.employer_profile?.company_name || "Название компании",
            region: data.employer_profile?.region || "Регион не указан",
            industry: data.employer_profile?.industry || "Индустрия",
          });
        }

        // 2. Параллельный/последовательный запрос на получение вакансий ИМЕННО этого работодателя
        const vacanciesRes = await fetch("http://127.0.0.1:8000/vacancy/my", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (vacanciesRes.ok) {
          setVacancies(await vacanciesRes.json());
        }

        // 3. Запрос на получение всех входящих заявок от студентов на вакансии компании
        const appsRes = await fetch("http://127.0.0.1:8000/application/incoming", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (appsRes.ok) {
          setApplications(await appsRes.json());
        }

      } catch (err) {
        console.error("Ошибка загрузки данных работодателя:", err);
      } finally {
        // Выключаем спиннер загрузки в любом случае (успех или ошибка)
        setLoading(false);
      }
    };

    getEmployerData();
  }, [router]); // Зависимость от router перезапустит хук, если изменятся параметры маршрута



  /**
   * Функция-обработчик для удаления вакансии.
   * Вызывается при клике на иконку/кнопку корзины напротив вакансии.
   * param id - ID удаляемой вакансии
   */
  const handleDeleteVacancy = async (id: number) => {
    // Нативное подтверждение удаления во избежание случайных кликов
    if (!window.confirm("Вы уверены, что хотите удалить эту вакансию?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://127.0.0.1:8000/vacancy/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Оптимистичное обновление интерфейса: удаляем вакансию из стейта без повторного запроса к API
        setVacancies((prev) => prev.filter((v) => v.id !== id));
      } else {
        // Обработка бизнес-логики бэкенда (например, если СУБД сгенерировала ForeignKey Constraint Error из-за наличия откликов)
        alert("Не удалось удалить вакансию. Возможно, на неё уже есть отклики.");
      }
    } catch (error) {
      console.error("Ошибка при удалении вакансии:", error);
      alert("Ошибка соединения с сервером.");
    }
  };

  // Отрисовка экрана загрузки (Центрированный анимированный спиннер фирменного бирюзового цвета [#05A4BA])
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#05A4BA]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Карточка компании */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 bg-[#05A4BA] rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-cyan-100">
              {userData?.company_name?.slice(0, 1).toUpperCase()}
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{userData?.company_name}</h1>
              <p className="text-slate-500 text-sm mb-3">{userData?.email}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-600 text-xs font-bold border border-slate-200">
                  📍 {userData?.region}
                </span>
                <span className="bg-[#A9F4FF]/30 px-3 py-1 rounded-lg text-[#1D869E] text-xs font-bold border border-[#A9F4FF]/50">
                  🏢 {userData?.industry}
                </span>
              </div>
            </div>

            <button 
              onClick={() => router.push('/vacancies/create')}
              className="w-full md:w-auto px-6 py-4 bg-[#05A4BA] text-white font-black rounded-2xl shadow-lg shadow-cyan-100 hover:bg-[#1D869E] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Создать вакансию
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Секция вакансий */}
          <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Мои вакансии</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Всего: {vacancies.length}
              </span>
            </div>

            <div className="space-y-4">
              {vacancies.length > 0 ? (
                vacancies.map((vacancy) => (
                  <div key={vacancy.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-[#A9F4FF] hover:bg-white transition-all">
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-[#05A4BA] transition-colors">
                        {vacancy.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                        {new Date(vacancy.created_at).toLocaleDateString()} • {vacancy.applications_count} откликов
                      </p>
                    </div>

                    {/* Группа кнопок управления справа */}
                    <div className="flex items-center gap-2">
                      {/* Кнопка УДАЛЕНИЯ вакансии */}
                      <button
                        onClick={() => handleDeleteVacancy(vacancy.id)}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
                        title="Удалить вакансию"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>

                      {/* Кнопка перехода */}
                      <Link 
                        href={`/vacancies/${vacancy.id}`}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#05A4BA] hover:border-[#05A4BA] transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm italic">У вас пока нет активных вакансий</p>
                </div>
              )}
            </div>
          </div>

          {/* Секция входящих заявок */}
          <div className="bg-white border border-[#A9F4FF] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">Новые заявки</h3>
                <span className="bg-[#A9F4FF] text-[#1D869E] text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                  {applications.length} В очереди
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 w-4px">
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <div 
                      key={app.id}
                      onClick={() => router.push(`/vacancies/${app.vacancy_id}/applications/${app.id}`)} // Ссылка на просмотр деталей отклика
                      className="w-full text-left p-3.5 bg-slate-50 rounded-2xl border border-transparent hover:border-[#A9F4FF] hover:bg-white transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-[#05A4BA] transition-colors truncate max-w-[140px]">
                          {app.student_name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">
                          {new Date(app.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      
                      <p className="text-[11px] font-semibold text-[#1D869E] truncate mb-2">
                        на: {app.vacancy_title}
                      </p>

                      {app.cover_letter_preview ? (
                        <p className="text-xs text-slate-500 italic bg-slate-100/60 group-hover:bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
                          "{app.cover_letter_preview}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Без сопроводительного письма</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400 italic">У вас пока нет новых откликов</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Кнопка возврата на главную */}
            <button 
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-[#05A4BA] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1D869E] transition-all shadow-lg shadow-cyan-100 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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