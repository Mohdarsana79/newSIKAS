import sqlite3
import json
import sys
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No keyword provided'}))
        sys.exit(1)

    keyword = sys.argv[1]
    year = sys.argv[2] if len(sys.argv) > 2 else '2026'
    
    db_path = os.path.join(os.environ.get('APPDATA', ''), 'Arkas', 'arkas.db')
    if not os.path.exists(db_path):
        print(json.dumps({'error': f'arkas.db not found at {db_path}'}))
        sys.exit(1)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")
        
        if keyword == '__ALL__':
            query = """
                SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                FROM ref_acuan_barang AS a
                LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                ORDER BY a.nama_barang, a.tahun
            """
            cursor.execute(query)
        else:
            query = """
                SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                FROM ref_acuan_barang AS a
                LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                WHERE a.nama_barang LIKE ?
                ORDER BY a.nama_barang, a.tahun
                LIMIT 100
            """
            cursor.execute(query, (f'%{keyword}%',))
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append(dict(zip(columns, row)))
            
        print(json.dumps({'status': 'success', 'data': results}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    main()
