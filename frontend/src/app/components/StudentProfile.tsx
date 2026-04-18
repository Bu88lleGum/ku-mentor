"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "../services/userService"


export default function StudentProfile() {


interface UserProfile {
  username: string;
  email: string;
  gpa: number;
  interests: string[];
}

interface SearchHistory {
  id: number;
  query_text: string;
  created_at: string;
}

const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
const [userData, setUserData] = useState<UserProfile | null>(null);
const [loading, setLoading] = useState<boolean>(false);
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [allAvailableSkills, setAllAvailableSkills] = useState<{id: number, name: string}[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [message, setMessage] = useState("");

const router = useRouter();
  

// 1. Интерфейс (подстрой под свои поля из базы)
interface EnrolledCourse {
  id: number;
  course_id: number;
  course_name: string; // Или запрашивай через JOIN
}

// 2. Стейт внутри компонента
const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);




useEffect(() => {
  const getData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // 1. Загружаем профиль пользователя
      const data = await fetchUserProfile();
      
      // 2. Загружаем список навыков
      const skillsResponse = await fetch("http://127.0.0.1:8000/skill/");
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        setAllAvailableSkills(skillsData);
      }
      
      if (data) {
        const flattenedData: UserProfile = {
          username: data.username,
          email: data.email,
          gpa: data.student_profile?.gpa ?? 0,
          interests: data.student_profile?.interests ?? []
        };
        setUserData(flattenedData);
        setSelectedTags(flattenedData.interests);
      }

      // --- НОВАЯ ЧАСТЬ: Загрузка курсов пользователя ---
      const coursesResponse = await fetch("http://127.0.0.1:8000/studentcource/my-courses", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (coursesResponse.ok) {
        const myCoursesData = await coursesResponse.json();
        
        // Если бэкенд возвращает только course_id, можно временно 
        // отображать их так. Если нужен course_name, бэкенд должен делать JOIN.
        setEnrolledCourses(myCoursesData);
      }
      // -----------------------------------------------

      // 4. Загрузка истории поиска
      const historyResponse = await fetch("http://127.0.0.1:8000/searchhistory/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const uniqueHistory = historyData.reduce((acc: SearchHistory[], current: SearchHistory) => {
          const x = acc.find(item => item.query_text === current.query_text);
          if (!x) return acc.concat([current]);
          return acc;
        }, []); 
        setSearchHistory(uniqueHistory);
      }

    } catch (err) {
      console.error("Ошибка при загрузке профиля:", err);
      // router.push("/login?error=session_expired");
    } finally {
      setLoading(false);
    }
  };

  getData();
}, [router]);


const toggleTag = (tag: string) => {
  setSelectedTags(prev => 
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  );
};


const saveInterests = async () => {
  setIsSaving(true);
  
  // Мапим имена тегов в ID, которые ожидает бэкенд в поле skill_ids
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
        interests: selectedTags,    // Текстовые названия
        skill_ids: selectedSkillIds // МАССИВ ЧИСЕЛ (ID из базы)
      }), 
    });
  } catch (err) {
    setMessage("Ошибка сохранения");
  } finally {
    setIsSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Карточка основной информации */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Аватар с инициалом */}
            <div className="h-24 w-24 bg-[#1D869E] rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-inner">
              {userData?.username
                ?.split(' ')             
                .map(word => word[0])    
                .join('')                
                .toUpperCase()           
                .slice(0, 2)             
              }
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{userData?.username}</h1>
              </div>
              
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
    
            {/* Кнопка сохранения */}
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

        {/* Сетка действий */}
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
                    // При клике переходим на главную и добавляем query в URL
                    onClick={() => router.push(`/?query=${encodeURIComponent(item.query_text)}`)}
                    className="w-full flex justify-between items-center p-3 bg-slate-50 rounded-2xl hover:bg-[#A9F4FF]/20 hover:ring-1 hover:ring-[#A9F4FF] transition-all group"
                  >
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-[#1D869E]">
                      {item.query_text}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      {/* Маленькая иконка стрелочки, которая появляется при наведении */}
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
          <div className="bg-white border border-[#A9F4FF] rounded-3xl p-6 shadow-sm flex flex-col justify-between items-start">
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">Мои курсы</h3>
                <span className="bg-[#A9F4FF] text-[#1D869E] text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                  {enrolledCourses.length} Активно
                </span>
              </div>

              {/* Список зачисленных курсов */}
              <div className="space-y-3 mb-6">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.slice(0, 3).map((course) => (
                    <div key={course.id} className="flex items-center gap-3 p-3 bg-[#A9F4FF]/10 rounded-2xl border border-[#A9F4FF]/30">
                      <div className="w-2 h-2 rounded-full bg-[#05A4BA] animate-pulse" />
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {course.course_name || `Курс #${course.course_id}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic py-2 text-center">Вы еще не записались на курсы</p>
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
