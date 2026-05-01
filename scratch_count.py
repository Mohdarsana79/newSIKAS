import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

for table in ['ref_kode', 'ref_rekening']:
    cursor.execute(f"SELECT count(*) FROM {table}")
    print(f"{table}: {cursor.fetchone()[0]}")
