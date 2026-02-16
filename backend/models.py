from pydantic import BaseModel
from typing import Optional, List, Any

class CardData(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    category: Optional[str] = None
    website: Optional[str] = None
    additional_info: Optional[dict] = {}

class CardCreate(CardData):
    image_path: Optional[str] = None

class CardResponse(CardData):
    id: int
    image_path: str
    created_at: str

class SearchResult(BaseModel):
    source: str  # "internal" or "web"
    title: str
    price: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class SearchRequest(BaseModel):
    query: str

class SearchResponse(BaseModel):
    results: List[SearchResult]
