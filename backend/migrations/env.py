import sys
from os.path import abspath, dirname

# 1. Добавляем путь к проекту, чтобы Alembic видел ваши файлы
sys.path.insert(0, dirname(dirname(abspath(__file__))))

from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 2. Импорт вашей конфигурации
from sqlmodel import SQLModel
from database import DATABASE_URL  # Импортируем ваш URL
from models import Course         # Убедитесь, что все модели импортированы здесь

config = context.config

# 3. Динамически подставляем DATABASE_URL из вашего файла database.py
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    # 4. Используем настройки из конфига (куда мы уже пробросили URL)
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            # 5. Важно для pgvector: чтобы Alembic не пытался удалить расширение
            include_object=include_object 
        )

        with context.begin_transaction():
            context.run_migrations()

# 6. Вспомогательная функция, чтобы Alembic не трогал расширение vector
def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name == "spatial_ref_sys": # для других расширений, если будут
        return False
    return True

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()