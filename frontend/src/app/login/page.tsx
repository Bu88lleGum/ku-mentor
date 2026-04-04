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
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); //загрузка
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);

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
      setLocalError(err.message);
      setIsLoading(false);
    }
  };

const handleInputChange = (setter: (val: string) => void, value: string) => {
  setter(value);
  if (localError) setLocalError(null);
  
  // Если в URL есть ошибка, убираем её, чтобы она не "залипла"
  if (searchParams.get('error')) {
    router.replace('/login'); // Мягко очищает URL без перезагрузки
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
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-40 bg-[#05A4BA] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
            <h2 className="text-white text-2xl font-bold">KU Mentor</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Твой персональный ИИ-секретарь</p>
        </div>

        {/* Форма */}
        <form className="mt-8 space-y-4" onSubmit={handleLogin}>
          {(localError || searchParams.get('error')) && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium text-center animate-in fade-in duration-300">
            {localError 
              ? localError 
              : "Сессия истекла. Пожалуйста, войдите снова."
            }
          </div>
        )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 ml-1 mb-1">Email</label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => 
                  setUsername(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#05A4BA] focus:bg-white transition-all"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 ml-1 mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#05A4BA] focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 bg-[#05A4BA] text-white font-bold rounded-xl hover:bg-[#1D869E] transition-all shadow-md shadow-cyan-100 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Авторизация..." : "Войти в систему"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center w-full border-t border-slate-100"></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">или</span></div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full py-3 border border-slate-200 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#1D869E] hover:border-[#A9F4FF] transition-all">
          Назад на главную
        </button>
      </div>
    </div>
  );
}