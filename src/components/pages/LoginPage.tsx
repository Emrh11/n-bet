import { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react';

interface LoginPageProps {
    onLogin: (username: string, userData: any) => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
}

const LoginPage = ({ onLogin, isDarkMode, onToggleDarkMode }: LoginPageProps) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Lütfen tüm alanları doldurun');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('https://nobettakip.site/api/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success && data.token) {
                // Store token in localStorage
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Call onLogin with user data
                onLogin(data.user.username, data.user);
            } else {
                setError(data.error || 'Giriş başarısız');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası');
        }

        setIsLoading(false);
    };

    return (
        <div style={{
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Dark/Light Mode Toggle - Top Right */}
            <button
                onClick={onToggleDarkMode}
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    padding: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 200ms ease',
                    zIndex: 20
                }}
                title={isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
            >
                {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>

            {/* Login Card */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '420px',
                    margin: '0 1rem'
                }}
            >

                {/* Login Form */}
                <div
                    className="phase-card"
                    style={{
                        padding: '2rem',
                        backdropFilter: 'blur(20px)',
                        backgroundColor: 'rgba(var(--card), 0.8)',
                        border: '1px solid var(--card-border)'
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Username Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--muted-foreground)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Kullanıcı Adı
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--muted-foreground)'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="kullaniciadi"
                                    className="phase-input"
                                    style={{
                                        paddingLeft: '2.75rem',
                                        height: '2.75rem',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--muted-foreground)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Şifre
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--muted-foreground)'
                                    }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="phase-input"
                                    style={{
                                        paddingLeft: '2.75rem',
                                        paddingRight: '2.75rem',
                                        height: '2.75rem',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--muted-foreground)',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember & Forgot */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    style={{
                                        width: '1rem',
                                        height: '1rem',
                                        accentColor: 'var(--foreground)'
                                    }}
                                />
                                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>Beni hatırla</span>
                            </label>
                            <a
                                href="#"
                                style={{
                                    fontSize: '0.8125rem',
                                    color: 'var(--foreground)',
                                    textDecoration: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Şifremi unuttum
                            </a>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '0.5rem',
                                color: 'rgb(239, 68, 68)',
                                fontSize: '0.8125rem'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="phase-button"
                            style={{
                                height: '2.75rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <div style={{
                                        width: '1rem',
                                        height: '1rem',
                                        border: '2px solid var(--background)',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    Giriş yapılıyor...
                                </>
                            ) : (
                                <>
                                    Giriş Yap
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
