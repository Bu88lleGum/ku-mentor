"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "../services/userService";
import Link from "next/link";

export default function EmployerProfilePage() {
  // Интерфейсы для работодателя
  interface EmployerProfile {
    username: string;
    email: string;
    company_name?: string;
    region?: string;
    industry?: string;
  }

  interface Vacancy {
    id: number;
    title: string;
    status: "active" | "closed";
    applications_count: number;
    created_at: string;
  }

  interface Application {
    id: number;
    student_name: string;
    vacancy_title: string;
    status: string;
  }

  const [userData, setUserData] = useState<EmployerProfile | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const getEmployerData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const data = await fetchUserProfile();
        if (data) {
          setUserData({
            username: data.username,
            email: data.email,
            company_name: data.employer_profile?.company_name || "Название компании",
            region: data.employer_profile?.region || "Регион не указан",
            industry: data.employer_profile?.industry || "Индустрия",
          });
        }

        const vacanciesRes = await fetch("http://127.0.0.1:8000/vacancy/my", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (vacanciesRes.ok) {
          setVacancies(await vacanciesRes.json());
        }

        const appsRes = await fetch("http://127.0.0.1:8000/application/incoming", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (appsRes.ok) {
          setApplications(await appsRes.json());
        }

      } catch (err) {
        console.error("Ошибка загрузки данных работодателя:", err);
      } finally {
        setLoading(false);
      }
    };

    getEmployerData();
  }, [router]);

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
                    <Link 
                      href={`/vacancies/${vacancy.id}`}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#05A4BA] hover:border-[#05A4BA] transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm italic">У вас пока нет активных вакансий</p>
                </div>
              )}
            </div>
          </div>

          {/* Секция входящих заявок + Кнопка возврата */}
          <div className="bg-white border border-[#A9F4FF] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-4">Новые заявки</h3>
              {/* <div className="space-y-3 mb-6">
                {applications.length > 0 ? (
                  applications.slice(0, 5).map((app) => (
                    <div key={app.id} className="p-3 bg-[#A9F4FF]/10 rounded-2xl border border-[#A9F4FF]/20">
                      <p className="text-xs font-black text-[#1D869E] mb-1">{app.student_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">на: {app.vacancy_title}</p>
                      <button className="mt-2 w-full py-1.5 bg-white text-[10px] font-bold text-[#05A4BA] rounded-lg border border-[#A9F4FF] hover:bg-[#05A4BA] hover:text-white transition-all">
                        Смотреть профиль
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">Новых откликов нет</p>
                )} */}
              {/* </div> */}
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