import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

# Cari kode rekening yang mengandung kata "Modal"
cursor.execute("""
    SELECT DISTINCT substr(kode_rekening, 1, 6) as prefix, rekening 
    FROM ref_rekening 
    WHERE rekening LIKE '%Modal Peralatan dan Mesin%' 
       OR rekening LIKE '%Modal Jalan, Jaringan, dan Irigasi%'
       OR rekening LIKE '%Modal Aset Tetap Lainnya%'
    LIMIT 10
""")
rows = cursor.fetchall()

for row in rows:
    print(f"{row[0]} - {row[1]}")
