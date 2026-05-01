import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

# Cari kode rekening yang mengandung kata "Modal"
cursor.execute("""
    SELECT kode_rekening, rekening 
    FROM ref_rekening 
    WHERE tahun = '2026' AND length(kode_rekening) <= 10 
      AND (rekening LIKE '%Peralatan dan Mesin%' OR rekening LIKE '%Jaringan%' OR rekening LIKE '%Aset Tetap%')
    ORDER BY kode_rekening
    LIMIT 20
""")
rows = cursor.fetchall()

for row in rows:
    print(f"{row[0]} - {row[1]}")
