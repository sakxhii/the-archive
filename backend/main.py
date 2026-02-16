
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid
import json
from typing import List

from db import init_db, save_card, get_all_cards, search_cards, update_card, delete_card
from services import gemini_service
from services.gemini_service import extract_card_data

app = FastAPI(title="Gifting Platform Backend")

# CORS
origins = [
    "http://localhost:5173",  # React App
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now during dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Models (Pydantic)
class SearchRequest(BaseModel):
    query: str

class SearchResult(BaseModel):
    source: str
    title: str
    price: str = "N/A"
    link: str = "#"
    description: str = ""
    image_url: str = ""

@app.post("/analyze-card")
async def analyze_card(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    try:
        # Save file with a unique name
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract data with Gemini
        extracted_data = extract_card_data(file_path)
        
        # Add image path to response
        extracted_data["image_path"] = file_path
        
        return extracted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-vendor")
async def save_vendor_endpoint(card_data: dict):
    try:
        # Merge products into additional_info for storage and searchability
        # This logic was previously in upload-card, now client sends pre-processed data
        # or we can re-add it here if the client sends raw extracted_data
        
        # For now, assuming card_data is already structured for saving
        # If 'products' is still separate, merge it here:
        if "products" in card_data and isinstance(card_data.get("additional_info"), dict):
            card_data["additional_info"]["products_sold"] = card_data.pop("products")
        elif "products" in card_data: # if additional_info wasn't there
            card_data["additional_info"] = {"products_sold": card_data.pop("products")}

        card_id = save_card(card_data)
        return {"id": card_id, "message": "Vendor saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/update-vendor/{card_id}")
async def update_vendor_endpoint(card_id: int, card_data: dict):
    try:
        if "products" in card_data and isinstance(card_data.get("additional_info"), dict):
             card_data["additional_info"]["products_sold"] = card_data.pop("products")
        elif "products" in card_data:
             card_data["additional_info"] = {"products_sold": card_data.pop("products")}
        
        update_card(card_id, card_data)
        return {"id": card_id, "message": "Vendor updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete-vendor/{card_id}")
async def delete_vendor_endpoint(card_id: int):
    try:
        delete_card(card_id)
        return {"id": card_id, "message": "Vendor deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cards")
def get_cards():
    return get_all_cards()

@app.post("/search-gifts")
async def search_gifts(request: SearchRequest):
    try:
        query = request.query
        
        # 1. Search Internal DB
        base_url = os.getenv("BASE_URL", "http://localhost:8000")
        internal_cards = search_cards(query)
        internal_results = []
        for card in internal_cards:
            internal_results.append(SearchResult(
                source="Internal Database",
                title=f"Gift from {card['name']}",
                description=f"Category: {card['category']}. Contact: {card['contact']}",
                link=card['website'] if card['website'] else "#",
                image_url=f"{base_url}/{card['image_path']}"
            ))
            
        # 2. Search Web via Gemini
        gemini_data = gemini_service.search_web_gems(query)
        
        web_products = []
        for item in gemini_data.get("products", []):
            web_products.append(SearchResult(
                source="Web Product",
                title=item.get("title", "Gift Idea"),
                price=item.get("price", "N/A"),
                link=item.get("link", "#"),
                description=item.get("description", ""),
                image_url=""
            ))

        web_vendors = []
        for item in gemini_data.get("vendors", []):
             web_vendors.append(SearchResult(
                source="Global Vendor",
                title=item.get("name", "Vendor"),
                price="N/A", # Not applicable for vendor
                link=item.get("website", "#"),
                description=item.get("specialty", ""),
                image_url=""
            ))
        
        return {
            "internal_results": internal_results,
            "web_products": web_products,
            "web_vendors": web_vendors
        }

    except Exception as e:
        print(f"Search API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
