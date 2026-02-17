
import os
import json
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get("GOOGLE_API_KEY")
# Models to try in order of preference (Fastest -> Smartest)
MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"]

def get_api_url(model_id):
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={API_KEY}"

def extract_card_data(image_path: str):
    if not API_KEY:
        return {"name": "Error: Missing API Key"}
# ... (rest of extract_card_data is unchanged)

    encoded_string = ""
    target_mime_type = "image/jpeg"
    try:
        if image_path.lower().endswith('.png'): target_mime_type = "image/png"
        elif image_path.lower().endswith('.webp'): target_mime_type = "image/webp"
        
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        return {"name": "File Error", "contact": str(e)}

    # Enhanced prompt for better accuracy
    prompt = """
        Analyze this business card image. Extract all text and details.
        Return a strict JSON object with these fields:
        {
            "name": "Business Name (or Person Name)",
            "phone": "Mobile/Phone numbers (comma separated)",
            "email": "Email addresses (comma separated)",
            "address": "Physical Address",
            "website": "Website URL (if any)",
            "category": "Industry (e.g., Catering, Technology, Retail)",
            "products": "List of products/services found or inferred",
            "tagline": "Slogan or Tagline",
            "social_media": "Instagram/LinkedIn handles",
            "designation": "Job Title (if personal card)"
        }
        If a field is not found, use an empty string. 
        Be extremely careful with phone numbers and emails.
    """

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": target_mime_type, "data": encoded_string}}
            ]
        }],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    headers = {'Content-Type': 'application/json'}
    
    last_error = ""
    
    # Try each model until one works
    for model_id in MODELS:
        print(f"Trying model: {model_id}...")
        url = get_api_url(model_id)
        try:
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                # Success!
                try:
                    text = response.json()['candidates'][0]['content']['parts'][0]['text']
                    text = text.replace("```json", "").replace("```", "").strip()
                    data = json.loads(text)
                    
                    # Post-process to match our DB schema
                    # Combine phone, email, address into 'contact'
                    contact_parts = []
                    if data.get("phone"): contact_parts.append(f"Ph: {data['phone']}")
                    if data.get("email"): contact_parts.append(f"✉ {data['email']}")
                    if data.get("address"): contact_parts.append(f"📍 {data['address']}")
                    
                    final_data = {
                        "name": data.get("name", ""),
                        "category": data.get("category", ""),
                        "website": data.get("website", ""),
                        "contact": " | ".join(contact_parts),
                        "products": data.get("products", ""),
                        "additional_info": {
                            "tagline": data.get("tagline", ""),
                            "social_media": data.get("social_media", ""),
                            "designation": data.get("designation", "")
                        }
                    }
                    return final_data

                except Exception as e:
                    print(f"Parsing error for {model_id}: {e}")
                    last_error = "Parsing Error"
                    continue 
            
            elif response.status_code == 429:
                print(f"Model {model_id} rate limited (429). Trying next...")
                last_error = f"429: {model_id}"
                continue
            else:
                print(f"Model {model_id} failed with {response.status_code}. Trying next...")
                last_error = f"{response.status_code}: {model_id}"
                continue
                
        except Exception as e:
            last_error = str(e)
            continue
            
    return {"name": "AI Error", "contact": f"All models failed. Last: {last_error}"}

def search_web_gems(query: str):
    print(f"DEBUG: Starting search_web_gems for query: '{query}'")
    
    # Define fallback data with nested products and market insights
    fallback_data = {
        "market_insights": {
            "price_trend": "Stable",
            "average_price": "$25 - $60",
            "trending_keywords": ["Eco-friendly", "Handmade", "Personalized", "Minimalist"],
            "summary": "Demand for sustainable and personalized corporate gifts is rising. fast shipping is a key differentiator."
        },
        "products": [
            {"title": "Eco-Friendly Bamboo Set", "price": "$45", "description": "Sustainable desk organizer set made from premium bamboo.", "link": "#"},
            {"title": "Custom Leather Journal", "price": "$30", "description": "Handcrafted leather notebook with personalized embossing.", "link": "#"},
            {"title": "Artisan Coffee Hamper", "price": "$60", "description": "Gourmet selection of single-origin beans and treats.", "link": "#"},
            {"title": "Smart Tech Tracker", "price": "$25", "description": "Bluetooth tracker for keys and wallets with custom branding.", "link": "#"},
            {"title": "Premium Metal Pen", "price": "$15", "description": "Weighted luxury pen suitable for corporate gifting.", "link": "#"}
        ],
        "vendors": [
            {
                "name": "Global Green Gifting", 
                "specialty": "Sustainable Corporate Gifts", 
                "website": "https://example.com",
                "products": [
                     {"title": "Bamboo Tumbler", "price": "$12"},
                     {"title": "Recycled Notebook", "price": "$8"},
                     {"title": "Organic Cotton Tote", "price": "$15"}
                ]
            },
            {
                "name": "LuxeStationery Co.", 
                "specialty": "Premium Office Supplies", 
                "website": "https://example.com",
                "products": [
                     {"title": "Gold Fountain Pen", "price": "$80"},
                     {"title": "Leather Desk Pad", "price": "$45"},
                     {"title": "Executive Planner", "price": "$35"}
                ]
            },
            {
                "name": "TechPromos intl.", 
                "specialty": "Branded Tech Accessories", 
                "website": "https://example.com",
                "products": [
                     {"title": "Wireless Charger", "price": "$25"},
                     {"title": "Noise Cancelling Buds", "price": "$60"},
                     {"title": "Smart Key Finder", "price": "$20"}
                ]
            }
        ]
    }

    if not API_KEY: 
        print("DEBUG: API_KEY is missing! returning fallback.")
        return fallback_data
    
    headers = {'Content-Type': 'application/json'}
    prompt = f"""
    You are an expert gifting assistant and market analyst.
    For the query: "{query}", provide a comprehensive analysis:
    
    1. **Market Insights**: specific to this product category (Price trends, popular features, what's hot).
    2. **5 Innovative Product Ideas**: specific gift items with approx prices.
    3. **5 Top Global Vendors**: known for this category, with their signature products.

    Return a STRICT JSON object with this exact structure:
    {{
        "market_insights": {{
            "price_trend": "Rising/Stable/Falling",
            "average_price": "e.g. $20 - $50",
            "trending_keywords": ["Tag1", "Tag2", "Tag3"],
            "summary": "Brief 1-sentence market overview."
        }},
        "products": [
            {{ "title": "Product Name", "price": "Approx Price", "description": "Why it's good", "link": "Official URL if known" }}
        ],
        "vendors": [
            {{ 
                "name": "Vendor/Brand Name", 
                "specialty": "What they are known for", 
                "website": "URL",
                "products": [
                    {{ "title": "Vendor Product Name", "price": "Price" }}
                ]
            }}
        ]
    }}
    """
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    # Try models
    for model_id in MODELS:
        try:
            print(f"DEBUG: Trying search via {model_id}...")
            url = get_api_url(model_id)
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                print(f"DEBUG: Success with {model_id}")
                text = response.json()['candidates'][0]['content']['parts'][0]['text']
                text = text.replace("```json", "").replace("```", "").strip()
                data = json.loads(text)
                return {
                    "products": data.get("products", []),
                    "vendors": data.get("vendors", [])
                }
            else:
                print(f"DEBUG: Failed {model_id} - Status: {response.status_code}, Body: {response.text}")
        except Exception as e:
            print(f"Search error with {model_id}: {e}")
            continue
            
    print("DEBUG: All search models failed. Returning fallback data.")        
    return fallback_data
