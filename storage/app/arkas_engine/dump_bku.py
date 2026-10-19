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

    # Strategi 3: Glob ke semua folder pengguna
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

MONTH_NAME_MAP = {
    1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
    5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
    9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

MONTH_NUMBER_MAP = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
}

def main():
    try:
        if len(sys.argv) < 4:
            print(json.dumps({
                "status": "error",
                "message": "Argumen tidak lengkap. Format: python dump_bku.py <mode: check|dump> <tahun> <sumber_dana_id> [bulan] [manual_db_path]"
            }))
            sys.exit(1)

        mode = sys.argv[1].lower().strip('-')
        tahun = int(sys.argv[2])
        sumber_dana_id = int(sys.argv[3])
        
        bulan_arg = sys.argv[4].strip() if len(sys.argv) > 4 and sys.argv[4].strip() != "" and sys.argv[4].strip() != "all" and sys.argv[4].strip() != "None" else None
        manual_db_path = sys.argv[5].strip() if len(sys.argv) > 5 and sys.argv[5].strip() != "" else None

        # Jika bulan_arg berbentuk path db (misal user lupa mengisi argumen bulan), sesuaikan
        if bulan_arg and ('.db' in bulan_arg.lower() or '\\' in bulan_arg or '/' in bulan_arg):
            manual_db_path = bulan_arg
            bulan_arg = None

        bulan_num = None
        if bulan_arg:
            b_clean = bulan_arg.lower().strip()
            if b_clean.isdigit():
                bulan_num = int(b_clean)
            elif b_clean in MONTH_NUMBER_MAP:
                bulan_num = MONTH_NUMBER_MAP[b_clean]

        db_path = find_arkas_db(manual_db_path)
        if not db_path:
            error_msg = "Database ARKAS (arkas.db) tidak ditemukan."
            if manual_db_path:
                error_msg += f" Jalur manual salah: {manual_db_path}"
            print(json.dumps({
                "status": "error",
                "message": error_msg + " Pastikan lokasi database sudah benar di menu Path Arkas."
            }))
            sys.exit(1)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA cipher_compatibility = 4;")
        cursor.execute(f"PRAGMA key = '{get_arkas_key()}';")

        # Uji buka database
        try:
            cursor.execute("SELECT count(*) FROM sqlite_master;")
        except sqlite3.DatabaseError:
            print(json.dumps({
                "status": "error",
                "message": "Gagal mendekripsi database ARKAS. Kunci enkripsi mungkin salah atau file corrupt."
            }))
            sys.exit(1)

        # 1. Ambil semua id_anggaran yang valid untuk tahun dan sumber dana ini
        cursor.execute("""
            SELECT id_anggaran, is_revisi, is_approve, jumlah
            FROM anggaran
            WHERE tahun_anggaran = ? AND id_ref_sumber_dana = ? AND soft_delete = 0
            ORDER BY is_revisi DESC;
        """, (tahun, sumber_dana_id))
        anggaran_rows = cursor.fetchall()

        if not anggaran_rows:
            print(json.dumps({
                "status": "success",
                "exists": False,
                "message": f"Tidak ditemukan data anggaran untuk tahun {tahun} dan sumber dana {sumber_dana_id} di ARKAS."
            }))
            conn.close()
            sys.exit(0)

        id_anggaran_list = [r[0] for r in anggaran_rows]
        anggaran_placeholders = ",".join(["?"] * len(id_anggaran_list))

        # Filter tanggal jika bulan_num diset
        date_filter_sql = f"AND k.tanggal_transaksi LIKE '{tahun}-%'"
        if bulan_num is not None:
            bulan_str = f"{bulan_num:02d}"
            date_filter_sql = f"AND k.tanggal_transaksi LIKE '{tahun}-{bulan_str}-%'"

        # Cek apakah ada data kas_umum sama sekali
        check_query = f"""
            SELECT count(*) 
            FROM kas_umum k
            WHERE k.id_anggaran IN ({anggaran_placeholders})
              AND k.soft_delete = 0
              {date_filter_sql}
        """
        cursor.execute(check_query, id_anggaran_list)
        total_kas_rows = cursor.fetchone()[0]

        if total_kas_rows == 0:
            print(json.dumps({
                "status": "success",
                "exists": False,
                "message": f"Tidak ada catatan BKU di ARKAS untuk tahun {tahun}" + (f" bulan {MONTH_NAME_MAP.get(bulan_num)}" if bulan_num else "") + "."
            }))
            conn.close()
            sys.exit(0)

        # ========================================================
        # MODE CHECK (PREVIEW CEPAT)
        # ========================================================
        if mode == 'check':
            # Penerimaan dana (id_ref_bku = 2)
            q_penerimaan = f"""
                SELECT count(*), coalesce(sum(k.saldo), 0)
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 2
                  AND k.soft_delete = 0
                  {date_filter_sql}
            """
            cursor.execute(q_penerimaan, id_anggaran_list)
            penerimaan_count, penerimaan_total = cursor.fetchone()

            # Penarikan tunai (id_ref_bku = 3)
            q_penarikan = f"""
                SELECT count(*), coalesce(sum(k.saldo), 0)
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 3
                  AND k.soft_delete = 0
                  {date_filter_sql}
            """
            cursor.execute(q_penarikan, id_anggaran_list)
            penarikan_count, penarikan_total = cursor.fetchone()

            # Setor tunai (id_ref_bku = 5)
            q_setor = f"""
                SELECT count(*), coalesce(sum(k.saldo), 0)
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 5
                  AND k.soft_delete = 0
                  {date_filter_sql}
            """
            cursor.execute(q_setor, id_anggaran_list)
            setor_count, setor_total = cursor.fetchone()

            # Belanja (id_ref_bku IN (4, 15))
            q_belanja = f"""
                SELECT count(DISTINCT k.id_kas_nota), count(*), coalesce(sum(k.saldo), 0)
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku IN (4, 15)
                  AND k.soft_delete = 0
                  {date_filter_sql}
            """
            cursor.execute(q_belanja, id_anggaran_list)
            nota_count, item_belanja_count, belanja_total = cursor.fetchone()

            # Status tutup bulan (dari aktivasi_bku)
            # id_periode 81 = Januari ... 92 = Desember
            periode_filter = ""
            if bulan_num is not None:
                target_periode = 80 + bulan_num
                periode_filter = f"AND id_periode = {target_periode}"

            q_aktivasi = f"""
                SELECT a.id_periode, a.tanggal_finish, coalesce(a.saldo_akhir_bank, 0), coalesce(a.saldo_akhir_tunai, 0)
                FROM aktivasi_bku a
                WHERE a.id_anggaran IN ({anggaran_placeholders})
                  AND a.soft_delete = 0
                  AND a.tanggal_finish IS NOT NULL
                  {periode_filter}
                GROUP BY a.id_periode
                ORDER BY a.id_periode ASC
            """
            cursor.execute(q_aktivasi, id_anggaran_list)
            closed_months = cursor.fetchall()
            closed_month_names = [MONTH_NAME_MAP.get(r[0] - 80, str(r[0])) for r in closed_months]

            # Bunga bank & pajak bunga
            q_bunga = f"""
                SELECT 
                    coalesce(sum(CASE WHEN k.id_ref_bku = 6 THEN k.saldo ELSE 0 END), 0) as bunga,
                    coalesce(sum(CASE WHEN k.id_ref_bku = 7 THEN k.saldo ELSE 0 END), 0) as pajak_bunga
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku IN (6, 7)
                  AND k.soft_delete = 0
                  {date_filter_sql}
            """
            cursor.execute(q_bunga, id_anggaran_list)
            bunga_total, pajak_bunga_total = cursor.fetchone()

            print(json.dumps({
                "status": "success",
                "exists": True,
                "tahun": tahun,
                "bulan": MONTH_NAME_MAP.get(bulan_num) if bulan_num else "Semua Bulan",
                "total_penerimaan": penerimaan_count,
                "nominal_penerimaan": float(penerimaan_total),
                "total_penarikan": penarikan_count,
                "nominal_penarikan": float(penarikan_total),
                "total_setor": setor_count,
                "nominal_setor": float(setor_total),
                "total_nota_belanja": nota_count,
                "total_item_belanja": item_belanja_count,
                "nominal_belanja": float(belanja_total),
                "closed_months": closed_month_names,
                "is_closed": len(closed_months) > 0 if bulan_num else None,
                "total_bunga_bank": float(bunga_total),
                "total_pajak_bunga": float(pajak_bunga_total),
            }))
            conn.close()
            sys.exit(0)

        # ========================================================
        # MODE DUMP (EKSTRAKSI LENGKAP)
        # ========================================================
        elif mode == 'dump':
            # 1. Penerimaan Dana (id_ref_bku = 2)
            q_penerimaan = f"""
                SELECT 
                    k.id_kas_umum,
                    k.tanggal_transaksi,
                    k.saldo as nominal,
                    coalesce(n.no_bukti, k.uraian) as no_bukti,
                    k.uraian
                FROM kas_umum k
                LEFT JOIN kas_umum_nota n ON k.id_kas_nota = n.id_kas_nota
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 2
                  AND k.soft_delete = 0
                  {date_filter_sql}
                ORDER BY k.tanggal_transaksi ASC, k.id_kas_umum ASC
            """
            cursor.execute(q_penerimaan, id_anggaran_list)
            penerimaan_rows = []
            for r in cursor.fetchall():
                penerimaan_rows.append({
                    "id_kas_umum": r[0],
                    "tanggal_terima": r[1],
                    "jumlah_dana": float(r[2]),
                    "no_bukti": r[3],
                    "uraian": r[4]
                })

            # 2. Penarikan Tunai (id_ref_bku = 3)
            q_penarikan = f"""
                SELECT 
                    k.id_kas_umum,
                    k.tanggal_transaksi,
                    k.saldo as nominal,
                    k.uraian
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 3
                  AND k.soft_delete = 0
                  {date_filter_sql}
                ORDER BY k.tanggal_transaksi ASC, k.id_kas_umum ASC
            """
            cursor.execute(q_penarikan, id_anggaran_list)
            penarikan_rows = []
            for r in cursor.fetchall():
                penarikan_rows.append({
                    "id_kas_umum": r[0],
                    "tanggal_penarikan": r[1],
                    "jumlah_penarikan": float(r[2]),
                    "uraian": r[3]
                })

            # 3. Setor Tunai (id_ref_bku = 5)
            q_setor = f"""
                SELECT 
                    k.id_kas_umum,
                    k.tanggal_transaksi,
                    k.saldo as nominal,
                    k.uraian
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku = 5
                  AND k.soft_delete = 0
                  {date_filter_sql}
                ORDER BY k.tanggal_transaksi ASC, k.id_kas_umum ASC
            """
            cursor.execute(q_setor, id_anggaran_list)
            setor_rows = []
            for r in cursor.fetchall():
                setor_rows.append({
                    "id_kas_umum": r[0],
                    "tanggal_setor": r[1],
                    "jumlah_setor": float(r[2]),
                    "uraian": r[3]
                })

            # 4. Ambil Pajak dan NTPN per Nota
            # Cari dari kas_umum_nota_pajak
            q_ntpn = """
                SELECT id_kas_nota, ntpn, tanggal_lapor
                FROM kas_umum_nota_pajak
                WHERE soft_delete = 0;
            """
            cursor.execute(q_ntpn)
            ntpn_map = {}
            for r in cursor.fetchall():
                ntpn_map[r[0]] = {
                    "ntpn": r[1] or "",
                    "tanggal_lapor": r[2] or ""
                }

            # Cari rincian pajak (id_ref_bku IN (10, 11))
            q_tax_details = f"""
                SELECT 
                    k.id_kas_nota,
                    k.parent_id_kas_umum,
                    k.id_ref_bku,
                    k.uraian,
                    k.saldo,
                    k.is_ppn,
                    k.is_pph_21,
                    k.is_pph_22,
                    k.is_pph_23,
                    k.is_pph_4,
                    k.is_sspd
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku IN (10, 11)
                  AND k.soft_delete = 0
            """
            cursor.execute(q_tax_details, id_anggaran_list)
            tax_by_nota = {}
            for r in cursor.fetchall():
                nota_id = r[0]
                if not nota_id:
                    continue
                if nota_id not in tax_by_nota:
                    tax_by_nota[nota_id] = {
                        "is_ppn": False,
                        "is_pph_21": False,
                        "is_pph_22": False,
                        "is_pph_23": False,
                        "is_pph_4": False,
                        "is_sspd": False,
                        "total_pajak": 0,
                        "pajak_type": "Tanpa Pajak",
                        "persen_pajak": 0
                    }
                # Ambil hanya yang setor (id_ref_bku = 11) untuk nominal agar tidak terhitung ganda terima & setor
                if r[2] == 11:
                    tax_by_nota[nota_id]["total_pajak"] += float(r[4])
                
                if r[5] == 1:
                    tax_by_nota[nota_id]["is_ppn"] = True
                    tax_by_nota[nota_id]["pajak_type"] = "PPN"
                    tax_by_nota[nota_id]["persen_pajak"] = 11
                elif r[6] == 1:
                    tax_by_nota[nota_id]["is_pph_21"] = True
                    tax_by_nota[nota_id]["pajak_type"] = "PPh 21"
                    tax_by_nota[nota_id]["persen_pajak"] = 5
                elif r[7] == 1:
                    tax_by_nota[nota_id]["is_pph_22"] = True
                    tax_by_nota[nota_id]["pajak_type"] = "PPh 22"
                    tax_by_nota[nota_id]["persen_pajak"] = 1.5
                elif r[8] == 1:
                    tax_by_nota[nota_id]["is_pph_23"] = True
                    tax_by_nota[nota_id]["pajak_type"] = "PPh 23"
                    tax_by_nota[nota_id]["persen_pajak"] = 2
                elif r[9] == 1:
                    tax_by_nota[nota_id]["is_pph_4"] = True
                    tax_by_nota[nota_id]["pajak_type"] = "PPh Final"
                elif r[10] == 1:
                    tax_by_nota[nota_id]["is_sspd"] = True

            # 5. Ekstraksi Belanja Kas Keluar (id_ref_bku IN (4, 15))
            q_belanja = f"""
                SELECT 
                    k.id_kas_umum,
                    k.id_kas_nota,
                    n.no_bukti,
                    n.no_nota,
                    k.tanggal_transaksi,
                    k.id_ref_bku,
                    n.nama_toko,
                    n.alamat_toko,
                    n.npwp,
                    n.is_beli_di_siplah,
                    k.uraian as item_uraian,
                    k.volume,
                    k.saldo as item_total,
                    coalesce(p.harga_satuan, (k.saldo / max(1, k.volume))) as harga_satuan,
                    coalesce(r.satuan, 'buah') as satuan,
                    k.kode_rekening,
                    rk.id_kode as kode_kegiatan,
                    r.uraian as rapbs_uraian,
                    p.id_periode
                FROM kas_umum k
                JOIN kas_umum_nota n ON k.id_kas_nota = n.id_kas_nota
                LEFT JOIN rapbs_periode p ON k.id_rapbs_periode = p.id_rapbs_periode
                LEFT JOIN rapbs r ON p.id_rapbs = r.id_rapbs
                LEFT JOIN (
                    SELECT DISTINCT id_ref_kode, id_kode 
                    FROM ref_kode 
                    WHERE tahun = {tahun} AND sumber_dana_id = {sumber_dana_id}
                ) rk ON r.id_ref_kode = rk.id_ref_kode
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku IN (4, 15)
                  AND k.soft_delete = 0
                  {date_filter_sql}
                ORDER BY k.tanggal_transaksi ASC, n.no_bukti ASC, k.id_kas_umum ASC;
            """
            cursor.execute(q_belanja, id_anggaran_list)
            belanja_rows = cursor.fetchall()

            # Kelompokkan baris belanja berdasarkan id_kas_nota
            notas_dict = {}
            for row in belanja_rows:
                nota_id = row[1]
                if nota_id not in notas_dict:
                    # Tentukan jenis transaksi
                    # id_ref_bku 4 = tunai, 15 = non-tunai
                    jenis_tx = 'tunai' if row[5] == 4 else 'non-tunai'
                    
                    tax_info = tax_by_nota.get(nota_id, {})
                    ntpn_info = ntpn_map.get(nota_id, {})

                    notas_dict[nota_id] = {
                        "id_kas_nota": nota_id,
                        "no_bukti": row[2] or "",
                        "no_nota": row[3] or "",
                        "nomor_nota": row[2] or "",
                        "tanggal_transaksi": row[4],
                        "jenis_transaksi": jenis_tx,
                        "nama_toko": row[6] or "",
                        "alamat_toko": row[7] or "",
                        "npwp": row[8] or "",
                        "is_siplah": bool(row[9]),
                        "kode_kegiatan": row[16] or "",
                        "kode_rekening": row[15] or "",
                        "pajak": tax_info.get("pajak_type", "Tanpa Pajak"),
                        "persen_pajak": tax_info.get("persen_pajak", 0),
                        "total_pajak": tax_info.get("total_pajak", 0),
                        "ntpn": ntpn_info.get("ntpn", ""),
                        "tanggal_lapor": ntpn_info.get("tanggal_lapor", ""),
                        "items": []
                    }

                notas_dict[nota_id]["items"].append({
                    "id_kas_umum": row[0],
                    "uraian": row[10] or "",
                    "volume": float(row[11]),
                    "item_total": float(row[12]),
                    "harga_satuan": float(row[13]),
                    "satuan": row[14] or "buah",
                    "kode_rekening": row[15] or "",
                    "kode_kegiatan": row[16] or "",
                    "rapbs_uraian": row[17] or row[10] or ""
                })

            # Format akhir daftar nota transaksi belanja
            transaksi_belanja = []
            for nota_id, nota in notas_dict.items():
                total_kotor = sum(item["item_total"] for item in nota["items"])
                # Uraian header bisa mengambil nama nota atau uraian item pertama
                uraian_header = nota["items"][0]["uraian"] if len(nota["items"]) > 0 else f"Belanja {nota['no_bukti']}"
                
                transaksi_belanja.append({
                    "no_bukti": nota["no_bukti"],
                    "no_nota": nota["no_nota"],
                    "nomor_nota": nota["no_bukti"],
                    "tanggal_transaksi": nota["tanggal_transaksi"],
                    "jenis_transaksi": nota["jenis_transaksi"],
                    "nama_toko": nota["nama_toko"],
                    "alamat_toko": nota["alamat_toko"],
                    "npwp": nota["npwp"],
                    "is_siplah": nota["is_siplah"],
                    "kode_kegiatan": nota["kode_kegiatan"],
                    "kode_rekening": nota["kode_rekening"],
                    "uraian": uraian_header,
                    "total_transaksi_kotor": total_kotor,
                    "dibelanjakan": total_kotor,
                    "pajak": nota["pajak"],
                    "persen_pajak": nota["persen_pajak"],
                    "total_pajak": nota["total_pajak"],
                    "ntpn": nota["ntpn"],
                    "tanggal_lapor": nota["tanggal_lapor"],
                    "items": nota["items"]
                })

            # 6. Status Tutup Buku Bulanan & Bunga Bank
            periode_filter = ""
            if bulan_num is not None:
                target_periode = 80 + bulan_num
                periode_filter = f"AND a.id_periode = {target_periode}"

            q_closing = f"""
                SELECT 
                    a.id_periode,
                    max(a.tanggal_aktivasi),
                    max(a.tanggal_finish),
                    coalesce(max(a.saldo_awal_bank), 0),
                    coalesce(max(a.saldo_awal_tunai), 0),
                    coalesce(max(a.saldo_akhir_bank), 0),
                    coalesce(max(a.saldo_akhir_tunai), 0)
                FROM aktivasi_bku a
                WHERE a.id_anggaran IN ({anggaran_placeholders})
                  AND a.soft_delete = 0
                  {periode_filter}
                GROUP BY a.id_periode
                ORDER BY a.id_periode ASC
            """
            cursor.execute(q_closing, id_anggaran_list)
            closing_rows = cursor.fetchall()

            # Ambil bunga bank per bulan
            q_bunga_monthly = f"""
                SELECT 
                    k.tanggal_transaksi,
                    k.id_ref_bku,
                    k.saldo
                FROM kas_umum k
                WHERE k.id_anggaran IN ({anggaran_placeholders})
                  AND k.id_ref_bku IN (6, 7)
                  AND k.soft_delete = 0
                  {date_filter_sql}
                ORDER BY k.tanggal_transaksi ASC
            """
            cursor.execute(q_bunga_monthly, id_anggaran_list)
            bunga_by_month = {}
            for r in cursor.fetchall():
                # tanggal format: YYYY-MM-DD
                tgl = r[0]
                m_num = int(tgl.split('-')[1])
                if m_num not in bunga_by_month:
                    bunga_by_month[m_num] = {"bunga_bank": 0, "pajak_bunga_bank": 0, "tanggal": tgl}
                if r[1] == 6:
                    bunga_by_month[m_num]["bunga_bank"] = float(r[2])
                elif r[1] == 7:
                    bunga_by_month[m_num]["pajak_bunga_bank"] = float(r[2])

            penutupan_bulan = []
            for r in closing_rows:
                m_num = r[0] - 80
                m_name = MONTH_NAME_MAP.get(m_num, f"Bulan {m_num}")
                bunga_info = bunga_by_month.get(m_num, {})

                penutupan_bulan.append({
                    "bulan_angka": m_num,
                    "bulan_nama": m_name,
                    "is_closed": r[2] is not None,
                    "tanggal_tutup": r[2],
                    "saldo_awal_bank": float(r[3]),
                    "saldo_awal_tunai": float(r[4]),
                    "saldo_akhir_bank": float(r[5]),
                    "saldo_akhir_tunai": float(r[6]),
                    "bunga_bank": bunga_info.get("bunga_bank", 0),
                    "pajak_bunga_bank": bunga_info.get("pajak_bunga_bank", 0)
                })

            print(json.dumps({
                "status": "success",
                "tahun": tahun,
                "bulan": MONTH_NAME_MAP.get(bulan_num) if bulan_num else "Semua Bulan",
                "penerimaan_dana": penerimaan_rows,
                "penarikan_tunai": penarikan_rows,
                "setor_tunai": setor_rows,
                "transaksi_belanja": transaksi_belanja,
                "penutupan_bulan": penutupan_bulan
            }))
            conn.close()
            sys.exit(0)

        else:
            print(json.dumps({
                "status": "error",
                "message": f"Mode '{mode}' tidak dikenal. Gunakan 'check' atau 'dump'."
            }))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Terjadi kesalahan: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
