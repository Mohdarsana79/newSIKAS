import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA cipher_compatibility = 4;")
cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

# Total rows
cursor.execute("SELECT COUNT(*) FROM ref_acuan_barang")
print("Total rows:", cursor.fetchone()[0])

# Total distinct barang
cursor.execute("SELECT COUNT(DISTINCT id_barang) FROM ref_acuan_barang")
print("Distinct id_barang:", cursor.fetchone()[0])

# Show a duplicate example
cursor.execute("""
    SELECT id_barang, nama_barang, tahun 
    FROM ref_acuan_barang 
    WHERE id_barang IN (
        SELECT id_barang FROM ref_acuan_barang GROUP BY id_barang HAVING COUNT(*) > 1
    )
    LIMIT 5
""")
print("Example duplicates:")
for row in cursor.fetchall():
    print(row)
