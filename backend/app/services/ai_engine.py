import os
from fastembed import TextEmbedding

class AIEngine:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        cache_path = os.path.join(os.getcwd(), "model_cache")
        self.model = TextEmbedding(
            model_name=model_name,
            cache_dir=cache_path
        )

    # Твой существующий метод для сложных сущностей (Курсы/Вакансии)
    def create_embedding(self, title: str, description: str = "", categories: list[str] = []) -> list[float]:
        clean_categories = [cat.name if hasattr(cat, 'name') else str(cat) for cat in categories]
        categories_str = ", ".join(clean_categories)
        enriched_text = f"{title}. {title}. {title}. {categories_str}. {categories_str}. {description}"
        embeddings_generator = self.model.embed([enriched_text])
        return list(next(embeddings_generator))

    # НОВЫЙ МЕТОД: Универсальный генератор для простого текста (для Студента)
    def embed_text(self, text: str) -> list[float]:
        if not text.strip():
            return [] # Возвращаем пустой список, если текст пустой
        embeddings_generator = self.model.embed([text])
        return list(next(embeddings_generator))

# Экземпляр сервиса
ai_service = AIEngine()