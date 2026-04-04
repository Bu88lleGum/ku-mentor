"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';


export default function LoginPage() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const [username, setUsername] = useState(''); // email
  const [password, setPassword] = useState(''); // пароль
  const error = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false); //загрузка
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // setError('');

    try {
      // 1. Создаем объект URLSearchParams (формат application/x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('username', username); // Бэкенд ждет email в поле username
      formData.append('password', password);

      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        // Выводим конкретную ошибку от бэкенда ("Неверный email или пароль")
        throw new Error(data.detail || "Ошибка входа");
      }

      // 2. СОХРАНЕНИЕ ТОКЕНА
      // access_token — это твой ключ к защищенным данным
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', username); // Сохраняем email для отображения в профиле

      // 3. ПЕРЕХОД
      router.push('/profile'); 
      
    } catch (err: any) {
      // setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (error === 'session_expired') {
      window.dispatchEvent(new CustomEvent("show-toast", { 
        detail: "Сессия истекла. Пожалуйста, войдите снова." 
      }));
    }
  }, [error]);

  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-40 bg-indigo-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
            <h2 className="text-white text-2xl font-bold">KU Mentor</h2>
          </div>
          <p className="mt-2 text-sm text-gray-500">Твой персональный ИИ-секретарь</p>
        </div>

        {/* Форма */}
        <form className="mt-8 space-y-4" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 ml-1 mb-1">Email</label>
              <input 
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 ml-1 mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 bg-indigo-700 text-white font-bold rounded-xl hover:bg-indigo-800 transition-all shadow-md active:scale-95 disabled:opacity-70"
          >
            {isLoading ? "Авторизация..." : "Войти в систему"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center w-full border-t border-gray-100"></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">или</span></div>
        </div>

        <button 
          onClick={() => router.push('/')} 
          className="w-full py-3 border border-gray-200 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Назад на главную
        </button>
      </div>
    </div>
  );
}