from fastembed import TextEmbedding

class AIEngine:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        # Модель инициализируется здесь
        self.model = TextEmbedding(model_name=model_name)

    def create_embedding(self, text: str) -> list[float]:
        # Превращает текст в вектор (embedding)
        # Генерируем эмбеддинг. FastEmbed возвращает генератор, берем первый элемент
        embeddings_generator = self.model.embed([text])
        return list(next(embeddings_generator))

# Создаем один экземпляр сервиса, который будем импортировать в другие файлы
ai_service = AIEngine()