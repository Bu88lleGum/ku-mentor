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
    confirmPassword: '', // Поле подтверждения
    fullName: '',
    companyName: '',
    region: '', // Поле региона
    industry: '', // Поле индустрии
  });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (formData.password !== formData.confirmPassword) {
    setError('Пароли не совпадают');
    return;
  }

  setLoading(true);
  
  try {

  const registrationData = {
    username: formData.fullName, 
    email: formData.email,
    password: formData.password,
    role: role
  };

  const regResponse = await fetch('http://127.0.0.1:8000/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  });
    const regData = await regResponse.json();

    if (!regResponse.ok) {
      // Проверяем, является ли detail массивом (типично для FastAPI 422 error)
      if (Array.isArray(regData.detail)) {
        // Берем сообщение из первого элемента ошибки
        throw new Error(regData.detail[0].msg);
      } 
      // Если это просто строка
      throw new Error(regData.detail || 'Ошибка при регистрации');
    }

    // Сохраняем токен сразу, он нужен для PATCH запроса
    const token = regData.access_token;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role.toUpperCase());
    }

    // 2. ДОЗАПОЛНЕНИЕ ДАННЫХ РАБОТОДАТЕЛЯ (если роль работодатель)
    if (role === 'employer') {
      const employerData = {
        company_name: formData.companyName,
        industry: formData.industry,
        region: formData.region
      };

      const patchResponse = await fetch('http://127.0.0.1:8000/users/complete-employer', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(employerData)
      });

      if (!patchResponse.ok) {
        const patchError = await patchResponse.json();
        console.error("Ошибка при сохранении данных компании:", patchError);
        // Не выбрасываем ошибку здесь, чтобы юзер всё равно попал в профиль, 
        // но можно вывести уведомление.
      }
    }

    // 3. ПЕРЕХОД В ПРОФИЛЬ
    router.push('/profile');

  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
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
          <button onClick={() => setRole('student')} className={`flex-1 py-2.5 text-sm font-bold z-10 ${role === 'student' ? 'text-[#05A4BA]' : 'text-slate-500'}`}>
            Студент
          </button>
          <button onClick={() => setRole('employer')} className={`flex-1 py-2.5 text-sm font-bold z-10 ${role === 'employer' ? 'text-[#05A4BA]' : 'text-slate-500'}`}>
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
                  <input required type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="Tech Global LLC"
                    value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Регион</label>
                    <input required type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="Алматы"
                      value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Индустрия</label>
                    <input required type="text" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="IT / Финтех"
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
              <input required type="password" className="w-full p-4 bg-slate-50 text-black border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#A9F4FF]" placeholder="••••••••"
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Подтверждение</label>
              <input required type="password" className={`w-full p-4 bg-slate-50 text-black border rounded-2xl outline-none focus:ring-4 transition-all ${error ? 'border-red-300 focus:ring-red-100' : 'border-slate-100 focus:ring-[#A9F4FF]'}`} placeholder="••••••••"
                value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
          </div>

          {/* Вывод ошибки валидации */}
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