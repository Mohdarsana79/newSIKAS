import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%pajak%';")
print("Tables with 'pajak':", cursor.fetchall())

cursor.execute("PRAGMA table_info(ref_pajak)")
print("Columns in ref_pajak:")
for row in cursor.fetchall():
    print(row[1], row[2])
    
cursor.execute("PRAGMA table_info(ref_rekening)")
print("Columns in ref_rekening:")
for row in cursor.fetchall():
    if 'pajak' in row[1].lower() or 'ppn' in row[1].lower() or 'pph' in row[1].lower():
        print(row[1], row[2])
