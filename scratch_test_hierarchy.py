import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

cursor.execute("SELECT DISTINCT id_kode, uraian_kode FROM ref_kode WHERE id_kode LIKE '02.%' ORDER BY id_kode LIMIT 10")
for row in cursor.fetchall():
    print(f"{row[0]} -> {row[1]}")
