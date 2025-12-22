import { useState, useEffect } from 'react';
import { Plus, Filter, MoreVertical, Trash2, Edit, X, Loader2, User, Mail, Phone, Key, UserCog } from 'lucide-react';
import { getAllPersonnel, createPersonnel, updatePersonnel, deletePersonnel } from '../../services/personnelService';
import type { Personnel, CreatePersonnelData, UpdatePersonnelData } from '../../services/personnelService';

const StaffContent = () => {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form data
    const [formData, setFormData] = useState<CreatePersonnelData>({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        role: 'user',
        shiftOrder: 0,
        isOnDuty: true
    });

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // Fetch personnel on mount
    useEffect(() => {
        fetchPersonnel();
    }, []);

    const fetchPersonnel = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllPersonnel();
            setPersonnel(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Personel listesi yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPersonnel = async () => {
        if (!formData.name || !formData.email || !formData.username || !formData.password) {
            alert('Lütfen zorunlu alanları doldurun');
            return;
        }

        setIsSaving(true);
        try {
            const newPersonnel = await createPersonnel(formData);
            setPersonnel([...personnel, newPersonnel]);
            setShowAddModal(false);
            resetForm();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Personel eklenirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePersonnel = async () => {
        if (!selectedPersonnel) return;

        setIsSaving(true);
        try {
            const updateData: UpdatePersonnelData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                username: formData.username,
                role: formData.role,
                shiftOrder: formData.shiftOrder,
                isOnDuty: formData.isOnDuty
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            const updated = await updatePersonnel(selectedPersonnel.id, updateData);
            setPersonnel(personnel.map(p => p.id === updated.id ? updated : p));
            setShowEditModal(false);
            setSelectedPersonnel(null);
            resetForm();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Personel güncellenirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePersonnel = async () => {
        if (!selectedPersonnel) return;

        setIsSaving(true);
        try {
            await deletePersonnel(selectedPersonnel.id);
            setPersonnel(personnel.filter(p => p.id !== selectedPersonnel.id));
            setShowDeleteConfirm(false);
            setSelectedPersonnel(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Personel silinirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            username: '',
            password: '',
            role: 'user',
            shiftOrder: 0,
            isOnDuty: true
        });
    };

    const openEditModal = (person: Personnel) => {
        setSelectedPersonnel(person);
        setFormData({
            name: person.name,
            email: person.email,
            phone: person.phone || '',
            username: person.username,
            password: '',
            role: person.role,
            shiftOrder: person.shift_order,
            isOnDuty: Boolean(person.is_on_duty)
        });
        setShowEditModal(true);
        setOpenMenuId(null);
    };

    const openDeleteConfirm = (person: Personnel) => {
        setSelectedPersonnel(person);
        setShowDeleteConfirm(true);
        setOpenMenuId(null);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--card-border)'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Personel Listesi</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                        {personnel.length} personel kayıtlı
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        border: '1px solid var(--card-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer'
                    }}>
                        <Filter size={14} /> Filtrele
                    </button>
                    <button
                        className="phase-button"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={14} /> Yeni Ekle
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '3rem',
                    color: 'var(--muted-foreground)'
                }}>
                    <Loader2 size={24} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                    Yükleniyor...
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '0.5rem',
                    color: 'rgb(239, 68, 68)',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            {/* Table */}
            {!isLoading && !error && (
                <div className="phase-card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                backgroundColor: 'var(--muted)',
                                color: 'var(--muted-foreground)',
                                fontWeight: 600,
                                borderBottom: '1px solid var(--card-border)',
                                letterSpacing: '0.05em'
                            }}>
                                <th style={{ padding: '0.625rem 1rem' }}>Ad Soyad</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Kullanıcı Adı</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Rol</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Durum</th>
                                <th style={{ padding: '0.625rem 1rem', textAlign: 'right' }}>Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personnel.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        Henüz personel eklenmemiş
                                    </td>
                                </tr>
                            ) : (
                                personnel.map((person) => (
                                    <tr key={person.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '1.75rem',
                                                    height: '1.75rem',
                                                    borderRadius: '0.5rem',
                                                    backgroundColor: 'var(--muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid var(--card-border)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: 'var(--foreground)'
                                                }}>
                                                    {person.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--foreground)' }}>
                                                        {person.name}
                                                    </p>
                                                    <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                                                        {person.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                                            {person.username}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            <span style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                backgroundColor: person.role === 'admin' ? 'var(--foreground)' : 'var(--muted)',
                                                color: person.role === 'admin' ? 'var(--background)' : 'var(--foreground)',
                                                textTransform: 'uppercase'
                                            }}>
                                                {person.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                color: person.is_active ? 'var(--success)' : 'var(--muted-foreground)'
                                            }}>
                                                {person.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', position: 'relative' }}>
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === person.id ? null : person.id)}
                                                style={{
                                                    color: 'var(--muted-foreground)',
                                                    padding: '0.375rem',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '0.375rem'
                                                }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === person.id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    right: '1.5rem',
                                                    top: '100%',
                                                    backgroundColor: 'var(--card)',
                                                    border: '1px solid var(--card-border)',
                                                    borderRadius: '0.5rem',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    zIndex: 50,
                                                    minWidth: '140px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <button
                                                        onClick={() => openEditModal(person)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            width: '100%',
                                                            padding: '0.625rem 1rem',
                                                            fontSize: '0.8125rem',
                                                            color: 'var(--foreground)',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <Edit size={14} /> Düzenle
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteConfirm(person)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            width: '100%',
                                                            padding: '0.625rem 1rem',
                                                            fontSize: '0.8125rem',
                                                            color: 'rgb(239, 68, 68)',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <Trash2 size={14} /> Sil
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div style={{
                        backgroundColor: 'var(--card)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--card-border)',
                        width: '100%',
                        maxWidth: '480px',
                        margin: '1rem'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid var(--card-border)'
                        }}>
                            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>
                                {showAddModal ? 'Yeni Personel Ekle' : 'Personel Düzenle'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setShowEditModal(false);
                                    setSelectedPersonnel(null);
                                    resetForm();
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted-foreground)',
                                    padding: '0.25rem'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Name */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                    Ad Soyad *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="phase-input"
                                        style={{ paddingLeft: '2.5rem', height: '2.5rem' }}
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                    E-posta *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="phase-input"
                                        style={{ paddingLeft: '2.5rem', height: '2.5rem' }}
                                        placeholder="ornek@sirket.com"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                    Telefon
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="phase-input"
                                        style={{ paddingLeft: '2.5rem', height: '2.5rem' }}
                                        placeholder="0500 000 00 00"
                                    />
                                </div>
                            </div>

                            {/* Username & Role Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                        Kullanıcı Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="phase-input"
                                        style={{ height: '2.5rem' }}
                                        placeholder="kullaniciadi"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                        Rol
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                                        className="phase-input"
                                        style={{ height: '2.5rem' }}
                                    >
                                        <option value="user">Kullanıcı</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {/* Password */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                                    {showEditModal ? 'Şifre (Değiştirmek için doldurun)' : 'Şifre *'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="phase-input"
                                        style={{ paddingLeft: '2.5rem', height: '2.5rem' }}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {/* Nöbete Tabi */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                backgroundColor: 'var(--muted)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--card-border)'
                            }}>
                                <input
                                    type="checkbox"
                                    id="isOnDuty"
                                    checked={formData.isOnDuty}
                                    onChange={(e) => setFormData({ ...formData, isOnDuty: e.target.checked })}
                                    style={{
                                        width: '1.25rem',
                                        height: '1.25rem',
                                        cursor: 'pointer',
                                        accentColor: 'rgb(16, 185, 129)'
                                    }}
                                />
                                <label
                                    htmlFor="isOnDuty"
                                    style={{
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        color: 'var(--foreground)'
                                    }}
                                >
                                    Nöbete Tabi
                                    <span style={{
                                        display: 'block',
                                        fontSize: '0.6875rem',
                                        color: 'var(--muted-foreground)',
                                        marginTop: '0.125rem'
                                    }}>
                                        Bu personel nöbet çizelgesinde gösterilsin
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem',
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--card-border)'
                        }}>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setShowEditModal(false);
                                    setSelectedPersonnel(null);
                                    resetForm();
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    cursor: 'pointer'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={showAddModal ? handleAddPersonnel : handleUpdatePersonnel}
                                disabled={isSaving}
                                className="phase-button"
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    opacity: isSaving ? 0.7 : 1,
                                    cursor: isSaving ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSaving ? 'Kaydediliyor...' : (showAddModal ? 'Ekle' : 'Güncelle')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedPersonnel && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100
                }}>
                    <div style={{
                        backgroundColor: 'var(--card)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--card-border)',
                        width: '100%',
                        maxWidth: '400px',
                        margin: '1rem',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
                            Personeli Sil
                        </h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            <strong>{selectedPersonnel.name}</strong> isimli personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setSelectedPersonnel(null);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    cursor: 'pointer'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleDeletePersonnel}
                                disabled={isSaving}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    backgroundColor: 'rgb(239, 68, 68)',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    color: 'white',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    opacity: isSaving ? 0.7 : 1
                                }}
                            >
                                {isSaving ? 'Siliniyor...' : 'Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close dropdown */}
            {openMenuId && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setOpenMenuId(null)}
                />
            )}
        </div>
    );
};

export default StaffContent;
