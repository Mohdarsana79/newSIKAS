import Chart from 'react-apexcharts';
import IconTile from '@/Components/ui/IconTile';

interface TabGrafikProps {
    grafikData: any;
    isDarkMode: boolean;
}

export default function TabGrafik({ grafikData, isDarkMode }: TabGrafikProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    return (
        <div className="animate-rise space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <IconTile tone="violet" size="md">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                            <path d="M22 12A10 10 0 0 0 12 2v10z" />
                        </svg>
                    </IconTile>
                    <div className="min-w-0">
                        <h2 className="text-[13.5px] font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                            Analisis Proporsi Anggaran RKAS
                        </h2>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Proporsi alokasi belanja terhadap total pagu.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {/* Chart 1: Buku */}
                <div className="sikas-card flex flex-col p-4">
                    <h3 className="mb-3 text-center text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">Proporsi Anggaran BUKU</h3>
                    <div className="flex flex-1 items-center justify-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Penyediaan Buku', 'Komponen Anggaran Lainnya'],
                                colors: ['#F59E0B', isDarkMode ? '#2B2940' : '#ECECF3'],
                                legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                stroke: { show: !isDarkMode }
                            }}
                            series={[grafikData.buku.value, grafikData.total - grafikData.buku.value]}
                            type="donut"
                            height={300}
                        />
                    </div>
                    <div className={`mt-4 rounded-2xl border p-4 ${grafikData.buku.valid ? 'border-mint/20 bg-pastel-mint/60 dark:border-mint/20 dark:bg-mint/10' : 'border-amber-300/50 bg-pastel-amber/60 dark:border-amber-400/20 dark:bg-amber-400/10'}`}>
                        <h4 className={`mb-2 inline-block rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white ${grafikData.buku.valid ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-amber-600 dark:bg-amber-700'}`}>INFORMASI ALOKASI BUKU</h4>
                        <div className="mt-2 flex items-start gap-3">
                            <div className={`mt-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full text-white ${grafikData.buku.valid ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                {grafikData.buku.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-extrabold text-slate-900 dark:text-white">{grafikData.buku.valid ? 'Alokasi belanja Anda sudah sesuai juknis' : 'Alokasi belanja Anda belum sesuai juknis'}</p>
                                <p className="text-justify text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">{grafikData.buku.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 2: Honor */}
                <div className="sikas-card flex flex-col p-4">
                    <h3 className="mb-3 text-center text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">Proporsi Anggaran Honor dari Total Pagu</h3>
                    <div className="flex flex-1 items-center justify-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Pembayaran Honor', 'Komponen Anggaran Lainnya'],
                                colors: ['#3B82F6', isDarkMode ? '#2B2940' : '#ECECF3'],
                                legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(1) + '%' },
                                plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                stroke: { show: !isDarkMode }
                            }}
                            series={[grafikData.honor.value, grafikData.total - grafikData.honor.value]}
                            type="donut"
                            height={300}
                        />
                    </div>
                    <div className={`mt-4 rounded-2xl border p-4 ${grafikData.honor.valid ? 'border-mint/20 bg-pastel-mint/60 dark:border-mint/20 dark:bg-mint/10' : 'border-amber-300/50 bg-pastel-amber/60 dark:border-amber-400/20 dark:bg-amber-400/10'}`}>
                        <h4 className={`mb-2 inline-block rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white ${grafikData.honor.valid ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-amber-600 dark:bg-amber-700'}`}>ALOKASI ANGGARAN HONOR</h4>
                        <div className="mt-2 flex items-start gap-3">
                            <div className={`mt-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full text-white ${grafikData.honor.valid ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                {grafikData.honor.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-extrabold text-slate-900 dark:text-white">{grafikData.honor.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                <p className="text-justify text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">{grafikData.honor.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 3: Pemeliharaan */}
                <div className="sikas-card flex flex-col p-4">
                    <h3 className="mb-3 text-center text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">Proporsi Anggaran Pemeliharaan Sarpras</h3>
                    <div className="flex flex-1 items-center justify-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Pemeliharaan Sarpras', 'Komponen Anggaran Lainnya'],
                                colors: ['#10B981', isDarkMode ? '#2B2940' : '#ECECF3'],
                                legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(2) + '%' },
                                plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                stroke: { show: !isDarkMode }
                            }}
                            series={[grafikData.pemeliharaan.value, grafikData.total - grafikData.pemeliharaan.value]}
                            type="donut"
                            height={300}
                        />
                    </div>
                    <div className={`mt-4 rounded-2xl border p-4 ${grafikData.pemeliharaan.valid ? 'border-mint/20 bg-pastel-mint/60 dark:border-mint/20 dark:bg-mint/10' : 'border-rose-200 bg-pastel-rose/70 dark:border-rose-400/20 dark:bg-rose-500/10'}`}>
                        <h4 className={`mb-2 inline-block rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white ${grafikData.pemeliharaan.valid ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700'}`}>INFORMASI ALOKASI SARPRAS</h4>
                        <div className="mt-2 flex items-start gap-3">
                            <div className={`mt-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full text-white ${grafikData.pemeliharaan.valid ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                {grafikData.pemeliharaan.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="mb-1 text-[11.5px] font-extrabold text-slate-900 dark:text-white">{grafikData.pemeliharaan.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                <p className="text-justify text-[10.5px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">{grafikData.pemeliharaan.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 4: Jenis Belanja */}
                <div className="sikas-card flex flex-col items-center p-4">
                    <h3 className="mb-3 text-center text-[12px] font-extrabold tracking-tight text-slate-900 dark:text-white">Proporsi Antar Jenis Belanja Lainnya dari Total Pagu</h3>
                    <div className="flex w-full flex-1 items-center justify-center">
                        <Chart
                            options={{
                                labels: grafikData.jenis_belanja.map((d: any) => d.label),
                                colors: ['#7C5CFF', '#F47B45', '#10B981', '#F59E0B', '#3B82F6', '#C5E84E'],
                                legend: { position: 'bottom', labels: { colors: isDarkMode ? '#f3f4f6' : '#374151' } },
                                dataLabels: { enabled: true, formatter: (val) => (val as number).toFixed(2) + '%' },
                                plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, showAlways: true, label: 'Total', fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#f3f4f6' : '#373d3f' } } } } },
                                tooltip: { y: { formatter: (val) => formatCurrency(val) } },
                                stroke: { show: !isDarkMode }
                            }}
                            series={grafikData.jenis_belanja.map((d: any) => d.value)}
                            type="donut"
                            height={300}
                            width="100%"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
