import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

print("--- SCHEMA kas_umum_nota_pajak ---")
cursor.execute("PRAGMA table_info(kas_umum_nota_pajak)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

print("\n--- DATA kas_umum_nota_pajak ---")
cursor.execute("SELECT * FROM kas_umum_nota_pajak LIMIT 5")
for row in cursor.fetchall():
    print(row)
