/**
 * Функция для получения данных текущего авторизованного пользователя
 */
export const fetchUserProfile = async () => {
  try {
    // 1. Извлекаем токен доступа
    const token = localStorage.getItem("token");

    // 2. Если токена нет, сразу выкидываем ошибку (или редиректим на логин)
    if (!token) {
      throw new Error("Токен отсутствует. Пожалуйста, войдите в систему.");
    }

    // 3. Выполняем GET-запрос
    const response = await fetch("http://127.0.0.1:8000/users/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // 4. Проверяем статус ответа
    if (!response.ok) {
      // Если токен протух (401), лучше его удалить
      
      if (response.status === 401) {

      localStorage.removeItem("token");

      // 1. Создаем событие с сообщением в поле detail
      const event = new CustomEvent("show-toast", { 
        detail: "Сессия истекла. Пожалуйста, войдите снова." 
      });

      // 2. Отправляем его на уровень всего окна (window)
      window.dispatchEvent(event);
    }
      throw new Error(`Ошибка сервера: ${response.status}`);
    }

    // 5. Возвращаем распарсенные данные (username, email, gpa и т.д.)
    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Ошибка при получении данных профиля:", error);
    throw error; // Пробрасываем ошибку дальше для обработки в компоненте
  }
};