
import { useState, useEffect, useRef } from 'react';
import { Camera, Save, User, Mail, Phone, Loader2 } from 'lucide-react';
import { getAccount, updateAccount } from '../../services/accountService';

const SettingsContent = () => {
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        avatar: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        if (selectedFile) {
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [selectedFile]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert('Dosya boyutu 2MB\'dan küçük olmalıdır.');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let dataToSend: any;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('name', profileData.name);
                formData.append('email', profileData.email);
                formData.append('phone', profileData.phone);
                formData.append('avatar', selectedFile);
                dataToSend = formData;
            } else {
                dataToSend = {
                    name: profileData.name,
                    email: profileData.email,
                    phone: profileData.phone
                };
            }

            const updatedProfile = await updateAccount(dataToSend);

            setProfileData({
                name: updatedProfile.name,
                email: updatedProfile.email,
                phone: updatedProfile.phone,
                avatar: updatedProfile.avatar || ''
            });

            setSelectedFile(null);
            setPreviewUrl(null);

            // Update local storage user data to reflect changes immediately in UI (like sidebar name)
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            localStorage.setItem('userData', JSON.stringify({ ...userData, ...updatedProfile }));

            alert('Profil bilgileriniz güncellendi!');

            // Force reload to update sidebar avatar if changed
            if (selectedFile) {
                window.location.reload();
            }

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
        <div className="animate-fade-in" style={{ maxWidth: '48rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Page Header */}
            <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
                    Ayarlar
                </h2>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Profil bilgilerinizi güncelleyin
                </p>
            </div>

            {/* Profile Photo Section */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.025em' }}>Profil Fotoğrafı</h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '6rem',
                        height: '6rem',
                        borderRadius: '50%',
                        backgroundColor: 'var(--muted)',
                        border: '3px solid var(--card-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {(previewUrl || profileData.avatar) ? (
                            <img
                                src={previewUrl || profileData.avatar}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <User size={32} style={{ color: 'var(--muted-foreground)' }} />
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="phase-button"
                            style={{
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={16} />
                            Fotoğraf Değiştir
                        </button>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                            JPG, PNG veya GIF. Maksimum 2MB.
                        </p>
                    </div>
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

