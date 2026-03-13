"use client";
import { useState, useEffect } from "react";

const ALL_TAGS = ["Python", "Data Science", "SQL", "NestJS", "Frontend", "Machine Learning", "UI/UX Design", "Project Management"];

export default function ProfilePage() {
  const [username, setUsername] = useState("Студент");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Python", "SQL"]);
  const [gpa, setGpa] = useState("4.8");

  // Имитация загрузки данных при входе
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUsername(savedUser);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Карточка основной информации */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold">
              {username[0]?.toUpperCase()}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
              <p className="text-gray-500">Студент • Информационные системы</p>
              <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-blue-50 px-3 py-1 rounded-lg text-blue-700 text-sm font-medium">
                  GPA: {gpa}
                </div>
                <div className="bg-green-50 px-3 py-1 rounded-lg text-green-700 text-sm font-medium">
                  Регион: Акмолинская обл.
                </div>
              </div>
            </div>
            <button className="px-6 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
              Редактировать
            </button>
          </div>
        </div>

        {/* Блок интересов (для ИИ-рекомендаций) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Мои интересы</h2>
          <p className="text-sm text-gray-500 mb-6">Выберите направления, чтобы Mentor предлагал более точные курсы и вакансии.</p>
          
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedTags.includes(tag)
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent"
                }`}
              >
                {tag} {selectedTags.includes(tag) ? "✕" : "+"}
              </button>
            ))}
          </div>
        </div>

        {/* Заглушка для Рекомендаций */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm opacity-60">
            <h3 className="font-bold text-gray-900 mb-2">Сохраненные курсы</h3>
            <p className="text-sm text-gray-400 italic">Здесь появятся курсы, которые вы отметите флажком.</p>
          </div>
          <div className="bg-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-100 flex flex-col justify-between items-start">
            <h3 className="font-bold text-white mb-2">Подобрать вакансии?</h3>
            <p className="text-blue-100 text-sm mb-4">На основе ваших тегов мы нашли НИ ОДНОЙ подходящей позиции в вашем регионе.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              Перейти к поиску
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}