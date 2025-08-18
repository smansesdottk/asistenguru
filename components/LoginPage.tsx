import React, { useState } from 'react';
import type { PublicConfig } from '../types';
import LogoIcon from './icons/LogoIcon';

interface LoginPageProps {
    onLogin: () => void;
    config: PublicConfig;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, config }) => {
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const performAdminLogin = async (adminPassword: string) => {
        if (!adminPassword) return;
        setIsLoggingIn(true);
        setError(null);
        try {
            const response = await fetch('/api/auth-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword }),
            });
            if (!response.ok) {
                // Try to parse the error, but have a fallback.
                let errorMessage = 'Password salah atau terjadi kesalahan server.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    // This happens if the server returns non-JSON, like the "A server e..." error.
                    console.error("Failed to parse error response as JSON", jsonError);
                    errorMessage = "Terjadi kesalahan tak terduga di server.";
                }
                throw new Error(errorMessage);
            }
            onLogin();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal login sebagai admin');
            setPassword('');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleGoogleLogin = () => {
        if (!config?.googleClientId || !config?.appBaseUrl) {
            alert('Konfigurasi login Google tidak lengkap (Client ID atau App URL belum diatur).');
            return;
        }
        const redirectUri = `${config.appBaseUrl}/api/auth-callback`;
        const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: config.googleClientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            prompt: 'select_account',
        })}`;
        window.location.href = googleLoginUrl;
    };

    const handleAdminFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performAdminLogin(password);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg text-center">
                <header>
                    <LogoIcon className="w-24 h-24 mx-auto mb-4 text-blue-500" />
                    <h1 className="text-3xl font-bold">{config.schoolNameFull || 'Chat AI Sekolah'}</h1>
                    <p className="text-gray-400">
                        Asisten Virtual {config.schoolNameShort || ''}
                    </p>
                </header>
                
                {error && <p className="text-red-400 p-3 bg-red-900/50 rounded-md my-4">Error: {error}</p>}

                {config.isGoogleLoginConfigured ? (
                    <main className="space-y-6">
                        <div>
                            <button
                                onClick={handleGoogleLogin}
                                type="button"
                                className="w-full inline-flex justify-center items-center gap-x-3 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M47.532 24.552c0-1.566-.14-3.09-.408-4.552H24.38v8.65h13.01c-.562 2.782-2.22 5.15-4.792 6.786v5.61h7.222c4.228-3.89,6.648-9.674,6.648-16.494z" fill="#4285F4"></path><path d="M24.38 48c6.48 0 11.93-2.14 15.908-5.786l-7.222-5.61c-2.14 1.44-4.882 2.292-7.936 2.292-6.14 0-11.34-4.13-13.2-9.722H3.85v5.794C7.82 42.59,15.48 48,24.38 48z" fill="#34A853"></path><path d="M11.18 28.962c-.49-1.44-.77-3-.77-4.602s.28-3.162.77-4.602V14.04H3.85C2.17 17.2,1.25 20.73,1.25 24.36s.92 7.16,2.6 10.32l7.33-5.718z" fill="#FBBC05"></path><path d="M24.38 9.6c3.49 0 6.6.98 9.076 3.33l6.41-6.41C36.31 2.33 30.86 0 24.38 0 15.48 0 7.82 5.41,3.85 14.04l7.33 5.718c1.86-5.592 7.06-9.722 13.2-9.722z" fill="#EA4335"></path></svg>
                                Login dengan Akun Google
                            </button>
                            <p className="text-center text-xs text-gray-500 mt-2">Gunakan akun @sekolah</p>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-800 text-gray-500">Atau</span>
                            </div>
                        </div>

                        <form onSubmit={handleAdminFormSubmit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-300">Login Admin</h2>
                             <div>
                                <label htmlFor="admin-password-full" className="sr-only">Password</label>
                                <input
                                    id="admin-password-full"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Kata Sandi Admin"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full px-4 py-3 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn ? 'Memproses...' : 'Login sebagai Admin'}
                            </button>
                        </form>
                    </main>
                ) : (
                    <main>
                        <form onSubmit={handleAdminFormSubmit} className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-300">Login Admin</h2>
                            <p className="text-xs text-gray-500">
                                Autentikasi Google tidak dikonfigurasi. Silakan login menggunakan kata sandi admin.
                            </p>
                            <div>
                                <label htmlFor="admin-password-only" className="sr-only">Password</label>
                                <input
                                    id="admin-password-only"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Kata Sandi Admin"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn || !password}
                                className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn ? 'Memproses...' : 'Login'}
                            </button>
                        </form>
                    </main>
                )}
                 <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
                    Powered by Google Gemini
                </p>
            </div>
        </div>
    );
};

export default LoginPage;