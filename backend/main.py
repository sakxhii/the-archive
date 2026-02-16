from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid
import json
from typing import List, Optional
from PIL import Image
import datetime

from db import init_db, save_card, get_all_cards, search_cards, update_card, delete_card
from services import gemini_service, status_service
from services.gemini_service import extract_card_data
from services.scraper_service import scrape_vendor_website
from services.status_service import update_status

app = FastAPI(title="Gifting Platform Backend")

# Add Status Streaming Router
app.include_router(status_service.router)

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
async def analyze_card(
    front: UploadFile = File(...),
    back: Optional[UploadFile] = File(None),
    request_id: Optional[str] = Form(None)
):
    await update_status(request_id, "Starting upload...")
    if not front:
        raise HTTPException(status_code=400, detail="No front file uploaded")
    
    try:
        # Save Front File with a unique name
        await update_status(request_id, "Saving image files...")
        file_extension = front.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(front.file, buffer)
            
        # If Back File exists, merge them
        if back:
            try:
                await update_status(request_id, "Merging front and back sides...")
                # Save Back temp
                back_ext = back.filename.split(".")[-1]
                back_path = f"uploads/temp_back_{unique_filename}"
                with open(back_path, "wb") as buffer:
                    shutil.copyfileobj(back.file, buffer)
                
                # Open images
                img1 = Image.open(file_path)
                img2 = Image.open(back_path)
                
                # Convert to RGB to avoid mode mismatches (e.g. RGBA vs RGB)
                if img1.mode != 'RGB': img1 = img1.convert('RGB')
                if img2.mode != 'RGB': img2 = img2.convert('RGB')
                
                w1, h1 = img1.size
                w2, h2 = img2.size
                
                max_width = max(w1, w2)
                total_height = h1 + h2 + 20 # 20px padding
                
                new_im = Image.new('RGB', (max_width, total_height), (255, 255, 255))
                
                new_im.paste(img1, (0,0))
                new_im.paste(img2, (0, h1 + 20))
                
                # Save combined image overwriting the original front file path
                new_im.save(file_path)
                
                # Cleanup temp
                if os.path.exists(back_path):
                    os.remove(back_path)
                    
            except Exception as merge_err:
                print(f"Image Merge Error: {merge_err}")
                await update_status(request_id, f"Merge warning: {merge_err}")
                if os.path.exists(back_path): os.remove(back_path)
            
        # Extract data with Gemini
        await update_status(request_id, "AI Analysis: Reading text from card...")
        extracted_data = extract_card_data(file_path)
        
        # 3. New Feature: Scrape Website if available
        website = extracted_data.get("website")
        if website:
             print(f"Scraping website found on card: {website}")
             await update_status(request_id, f"Found website: {website}. Scraping product details...")
             scraped_data = scrape_vendor_website(website)
             
             # Capture Scrape Status/Errors
             scrape_status = "success"
             if not scraped_data.get("products") and not scraped_data.get("pricing_info"):
                 if "error" in scraped_data: # If our scraper returns specific error keys
                     scrape_status = scraped_data["error"]
                 else:
                     scrape_status = "no_data_found"
             
             # Merge Scraped Products
             if scraped_data.get("products"):
                 existing_products = extracted_data.get("products", "")
                 new_products = ", ".join(scraped_data["products"])
                 if existing_products:
                     extracted_data["products"] = f"{existing_products}, {new_products}"
                 else:
                     extracted_data["products"] = new_products
                     
             # Add Pricing Info to Additional Info
             if "additional_info" not in extracted_data: extracted_data["additional_info"] = {}
             
             if scraped_data.get("pricing_guide"):
                 extracted_data["additional_info"]["pricing_guide"] = scraped_data["pricing_guide"]
             elif "Failed" in str(scraped_data.get("pricing_guide", "")):
                 extracted_data["additional_info"]["pricing_guide"] = scraped_data.get("pricing_guide")
             
             # Pass status to frontend
             extracted_data["scrape_status"] = scrape_status
        else:
             await update_status(request_id, "No website found on card. Skipping web scrape.")
             extracted_data["scrape_status"] = "no_website"

        # Add image path to response
        extracted_data["image_path"] = file_path
        
        await update_status(request_id, "Complete")
        return extracted_data
    except Exception as e:
        await update_status(request_id, f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-vendor")
async def save_vendor_endpoint(card_data: dict):
    try:
        # Validate additional_info is a dict
        if "additional_info" not in card_data or not isinstance(card_data["additional_info"], dict):
            card_data["additional_info"] = {}

        # Merge products into additional_info
        if "products" in card_data:
            card_data["additional_info"]["products_sold"] = card_data.pop("products")

        card_id = save_card(card_data)
        return {"id": card_id, "message": "Vendor saved successfully"}
    except Exception as e:
        print(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/update-vendor/{card_id}")
async def update_vendor_endpoint(card_id: int, card_data: dict):
    try:
        # Validate additional_info is a dict
        if "additional_info" not in card_data or not isinstance(card_data["additional_info"], dict):
            card_data["additional_info"] = {}

        # Merge products into additional_info
        if "products" in card_data:
            card_data["additional_info"]["products_sold"] = card_data.pop("products")
        
        update_card(card_id, card_data)
        return {"id": card_id, "message": "Vendor updated successfully"}
    except Exception as e:
        print(f"Update Error: {e}")
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
        import traceback
        error_msg = f"Search API Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        with open("backend_errors.log", "a") as f:
            f.write(f"[{datetime.datetime.now()}] {error_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
