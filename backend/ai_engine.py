from fastembed import TextEmbedding

# Модель загрузится один раз при первом импорте этого файла
model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")