from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import os
import boto3
import shutil

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

def get_s3_client():
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        return None
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION")
    )

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
    s3_client = get_s3_client()
    bucket = os.getenv("S3_BUCKET_NAME")
    
    # Base URL for Render deployments
    RENDER_URL = "https://pcb-backend-ob8m.onrender.com"
    
    try:
        if preview_image:
            if s3_client and bucket:
                s3_client.upload_fileobj(preview_image.file, bucket, preview_image.filename)
                preview_url = f"https://{bucket}.s3.amazonaws.com/{preview_image.filename}"
            else:
                file_path = os.path.join("uploads", preview_image.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(preview_image.file, buffer)
                preview_url = f"{RENDER_URL}/uploads/{preview_image.filename}"
                
        if symbol_file:
            if s3_client and bucket:
                s3_client.upload_fileobj(symbol_file.file, bucket, symbol_file.filename)
                symbol_url = f"https://{bucket}.s3.amazonaws.com/{symbol_file.filename}"
            else:
                file_path = os.path.join("uploads", symbol_file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(symbol_file.file, buffer)
                symbol_url = f"{RENDER_URL}/uploads/{symbol_file.filename}"
                
        if footprint_file:
            if s3_client and bucket:
                s3_client.upload_fileobj(footprint_file.file, bucket, footprint_file.filename)
                footprint_url = f"https://{bucket}.s3.amazonaws.com/{footprint_file.filename}"
            else:
                file_path = os.path.join("uploads", footprint_file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(footprint_file.file, buffer)
                footprint_url = f"{RENDER_URL}/uploads/{footprint_file.filename}"
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