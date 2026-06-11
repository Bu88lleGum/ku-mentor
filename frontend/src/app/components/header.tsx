"use client";

import { useRouter } from "next/navigation";
import LogoutButton from "./logoutButton";
import { Heart, User } from "lucide-react";

interface HeaderProps {
  isAuth: boolean;
}

export default function HeaderPage({ isAuth }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-6 sticky top-0 z-50 transition-all">
      {/* Увеличено до max-w-6xl для соответствия главной странице */}
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* ЛЕВАЯ ЧАСТЬ: Логотип */}
        <div 
          onClick={() => router.push("/")} 
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A9F4FF] to-[#05A4BA] flex items-center justify-center shadow-md shadow-cyan-100 transition-transform group-hover:scale-105">
            <span className="text-white font-black text-sm">KU</span>
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-800 group-hover:text-[#05A4BA] transition-colors">
            Mentor
          </span>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Навигация */}
        <div className="flex items-center gap-3">
          {isAuth ? (
            <>
              <button
                onClick={() => router.push("/favourites")}
                className="p-2.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-red-500 hover:bg-red-50 hover:border-red-100 active:scale-95 transition-all flex items-center justify-center group"
                title="Избранное"
              >
                <Heart className="w-4 h-4 transition-transform group-hover:scale-110" />
              </button>

              <LogoutButton />
              
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:text-[#05A4BA] hover:border-cyan-100 transition-all active:scale-98"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Мой профиль
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#05A4BA] transition-colors rounded-xl"
              >
                Войти
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-4 py-2 bg-[#05A4BA] text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-100/50 hover:bg-[#1D869E] active:scale-95 transition-all"
              >
                Регистрация
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}