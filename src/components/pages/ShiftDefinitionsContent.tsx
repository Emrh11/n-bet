import { ArrowRight, ChevronDown, ChevronUp, Clock, Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DayHoursDetail, ShiftDefinition } from '../../services/shiftDefinitionsService';
import {
    createShiftDefinition,
    deleteShiftDefinition,
    getAllShiftDefinitions,
    updateShiftDefinition
} from '../../services/shiftDefinitionsService';

interface ShiftDefinitionsContentProps {
    userRole: 'admin' | 'user';
    isDarkMode?: boolean;
}

// Varsayılan gün saatleri
const getDefaultDayHours = (): { [key: string]: DayHoursDetail } => ({
    pzt: { before12: 0, after12: 0, expected: 8, mealDeduction: 2 },
    sal: { before12: 0, after12: 0, expected: 8, mealDeduction: 2 },
    car: { before12: 0, after12: 0, expected: 8, mealDeduction: 2 },
    per: { before12: 0, after12: 0, expected: 8, mealDeduction: 2 },
    cum: { before12: 0, after12: 0, expected: 8, mealDeduction: 0 },
    cmt: { before12: 0, after12: 0, expected: 0, mealDeduction: 0 },
    paz: { before12: 0, after12: 0, expected: 0, mealDeduction: 2 },
    tatil: { before12: 0, after12: 0, expected: 0, mealDeduction: 0 },
    arifesi: { before12: 0, after12: 0, expected: 4, mealDeduction: 0 }
});


