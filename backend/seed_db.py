
import sqlite3
import json

DB_NAME = "storytellerz.db"

SAMPLE_VENDORS = [
    {
        "name": "Artisanal Hampers Co.",
        "contact": "Sarah Johnson | +1-555-0123",
        "category": "Food & Beverage",
        "website": "https://example.com/hampers",
        "additional_info": {
            "specialty": "Gourmet Snack Boxes",
            "price_range": "$50 - $200",
            "corporate_orders": "Yes"
        },
        "image_path": "None" # Placeholder needed if file doesn't exist
    },
    {
        "name": "TechTrend Promotions",
        "contact": "Mike Chen | promo@techtrend.com",
        "category": "Electronics",
        "website": "https://example.com/tech",
        "additional_info": {
            "products": "Power banks, Wireless Chargers, Smart Bottles",
            "branding": "Laser Etching Available"
        },
        "image_path": "None"
    },
    {
        "name": "EcoGreen Essentials",
        "contact": "info@ecogreen.org",
        "category": "Sustainable Goods",
        "website": "https://example.com/eco",
        "additional_info": {
            "materials": "Bamboo, Recycled Plastic",
            "certification": "B-Corp Certified"
        },
        "image_path": "None"
    },
    {
        "name": "Luxe Leatherworks",
        "contact": "orders@luxeleather.com",
        "category": "Accessories",
        "website": "https://example.com/leather",
        "additional_info": {
            "items": "Notebooks, Wallets, Laptop Sleeves",
            "origin": "Handmade in Italy"
        },
        "image_path": "None"
    },
        {
        "name": "Zen Office Decor",
        "contact": "hello@zendecor.com",
        "category": "Office Decor",
        "website": "https://example.com/decor",
        "additional_info": {
            "items": "Desk Plants, Minimalist Organizers",
            "vibe": "Modern & Calm"
        },
        "image_path": "None"
    }
]

def seed_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check if data already exists to avoid dupes
    cursor.execute("SELECT count(*) FROM cards")
    count = cursor.fetchone()[0]
    
    if count > 0:
        print(f"Database already has {count} entries. Skipping seed.")
        conn.close()
        return

    print("Seeding database with sample vendors...")
    for vendor in SAMPLE_VENDORS:
        cursor.execute('''
            INSERT INTO cards (name, contact, category, website, additional_info, image_path)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            vendor['name'],
            vendor['contact'],
            vendor['category'],
            vendor['website'],
            json.dumps(vendor['additional_info']),
            vendor['image_path']
        ))
    
    conn.commit()
    conn.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_db()
