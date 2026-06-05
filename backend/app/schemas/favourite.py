from datetime import datetime
from pydantic import BaseModel

class FavouriteToggleResponse(BaseModel):
    is_favourited: bool  # True — добавлено, False — удалено
    message: str         # Например: "Vacancy added to favorites"