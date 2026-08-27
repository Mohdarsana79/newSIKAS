import Chart from 'react-apexcharts';

interface TabGrafikProps {
    grafikData: any;
    isDarkMode: boolean;
}

export default function TabGrafik({ grafikData, isDarkMode }: TabGrafikProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID').format(amount);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-fade-in-up">
            <h2 className="text-xl font-bold text-center text-blue-600 dark:text-blue-400 mb-8 uppercase">
                Analisis Proporsi Anggaran RKAS
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Buku */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran BUKU</h3>
                    <div className="flex-1 flex justify-center items-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Penyediaan Buku', 'Komponen Anggaran Lainnya'],
                                colors: ['#F59E0B', isDarkMode ? '#374151' : '#E5E7EB'],
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
                    <div className={`mt-4 p-4 rounded-md ${grafikData.buku.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        <h4 className={`font-bold uppercase text-xs mb-2 text-white px-2 py-1 inline-block rounded ${grafikData.buku.valid ? 'bg-green-700 dark:bg-green-800' : 'bg-yellow-700 dark:bg-yellow-800'}`}>INFORMASI ALOKASI BUKU</h4>
                        <div className="flex items-start gap-3 mt-2">
                            <div className={`mt-0.5 min-w-[20px] h-5 rounded-full flex items-center justify-center ${grafikData.buku.valid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                {grafikData.buku.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.buku.valid ? 'Alokasi belanja Anda sudah sesuai juknis' : 'Alokasi belanja Anda belum sesuai juknis'}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.buku.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 2: Honor */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran Honor dari Total Pagu</h3>
                    <div className="flex-1 flex justify-center items-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Pembayaran Honor', 'Komponen Anggaran Lainnya'],
                                colors: ['#06B6D4', isDarkMode ? '#374151' : '#E5E7EB'],
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
                    <div className={`mt-4 p-4 rounded-md ${grafikData.honor.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        <h4 className={`font-bold uppercase text-xs mb-2 text-white px-2 py-1 inline-block rounded ${grafikData.honor.valid ? 'bg-green-700 dark:bg-green-800' : 'bg-yellow-700 dark:bg-yellow-800'}`}>ALOKASI ANGGARAN HONOR</h4>
                        <div className="flex items-start gap-3 mt-2">
                            <div className={`mt-0.5 min-w-[20px] h-5 rounded-full flex items-center justify-center ${grafikData.honor.valid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                {grafikData.honor.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.honor.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.honor.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 3: Pemeliharaan */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Anggaran Pemeliharaan Sarpras</h3>
                    <div className="flex-1 flex justify-center items-center -ml-4">
                        <Chart
                            options={{
                                labels: ['Pemeliharaan Sarpras', 'Komponen Anggaran Lainnya'],
                                colors: ['#10B981', isDarkMode ? '#374151' : '#E5E7EB'],
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
                    <div className={`mt-4 p-4 rounded-md ${grafikData.pemeliharaan.valid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <h4 className="font-bold uppercase text-xs mb-2 text-white bg-green-700 dark:bg-green-800 px-2 py-1 inline-block rounded">INFORMASI ALOKASI SARPRAS</h4>
                        <div className="flex items-start gap-3 mt-2">
                            <div className={`mt-0.5 min-w-[20px] h-5 rounded-full flex items-center justify-center ${grafikData.pemeliharaan.valid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {grafikData.pemeliharaan.valid ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{grafikData.pemeliharaan.valid ? 'Alokasi anggaran Anda sudah sesuai juknis' : 'Alokasi anggaran belum sesuai juknis'}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed text-justify">{grafikData.pemeliharaan.message}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 4: Jenis Belanja */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center">
                    <h3 className="text-center font-bold text-gray-800 dark:text-gray-100 mb-4">Proporsi Antar Jenis Belanja Lainnya dari Total Pagu</h3>
                    <div className="flex-1 w-full flex justify-center items-center">
                        <Chart
                            options={{
                                labels: grafikData.jenis_belanja.map((d: any) => d.label),
                                colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'],
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
