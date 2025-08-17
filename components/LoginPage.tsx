import React, { useState } from 'react';
import type { PublicConfig } from '../types';

interface LoginPageProps {
    onLogin: () => void;
    config: PublicConfig;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, config }) => {
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = () => {
        if (!config?.googleClientId) {
            alert('Google Client ID tidak dikonfigurasi.');
            return;
        }
        const redirectUri = `${window.location.origin}/.netlify/functions/auth-callback`;
        const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: config.googleClientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            prompt: 'select_account',
        })}`;
        window.location.href = googleLoginUrl;
    };
    
    const handleAdminLogin = async () => {
        const password = prompt("Masukkan kata sandi Admin:");
        if (password) {
            try {
                const response = await fetch('/.netlify/functions/auth-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Password salah');
                }
                onLogin();
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Gagal login sebagai admin');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg text-center">
                <header>
                    <img src="/logo.png" alt="Logo Sekolah" className="w-24 h-24 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold">{config.schoolNameFull || 'Chat AI Sekolah'}</h1>
                    <p className="text-gray-400">
                        Asisten Virtual {config.schoolNameShort || ''}
                    </p>
                </header>
                
                {error && <p className="text-red-400">Error: {error}</p>}

                <main className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={!config?.googleClientId}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.655-3.39-11.127-7.962l-6.571,4.819C9.656,39.663,16.318,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.591,44,30.134,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        </svg>
                        <span>Sign in with Google</span>
                    </button>
                    <p className="text-xs text-gray-500">
                        Harap login menggunakan akun Google sekolah (@sman11mks.com).
                    </p>
                </main>
                
                <footer className="pt-4 border-t border-gray-700">
                    <button 
                        onClick={handleAdminLogin} 
                        className="text-xs text-gray-400 hover:text-white hover:underline"
                    >
                        Login sebagai Admin
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                        Dibuat oleh A. Indra Malik - SMAN11MKS
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default LoginPage;