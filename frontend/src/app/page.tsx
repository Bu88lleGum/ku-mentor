'use client';

import { useState } from 'react';
import Link from "next/link"

// Типизация ответа от твоего FastAPI
interface CourseRecommendation {
  id: number;
  title: string;
  description: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Запрос к твоему серверу (обязательно проверь, что он запущен на 8000 порту)
      const response = await fetch(`http://localhost:8000/recommend?user_query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Ошибка соединения с бэкендом:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

<Link 
  href="/login" 
  className="mx-12 px-5 py-2 border border-gray-200 text-gray-600 font-medium rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all duration-200"
>
  Войти
</Link>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-indigo-700 mb-4 tracking-tight">
            KU Mentor
          </h1>
          <p className="text-lg text-slate-600">
            Твой персональный ИИ-секретарь: найди курс по смыслу, а не по буквам.
          </p>
        </header>

        {/* Форма поиска */}
        <form onSubmit={handleSearch} className="relative group mb-16">
          <input
            type="text"
            className="w-full p-6 pr-32 text-lg rounded-2xl border-none shadow-xl focus:ring-4 focus:ring-indigo-300 transition-all outline-none bg-white text-black"
            placeholder="Опиши свои интересы..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'Найти'}
          </button>
        </form>

        {/* Результаты */}
        <div className="space-y-6">
          {Array.isArray(results) && results.map((course) => (
            <div 
              key={course.id} 
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-slate-800">{course.title}</h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Курс
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-lg">
                {course.description}
              </p>
            </div>
          ))}

          {results.length === 0 && !loading && query && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-xl font-medium">Ничего не найдено. Попробуй перефразировать запрос!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}