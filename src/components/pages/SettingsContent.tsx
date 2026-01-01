import { Camera, Check, Loader2, Mail, Phone, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAccount, updateAccount } from '../../services/accountService';
import { AVATAR_STYLES, getAvatarUrl } from '../../utils/avatarUtils';

const SEEDS = [
    'Felix', 'Aneka', 'Charlie', 'Luna', 'Kiki',
    'Milo', 'Misty', 'Jasper', 'Oliver', 'Shadow',
    'Sophie', 'Max', 'Bella', 'Leo', 'Chloe',
    'Oscar', 'Lily', 'Jack', 'Lucy', 'Cooper'
];

const SettingsContent = () => {
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        avatar: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState(AVATAR_STYLES[0]);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await getAccount();
            setProfileData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                avatar: data.avatar || ''
            });
        } catch (error) {
            console.error('Profil bilgileri yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarSelect = (url: string) => {
        setProfileData({ ...profileData, avatar: url });
        setShowAvatarPicker(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedProfile = await updateAccount({
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone,
                avatar: profileData.avatar
            });

            setProfileData({
                name: updatedProfile.name,
                email: updatedProfile.email,
                phone: updatedProfile.phone,
                avatar: updatedProfile.avatar || ''
            });

            // Update local storage user data to reflect changes immediately in UI
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            localStorage.setItem('userData', JSON.stringify({ ...userData, ...updatedProfile }));

            alert('Profil bilgileriniz güncellendi!');
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            alert('Değişiklikler kaydedilirken bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
            {/* Page Header */}
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
                    Ayarlar
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Profil bilgilerinizi güncelleyin
                </p>
            </div>

            {/* Avatar Section */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.025em' }}>Avatarınız</h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '6rem',
                            height: '6rem',
                            borderRadius: '1rem',
                            backgroundColor: 'var(--muted)',
                            border: '3px solid var(--card-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <img
                                src={getAvatarUrl(profileData.avatar, profileData.name)}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <div>
                            <button
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                className="phase-button"
                                style={{ fontSize: '0.875rem' }}
                            >
                                <Camera size={16} />
                                Avatar Seç
                            </button>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                                DiceBear kütüphanesinden size en uygun avatarı seçin.
                            </p>
                        </div>
                    </div>

                    {showAvatarPicker && (
                        <div className="animate-fade-in" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                            {/* Style Selection (Groups) */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                {AVATAR_STYLES.map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setSelectedStyle(style)}
                                        style={{
                                            padding: '0.375rem 0.875rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            border: '1px solid var(--card-border)',
                                            backgroundColor: selectedStyle === style ? 'var(--foreground)' : 'var(--muted)',
                                            color: selectedStyle === style ? 'var(--background)' : 'var(--foreground)',
                                            textTransform: 'capitalize',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {style.replace(/-/g, ' ')}
                                    </button>
                                ))}
                            </div>

                            {/* Variations Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                gap: '1rem'
                            }}>
                                {SEEDS.map(seed => {
                                    const url = `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${seed}`;
                                    const isSelected = profileData.avatar === url;
                                    return (
                                        <div
                                            key={seed}
                                            onClick={() => handleAvatarSelect(url)}
                                            style={{
                                                aspectRatio: '1',
                                                borderRadius: '0.75rem',
                                                backgroundColor: 'var(--muted)',
                                                border: `2px solid ${isSelected ? 'var(--foreground)' : 'var(--card-border)'}`,
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                        >
                                            <img src={url} alt={seed} style={{ width: '100%', height: '100%' }} />
                                            {isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    backgroundColor: 'var(--foreground)',
                                                    color: 'var(--background)',
                                                    borderRadius: '50%',
                                                    width: '18px',
                                                    height: '18px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Information Section */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.025em' }}>Profil Bilgileri</h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Name Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--muted-foreground)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Ad Soyad
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
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                className="phase-input"
                                style={{
                                    paddingLeft: '2.75rem',
                                    height: '2.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--muted-foreground)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            E-posta
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail
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
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className="phase-input"
                                style={{
                                    paddingLeft: '2.75rem',
                                    height: '2.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Phone Field */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--muted-foreground)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Telefon
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Phone
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
                                type="tel"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                className="phase-input"
                                style={{
                                    paddingLeft: '2.75rem',
                                    height: '2.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="phase-button"
                            style={{
                                fontSize: '0.875rem',
                                padding: '0.625rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: isSaving ? 0.7 : 1,
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={16} />
                            {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsContent;

