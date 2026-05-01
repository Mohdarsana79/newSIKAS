import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

cursor.execute("SELECT kode_rekening FROM ref_rekening WHERE tahun = '2026'")
lengths = set()
for row in cursor.fetchall():
    lengths.add(len(row[0].strip('.').split('.')))

print("Available parts lengths:", lengths)
