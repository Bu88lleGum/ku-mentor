"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ApplicationPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [vacancyTitle, setVacancyTitle] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Загружаем краткую инфу о вакансии, чтобы юзер понимал, куда откликается
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/vacancies/${id}`)
      .then(res => res.json())
      .then(data => setVacancyTitle(data.title))
      .catch(() => setVacancyTitle("Вакансии"));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8000/application/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          vacancy_id: Number(id),
          cover_letter: coverLetter,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Ошибка при отправке отклика");
      }

      // Если все ок, можно вернуть на страницу вакансии или в список
      alert("Отклик успешно отправлен!");
      router.push(`/vacancies/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <button 
          onClick={() => router.back()}
          className="text-slate-400 hover:text-[#05A4BA] font-bold text-sm mb-6 flex items-center gap-2"
        >
          ← Назад к вакансии
        </button>

        <h1 className="text-2xl font-black text-slate-900 mb-2">Отклик на вакансию</h1>
        <p className="text-[#05A4BA] font-bold mb-8">{vacancyTitle}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-3 ml-1">
              Сопроводительное письмо
            </label>
            <textarea
              required
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Расскажите, почему именно вы подходите на эту роль..."
              className="w-full h-64 p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-[#A9F4FF] text-slate-700 transition-all resize-none"
            />
            <p className="mt-2 text-xs text-slate-400 ml-1">
              Минимум 20 символов. Хорошее письмо повышает шансы на успех.
            </p>
          </div>

          {error && (
            <p className="text-rose-500 text-sm font-bold ml-1">⚠️ {error}</p>
          )}

          <button
            type="submit"
            disabled={loading || coverLetter.length < 20}
            className="w-full py-5 bg-[#05A4BA] text-white font-black rounded-[1.5rem] shadow-lg shadow-cyan-100 hover:bg-[#1D869E] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {loading ? "Отправка..." : "Отправить отклик"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}