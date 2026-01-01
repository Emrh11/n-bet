import { ArrowRight, Check, Eye, EyeOff, Lock, Moon, Sun, User, X } from 'lucide-react';
import { useState } from 'react';
import PixelBlast from '../PixelBlast';

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

    // Şifremi unuttum modal state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotUsername, setForgotUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);

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

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotMessage('');

        if (!forgotUsername.trim()) {
            setForgotMessage('Lütfen kullanıcı adınızı girin');
            setForgotSuccess(false);
            return;
        }

        if (!newPassword.trim()) {
            setForgotMessage('Lütfen yeni şifrenizi girin');
            setForgotSuccess(false);
            return;
        }

        if (newPassword.length < 4) {
            setForgotMessage('Şifre en az 4 karakter olmalıdır');
            setForgotSuccess(false);
            return;
        }

        setForgotLoading(true);

        try {
            const response = await fetch('https://nobettakip.site/api/password-reset.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: forgotUsername.trim(),
                    newPassword: newPassword
                }),
            });

            const data = await response.json();

            setForgotMessage(data.message || data.error || 'İşlem tamamlandı.');
            setForgotSuccess(data.success);

            if (data.success) {
                setForgotUsername('');
                setNewPassword('');
                // 2 saniye sonra modalı kapat
                setTimeout(() => {
                    closeForgotModal();
                }, 2000);
            }
        } catch (err) {
            setForgotMessage('Sunucu bağlantı hatası');
            setForgotSuccess(false);
        }

        setForgotLoading(false);
    };

    const openForgotModal = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowForgotModal(true);
        setForgotUsername('');
        setNewPassword('');
        setForgotMessage('');
        setForgotSuccess(false);
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotUsername('');
        setNewPassword('');
        setForgotMessage('');
    };


    return (
        <div style={{
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDarkMode ? '#050505' : '#f0f4f8',
            color: 'var(--foreground)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* High Quality PixelBlast Background */}
            <PixelBlast
                variant="square"
                pixelSize={3}
                color={isDarkMode ? '#B19EEF' : '#000000'}
                patternScale={2}
                patternDensity={1}
                enableRipples
                rippleSpeed={0.3}
                rippleThickness={0.1}
                rippleIntensityScale={1}
                speed={0.5}
                transparent
                edgeFade={0.5}
                isDarkMode={isDarkMode}
            />

            {/* Dark/Light Mode Toggle - Top Right */}
            <button
                onClick={onToggleDarkMode}
                style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    padding: '0.625rem',
                    backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms ease',
                    zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                title={isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
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
                        padding: '2.5rem',
                        backdropFilter: 'blur(24px)',
                        backgroundColor: isDarkMode ? 'rgba(10, 10, 15, 0.75)' : 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid var(--card-border)',
                        boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Logo */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <img
                                src={isDarkMode ? '/icon_white.png' : '/icon_black.png'}
                                alt="Nöbet Sistemi"
                                style={{
                                    width: '4rem',
                                    height: '4rem',
                                    objectFit: 'contain',
                                    marginBottom: '0.75rem'
                                }}
                            />
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                letterSpacing: '-0.025em'
                            }}>
                                Nöbet Sistemi
                            </span>
                        </div>

                        {/* Username Field */}
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
                                placeholder="Kullanıcı Adı"
                                className="phase-input"
                                style={{
                                    paddingLeft: '2.75rem',
                                    height: '2.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        {/* Password Field */}
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
                                placeholder="Şifre"
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
                                onClick={openForgotModal}
                                style={{
                                    fontSize: '0.8125rem',
                                    color: isDarkMode ? '#B19EEF' : '#6366f1',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    transition: 'opacity 200ms'
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

            {/* Şifremi Unuttum Modal */}
            {showForgotModal && (

                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1rem'
                    }}
                    onClick={closeForgotModal}
                >
                    <div
                        className="phase-card"
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            padding: '2rem',
                            backdropFilter: 'blur(24px)',
                            backgroundColor: isDarkMode ? 'rgba(15, 15, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid var(--card-border)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Şifremi Unuttum</h2>
                            <button
                                onClick={closeForgotModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    borderRadius: '0.375rem'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            Kullanıcı adınızı ve yeni şifrenizi girin.
                        </p>

                        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Username Field */}
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
                                    value={forgotUsername}
                                    onChange={(e) => setForgotUsername(e.target.value)}
                                    placeholder="Kullanıcı adınız"
                                    className="phase-input"
                                    style={{
                                        paddingLeft: '2.75rem',
                                        height: '2.75rem',
                                        fontSize: '0.875rem'
                                    }}
                                    autoFocus
                                />
                            </div>

                            {/* New Password Field */}
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
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Yeni şifreniz"
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
                                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Message */}
                            {forgotMessage && (
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: forgotSuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${forgotSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    borderRadius: '0.5rem',
                                    color: forgotSuccess ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                                    fontSize: '0.8125rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {forgotSuccess && <Check size={16} />}
                                    {forgotMessage}
                                </div>
                            )}


                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={closeForgotModal}
                                    style={{
                                        flex: 1,
                                        height: '2.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--card-border)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        transition: 'all 200ms'
                                    }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={forgotLoading}
                                    className="phase-button"
                                    style={{
                                        flex: 1,
                                        height: '2.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        opacity: forgotLoading ? 0.7 : 1,
                                        cursor: forgotLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {forgotLoading ? (
                                        <>
                                            <div style={{
                                                width: '0.875rem',
                                                height: '0.875rem',
                                                border: '2px solid var(--background)',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            Gönderiliyor...
                                        </>
                                    ) : 'Talep Gönder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default LoginPage;

