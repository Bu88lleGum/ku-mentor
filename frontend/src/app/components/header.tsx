"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LogoutButton from "@/src/app/components/logoutButton"; // Проверь этот путь импорта!

interface HeaderProps {
  searchMode: "courses" | "vacancies"; // Текущий режим глобального поиска (строгий литеральный тип)
  setSearchMode: (mode: "courses" | "vacancies") => void; // Колбэк-функция для изменения режима в стейте родителя
  isAuth: boolean; // Статус авторизации пользователя (залогинен/гость)
}

export default function HeaderPage({ searchMode, setSearchMode, isAuth }: HeaderProps) {
  const router = useRouter(); // Навигационный хук Next.js для программного редиректа (router.push)

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-8 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* ЛЕВАЯ ЧАСТЬ: Переключатель режима поиска */}
        <div className="flex items-center">
          <div className="bg-slate-100 p-1 rounded-2xl flex relative items-center cursor-pointer select-none">
            <motion.div
              className="absolute bg-[#05A4BA] rounded-[12px] h-[calc(100%-8px)]"
              layoutId="activeTabBg"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: searchMode === "courses" ? "100px" : "110px",
                left: searchMode === "courses" ? "4px" : "104px",
              }}
            />
            <button
              onClick={() => setSearchMode("courses")}
              className={`relative z-10 px-4 py-2 text-xs font-black rounded-xl transition-colors duration-200 w-[100px] text-center ${
                searchMode === "courses" ? "text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Курсы
            </button>
            <button
              onClick={() => setSearchMode("vacancies")}
              className={`relative z-10 px-4 py-2 text-xs font-black rounded-xl transition-colors duration-200 w-[110px] text-center ${
                searchMode === "vacancies" ? "text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Вакансии
            </button>
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Логика авторизации и навигации */}
        <div className="flex items-center gap-3">
          {isAuth ? (
            <>
              {/* КНОПКА «ИЗБРАННОЕ»: Появляется только у залогиненных юзеров */}
              <button
                onClick={() => router.push("/favourites")}
                className="p-2.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-red-500 hover:bg-red-50 hover:border-red-100 active:scale-[0.95] transition-all flex items-center justify-center group"
                title="Избранное"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4 transition-transform group-hover:scale-110"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                  />
                </svg>
              </button>

              {/* Если авторизован — рендерим LogoutButton и ссылку в профиль */}
              <LogoutButton />
              
              <button
                onClick={() => router.push("/profile")}
                className="px-5 py-2.5 bg-white text-[#05A4BA] border border-slate-200 text-xs font-black rounded-xl shadow-sm hover:bg-slate-50 transition-all"
              >
                Мой профиль
              </button>
            </>
          ) : (
            <>
              {/* Если НЕ авторизован — показываем базовые Войти / Регистрация */}
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2.5 text-xs font-black text-slate-600 hover:text-[#05A4BA] transition-colors rounded-xl"
              >
                Войти
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-5 py-2.5 bg-[#05A4BA] text-white text-xs font-black rounded-xl shadow-md shadow-cyan-100 hover:bg-[#1D869E] active:scale-[0.98] transition-all"
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