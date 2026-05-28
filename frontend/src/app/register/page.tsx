'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'employer'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', 
    fullName: '',
    companyName: '',
    region: '', 
    industry: '', 
  });

  // Очищаем специфичные поля при переключении роли, чтобы не слать лишний мусор
  const handleRoleChange = (newRole: 'student' | 'employer') => {
    setRole(newRole);
    setError('');
    setFormData(prev => ({
      ...prev,
      companyName: '',
      region: '',
      industry: '',
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Включаем состояние загрузки (кнопка заблокируется, появится спиннер)

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }
    
    try {
      // 1. Формируем единый объект для атомарной регистрации
      const registrationData = {
        username: formData.fullName, 
        email: formData.email,
        password: formData.password,
        role: role,
        company_name: role === 'employer' ? formData.companyName : undefined,
        industry: role === 'employer' ? formData.industry : undefined,
        region: role === 'employer' ? formData.region : undefined,
      };

      // 2. Отправляем запрос и ЖДЁМ ответа от бэкенда
      const regResponse = await fetch('http://127.0.0.1:8000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      const regData = await regResponse.json();

      if (!regResponse.ok) {
        if (Array.isArray(regData.detail)) {
          throw new Error(regData.detail[0].msg);
        } 
        throw new Error(regData.detail || 'Ошибка при создании аккаунта');
      }

      // 3. Извлекаем токен авторизации
      const token = regData.access_token;
      if (!token) {
        throw new Error('Аккаунт создан, но не удалось получить токен авторизации. Попробуйте войти вручную.');
      }
      
      const userPayload = {
        id: regData.user.id,
        email: formData.email,
        username: formData.fullName,
        role: role
      };

      // 4. Записываем данные в localStorage (Осуществляем автоматический вход)
      localStorage.setItem("token", token);
      localStorage.setItem("role", role.toUpperCase());
      localStorage.setItem("user", JSON.stringify(userPayload));

      // 5. КРИТИЧЕСКИЙ ШАГ: Небольшая пауза перед редиректом
      // Она нужна, чтобы Next.js и фоновые fetch-запросы (вроде /users/me) 
      // увидели обновлённый токен в localStorage до выполнения перехода.
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 6. Перенаправляем пользователя в созданный профиль
      router.push('/profile');
      router.refresh(); // Принудительно обновляем серверные компоненты Next.js, если они есть

    } catch (err: any) {
      // Если произошла ошибка — выключаем загрузку и показываем её текст
      setError(err.message);
      setLoading(false);
    }
    // Обрати внимание: мы убрали setLoading(false) из блока finally, 
    // чтобы лоадер крутился до тех пор, пока router.push() полностью не уведёт нас со страницы.
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-12">
      <Link href="/" className="mb-8 text-3xl font-black text-[#05A4BA]">
        KU Mentor
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100"
      >
        <h1 className="text-2xl font-black text-slate-800 text-center mb-2">Создать аккаунт</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">Выберите свою роль в системе</p>

        {/* Переключатель Ролей */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 relative">
          <motion.div 
            className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm z-0"
            initial={false}
            animate={{ 
              left: role === 'student' ? '6px' : '50%', 
              right: role === 'student' ? '50%' : '6px' 
            }}
          />
          <button type="button" onClick={() => handleRoleChange('student')} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${role === 'student' ? 'text-[#05A4BA]' : 'text-slate-500'}`}>
            Студент
          </button>
          <button type="button" onClick={() => handleRoleChange('employer')} className={`flex-1 py-2.5 text-sm font-bold z-10 transition-colors ${role === 'employer' ? 'text-[#05A4BA]' : 'text-slate-500'}`}>
            Работодатель
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Общие поля */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">ФИО</label>
            <input required type="text" className="w-full p-4 bg-slate-50 border text-black border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="Иван Иванов"
              value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
          </div>

          {/* Поля работодателя */}
          <AnimatePresence>
            {role === 'employer' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Название компании</label>
                  {/* ИСПРАВЛЕНИЕ: required становится true только если выбрана роль employer */}
                  <input required={role === 'employer'} type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="Tech Global LLC"
                    value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Регион</label>
                    <input required={role === 'employer'} type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="Алматы"
                      value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Индустрия</label>
                    <input required={role === 'employer'} type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="IT / Финтех"
                      value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Email</label>
            <input required type="email" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="example@mail.com"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          {/* Блок паролей */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Пароль</label>
              <input required type="password" id="password" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="••••••••"
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Подтверждение</label>
              <input required type="password" id="confirmPassword" className={`w-full p-4 bg-slate-50 text-black border rounded-2xl outline-none focus:ring-4 transition-all ${error === 'Пароли не совпадают' ? 'border-red-300 focus:ring-red-100' : 'border-slate-100 focus:ring-[#A9F4FF]'}`} placeholder="••••••••"
                value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
          </div>

          {/* Вывод ошибки */}
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-bold ml-1">
              ⚠️ {error}
            </motion.p>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 bg-[#05A4BA] text-white font-black rounded-2xl shadow-lg hover:bg-[#1D869E] active:scale-[0.98] transition-all flex justify-center items-center">
            {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500 text-sm">
          Уже есть аккаунт? {' '}
          <Link href="/login" className="text-[#05A4BA] font-bold hover:underline">Войти</Link>
        </p>
      </motion.div>
    </div>
  );
}