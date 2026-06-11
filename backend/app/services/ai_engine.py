import os
import math
from fastembed import TextEmbedding

class AIEngine:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        cache_path = os.path.join(os.getcwd(), "model_cache")
        self.model = TextEmbedding(
            model_name=model_name,
            cache_dir=cache_path
        )

    def create_embedding(self, title: str, description: str = "", categories: list[str] = []) -> list[float]:
        clean_categories = [cat.name if hasattr(cat, 'name') else str(cat) for cat in categories]
        categories_str = ", ".join(clean_categories)
        enriched_text = f"{title}. {title}. {title}. {categories_str}. {categories_str}. {description}"
        embeddings_generator = self.model.embed([enriched_text])
        return list(next(embeddings_generator))

    def embed_text(self, text: str) -> list[float]:
        if not text or not text.strip():
            return []
        embeddings_generator = self.model.embed([text])
        return list(next(embeddings_generator))

    # --- ИСПРАВЛЕННЫЙ МЕТОД: Безопасный расчет косинусного сходства ---
    def get_similarity(self, vec1, vec2) -> float:
        """
        Вычисляет косинусное сходство между двумя векторами.
        Безопасно работает как с чистыми Python-списками, так и с массивами NumPy.
        """
        # Безопасная проверка на None. Оператор 'is' не вызывает ValueError для массивов
        if vec1 is None or vec2 is None:
            return 0.0
            
        # Узнаем длину векторов (работает одинаково для list и numpy.ndarray)
        len1 = len(vec1)
        len2 = len(vec2)
        
        if len1 == 0 or len2 == 0 or len1 != len2:
            return 0.0
            
        # Считаем скалярное произведение и нормы. 
        # Использование zip() одинаково эффективно обходит списки и массивы.
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
            
        return float(dot_product / (norm_a * norm_b))

# Экземпляр сервиса
ai_service = AIEngine()