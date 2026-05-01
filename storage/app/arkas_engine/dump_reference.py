import sqlite3
import json
import sys
import os
import traceback

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Argumen tidak lengkap (butuh tipe dan tahun)"}))
            sys.exit(1)

        tipe = sys.argv[1]
        tahun = sys.argv[2]

        appdata = os.environ.get('APPDATA', '')
        if not appdata:
            print(json.dumps({"error": "APPDATA environment variable tidak ditemukan."}))
            sys.exit(1)

        db_path = os.path.join(appdata, 'Arkas', 'arkas.db')

        if not os.path.exists(db_path):
            print(json.dumps({"error": f"Database ARKAS tidak ditemukan di {db_path}"}))
            sys.exit(1)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute("PRAGMA key = 'K3md1kbudRIS3n4yan';")

        # Test decrypt
        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            print(json.dumps({"error": "Gagal mendekripsi database ARKAS. Kunci mungkin salah atau file corrupt."}))
            sys.exit(1)

        results = []

        if tipe == 'kegiatan':
            query = """
                SELECT DISTINCT id_kode, uraian_kode 
                FROM ref_kode 
                WHERE tahun = ?
                ORDER BY id_kode
            """
            cursor.execute(query, (tahun,))
            
            all_codes = {}
            for row in cursor.fetchall():
                all_codes[row[0]] = row[1]
                
            for id_kode, uraian in all_codes.items():
                parts = id_kode.strip('.').split('.')
                # Hanya ambil yang level 3 ke atas (uraian kegiatan sesungguhnya)
                if len(parts) >= 3:
                    program_kode = parts[0] + '.'
                    sub_program_kode = parts[0] + '.' + parts[1] + '.'
                    
                    results.append({
                        "id_kode": id_kode,
                        "program": all_codes.get(program_kode, ''),
                        "sub_program": all_codes.get(sub_program_kode, ''),
                        "uraian_kode": uraian
                    })

        elif tipe == 'rekening':
            query = """
                SELECT DISTINCT kode_rekening, rekening, is_ppn, is_pph21, is_pph22, is_pph23, is_pph4
                FROM ref_rekening 
                WHERE tahun = ?
                ORDER BY kode_rekening
            """
            cursor.execute(query, (tahun,))
            for row in cursor.fetchall():
                kode = row[0]
                
                # Hanya ambil kode rekening yang lengkap (6 bagian, contoh: 5.2.05.08.01.0005)
                parts = kode.strip('.').split('.')
                if len(parts) < 6:
                    continue

                pajak_list = []
                if row[2] == 1: pajak_list.append("PPN")
                if row[3] == 1: pajak_list.append("PPh 21")
                if row[4] == 1: pajak_list.append("PPh 22")
                if row[5] == 1: pajak_list.append("PPh 23")
                if row[6] == 1: pajak_list.append("PPh 4(2)")

                results.append({
                    "kode_rekening": kode,
                    "rekening": row[1],
                    "pajak": ", ".join(pajak_list) if pajak_list else "-",
                    "is_ppn": True if row[2] == 1 else False,
                    "is_pph21": True if row[3] == 1 else False,
                    "is_pph22": True if row[4] == 1 else False,
                    "is_pph23": True if row[5] == 1 else False,
                    "is_pph4": True if row[6] == 1 else False
                })
        else:
            print(json.dumps({"error": "Tipe referensi tidak valid"}))
            sys.exit(1)

        conn.close()

        print(json.dumps({"status": "success", "data": results}))

    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": f"Terjadi kesalahan internal: {error_msg}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
