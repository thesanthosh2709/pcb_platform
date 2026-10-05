from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import os
import shutil
from supabase import create_client, Client

from database import engine, Base, get_db
from models import Component, Comment
from schemas import ComponentOut, ComponentCreate, CommentOut, CommentCreate

app = FastAPI(title="PCB Platform API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Configure this to Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/components", response_model=List[ComponentOut])
async def get_components(q: str = None, db: AsyncSession = Depends(get_db)):
    query = select(Component)
    if q:
        query = query.where(Component.name.ilike(f"%{q}%") | Component.tags.ilike(f"%{q}%"))
    result = await db.execute(query)
    return result.scalars().unique().all()

@app.get("/components/{component_id}", response_model=ComponentOut)
async def get_component(component_id: int, db: AsyncSession = Depends(get_db)):
    query = select(Component).where(Component.id == component_id)
    result = await db.execute(query)
    component = result.scalars().first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return component

@app.post("/components/{component_id}/comments", response_model=CommentOut)
async def add_comment(component_id: int, comment: CommentCreate, db: AsyncSession = Depends(get_db)):
    db_comment = Comment(**comment.dict(), component_id=component_id)
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    return db_comment

@app.post("/admin/components", response_model=ComponentOut)
async def create_component(
    request: Request,
    name: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    admin_secret: str = Form(...),
    preview_image: UploadFile = File(None),
    symbol_file: UploadFile = File(None),
    footprint_file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    if admin_secret != os.getenv("ADMIN_SECRET", "supersecret"):
        raise HTTPException(status_code=401, detail="Invalid admin secret")
    
    preview_url = None
    symbol_url = None
    footprint_url = None
    supabase = get_supabase_client()
    bucket = os.getenv("SUPABASE_BUCKET", "pcb_components")
    
    # Base URL for Render deployments (Local Fallback)
    RENDER_URL = "https://pcb-backend-ob8m.onrender.com"
    
    def handle_upload(file_obj: UploadFile):
        if not file_obj:
            return None
        if supabase:
            file_bytes = file_obj.file.read()
            # Upsert prevents errors if a file with the same name is uploaded again
            supabase.storage.from_(bucket).upload(
                file=file_bytes,
                path=file_obj.filename,
                file_options={"content-type": file_obj.content_type, "upsert": "true"}
            )
            return supabase.storage.from_(bucket).get_public_url(file_obj.filename)
        else:
            # Fallback to local
            file_path = os.path.join("uploads", file_obj.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_obj.file, buffer)
            return f"{RENDER_URL}/uploads/{file_obj.filename}"

    try:
        if preview_image:
            preview_url = handle_upload(preview_image)
        if symbol_file:
            symbol_url = handle_upload(symbol_file)
        if footprint_file:
            footprint_url = handle_upload(footprint_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    db_comp = Component(
        name=name,
        description=description,
        tags=tags,
        preview_image_url=preview_url,
        symbol_file_url=symbol_url,
        footprint_file_url=footprint_url
    )
    db.add(db_comp)
    await db.commit()
    await db.refresh(db_comp)
    return db_comp

@app.delete("/admin/components/{component_id}")
async def delete_component(component_id: int, admin_secret: str, db: AsyncSession = Depends(get_db)):
    if admin_secret != os.getenv("ADMIN_SECRET", "supersecret"):
        raise HTTPException(status_code=401, detail="Invalid admin secret")
    
    query = select(Component).where(Component.id == component_id)
    result = await db.execute(query)
    comp = result.scalars().first()
    if not comp:
        raise HTTPException(status_code=404, detail="Not found")
    
    await db.delete(comp)
    await db.commit()
    return {"message": "Deleted"}