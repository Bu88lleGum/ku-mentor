from fastembed import TextEmbedding

class AIEngine:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        # Модель инициализируется один раз при старте
        self.model = TextEmbedding(model_name=model_name)

    def create_embedding(self, title: str, description: str, categories: list[str]) -> list[float]:
        clean_categories = [cat.name if hasattr(cat, 'name') else str(cat) for cat in categories]
        categories_str = ", ".join(clean_categories)
        
        # 2. Создаем "усиленный" текст: название 3 раза, категории 2 раза, затем описание
        enriched_text = f"{title}. {title}. {title}. {categories_str}. {categories_str}. {description}"
        
        # 3. Генерируем вектор
        embeddings_generator = self.model.embed([enriched_text])
        return list(next(embeddings_generator))

# Создаем экземпляр сервиса для импорта в роутеры
ai_service = AIEngine()