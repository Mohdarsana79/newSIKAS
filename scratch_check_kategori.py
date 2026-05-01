import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

# Cari kode unik level 2 untuk melihat pembagian kategori besar
cursor.execute("""
    SELECT DISTINCT 
        substr(kode_rekening, 1, 3) as prefix 
    FROM ref_rekening 
    WHERE tahun = '2026' 
""")
prefixes = cursor.fetchall()
print("Daftar Prefix Utama:")
for p in prefixes:
    print(p[0])
