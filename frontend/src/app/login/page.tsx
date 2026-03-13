"use client";

import { useRouter } from 'next/navigation'; // Важно: импорт из navigation
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter(); // Инициализируем роутер
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // 1. Здесь будет запрос к твоему API (пока имитация)
    // await api.login(username); 

    // 2. Сохраняем данные пользователя
    localStorage.setItem('user', 'тестовое_имя'); 

    // 3. ПЕРЕХОД: отправляем пользователя на страницу интересов или профиля
    // Мы решили сначала сделать страницу интересов, так что путь /interests
    router.push('/profile'); 
    
  } catch (error) {
    console.error("Ошибка входа", error);
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Заголовок */}
        <div className="text-center">
          <div className="mx-auto h-12 w-36 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <h2 className="text-white text-2xl font-bold">KU Mentor</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Твой персональный гид по университетским курсам
          </p>
        </div>

        {/* Форма */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 ml-1">
                Логин
              </label>
              <input id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all my-2"
                placeholder="Введите ваш логин"
              />

              <label htmlFor="username" className="block text-sm font-medium text-gray-700 ml-1">
                Пароль
              </label>
              <input
                className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="Введите ваш пароль"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Вход...
                </span>
              ) : "Войти в систему"}
            </button>
          </div>
          
        </form>
        <button onClick={() => window.location.href = '/'} className="group relative w-full flex justify-center py-3 px-4 my-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">Назад</button>

        {/* Подвал карточки */}
        <div className="text-center text-xs text-gray-400 mt-4">
          На данном этапе регистрация не требуется. <br/>
          Введите любое имя для создания демо-профиля.
        </div>
      </div>
    </div>
  );
}