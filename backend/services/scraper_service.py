from bs4 import BeautifulSoup
import requests
import re

def scrape_vendor_website(url: str):
    """
    Visits the vendor's website to extract product details and pricing.
    Returns a dictionary with 'products' and 'pricing_info'.
    """
    if not url:
        return {"products": [], "pricing_info": ""}
    
    # Ensure URL has schema
    if not url.startswith('http'):
        url = 'https://' + url
        
    # Suppress InsecureRequestWarning
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        
        # Try with verify=False to handle misconfigured SSL on small vendor sites
        # Increased timeout to 20s
        response = requests.get(url, headers=headers, timeout=20, verify=False)
        
        if response.status_code != 200:
            return {"products": [], "pricing_guide": f"Failed to access website: Status {response.status_code}", "error": f"HTTP {response.status_code}"}
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        products_with_prices = []
        found_prices = []
        
        # Strategy 1: Find "Product Cards" - containers with both name and price
        # Common containers for products
        potential_cards = soup.find_all(['div', 'li', 'article', 'tr'], class_=re.compile(r'product|item|card|box', re.I))
        
        for card in potential_cards:
            # Find name in this card
            name_tag = card.find(['h2', 'h3', 'h4', 'h5', 'a'], class_=re.compile(r'title|name', re.I))
            if not name_tag:
                 # Fallback: Just look for any heading
                 name_tag = card.find(['h2', 'h3', 'h4'])
            
            # Find price in this card
            price_tag = card.find(string=re.compile(r'[$₹€£]\s*[\d,]+'))
            
            if name_tag and price_tag:
                name = name_tag.get_text(strip=True)
                price = price_tag.strip()
                if len(name) > 3 and len(name) < 100:
                    products_with_prices.append({"item": name, "price": price})
                    found_prices.append(price)

        # Strategy 2: If Strategy 1 failed (or found very few), try the loose search but clearer
        if len(products_with_prices) < 3:
            # extract simple headings
            headings = soup.find_all(['h2', 'h3', 'h4'], limit=15)
            for h in headings:
                text = h.get_text(strip=True)
                price_match = re.search(r'[$₹€£]\s*[\d,]+', text)
                if price_match:
                     price = price_match.group()
                     name = text.replace(price, "").strip(" ()-")
                     if len(name) > 3:
                        products_with_prices.append({"item": name, "price": price})
                elif h.find_next(string=re.compile(r'[$₹€£]\s*[\d,]+')):
                     parent_text = h.parent.get_text(" ", strip=True) if h.parent else ""
                     pm = re.search(r'[$₹€£]\s*[\d,]+', parent_text)
                     if pm:
                         price = pm.group()
                         # Name is just the heading text usually
                         products_with_prices.append({"item": text, "price": price})

        # Remove duplicates based on item name
        seen = set()
        final_pricing = []
        for p in products_with_prices:
            if p['item'] not in seen:
                seen.add(p['item'])
                final_pricing.append(p)

        # Fallback if no structured data
        if not final_pricing:
             raw_prices = list(soup.find_all(string=re.compile(r'[$₹€£]\s*[\d,]+')))
             if raw_prices:
                 return {"products": [], "pricing_guide": [{"item": "Generic Price", "price": p.strip()} for p in raw_prices[:5]]}
        
        return {
            "products": [p['item'] for p in final_pricing][:10],
            "pricing_guide": final_pricing[:10]
        }
        
    except Exception as e:
        print(f"Scraping Error: {e}")
        return {"products": [], "pricing_guide": f"Error scraping website: {str(e)}"}
