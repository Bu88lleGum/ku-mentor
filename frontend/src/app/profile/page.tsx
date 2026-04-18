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
      const user = await fetchUserProfile(); 
      
      // 1. Пытаемся взять из localStorage (так как в user поле пустое)
      let userRole = localStorage.getItem("role");

      // 2. Если в localStorage пусто, пробуем "угадать" по данным профиля
      if (!userRole) {
        // Если student_profile пришел как null, скорее всего это EMPLOYER
        // Но это очень ненадежно!
        userRole = user.student_profile ? 'STUDENT' : 'EMPLOYER';
      }
      
      setRole(userRole.toUpperCase());
    } catch (err) {
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

  // Теперь сравниваем максимально надежно
  if (role === 'EMPLOYER') {
    return <EmployerProfile />;
  }

  // Если роль 'STUDENT' или любая другая
  return <StudentProfile />;
}