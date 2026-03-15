"use client";



import { useState } from "react";


// Пример ролей из твоей модели
enum UserRole {
  STUDENT = "student",
  EMPLOYER = "employer"
}



export default function ProfilePage() {

  // Состояния на основе модели User
  const [userData, setUserData] = useState({
    username: "Загрузка...",
    email: "email@example.com",
    role: UserRole.STUDENT,
    interests: [] ,
    createdAt: new Date().toLocaleDateString(),
    gpa: 4.8,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(["Python", "SQL"]);
  const ALL_TAGS = ["Python", "Data Science", "SQL", "NestJS", "Frontend", "UI/UX"];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };


  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const saveInterests = async () => {
    setIsSaving(true);
    setMessage("");
    
    try {
      const response = await fetch("ttp://127.0.0.1:8000/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selectedTags }),
      });

      if (response.ok) {
        setMessage("Интересы успешно сохранены!");
        // Скрываем сообщение через 3 секунды
        setTimeout(() => setMessage(""), 3000);
      } else {
        throw new Error("Ошибка при сохранении");
      }
    } catch (err) {
      setMessage("Не удалось сохранить данные");
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
              {userData.username[0]?.toUpperCase()}
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{userData.username}</h1>
                <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                  userData.role === UserRole.EMPLOYER ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {userData.role === UserRole.STUDENT ? "Студент" : "Работодатель"}
                </span>
              </div>
              
              <p className="text-gray-500 text-sm mb-3">{userData.email}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <div className="bg-gray-100 px-3 py-1 rounded-lg text-gray-600 text-xs">
                  На платформе с: {userData.createdAt}
                </div>
                {userData.role === UserRole.STUDENT && (
                  <div className="bg-indigo-50 px-3 py-1 rounded-lg text-indigo-700 text-xs font-bold">
                    GPA: {userData.gpa}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Блок интересов (Логика не меняется, но важна для STUDENT) */}
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
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? "bg-indigo-700 text-white shadow-md"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}>
                {tag} {selectedTags.includes(tag) ? "✕" : "+"}
              </button>
            ))}
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
