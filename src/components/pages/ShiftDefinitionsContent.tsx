import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import {
    getAllShiftDefinitions,
    createShiftDefinition,
    updateShiftDefinition,
    deleteShiftDefinition
} from '../../services/shiftDefinitionsService';
import type { ShiftDefinition } from '../../services/shiftDefinitionsService';

interface ShiftDefinitionsContentProps {
    userRole: 'admin' | 'user';
}

const ShiftDefinitionsContent = ({ userRole }: ShiftDefinitionsContentProps) => {
    const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentShift, setCurrentShift] = useState<ShiftDefinition>({
        id: 0,
        code: '',
        name: '',
        shortName: '',
        startTime: '',
        endTime: '',
        color: '#ef4444',
        bgColor: '#fee2e2',
        duration: '',
        breakTime: '',
        description: '',
        overtime: { pzt: 0, sal: 0, car: 0, per: 0, cum: 0, cmt: 0, paz: 0 },
        holidayHours: 0,
        eveOfHolidayHours: 0,
        isActive: true
    });

    const dayLabels: { [key: string]: string } = { pzt: 'Pzt', sal: 'Sal', car: 'Çar', per: 'Per', cum: 'Cum', cmt: 'Cmt', paz: 'Paz' };

    // Fetch shift definitions on mount
    useEffect(() => {
        fetchShiftDefinitions();
    }, []);

    const fetchShiftDefinitions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllShiftDefinitions();
            setShifts(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Nöbet tanımları yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (shift: ShiftDefinition) => {
        setCurrentShift(shift);
        setEditMode(true);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setCurrentShift({
            id: 0,
            code: '',
            name: '',
            shortName: '',
            startTime: '',
            endTime: '',
            color: '#ef4444',
            bgColor: '#fee2e2',
            duration: '',
            breakTime: '',
            description: '',
            overtime: { pzt: 0, sal: 0, car: 0, per: 0, cum: 0, cmt: 0, paz: 0 },
            holidayHours: 0,
            eveOfHolidayHours: 0,
            isActive: true
        });
        setEditMode(false);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentShift.name || !currentShift.code || !currentShift.startTime || !currentShift.endTime) {
            alert('Lütfen zorunlu alanları doldurun (Kod, Ad, Başlangıç, Bitiş)');
            return;
        }

        setIsSaving(true);
        try {
            if (editMode) {
                const updated = await updateShiftDefinition(currentShift.id, currentShift);
                setShifts(shifts.map(s => s.id === updated.id ? updated : s));
            } else {
                const created = await createShiftDefinition(currentShift);
                setShifts([...shifts, created]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Kaydetme işlemi başarısız');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu nöbet tanımını silmek istediğinize emin misiniz?')) return;

        try {
            await deleteShiftDefinition(id);
            setShifts(shifts.filter(s => s.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Silme işlemi başarısız');
        }
    };

    const handleOvertimeChange = (day: string, value: string) => {
        setCurrentShift(prev => ({
            ...prev,
            overtime: { ...prev.overtime, [day]: parseFloat(value) || 0 }
        }));
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
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Nöbet Tanımları</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                        {shifts.length} tanım kayıtlı
                    </p>
                </div>
                {userRole === 'admin' && (
                    <button onClick={handleAddNew} className="phase-button">
                        <Plus size={14} /> Yeni Tanım
                    </button>
                )}
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
                                <th style={{ padding: '0.625rem 1rem' }}>Kod</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Nöbet Adı</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Saat Aralığı</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Süre</th>
                                <th style={{ padding: '0.625rem 1rem' }}>Haftalık Toplam FM</th>
                                {userRole === 'admin' && <th style={{ padding: '0.625rem 1rem', textAlign: 'right' }}>İşlemler</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        Henüz nöbet tanımı eklenmemiş
                                    </td>
                                </tr>
                            ) : (
                                shifts.map((shift) => {
                                    const totalOvertime = Object.values(shift.overtime || {}).reduce((acc, curr) => acc + curr, 0);
                                    return (
                                        <tr key={shift.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.75rem',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    backgroundColor: shift.bgColor || 'var(--muted)',
                                                    color: shift.color || 'var(--foreground)',
                                                    fontWeight: 600
                                                }}>
                                                    {shift.code}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontWeight: 500 }}>{shift.name}</td>
                                            <td style={{ padding: '0.5rem 1rem' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--muted-foreground)',
                                                    backgroundColor: 'var(--muted)',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    width: 'fit-content',
                                                    border: '1px solid var(--card-border)'
                                                }}>
                                                    <span>{shift.startTime}</span>
                                                    <ArrowRight size={10} />
                                                    <span>{shift.endTime}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{shift.duration}</td>
                                            <td style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)' }}>{totalOvertime > 0 ? `${totalOvertime} Saat` : '-'}</td>
                                            {userRole === 'admin' && (
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleEdit(shift)}
                                                            style={{ padding: '0.375rem', background: 'none', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', color: 'var(--muted-foreground)', transition: 'all 200ms' }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(shift.id)}
                                                            style={{ padding: '0.375rem', background: 'none', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', color: 'var(--muted-foreground)', transition: 'all 200ms' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="phase-card"
                        style={{ width: '100%', maxWidth: '32rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', backgroundColor: 'var(--background)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--muted)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.025em' }}>{editMode ? 'Tanımı Düzenle' : 'Yeni Nöbet Tanımı'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--muted-foreground)' }} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Code & Name */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Kod *</label>
                                    <input
                                        type="text"
                                        value={currentShift.code}
                                        onChange={(e) => setCurrentShift({ ...currentShift, code: e.target.value })}
                                        className="phase-input"
                                        placeholder="Örn: 08-16"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Nöbet Adı *</label>
                                    <input
                                        type="text"
                                        value={currentShift.name}
                                        onChange={(e) => setCurrentShift({ ...currentShift, name: e.target.value })}
                                        className="phase-input"
                                        placeholder="Örn: Gündüz"
                                    />
                                </div>
                            </div>

                            {/* Time Range */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Başlangıç *</label>
                                    <input
                                        type="time"
                                        value={currentShift.startTime}
                                        onChange={(e) => setCurrentShift({ ...currentShift, startTime: e.target.value })}
                                        className="phase-input"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Bitiş *</label>
                                    <input
                                        type="time"
                                        value={currentShift.endTime}
                                        onChange={(e) => setCurrentShift({ ...currentShift, endTime: e.target.value })}
                                        className="phase-input"
                                    />
                                </div>
                            </div>

                            {/* Colors */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Renk</label>
                                    <input
                                        type="color"
                                        value={currentShift.color}
                                        onChange={(e) => setCurrentShift({ ...currentShift, color: e.target.value })}
                                        style={{ width: '100%', height: '2.5rem', border: '1px solid var(--card-border)', borderRadius: '0.375rem', cursor: 'pointer' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Arka Plan Rengi</label>
                                    <input
                                        type="color"
                                        value={currentShift.bgColor}
                                        onChange={(e) => setCurrentShift({ ...currentShift, bgColor: e.target.value })}
                                        style={{ width: '100%', height: '2.5rem', border: '1px solid var(--card-border)', borderRadius: '0.375rem', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            {/* Daily Overtime */}
                            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--card-border)' }}>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Günlük Fazla Mesai Saatleri</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                                    {Object.entries(dayLabels).map(([key, label]) => (
                                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <label style={{ fontSize: '9px', color: 'var(--muted-foreground)', textAlign: 'center', textTransform: 'uppercase' }}>{label}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={currentShift.overtime?.[key as keyof typeof currentShift.overtime] || 0}
                                                onChange={(e) => handleOvertimeChange(key, e.target.value)}
                                                className="phase-input"
                                                style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.375rem' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--card-border)', backgroundColor: 'var(--muted)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>İptal</button>
                            <button
                                onClick={handleSave}
                                className="phase-button"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftDefinitionsContent;
