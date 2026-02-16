import sqlite3
import json
from contextlib import contextmanager

DB_NAME = "storytellerz.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            contact TEXT,
            category TEXT,
            website TEXT,
            additional_info TEXT,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_card(card_data):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO cards (name, contact, category, website, additional_info, image_path)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        card_data.get('name'),
        card_data.get('contact'),
        card_data.get('category'),
        card_data.get('website'),
        json.dumps(card_data.get('additional_info', {})),
        card_data.get('image_path')
    ))
    card_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return card_id

def update_card(card_id, card_data):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE cards 
        SET name = ?, contact = ?, category = ?, website = ?, additional_info = ?, image_path = ?
        WHERE id = ?
    ''', (
        card_data.get('name'),
        card_data.get('category'),
        card_data.get('website'),
        json.dumps(card_data.get('additional_info', {})),
        card_data.get('image_path'),
        card_id
    ))
    conn.commit()
    conn.close()
    return card_id

def delete_card(card_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    conn.commit()
    conn.close()
    return True

def get_all_cards():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM cards ORDER BY created_at DESC')
    rows = cursor.fetchall()
    cards = []
    for row in rows:
        cards.append({
            "id": row[0],
            "name": row[1],
            "contact": row[2],
            "category": row[3],
            "website": row[4],
            "additional_info": json.loads(row[5]) if row[5] else {},
            "image_path": row[6],
            "created_at": row[7]
        })
    conn.close()
    return cards

def search_cards(query):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Split query into keywords for flexible matching (case-insensitive)
    keywords = query.lower().split()
    
    if not keywords:
        return []

    # Dynamic SQL builder: match ANY keyword in ANY field (broad search)
    conditions = []
    params = []
    
    for word in keywords:
        # Check if the word appears in name, category, or info
        conditions.append('(lower(name) LIKE ? OR lower(category) LIKE ? OR lower(additional_info) LIKE ?)')
        params.extend([f'%{word}%', f'%{word}%', f'%{word}%'])
    
    query_sql = f"SELECT * FROM cards WHERE {' OR '.join(conditions)}"
    
    cursor.execute(query_sql, params)
    rows = cursor.fetchall()
    
    # Deduplicate results by ID
    seen_ids = set()
    cards = []
    
    for row in rows:
        card_id = row[0]
        if card_id in seen_ids:
            continue
        seen_ids.add(card_id)
            
        cards.append({
            "id": row[0],
            "name": row[1],
            "contact": row[2],
            "category": row[3],
            "website": row[4],
            "additional_info": json.loads(row[5]) if row[5] else {},
            "image_path": row[6],
            "created_at": row[7]
        })
    conn.close()
    return cards

# Initialize on import (safe for simple apps)
try:
    init_db()
except:
    pass
