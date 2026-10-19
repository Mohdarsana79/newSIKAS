import sqlite3
import json
import sys
import os
import glob
import traceback

def find_arkas_db(manual_path=None):
    """
    Mencari file arkas.db secara dinamis.
    Jika manual_path diberikan, gunakan itu dulu.
    """
    if manual_path:
        # Bersihkan tanda petik dan spasi liar
        manual_path = manual_path.strip().strip('"').strip("'")
        if os.path.exists(manual_path):
            return manual_path

    # Strategi 1: Dari APPDATA environment variable
    appdata = os.environ.get('APPDATA', '')
    if appdata:
        path = os.path.join(appdata, 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

    # Strategi 2: Dari USERPROFILE + AppData/Roaming
    userprofile = os.environ.get('USERPROFILE', '')
    if userprofile:
        path = os.path.join(userprofile, 'AppData', 'Roaming', 'Arkas', 'arkas.db')
        if os.path.exists(path):
            return path

    # Strategi 3: Glob ke semua folder pengguna (paling fleksibel)
    system_drive = os.environ.get('SystemDrive', 'C:')
    patterns = [
        os.path.join(system_drive, 'Users', '*', 'AppData', 'Roaming', 'Arkas', 'arkas.db'),
        os.path.join(system_drive, 'Users', '*', 'AppData', 'Local', 'Arkas', 'arkas.db'),
    ]
    for pattern in patterns:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]

    return None

def get_arkas_key():
    """Mengambil kunci dekripsi database SQLCipher ARKAS."""
    return bytes([75, 51, 109, 100, 49, 107, 98, 117, 100, 82, 73, 83, 51, 110, 52, 121, 97, 110]).decode('utf-8')

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No keyword provided'}))
        sys.exit(1)

    keyword = sys.argv[1]
    year = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '' else 'ALL'
    manual_db_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else None

    db_path = find_arkas_db(manual_db_path)
    if not db_path:
        error_msg = 'Database arkas.db tidak ditemukan.'
        if manual_db_path:
            error_msg += f' Jalur manual salah: {manual_db_path}'
        
        print(json.dumps({
            'error': error_msg + ' Pastikan lokasi database sudah benar di menu Path Arkas.'
        }))
        sys.exit(1)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute(f"PRAGMA key = '{get_arkas_key()}';")

        # Test decrypt
        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            print(json.dumps({"error": "Gagal mendekripsi database ARKAS. Kunci mungkin salah atau file corrupt."}))
            sys.exit(1)

        has_year_filter = (year and year.upper() != 'ALL')

        if keyword == '__ALL__':
            if has_year_filter:
                query = """
                    SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                    FROM ref_acuan_barang AS a
                    LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                    WHERE a.tahun = ?
                    ORDER BY a.nama_barang, a.tahun
                """
                cursor.execute(query, (int(year),))
            else:
                query = """
                    SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                    FROM ref_acuan_barang AS a
                    LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                    ORDER BY a.nama_barang, a.tahun
                """
                cursor.execute(query)
        else:
            if has_year_filter:
                query = """
                    SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                    FROM ref_acuan_barang AS a
                    LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                    WHERE a.nama_barang LIKE ? AND a.tahun = ?
                    ORDER BY a.nama_barang, a.tahun
                    LIMIT 500
                """
                cursor.execute(query, (f'%{keyword}%', int(year)))
            else:
                query = """
                    SELECT a.id_barang, a.nama_barang, a.kode_rekening, b.rekening, a.satuan, a.batas_atas, a.tahun
                    FROM ref_acuan_barang AS a
                    LEFT JOIN ref_rekening AS b ON a.kode_rekening = b.kode_rekening AND a.tahun = b.tahun
                    WHERE a.nama_barang LIKE ?
                    ORDER BY a.nama_barang, a.tahun
                    LIMIT 500
                """
                cursor.execute(query, (f'%{keyword}%',))

        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        results = []
        for row in rows:
            row_dict = dict(zip(columns, row))
            # Format batas_atas jika None jadi 0
            if row_dict.get('batas_atas') is None:
                row_dict['batas_atas'] = 0
            results.append(row_dict)

        conn.close()
        print(json.dumps({'status': 'success', 'data': results, 'db_path': db_path}))
    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({'error': f"Terjadi kesalahan internal query: {error_msg}"}))


if __name__ == '__main__':
    main()
