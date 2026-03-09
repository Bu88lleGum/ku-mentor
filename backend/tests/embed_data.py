# это тестовый файл запускать не обязательно

from fastembed import TextEmbedding

# 1. Инициализируем модель (при первом запуске она скачается автоматически)
model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# 2. Твои данные по проекту (курсы или вакансии)
documents = [
    "Software Engineering course",      # English
    "Программирование на Python",       # Russian
    "Мәліметтер базасы және SQL"        # Kazakh (Базы данных и SQL)
]

# 3. Генерируем эмбеддинги
# Важно: .embed() возвращает генератор, поэтому оборачиваем в list
embeddings = list(model.embed(documents))

# Проверим размерность (для этой модели это будет 384)
print(f"Размерность вектора: {len(embeddings[0])}")
print(f"Пример данных 1: {embeddings[0]}...") # Первые 5 чисел первого вектора
print(f"Пример данных 2: {embeddings[1][:5]}...")
print(f"Пример данных 3: {embeddings[2][:5]}...")
