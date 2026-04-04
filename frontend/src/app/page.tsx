'use client';



import { useState, useEffect } from 'react';
import Link from "next/link"
import LogoutButton from "@/src/app/components/logoutButton";
import { fetchUserProfile } from "./services/userService"


// Типизация ответа от твоего FastAPI
interface CourseRecommendation {
  id: number;
  title: string;
  description: string;
}



export default function Home() {

  const [warning, setWarning] = useState('');
  const [isAuth, setIsAuth] = useState(false); //Авторизован
  const [query, setQuery] = useState(''); //Запрос
  const [results, setResults] = useState<CourseRecommendation[]>([]); //Результаты
  const [loading, setLoading] = useState(false); //Загрузка

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // 1. Очищаем старое предупреждение
    setWarning('');

    // 2. Проверка на минимальную длину (3 символа)
    if (query.trim().length < 3) {
      setWarning('Запрос должен содержать минимум 3 буквы');
      setResults([]); // Очищаем старые результаты, чтобы они исчезли
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`http://127.0.0.1:8000/recommend/?user_query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
        });
      if (response.status === 401) {
        setIsAuth(false);
        return;
      }

      const data = await response.json();

      console.log("ОТВЕТ БЭКЕНДА:", data);

      //-----------Проверка данных-----------
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data.recommendations && Array.isArray(data.recommendations)) {
        setResults(data.recommendations); // Попробуйте это имя, если оно в консоли
      } else if (data.courses && Array.isArray(data.courses)) {
        setResults(data.courses);
      } else {
        // Если ничего не подошло, попробуем взять первый найденный массив внутри объекта
        const autoFoundArray = Object.values(data).find(val => Array.isArray(val));
        setResults(Array.isArray(autoFoundArray) ? autoFoundArray : []);
      }
      // -------------------------------

    } catch (error) {
      setIsAuth(false)
      console.error("Ошибка соединения:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Проверка авторизации
useEffect(() => {
  const token = localStorage.getItem("token");
  
  const checkAuth = async () => {
    if (!token){
      return;
    }
    try {
      // Проверяем реальность токена через запрос к профилю
      await fetchUserProfile(); 
      setIsAuth(true);
    } catch (err) {
      // Токен оказался невалидным или истек
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuth(false);

      // Генерируем уведомление, которое поймает ToastProvider в layout.tsx
      window.dispatchEvent(new CustomEvent("show-toast", { 
        detail: "Сессия истекла. Пожалуйста, войдите в аккаунт снова." 
      }));
    }
  };

  checkAuth();
}, []);
  
  return (
    
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Хэдер на весь экран с синим фоном */}
      <header className="bg-indigo-700 pt-16 pb-20">
    
        {/* Кнопки в верхнем правом углу */}
        <div className="absolute top-6 right-6 flex gap-4">
        {isAuth ? (
          <>
            {/* Если авторизован — показываем кнопку Профиля */}
            <LogoutButton></LogoutButton>

            <Link 
              href="/profile" 
              className="bg-white text-indigo-700 px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-all"
            >Мой профиль</Link>
          </>
        
        ) : (
          /* Если НЕ авторизован — показываем кнопку Войти */
          <Link 
            href="/login" 
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
          >
            Войти
          </Link>
        )}
        </div>

        {/* Центральная часть хэдера */}
        <div className="text-center">
          <h1 className="text-6xl font-extrabold text-white my-24">KU Mentor</h1>
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto">Твой персональный ИИ-секретарь: найди курс по смыслу, а не по буквам.</p>
        </div>
      </header>

      {/* Результаты */}
      <main className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 -mt-10 relative z-10">
    
          {/* Сообщение для неавторизованных пользователей */}
          {!isAuth && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
              <span className="text-amber-600 text-lg">🔒</span>
              <p className="text-amber-800 text-sm font-medium">Пожалуйста, <Link href="/login" className="underline font-bold hover:text-amber-900">войдите в систему</Link>
                , чтобы воспользоваться ИИ-поиском курсов.
              </p>
            </div>
          )}

          {/* Форма поиска */}
          <form onSubmit={handleSearch} className="relative">
            <input type="text"
              // Блокируем поле, если нет авторизации
              disabled={!isAuth}
              className={`w-full p-6 text-lg rounded-2xl shadow-xl transition-all
                ${!isAuth 
                  ? "bg-gray-100 cursor-not-allowed text-gray-400 placeholder-gray-400" 
                  : "bg-white text-black outline-none focus:ring-4 focus:ring-indigo-300 shadow-indigo-100/50"
              }`}
              placeholder={isAuth ? "Опиши свои интересы..." : "Поиск доступен только после входа"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              />
    
            <button 
              type="submit"
              // Блокируем кнопку, если нет авторизации или идет загрузка
              disabled={!isAuth || loading}
              className={`absolute right-3 top-3 bottom-3 px-8 font-bold rounded-xl transition-all 
                ${!isAuth 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95 disabled:opacity-50"
                }`}
                >
              {loading ? '...' : 'Найти'}
            </button>
          </form>
          {/* Блок предупреждения */}
          {warning && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 animate-pulse">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-700 text-sm font-medium">{warning}</p>
            </div>
          )}
        </div>
  
        {/* Результаты */}
        <div className="max-w-4xl mx-auto px-4 mt-10 pb-20"> {/* Добавили отступы и ширину */}
          {results && results.length > 0 ? (
          <div className="relative space-y-6">
            {results.map((course: any, i: number) => (
              <div 
                // key={course.id || course.title} // Используем title если нет id
                key={`${course.id}-${course.title}-${i}`}
                className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-slate-800">{course.title}</h3>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase">Курс</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {course.description}
                </p>
              </div>
            ))}
          </div>
          ) : (
            !loading && query && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <p className="text-slate-400 text-xl font-medium">Ничего не найдено.</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}




