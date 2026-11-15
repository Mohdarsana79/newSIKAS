import AuthScene from '@/Components/Auth/AuthScene';
import { AuthAccent } from '@/Components/Auth/AuthHeading';
import AuthWordmark from '@/Components/Auth/AuthWordmark';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/**
 * Bingkai halaman autentikasi: panel ilustrasi (kiri) + kartu formulir (kanan).
 * Struktur ini dipakai Login, Register, dan halaman auth lain agar bahasa
 * desainnya konsisten. Semua konten halaman tetap dirender lewat `children`.
 */
export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="auth-shell relative min-h-screen w-full overflow-x-hidden">
            {/* Cahaya hangat + butiran kertas di belakang bingkai */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 -top-44 h-[520px] w-[520px] rounded-full bg-[#E5DBFF] opacity-70 blur-[120px]" />
                <div className="absolute -right-36 bottom-[-16%] h-[480px] w-[480px] rounded-full bg-[#FBDCC6] opacity-60 blur-[120px]" />
                <div className="auth-grain absolute inset-0" />
            </div>

            <div className="relative flex min-h-screen flex-col p-3 sm:p-4 lg:p-6">
                <div className="relative grid w-full min-w-0 flex-1 grid-cols-1 overflow-hidden rounded-[26px] border border-[#221C33]/10 bg-[#FFFDF8]/60 shadow-[0_36px_80px_-56px_rgba(34,28,51,0.55)] backdrop-blur-[2px] lg:grid-cols-[1.04fr_0.96fr]">
                    {/* Tanda potong ala cetak, hanya di layar lebar */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
                        {[
                            'left-2.5 top-2.5',
                            'right-2.5 top-2.5',
                            'left-2.5 bottom-2.5',
                            'right-2.5 bottom-2.5',
                        ].map((position) => (
                            <svg
                                key={position}
                                viewBox="0 0 12 12"
                                className={`absolute ${position} h-2.5 w-2.5 text-[#221C33]/20`}
                                fill="none"
                            >
                                <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        ))}
                    </div>

                    {/* Panel kiri: merek + ilustrasi */}
                    <aside className="relative hidden overflow-hidden bg-[linear-gradient(152deg,#F1E9FF_0%,#F7EFE3_46%,#FBE8D8_100%)] lg:flex lg:flex-col">
                        <div aria-hidden="true" className="auth-dots absolute inset-0 opacity-[0.38]" />
                        <div aria-hidden="true" className="auth-grain absolute inset-0" />
                        <div
                            aria-hidden="true"
                            className="absolute -right-24 top-10 h-64 w-64 rounded-full border border-[#6D4DE0]/10"
                        />

                        <div className="relative z-10 flex h-full flex-col px-9 py-9 xl:px-12 xl:py-11">
                            <div className="auth-rise">
                                <AuthWordmark />
                            </div>

                            <div className="auth-rise mt-8 max-w-[30rem] xl:mt-9" style={{ animationDelay: '90ms' }}>
                                <p className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.26em] text-[#6B5E86]">
                                    <span aria-hidden="true" className="h-px w-5 bg-[#C9B9E8]" />
                                    Sekolah lebih terkelola
                                </p>

                                <p className="mt-3.5 font-display text-[clamp(2rem,2.55vw,2.7rem)] font-semibold leading-[1.04] tracking-[-0.025em] text-[#221C33]">
                                    Anggaran sekolah, <AuthAccent>rapi</AuthAccent> dari hulu ke
                                    hilir.
                                </p>
                            </div>

                            <div className="relative z-10 mt-5 flex min-h-0 flex-1 items-start justify-center overflow-hidden">
                                <div className="relative w-[clamp(340px,54vh,530px)] max-w-full [@media(max-height:820px)]:w-[clamp(300px,42vh,400px)]">
                                    <div
                                        aria-hidden="true"
                                        className="absolute -inset-x-2 -bottom-3 top-2 rotate-[1.3deg] rounded-[26px] border border-[#E4D8C4]/70 bg-[#FFFDF8]/55"
                                    />

                                    <div className="relative -rotate-[0.6deg] rounded-[24px] border border-[#FFFDF8] bg-[#FFFDF8] p-2 shadow-[0_26px_48px_-30px_rgba(34,28,51,0.5),0_2px_0_rgba(255,255,255,0.8)_inset] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:rotate-0 hover:scale-[1.008]">
                                        <div className="relative overflow-hidden rounded-[18px] bg-[#FAF4E8]">
                                            <AuthScene className="[filter:saturate(1.22)_contrast(1.05)]" />
                                            <div
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-36px_48px_-24px_rgba(34,28,51,0.16)]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F8E9DB] to-transparent"
                                />
                            </div>

                            <div className="auth-rise relative z-10 mt-5 max-w-[34rem]" style={{ animationDelay: '200ms' }}>
                                <div className="flex items-start gap-3">
                                    <span aria-hidden="true" className="mt-[7px] h-px w-7 shrink-0 bg-[#C9B9E8]" />
                                    <p className="text-[12.5px] leading-relaxed text-[#5C5468]">
                                        RKAS, buku kas, dan laporan dalam satu alur — tanpa spreadsheet
                                        berserakan.
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 mt-5 flex items-center justify-between gap-4 border-t border-[#221C33]/10 pt-4 text-[10px] tracking-[0.04em] text-[#6B5E86]">
                                <span>© 2026 SIKAS</span>
                                <a
                                    href="https://www.youtube.com/@giandarsana5772"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="auth-link font-medium text-[#6B5E86] transition-colors hover:text-[#221C33]"
                                >
                                    Dibuat oleh Moh Gian Darsana, S.Pd., Gr
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* Panel kanan: kartu formulir */}
                    <main className="relative flex min-w-0 flex-col items-center justify-center bg-[#FBF5E9] px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="auth-dots absolute inset-0 opacity-[0.28]" />
                            <div className="absolute -bottom-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#E5DBFF] opacity-50 blur-[90px]" />
                        </div>

                        <div className="relative z-10 w-full min-w-0 max-w-[452px]">
                            <div className="auth-rise mb-7 flex justify-center lg:hidden">
                                <Link href="/" aria-label="SIKAS — beranda" className="max-w-full">
                                    <AuthWordmark compact />
                                </Link>
                            </div>

                            <div className="relative">
                                <div
                                    aria-hidden="true"
                                    className="absolute -inset-x-2 -bottom-3 top-4 rotate-[1.1deg] rounded-[30px] border border-[#D9CBB4]/70 bg-[#F3EAD9]/55"
                                />

                                <div className="relative overflow-hidden rounded-[26px] border border-[#E4D8C4] bg-[#FFFDF8] px-5 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_28px_60px_-36px_rgba(74,47,176,0.38),0_10px_20px_-16px_rgba(34,28,51,0.22)] sm:px-8 sm:py-9">
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 12 12"
                                        className="absolute right-4 top-4 h-2.5 w-2.5 text-[#221C33]/15"
                                        fill="none"
                                    >
                                        <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
                                    </svg>

                                    <div className="relative">{children}</div>
                                </div>
                            </div>

                            <p className="mt-5 text-center text-[9.5px] uppercase tracking-[0.16em] text-[#6B6178] lg:hidden">
                                © 2026 SIKAS · Sistem Informasi Keuangan Sekolah
                            </p>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
