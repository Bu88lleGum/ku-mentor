import os
from fastembed import TextEmbedding

class AIEngine:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        # 1. Указываем путь к локальной папке для кэша моделей
        # Это создаст папку model_cache прямо в корне твоего проекта backend
        cache_path = os.path.join(os.getcwd(), "model_cache")
        
        # 2. Инициализируем модель с фиксированным путем кэша
        self.model = TextEmbedding(
            model_name=model_name,
            cache_dir=cache_path  # Теперь модель не будет зависеть от папки Temp
        )

    def create_embedding(self, title: str, description: str = "", categories: list[str] = []) -> list[float]:
        clean_categories = [cat.name if hasattr(cat, 'name') else str(cat) for cat in categories]
        categories_str = ", ".join(clean_categories)
        
        # Создаем "усиленный" текст
        enriched_text = f"{title}. {title}. {title}. {categories_str}. {categories_str}. {description}"
        
        # Генерируем вектор
        embeddings_generator = self.model.embed([enriched_text])
        return list(next(embeddings_generator))

# Создаем экземпляр сервиса
ai_service = AIEngine()