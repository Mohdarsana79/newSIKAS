import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

cursor.execute("PRAGMA table_info(ref_rekening)")
columns = cursor.fetchall()

print("Kolom pada ref_rekening:")
for col in columns:
    print(f"- {col[1]} ({col[2]})")
