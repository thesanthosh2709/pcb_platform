from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CommentBase(BaseModel):
    user_name: str
    content: str
    rating: Optional[int] = None

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: int
    component_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ComponentBase(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[str] = None
    preview_image_url: Optional[str] = None
    symbol_file_url: Optional[str] = None
    footprint_file_url: Optional[str] = None

class ComponentCreate(ComponentBase):
    pass

class ComponentOut(ComponentBase):
    id: int
    created_at: datetime
    comments: List[CommentOut] = []
    class Config:
        from_attributes = True