import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Filter, X, Trash2, Wand2, Loader2 } from 'lucide-react';
import { getAllShiftDefinitions } from '../../services/shiftDefinitionsService';
import { getAllPersonnel } from '../../services/personnelService';
import { getShiftsByMonth, createShift, deleteShift, createBulkShifts, clearMonthShifts } from '../../services/shiftsService';
import type { ShiftDefinition } from '../../services/shiftDefinitionsService';
import type { Personnel } from '../../services/personnelService';
import type { ShiftAPI } from '../../services/shiftsService';

interface ShiftAssignment {
    id?: number;
    staffId: number;
    shiftCode: string;
    shiftDefinitionId?: number | null;
}

interface ShiftsMap {
    [date: string]: ShiftAssignment[];
}

interface ShiftSchedulerContentProps {
    userRole: 'admin' | 'user';
}

const ShiftSchedulerContent = ({ userRole }: ShiftSchedulerContentProps) => {
    const [shiftDefinitions, setShiftDefinitions] = useState<ShiftDefinition[]>([]);
    const [staffList, setStaffList] = useState<Personnel[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState<ShiftsMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedShiftType, setSelectedShiftType] = useState('');

    // Fetch shift definitions and personnel from API
    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                const [definitions, personnel] = await Promise.all([
                    getAllShiftDefinitions(),
                    getAllPersonnel()
                ]);
                setShiftDefinitions(definitions);
                // Sadece nöbete tabi olan personelleri göster (is_on_duty = 1 veya true)
                const onDutyPersonnel = personnel.filter(p => Boolean(p.is_on_duty));
                setStaffList(onDutyPersonnel);
                if (definitions.length > 0) {
                    setSelectedShiftType(definitions[0].code);
                }
            } catch (err) {
                console.error('Data yüklenemedi:', err);
            }
        };
        fetchBaseData();
    }, []);

    // Fetch shifts when month changes
    useEffect(() => {
        const fetchShifts = async () => {
            setIsLoading(true);
            try {
                const month = currentDate.getMonth() + 1;
                const year = currentDate.getFullYear();
                const shiftsData = await getShiftsByMonth(month, year);

                // Transform API data to ShiftsMap format
                const shiftsMap: ShiftsMap = {};
                shiftsData.forEach((shift: ShiftAPI) => {
                    const dateStr = shift.date;
                    if (!shiftsMap[dateStr]) {
                        shiftsMap[dateStr] = [];
                    }
                    shiftsMap[dateStr].push({
                        id: shift.id,
                        staffId: shift.personnel_id,
                        shiftCode: shift.short_name || 'N',
                        shiftDefinitionId: shift.shift_definition_id
                    });
                });
                setShifts(shiftsMap);
            } catch (err) {
                console.error('Shifts yüklenemedi:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchShifts();
    }, [currentDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

    const getDayName = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayNames = ['PAZ', 'PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT'];
        return dayNames[date.getDay()];
    };

    const getDayColor = (dayName: string) => {
        if (dayName === 'CMT' || dayName === 'PAZ') return 'rgb(239, 68, 68)';
        return 'var(--muted-foreground)';
    };

    const handleCellClick = (staffId: number, day: number) => {
        if (userRole !== 'admin') return;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedStaffId(staffId);
        setSelectedDate(dateStr);
        setIsModalOpen(true);
    };

    const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const handleAddShift = async () => {
        if (!selectedDate || !selectedStaffId || !selectedShiftType) return;

        // Find the shift definition to get its ID
        const shiftDef = shiftDefinitions.find(d => d.code === selectedShiftType);
        const NOBET_ID = 2;
        const NOBET_ERTESI_ID = 3;

        setIsSaving(true);
        try {
            // Check if shift already exists
            const currentDayShifts = shifts[selectedDate] || [];
            const existingShift = currentDayShifts.find(s => s.staffId === selectedStaffId && s.shiftCode === selectedShiftType);

            if (existingShift && existingShift.id) {
                // Delete existing shift
                await deleteShift(existingShift.id);
                setShifts(prev => {
                    const newState = { ...prev };
                    const newShifts = (newState[selectedDate] || []).filter(s => s.id !== existingShift.id);
                    if (newShifts.length === 0) {
                        delete newState[selectedDate];
                    } else {
                        newState[selectedDate] = newShifts;
                    }
                    return newState;
                });
            } else {
                // Create new shift
                const newShift = await createShift({
                    personnel_id: selectedStaffId,
                    shift_definition_id: shiftDef?.id || null,
                    date: selectedDate,
                    shift_type: 'full',
                    status: 'scheduled'
                });

                // Update local state
                setShifts(prev => {
                    const newState = { ...prev };
                    const dayShifts = newState[selectedDate] || [];
                    newState[selectedDate] = [...dayShifts, {
                        id: newShift.id,
                        staffId: newShift.personnel_id,
                        shiftCode: newShift.short_name || selectedShiftType,
                        shiftDefinitionId: newShift.shift_definition_id
                    }];
                    return newState;
                });

                // Eğer ana nöbet (ID 2) eklendiyse, ertesi güne nöbet ertesi (ID 3) ekle
                if (shiftDef?.id === NOBET_ID) {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    const nextDay = new Date(y, m - 1, d + 1);
                    const nextDateStr = formatDate(nextDay);

                    // Ertesi gün zaten nöbet ertesi var mı kontrol et
                    const nextDayShifts = shifts[nextDateStr] || [];
                    const hasNobetErtesi = nextDayShifts.some(s => s.staffId === selectedStaffId && s.shiftDefinitionId === NOBET_ERTESI_ID);

                    if (!hasNobetErtesi) {
                        const nobetErtesiShift = await createShift({
                            personnel_id: selectedStaffId,
                            shift_definition_id: NOBET_ERTESI_ID,
                            date: nextDateStr,
                            shift_type: 'full',
                            status: 'scheduled'
                        });

                        setShifts(prev => {
                            const newState = { ...prev };
                            const nextShifts = newState[nextDateStr] || [];
                            newState[nextDateStr] = [...nextShifts, {
                                id: nobetErtesiShift.id,
                                staffId: nobetErtesiShift.personnel_id,
                                shiftCode: nobetErtesiShift.short_name || 'NE',
                                shiftDefinitionId: nobetErtesiShift.shift_definition_id
                            }];
                            return newState;
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Nöbet eklenirken hata:', err);
            alert('Nöbet eklenirken hata oluştu');
        } finally {
            setIsSaving(false);
        }

        setIsModalOpen(false);
    };

    const handleRemoveShiftFromModal = async (staffId: number, shiftCode: string, date: string, shiftId?: number) => {
        if (!shiftId) {
            // Local only removal (for shifts without ID)
            setShifts(prev => {
                const newState = { ...prev };
                const dayShifts = newState[date] || [];
                const newShifts = dayShifts.filter(s => !(s.staffId === staffId && s.shiftCode === shiftCode));
                if (newShifts.length === 0) {
                    delete newState[date];
                } else {
                    newState[date] = newShifts;
                }
                return newState;
            });
            setIsModalOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            await deleteShift(shiftId);
            setShifts(prev => {
                const newState = { ...prev };
                const dayShifts = newState[date] || [];
                const newShifts = dayShifts.filter(s => s.id !== shiftId);
                if (newShifts.length === 0) {
                    delete newState[date];
                } else {
                    newState[date] = newShifts;
                }
                return newState;
            });
        } catch (err) {
            console.error('Nöbet silinirken hata:', err);
            alert('Nöbet silinirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
        setIsModalOpen(false);
    };

    const handleAutoDistribute = async () => {
        if (staffList.length === 0) {
            alert('Nöbete tabi personel bulunamadı');
            return;
        }

        const confirmed = confirm('Bu ay için tüm nöbetler silinip yeniden dağıtılacak. Devam etmek istiyor musunuz?');
        if (!confirmed) return;

        setIsSaving(true);
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const daysInMonth = getDaysInMonth(currentDate);

            // Nöbet tanımları: ID 2 = Nöbet, ID 3 = Nöbet Ertesi
            const NOBET_ID = 2;
            const NOBET_ERTESI_ID = 3;

            // Önceki ayın son gününde kim nöbetçiydi bul - API'den çek
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
            const prevLastDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevMonthDays).padStart(2, '0')}`;

            // Önceki ayın nöbetlerini API'den çek
            let startingStaffIndex = 0;
            try {
                const prevMonthShifts = await getShiftsByMonth(prevMonth, prevYear);
                // Son günde nöbet tutan kişiyi bul
                const lastDayShift = prevMonthShifts.find(
                    (s: ShiftAPI) => s.date === prevLastDateStr && s.shift_definition_id === NOBET_ID
                );

                if (lastDayShift) {
                    const lastStaffIndex = staffList.findIndex(staff => staff.id === lastDayShift.personnel_id);
                    if (lastStaffIndex >= 0) {
                        // Bir sonraki kişiden başla
                        startingStaffIndex = (lastStaffIndex + 1) % staffList.length;
                    }
                }
            } catch (err) {
                console.log('Önceki ay verileri alınamadı, ilk kişiden başlanacak');
            }

            // Önce mevcut ayın nöbetlerini sil
            await clearMonthShifts(month, year);

            // Tüm atamaları hazırla
            const shiftsToCreate: { personnel_id: number; shift_definition_id: number; date: string; shift_type: string; status: string }[] = [];

            // Önceki ayın son nöbetçisinin bu ayın 1. günü nöbet ertesi olması gerekiyor
            if (startingStaffIndex > 0 || staffList.length === 1) {
                // startingStaffIndex > 0 ise önceki ayda nöbetçi vardı demek
                // O kişinin index'i startingStaffIndex - 1
                const prevStaffIndex = startingStaffIndex === 0 ? staffList.length - 1 : startingStaffIndex - 1;
                const prevStaff = staffList[prevStaffIndex];
                const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;

                shiftsToCreate.push({
                    personnel_id: prevStaff.id,
                    shift_definition_id: NOBET_ERTESI_ID,
                    date: firstDayStr,
                    shift_type: 'full',
                    status: 'scheduled'
                });
            }

            let staffIndex = startingStaffIndex;

            for (let day = 1; day <= daysInMonth; day++) {
                const currentStaff = staffList[staffIndex];
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                // Nöbet ata
                shiftsToCreate.push({
                    personnel_id: currentStaff.id,
                    shift_definition_id: NOBET_ID,
                    date: dateStr,
                    shift_type: 'full',
                    status: 'scheduled'
                });

                // Ertesi gün için Nöbet Ertesi ata
                const nextDay = new Date(year, month - 1, day + 1);
                const nextDateStr = formatDate(nextDay);

                shiftsToCreate.push({
                    personnel_id: currentStaff.id,
                    shift_definition_id: NOBET_ERTESI_ID,
                    date: nextDateStr,
                    shift_type: 'full',
                    status: 'scheduled'
                });

                staffIndex = (staffIndex + 1) % staffList.length;
            }

            // Toplu ekleme yap
            await createBulkShifts(shiftsToCreate);

            // Güncel verileri yeniden çek
            const refreshedShifts = await getShiftsByMonth(month, year);
            const shiftsMap: ShiftsMap = {};
            refreshedShifts.forEach((shift: ShiftAPI) => {
                const dateStr = shift.date;
                if (!shiftsMap[dateStr]) {
                    shiftsMap[dateStr] = [];
                }
                shiftsMap[dateStr].push({
                    id: shift.id,
                    staffId: shift.personnel_id,
                    shiftCode: shift.short_name || 'N',
                    shiftDefinitionId: shift.shift_definition_id
                });
            });
            setShifts(shiftsMap);

            alert('Nöbetler başarıyla dağıtıldı!');
        } catch (err) {
            console.error('Otomatik dağıtım hatası:', err);
            alert('Nöbet dağıtımı sırasında hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    // Ayın tüm nöbetlerini temizle
    const handleClearMonth = async () => {
        const confirmed = confirm(`${monthName} ayındaki tüm nöbetler silinecek. Devam etmek istiyor musunuz?`);
        if (!confirmed) return;

        setIsSaving(true);
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            await clearMonthShifts(month, year);
            setShifts({});

            alert('Tüm nöbetler silindi!');
        } catch (err) {
            console.error('Nöbetler silinirken hata:', err);
            alert('Nöbetler silinirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const getStaffShiftsForDay = (staffId: number, day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return (shifts[dateStr] || []).filter(s => s.staffId === staffId);
    };

    const calculateMonthlyTotal = (staffId: number) => {
        let total = 0;
        for (let day = 1; day <= days; day++) {
            const dayShifts = getStaffShiftsForDay(staffId, day);
            const dayName = getDayName(day);
            dayShifts.forEach(shift => {
                const shiftDef = shiftDefinitions.find(d => d.code === shift.shiftCode);
                if (shiftDef && shiftDef.overtime) {
                    const dayKeyMap: { [key: string]: keyof typeof shiftDef.overtime } = {
                        'PZT': 'pzt', 'SAL': 'sal', 'ÇAR': 'car', 'PER': 'per', 'CUM': 'cum', 'CMT': 'cmt', 'PAZ': 'paz'
                    };
                    const dayKey = dayKeyMap[dayName];
                    if (dayKey) {
                        total += shiftDef.overtime[dayKey] || 0;
                    }
                }
            });
        }
        return total;
    };

    const existingShiftsForSelection = selectedDate && selectedStaffId
        ? (shifts[selectedDate] || []).filter(s => s.staffId === selectedStaffId)
        : [];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--card-border)'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar style={{ color: 'var(--muted-foreground)' }} size={20} />
                        Nöbet Çizelgesi
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>Aylık personel nöbet dağılımını görüntüleyin.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Month Navigator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '0.5rem',
                        padding: '0.25rem'
                    }}>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                            style={{
                                padding: '0.375rem',
                                background: 'none',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                color: 'var(--muted-foreground)',
                                transition: 'all 200ms'
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ padding: '0 1rem', fontSize: '0.875rem', fontWeight: 500, minWidth: '140px', textAlign: 'center', textTransform: 'capitalize' }}>{monthName}</span>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                            style={{
                                padding: '0.375rem',
                                background: 'none',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                color: 'var(--muted-foreground)',
                                transition: 'all 200ms'
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {userRole === 'admin' && (
                        <button
                            onClick={handleAutoDistribute}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                backgroundColor: 'var(--muted)',
                                border: '1px solid var(--card-border)',
                                cursor: 'pointer',
                                color: 'var(--foreground)',
                                transition: 'all 200ms'
                            }}
                        >
                            <Wand2 size={14} /> Otomatik Dağıt
                        </button>
                    )}
                    {userRole === 'admin' && (
                        <button
                            onClick={handleClearMonth}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                cursor: 'pointer',
                                color: 'rgb(239, 68, 68)',
                                transition: 'all 200ms'
                            }}
                        >
                            <Trash2 size={14} /> Ayı Temizle
                        </button>
                    )}
                    <button className="phase-button">
                        <Download size={14} /> Excel
                    </button>
                </div>
            </div>

            {/* Schedule Table */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'rgba(var(--muted), 0.2)' }}>
                                <th style={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 20,
                                    backgroundColor: 'var(--background)',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    color: 'var(--muted-foreground)',
                                    borderRight: '1px solid var(--card-border)',
                                    minWidth: '180px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Filter size={12} style={{ color: 'var(--muted-foreground)' }} />
                                        PERSONEL LİSTESİ
                                    </div>
                                </th>
                                {Array.from({ length: days }).map((_, i) => {
                                    const day = i + 1;
                                    const dayName = getDayName(day);
                                    return (
                                        <th key={day} style={{
                                            padding: '0.5rem 0.375rem',
                                            textAlign: 'center',
                                            minWidth: '45px',
                                            borderRight: '1px solid var(--card-border)',
                                            backgroundColor: 'var(--background)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: getDayColor(dayName) }}>{dayName}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--foreground)' }}>{day}</span>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th style={{
                                    position: 'sticky',
                                    right: 0,
                                    zIndex: 20,
                                    backgroundColor: 'var(--background)',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    color: 'var(--muted-foreground)',
                                    borderLeft: '1px solid var(--card-border)',
                                    minWidth: '60px'
                                }}>
                                    TOP.
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map((staff: Personnel, idx: number) => (
                                <tr key={staff.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: 'var(--background)',
                                        padding: '0.5rem 1rem',
                                        borderRight: '1px solid var(--card-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted-foreground)', width: '1rem' }}>{idx}</span>
                                            <div style={{
                                                width: '1.75rem',
                                                height: '1.75rem',
                                                borderRadius: '0.375rem',
                                                border: '1px solid var(--card-border)',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}>
                                                <img src={staff.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.name}`} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <span style={{ fontWeight: 500, fontSize: '0.65rem', color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{staff.name}</span>
                                        </div>
                                    </td>
                                    {Array.from({ length: days }).map((_, i) => {
                                        const day = i + 1;
                                        const dayShifts = getStaffShiftsForDay(staff.id, day);
                                        const dayName = getDayName(day);
                                        const isWeekend = dayName === 'CMT' || dayName === 'PAZ';
                                        const isToday = day === 19;

                                        return (
                                            <td
                                                key={day}
                                                onClick={() => handleCellClick(staff.id, day)}
                                                style={{
                                                    padding: '0.125rem',
                                                    textAlign: 'center',
                                                    borderRight: '1px solid var(--card-border)',
                                                    transition: 'all 200ms',
                                                    cursor: userRole === 'admin' ? 'pointer' : 'default',
                                                    backgroundColor: isToday ? 'rgba(59, 130, 246, 0.1)' : isWeekend ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                                    borderColor: isToday ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.125rem', minHeight: '32px' }}>
                                                    {dayShifts.map((shift, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '0.125rem 0.375rem',
                                                                borderRadius: '0.25rem',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                backgroundColor: shift.shiftCode === 'N' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                                color: shift.shiftCode === 'N' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                                                                border: `1px solid ${shift.shiftCode === 'N' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                                            }}
                                                        >
                                                            {shift.shiftCode}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td style={{
                                        position: 'sticky',
                                        right: 0,
                                        zIndex: 10,
                                        backgroundColor: 'var(--background)',
                                        padding: '0.5rem 1rem',
                                        textAlign: 'center',
                                        borderLeft: '1px solid var(--card-border)'
                                    }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--foreground)' }}>{calculateMonthlyTotal(staff.id)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="phase-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1.5rem' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Gösterim:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: 'rgb(239, 68, 68)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>N</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Nöbet</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: 'rgb(16, 185, 129)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>NE</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Nöbet Ertesi</span>
                </div>
                <div style={{ height: '1rem', width: '1px', backgroundColor: 'var(--card-border)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '1.25rem', height: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.25rem' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Hafta Sonu</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '1.25rem', height: '1.25rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '0.25rem' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Bugün</span>
                </div>
            </div>

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
                        style={{ width: '100%', maxWidth: '24rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', backgroundColor: 'var(--background)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(var(--muted), 0.3)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '0.875rem' }}>Nöbet Ekle/Çıkar</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--muted-foreground)' }} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Tarih: <span style={{ fontFamily: 'monospace', color: 'var(--foreground)' }}>{selectedDate}</span></p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Personel: <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{staffList.find((s: Personnel) => s.id === selectedStaffId)?.name}</span></p>
                            </div>

                            {existingShiftsForSelection.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Mevcut Atamalar</label>
                                    {existingShiftsForSelection.map((s, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(var(--muted), 0.2)', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--card-border)' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{s.shiftCode}</span>
                                            <button
                                                onClick={() => handleRemoveShiftFromModal(s.staffId, s.shiftCode, selectedDate!, s.id)}
                                                style={{ color: 'rgb(239, 68, 68)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Nöbet Tipi Ekle</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {shiftDefinitions.map(def => (
                                        <button
                                            key={def.code}
                                            onClick={() => setSelectedShiftType(def.code)}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                borderRadius: '0.25rem',
                                                border: `1px solid ${selectedShiftType === def.code ? 'rgba(16, 185, 129, 0.5)' : 'var(--card-border)'}`,
                                                backgroundColor: selectedShiftType === def.code ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                color: selectedShiftType === def.code ? 'rgb(16, 185, 129)' : 'var(--foreground)',
                                                cursor: 'pointer',
                                                transition: 'all 200ms'
                                            }}
                                        >
                                            {def.code}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSelectedShiftType('NE')}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            borderRadius: '0.25rem',
                                            border: `1px solid ${selectedShiftType === 'NE' ? 'rgba(16, 185, 129, 0.5)' : 'var(--card-border)'}`,
                                            backgroundColor: selectedShiftType === 'NE' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                            color: selectedShiftType === 'NE' ? 'rgb(16, 185, 129)' : 'var(--foreground)',
                                            cursor: 'pointer',
                                            transition: 'all 200ms'
                                        }}
                                    >
                                        Nöbet Ertesi (NE)
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--card-border)', backgroundColor: 'rgba(var(--muted), 0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                İptal
                            </button>
                            <button onClick={handleAddShift} className="phase-button" style={{ padding: '0.375rem 1rem', fontSize: '0.75rem' }}>Ekle</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftSchedulerContent;
