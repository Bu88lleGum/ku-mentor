"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "../services/userService"


export default function ProfilePage() {


interface UserProfile {
  username: string;
  email: string;
  gpa: number;
  interests: string[];
}

const [userData, setUserData] = useState<UserProfile | null>(null);
const [loading, setLoading] = useState<boolean>(false);
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [allAvailableSkills, setAllAvailableSkills] = useState<{id: number, name: string}[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [message, setMessage] = useState("");

const router = useRouter();
  

useEffect(() => {
  const getData = async () => {
    try {
      //1. профиль
      const data = await fetchUserProfile();
      
      // все доступные навыки из БД
      const skillsResponse = await fetch("http://127.0.0.1:8000/skill/");
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        setAllAvailableSkills(skillsData);
      }
      
      if (data) {
        // 2. UserProfile
        const flattenedData: UserProfile = {
          username: data.username,
          email: data.email,
          gpa: data.student_profile?.gpa ?? 0,
          interests: data.student_profile?.interests ?? []
        };

        // 3. обновляем стейты
        setUserData(flattenedData);
        setSelectedTags(flattenedData.interests);
      }
    } catch (err) {
      console.error("Ошибка при загрузке профиля:", err);
      localStorage.removeItem("token");
      router.push("/login?error=session_expired");

    } finally {
      // 4. Выключаем индикатор загрузки ТОЛЬКО после того, как стейты обновились
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
    <div className="min-h-screen bg-gray-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Карточка основной информации (Обновленная под модель User) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Аватар с инициалом */}
            <div className="h-24 w-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-inner">
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
                <h1 className="text-2xl font-bold text-gray-900">{userData?.username}</h1>
              </div>
              
              <p className="text-gray-500 text-sm mb-3">{userData?.email}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <div className="bg-indigo-50 px-3 py-1 rounded-lg text-indigo-700 text-xs font-bold">
                    GPA: {userData?.gpa}
                  </div>
              </div>
            </div>

          </div>
        </div>

        {/* Блок интересов*/}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Мои интересы</h2>
              <p className="text-sm text-gray-500 mb-6">Выберите направления, чтобы Mentor подобрал курсы.</p>
            </div>
    
            {/* Кнопка сохранения в углу блока */}
            <button
              onClick={saveInterests}
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                isSaving 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95"
              }`}>
              {isSaving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allAvailableSkills.map(skill => {
              const isSelected = selectedTags.includes(skill.name); 
              return (
                <button
                  key={skill.id} // Теперь ключ — это реальный ID из базы
                  onClick={() => toggleTag(skill.name)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isSelected ? "bg-indigo-700 text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
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
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1 text-lg">История поиска</h3>
            <p className="text-sm text-gray-400">Ваши последние запросы по курсам и вакансиям.</p>
          </div>

          <div className="bg-indigo-700 rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col justify-between items-start text-white">
            <div>
              <h3 className="font-bold text-lg mb-1">Рекомендации ИИ</h3>
              <p className="text-indigo-100 text-sm opacity-90">На основе вашей роли и интересов мы подготовили новые предложения.</p>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-6 bg-white text-indigo-700 px-6 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all shadow-md">
              Смотреть всё
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
