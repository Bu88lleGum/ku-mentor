"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateVacancyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [allSkills, setAllSkills] = useState<{ id: number; name: string }[]>([]);
  
  // Состояние формы в соответствии с твоей Pydantic схемой
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    location: "",
    salary_range: "",
    is_internship: false,
    skill_ids: [] as number[],
  });

  // Загружаем навыки для выбора
  useEffect(() => {
    fetch("http://127.0.0.1:8000/skill/")
      .then((res) => res.json())
      .then((data) => setAllSkills(data))
      .catch((err) => console.error("Ошибка загрузки навыков:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Показываем окно предупреждения перед созданием вакансии
    const isConfirmed = window.confirm(
      "Вы уверены, что хотите опубликовать эту вакансию? Редактировать её после создания будет нельзя!"
    );

    // 2. Если пользователь нажал "Отмена" — прерываем отправку формы
    if (!isConfirmed) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/vacancy/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/profile"); // Возвращаемся в профиль после создания
      } else {
        alert("Ошибка при создании вакансии");
      }
    } catch (error) {
      console.error(error);
      alert("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: number) => {
    setFormData(prev => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(skillId)
        ? prev.skill_ids.filter(id => id !== skillId)
        : [...prev.skill_ids, skillId]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-400 text-black">
        <h1 className="text-2xl font-black text-slate-900 mb-6">Создание новой вакансии</h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Название */}
          <div className="text-black">
            <label className="block text-sm font-bold text-slate-700 mb-2">Название позиции *</label>
            <input
              required
              type="text"
              placeholder="Напр. Middle Python Developer"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#05A4BA] outline-none transition-all"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Локация */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Локация</label>
              <input
                type="text"
                placeholder="Алматы, удаленно..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#05A4BA] outline-none"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            {/* Зарплата */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Зарплата</label>
              <input
                type="text"
                placeholder="500,000 - 800,000 KZT"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#05A4BA] outline-none"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
              />
            </div>
          </div>

          {/* Стажировка */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input
              type="checkbox"
              id="internship"
              className="w-5 h-5 accent-[#05A4BA]"
              checked={formData.is_internship}
              onChange={(e) => setFormData({ ...formData, is_internship: e.target.checked })}
            />
            <label htmlFor="internship" className="text-sm font-bold text-slate-700 cursor-pointer">
              Это программа стажировки
            </label>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Описание вакансии *</label>
            <textarea
              required
              rows={4}
              placeholder="Расскажите о проекте и задачах..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#05A4BA] outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Требования */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Требования к кандидату</label>
            <textarea
              rows={3}
              placeholder="Опыт работы, стек технологий..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#05A4BA] outline-none"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            />
          </div>

          {/* Выбор скиллов (теги) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Необходимые навыки</label>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill) => (
                <button
                  type="button"
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    formData.skill_ids.includes(skill.id)
                      ? "bg-[#05A4BA] text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-[#05A4BA]"
                  }`}
                >
                  {skill.name} {formData.skill_ids.includes(skill.id) ? "✕" : "+"}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-[#05A4BA] text-white font-black rounded-2xl shadow-lg shadow-cyan-100 hover:bg-[#1D869E] transition-all disabled:opacity-50"
            >
              {loading ? "Публикация..." : "Опубликовать вакансию"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}