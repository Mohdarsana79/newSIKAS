import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

cursor.execute("SELECT kode_rekening, rekening FROM ref_rekening WHERE kode_rekening LIKE '5.2.1.01.001%'")
rows = cursor.fetchall()

if rows:
    for row in rows:
        print(f"Ditemukan: {row[0]} -> {row[1]}")
else:
    print("Tidak ditemukan")