const ShiftDefinitionsContent = ({ userRole, isDarkMode = false }: ShiftDefinitionsContentProps) => {
    const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

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
        dailyHours: getDefaultDayHours() as ShiftDefinition['dailyHours'],
        holidayHours: 0,
        eveOfHolidayHours: 0,
        isActive: true
    });

    const dayLabels: { [key: string]: string } = {
        pzt: 'Pazartesi',
        sal: 'Salı',
        car: 'Çarşamba',
        per: 'Perşembe',
        cum: 'Cuma',
        cmt: 'Cumartesi',
        paz: 'Pazar'
    };

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
        setCurrentShift({
            ...shift,
            dailyHours: shift.dailyHours || getDefaultDayHours() as ShiftDefinition['dailyHours']
        });
        setEditMode(true);
        setShowAdvanced(true); // Düzenlemede detayları göster
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
            dailyHours: getDefaultDayHours() as ShiftDefinition['dailyHours'],
            holidayHours: 0,
            eveOfHolidayHours: 0,
            isActive: true
        });
        setEditMode(false);
        setShowAdvanced(false);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentShift.name || !currentShift.code || !currentShift.startTime || !currentShift.endTime) {
            alert('Lütfen zorunlu alanları doldurun (Kod, Ad, Başlangıç, Bitiş)');
            return;
        }

        // Eski overtime formatını dailyHours'dan oluştur (geriye uyumluluk)
        const updatedOvertime = {
            pzt: currentShift.dailyHours.pzt.before12 + currentShift.dailyHours.pzt.after12,
            sal: currentShift.dailyHours.sal.before12 + currentShift.dailyHours.sal.after12,
            car: currentShift.dailyHours.car.before12 + currentShift.dailyHours.car.after12,
            per: currentShift.dailyHours.per.before12 + currentShift.dailyHours.per.after12,
            cum: currentShift.dailyHours.cum.before12 + currentShift.dailyHours.cum.after12,
            cmt: currentShift.dailyHours.cmt.before12 + currentShift.dailyHours.cmt.after12,
            paz: currentShift.dailyHours.paz.before12 + currentShift.dailyHours.paz.after12
        };

        const shiftToSave: ShiftDefinition = {
            ...currentShift,
            shortName: currentShift.code,
            overtime: updatedOvertime,
            holidayHours: currentShift.dailyHours.tatil.before12 + currentShift.dailyHours.tatil.after12,
            eveOfHolidayHours: currentShift.dailyHours.arifesi.before12 + currentShift.dailyHours.arifesi.after12
        };

        setIsSaving(true);
        try {
            if (editMode) {
                const updated = await updateShiftDefinition(shiftToSave.id, shiftToSave);
                setShifts(shifts.map(s => s.id === updated.id ? updated : s));
            } else {
                const created = await createShiftDefinition(shiftToSave);
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

    const handleDayHoursChange = (
        day: keyof ShiftDefinition['dailyHours'],
        field: keyof DayHoursDetail,
        value: string
    ) => {
        setCurrentShift(prev => ({
            ...prev,
            dailyHours: {
                ...prev.dailyHours,
                [day]: {
                    ...prev.dailyHours[day],
                    [field]: parseFloat(value) || 0
                }
            }
        }));
    };

    // Toplam fazla mesai hesapla
    const calculateTotalOvertime = (dh: ShiftDefinition['dailyHours']) => {
        const weekdays = ['pzt', 'sal', 'car', 'per', 'cum', 'cmt', 'paz'] as const;
        return weekdays.reduce((total, day) => {
            return total + dh[day].before12 + dh[day].after12;
        }, 0);
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
                                    const totalOvertime = shift.dailyHours
                                        ? calculateTotalOvertime(shift.dailyHours)
                                        : Object.values(shift.overtime || {}).reduce((acc, curr) => acc + curr, 0);
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
            {isModalOpen && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 1rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        overflowY: 'auto'
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="phase-card thin-scrollbar"
                        style={{
                            width: '100%',
                            maxWidth: '56rem',
                            maxHeight: 'calc(100vh - 4rem)',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            backgroundColor: 'var(--card)',
                            margin: 'auto'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDarkMode ? '#000000' : 'rgba(var(--muted), 0.3)', flexShrink: 0 }}>
                            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.025em' }}>{editMode ? '✏️ Tanımı Düzenle' : '➕ Yeni Nöbet Tanımı'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><X size={18} style={{ color: 'var(--muted-foreground)' }} /></button>
                        </div>

                        {/* Modal Content - scrollable */}
                        <div style={{
                            padding: '1rem',
                            overflowY: 'auto',
                            flexGrow: 1
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Code & Name */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Kod *</label>
                                        <input
                                            type="text"
                                            value={currentShift.code}
                                            onChange={(e) => setCurrentShift({ ...currentShift, code: e.target.value })}
                                            className="phase-input"
                                            placeholder="Örn: N"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Nöbet Adı *</label>
                                        <input
                                            type="text"
                                            value={currentShift.name}
                                            onChange={(e) => setCurrentShift({ ...currentShift, name: e.target.value })}
                                            className="phase-input"
                                            placeholder="Örn: Nöbet"
                                        />
                                    </div>
                                </div>

                                {/* Time Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Başlangıç Saati *</label>
                                        <input
                                            type="time"
                                            value={currentShift.startTime}
                                            onChange={(e) => setCurrentShift({ ...currentShift, startTime: e.target.value })}
                                            className="phase-input"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Bitiş Saati *</label>
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
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Yazı Rengi</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="color"
                                                value={currentShift.color}
                                                onChange={(e) => setCurrentShift({ ...currentShift, color: e.target.value })}
                                                style={{ width: '2.5rem', height: '2.5rem', padding: '2px', border: '1px solid var(--card-border)', borderRadius: '0.375rem', cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={currentShift.color}
                                                onChange={(e) => setCurrentShift({ ...currentShift, color: e.target.value })}
                                                className="phase-input"
                                                style={{ flex: 1, fontFamily: 'monospace' }}
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Arka Plan Rengi</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="color"
                                                value={currentShift.bgColor}
                                                onChange={(e) => setCurrentShift({ ...currentShift, bgColor: e.target.value })}
                                                style={{ width: '2.5rem', height: '2.5rem', padding: '2px', border: '1px solid var(--card-border)', borderRadius: '0.375rem', cursor: 'pointer' }}
                                            />
                                            <input
                                                type="text"
                                                value={currentShift.bgColor}
                                                onChange={(e) => setCurrentShift({ ...currentShift, bgColor: e.target.value })}
                                                className="phase-input"
                                                style={{ flex: 1, fontFamily: 'monospace' }}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Settings Toggle */}
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        backgroundColor: 'var(--muted)',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        color: 'var(--foreground)',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={16} style={{ color: 'var(--muted-foreground)' }} />
                                        <span>Detaylı Hakediş Ayarları</span>
                                    </div>
                                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {/* Detailed Daily Hours Table */}
                                {showAdvanced && (
                                    <div style={{
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--card-border)',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Info Banner */}
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            borderBottom: '1px solid var(--card-border)',
                                            fontSize: '0.75rem',
                                            color: 'var(--muted-foreground)'
                                        }}>
                                            💡 <strong>İpucu:</strong> Her gün için 12:00 öncesi ve sonrası fazla mesai saatlerini ve beklenen çalışma süresini girin.
                                            Toplam otomatik hesaplanır.
                                        </div>

                                        {/* Table */}
                                        <div className="thin-scrollbar" style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: 'var(--muted)' }}>
                                                        <th style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--card-border)', minWidth: '100px' }}>Gün</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--card-border)', minWidth: '80px' }}>12:00 Öncesi</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--card-border)', minWidth: '80px' }}>12:00 Sonrası</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'rgb(59, 130, 246)', borderBottom: '1px solid var(--card-border)', minWidth: '80px', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>Beklenen</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'rgb(239, 68, 68)', borderBottom: '1px solid var(--card-border)', minWidth: '70px', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>Fazla Mesai</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'rgb(249, 115, 22)', borderBottom: '1px solid var(--card-border)', minWidth: '70px', backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>Kesinti</th>
                                                        <th style={{ padding: '0.625rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', color: 'rgb(34, 197, 94)', borderBottom: '1px solid var(--card-border)', minWidth: '60px', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(['pzt', 'sal', 'car', 'per', 'cum', 'cmt', 'paz', 'tatil', 'arifesi'] as const).map((day, idx) => {
                                                        const dayData = currentShift.dailyHours[day];
                                                        const total = (dayData?.before12 || 0) + (dayData?.after12 || 0);
                                                        const expected = dayData?.expected || 0;
                                                        const mealDeduction = dayData?.mealDeduction || 0;
                                                        const brutFM = total; // Brüt fazla mesai = toplam çalışma
                                                        const netFM = Math.max(0, brutFM - mealDeduction); // Net = Brüt - Kesinti
                                                        const isWeekend = day === 'cmt' || day === 'paz';
                                                        const isHolidayField = day === 'tatil' || day === 'arifesi';

                                                        return (
                                                            <tr
                                                                key={day}
                                                                style={{
                                                                    borderBottom: '1px solid var(--card-border)',
                                                                    backgroundColor: isHolidayField
                                                                        ? 'rgba(59, 130, 246, 0.05)'
                                                                        : isWeekend
                                                                            ? 'rgba(239, 68, 68, 0.05)'
                                                                            : idx % 2 === 0 ? 'transparent' : 'var(--muted)'
                                                                }}
                                                            >
                                                                <td style={{
                                                                    padding: '0.375rem 0.75rem',
                                                                    fontWeight: 500,
                                                                    color: isHolidayField ? 'rgb(59, 130, 246)' : isWeekend ? 'rgb(239, 68, 68)' : 'var(--foreground)',
                                                                    fontSize: '0.7rem'
                                                                }}>
                                                                    {day === 'tatil' ? 'Bayram' : day === 'arifesi' ? 'Arife' : dayLabels[day]}
                                                                </td>
                                                                <td style={{ padding: '0.25rem 0.5rem' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.5"
                                                                        value={dayData?.before12 || 0}
                                                                        onChange={(e) => handleDayHoursChange(day, 'before12', e.target.value)}
                                                                        className="phase-input"
                                                                        style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.375rem' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '0.25rem 0.5rem' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.5"
                                                                        value={dayData?.after12 || 0}
                                                                        onChange={(e) => handleDayHoursChange(day, 'after12', e.target.value)}
                                                                        className="phase-input"
                                                                        style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.375rem' }}
                                                                    />
                                                                </td>
                                                                {/* Beklenen */}
                                                                <td style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.5"
                                                                        value={expected}
                                                                        onChange={(e) => handleDayHoursChange(day, 'expected', e.target.value)}
                                                                        className="phase-input"
                                                                        style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.375rem', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                                                                    />
                                                                </td>
                                                                {/* Brüt FM */}
                                                                <td style={{
                                                                    padding: '0.5rem',
                                                                    textAlign: 'center',
                                                                    fontWeight: 700,
                                                                    color: brutFM > 0 ? 'rgb(239, 68, 68)' : 'var(--muted-foreground)',
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                                    fontSize: '0.7rem'
                                                                }}>
                                                                    {brutFM > 0 ? `${brutFM}s` : '-'}
                                                                </td>
                                                                {/* Kesinti (Yemek) */}
                                                                <td style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.5"
                                                                        value={mealDeduction}
                                                                        onChange={(e) => handleDayHoursChange(day, 'mealDeduction', e.target.value)}
                                                                        className="phase-input"
                                                                        style={{ textAlign: 'center', fontSize: '0.75rem', padding: '0.375rem', backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
                                                                    />
                                                                </td>
                                                                {/* Net FM */}
                                                                <td style={{
                                                                    padding: '0.5rem',
                                                                    textAlign: 'center',
                                                                    fontWeight: 700,
                                                                    color: netFM > 0 ? 'rgb(34, 197, 94)' : 'var(--muted-foreground)',
                                                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                                    fontSize: '0.7rem'
                                                                }}>
                                                                    {netFM > 0 ? `+${netFM}s` : '-'}
                                                                </td>
                                                            </tr>

                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--card-border)', backgroundColor: isDarkMode ? '#000000' : 'rgba(var(--muted), 0.3)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>

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
                </div>,
                document.body
            )
            }
        </div >
    );
};

export default ShiftDefinitionsContent;
