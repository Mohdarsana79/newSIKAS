import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

# Cek apakah ada rekening yang kena PPN atau PPh
cursor.execute("""
    SELECT kode_rekening, rekening, is_ppn, is_pph21, is_pph22, is_pph23, is_pph4 
    FROM ref_rekening 
    WHERE is_ppn = 1 OR is_pph21 = 1 OR is_pph22 = 1 OR is_pph23 = 1 OR is_pph4 = 1
    LIMIT 5
""")
rows = cursor.fetchall()

if rows:
    for r in rows:
        print(f"Kode: {r[0]} | Rekening: {r[1]} | PPN:{r[2]} PPh21:{r[3]} PPh22:{r[4]} PPh23:{r[5]} PPh4(2):{r[6]}")
else:
    print("Tidak ada rekening yang ditandai kena pajak.")
