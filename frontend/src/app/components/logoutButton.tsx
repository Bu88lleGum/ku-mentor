"use client";



export default function LogoutButton() {
  const handleLogout = () => {
    // 1. Удаляем токен и данные пользователя из браузера
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 2. Перенаправляем на главную
    // Используем window.location.href вместо router.push, 
    // если хотим принудительно перезагрузить все состояние приложения
    window.location.href = "/"; 
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all active:scale-95">
      Выйти из аккаунта
    </button>
  );
}