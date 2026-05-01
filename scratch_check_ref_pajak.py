import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

print("--- SCHEMA ref_pajak ---")
cursor.execute("PRAGMA table_info(ref_pajak)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

print("\n--- DATA ref_pajak ---")
cursor.execute("SELECT * FROM ref_pajak LIMIT 10")
for row in cursor.fetchall():
    print(row)
