'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentProfile from '../components/StudentProfile';
import EmployerProfile from '../components/EmployerProfile';
import { fetchUserProfile } from '../services/userService';

export default function ProfilePage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getRole = async () => {
      try {
        // Получаем чистый актуальный профиль с бэкенда
        const user = await fetchUserProfile(); 
        
        // Базовое значение на случай непредвиденных обстоятельств
        let detectedRole = 'STUDENT';

        if (user) {
          // 1. Проверяем поле 'role' из пришедшего JSON ("student" или "employer")
          if (user.role) {
            detectedRole = user.role.toUpperCase();
          } 
          // 2. Запасной вариант (твоя угадайка): если бэкенд не прислал строку role
          else if (user.student_profile !== null && user.student_profile !== undefined) {
            detectedRole = 'STUDENT';
          } else if (user.employer_profile !== null && user.employer_profile !== undefined) {
            detectedRole = 'EMPLOYER';
          }
        }

        // Устанавливаем проверенную роль
        setRole(detectedRole);

      } catch (err) {
        console.error("Ошибка при получении профиля:", err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    getRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#05A4BA]"></div>
      </div>
    );
  }

  // Строгое сравнение с ответом бэкенда в UPPERCASE
  if (role === 'EMPLOYER') {
    return <EmployerProfile />;
  }

  // Во всех остальных случаях (STUDENT или если что-то пошло не так)
  return <StudentProfile />;
}