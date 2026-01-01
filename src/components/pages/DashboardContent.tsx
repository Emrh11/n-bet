
import { Activity, ArrowRight, Calendar, Clock, FileText, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllExchanges } from '../../services/exchangesService';
import { getAllPersonnel } from '../../services/personnelService';
import { getAllShiftDefinitions } from '../../services/shiftDefinitionsService';
import { getShiftsByMonth } from '../../services/shiftsService';
import { calculateStaffHakedis } from '../../utils/hakedisUtils';
import StatCard from '../ui/StatCard';
import type { ShiftAssignment } from './ShiftSchedulerContent';

interface DashboardProps {
    onNavigate?: (page: string) => void;
}

interface WeeklyShift {
    date: string;
    dayName: string;
    dayNumber: number;
    monthName: string;
    name: string;
    isToday: boolean;
}

const DashboardContent = ({ onNavigate }: DashboardProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPersonnel: 0,
        activePersonnel: 0,
        totalMonthlyOvertime: 0,
        myShiftsThisMonth: 0,
        pendingExchanges: 0
    });
    const [weeklyShifts, setWeeklyShifts] = useState<WeeklyShift[]>([]);
    const [myUpcomingShifts, setMyUpcomingShifts] = useState<{ date: string; shiftName: string }[]>([]);

    const currentUserId = Number(JSON.parse(localStorage.getItem('userData') || '{}')?.id) || 0;
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Get 5 days starting from today (bugün + 4 gün)
    const getWeekDates = () => {
        const dates: string[] = [];
        const now = new Date();
        for (let i = 0; i < 5; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch basic data first
                const [personnel, exchanges, shiftDefinitions] = await Promise.all([
                    getAllPersonnel(),
                    getAllExchanges(),
                    getAllShiftDefinitions()
                ]);

                // Get all relevant months for the 5-day window
                const weekDates = getWeekDates();
                const monthsToFetch = [...new Set(weekDates.map(d => {
                    const parts = d.split('-');
                    return `${parts[0]}-${parseInt(parts[1])}`;
                }))];

                // Fetch shifts for all relevant months
                const shiftResults = await Promise.all(
                    monthsToFetch.map(ym => {
                        const [y, m] = ym.split('-').map(Number);
                        return getShiftsByMonth(m, y);
                    })
                );
                const shifts = shiftResults.flat();

                // Toplam personel
                const totalPersonnel = personnel.length;
                const activePersonnel = personnel.filter(p => p.is_on_duty).length;

                // Haftalık nöbetler (5 gün)
                // Dynamically find Nöbet ID if possible, include YB (Yılbaşı) for holiday context
                const nobetDef = shiftDefinitions.find(d =>
                    d.name.toLowerCase().includes('nöbet') ||
                    d.shortName.toLowerCase() === 'n' ||
                    d.code.toLowerCase() === 'n' ||
                    d.shortName.toLowerCase() === 'yb' ||
                    d.code.toLowerCase() === 'yb' ||
                    d.name.toLowerCase().includes('yılbaşı')
                );
                const NOBET_ID = nobetDef ? nobetDef.id : 2;

                const weeklyShiftsList: WeeklyShift[] = weekDates.map(date => {
                    // Filter shifts for this date.
                    // Use includes for date matching to handle potential timestamp strings
                    let dayShifts = shifts.filter(s => s.date.includes(date) && Number(s.shift_definition_id) === NOBET_ID);

                    if (dayShifts.length === 0) {
                        dayShifts = shifts.filter(s => s.date.includes(date));
                    }

                    const personNames = dayShifts.map(s => {
                        const person = personnel.find(p => p.id === s.personnel_id);
                        return person?.name || 'Bilinmiyor';
                    });

                    const dateObj = new Date(date);

                    return {
                        date,
                        dayName: dayNames[dateObj.getDay()],
                        dayNumber: dateObj.getDate(),
                        monthName: monthNames[dateObj.getMonth()],
                        name: personNames.length > 0 ? personNames.join(', ') : 'Nöbetçi yok',
                        isToday: date === today
                    };
                });

                setWeeklyShifts(weeklyShiftsList);

                // Personelin Aylık Fazla Mesai Toplamı Hesaplama (Merkezi Hesaplama Kullan)
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonthNum = now.getMonth() + 1;
                const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

                // Shift'leri ShiftsMap formatına dönüştür
                const shiftsMap: { [date: string]: ShiftAssignment[] } = {};
                shifts.forEach(shift => {
                    const dateKey = shift.date.split('T')[0];
                    if (!shiftsMap[dateKey]) {
                        shiftsMap[dateKey] = [];
                    }
                    shiftsMap[dateKey].push({
                        id: shift.id,
                        staffId: shift.personnel_id,
                        shiftCode: shiftDefinitions.find(d => d.id === Number(shift.shift_definition_id))?.code || '',
                        shiftDefinitionId: Number(shift.shift_definition_id)
                    });
                });


                // Kullanıcının hakediş hesaplamasını yap
                const hakedis = calculateStaffHakedis(
                    currentUserId,
                    currentMonthNum,
                    currentYear,
                    shiftsMap,
                    shiftDefinitions
                );

                // Net Fazla Mesai = Toplam Fazla - Toplam Eksik
                const netFazlaMesai = hakedis.totalExcessHours - hakedis.totalMissingHours;

                // Bu ayki nöbetlerim
                const myShifts = shifts.filter(s =>
                    s.date.startsWith(currentMonthKey) &&
                    s.personnel_id === currentUserId &&
                    s.shift_definition_id === NOBET_ID
                );

                // Gelecek nöbetlerim (bugün ve sonrası)
                const upcomingShifts = shifts.filter(s =>
                    s.date >= today &&
                    s.personnel_id === currentUserId &&
                    s.shift_definition_id === NOBET_ID
                )
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 3)
                    .map(s => ({
                        date: s.date,
                        shiftName: 'Nöbet'
                    }));
                setMyUpcomingShifts(upcomingShifts);

                // Bekleyen değişim talepleri - BU AY ile sınırlamaya gerek yok, genel bekleyenler
                const pendingExchanges = exchanges.filter(e =>
                    e.status === 'pending' || e.status === 'target_approved'
                ).length;

                setStats({
                    totalPersonnel,
                    activePersonnel,
                    totalMonthlyOvertime: netFazlaMesai,
                    myShiftsThisMonth: myShifts.length,
                    pendingExchanges
                });

            } catch (err) {
                console.error('Dashboard verileri yüklenemedi:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [today, currentUserId]);

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.getDate(),
            month: monthNames[date.getMonth()],
            dayName: dayNames[date.getDay()]
        };
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem'
            }}>
                <StatCard
                    title="Toplam Personel"
                    value={String(stats.totalPersonnel)}
                    trend={`${stats.activePersonnel} aktif`}
                    trendUp={null}
                    icon={<Users size={18} />}
                />
                <StatCard
                    title="Aylık Fazla Mesai"
                    value={`${stats.totalMonthlyOvertime} Saat`}
                    trend="Bu ay"
                    trendUp={null}
                    icon={<Clock size={18} />}
                />
                <StatCard
                    title="Bu Ay Nöbetlerim"
                    value={String(stats.myShiftsThisMonth)}
                    trend={`${currentMonth}.ay`}
                    trendUp={null}
                    icon={<FileText size={18} />}
                />
                <StatCard
                    title="Bekleyen Talepler"
                    value={String(stats.pendingExchanges)}
                    trend="Değişim talebi"
                    trendUp={stats.pendingExchanges > 0 ? true : null}
                    icon={<Activity size={18} />}
                />
            </div>

            {/* Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '2rem'
            }}>
                {/* Weekly Shifts */}
                <div className="phase-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid var(--card-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(var(--muted), 0.1)'
                    }}>
                        <h3 style={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.025em' }}>
                            Nöbetçiler <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>(5 günlük)</span>
                        </h3>
                        <Clock size={14} style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                    <div style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {weeklyShifts.map((shift, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: shift.isToday
                                            ? '2px solid rgb(59, 130, 246)'
                                            : '1px solid var(--card-border)',
                                        backgroundColor: shift.isToday
                                            ? 'rgba(59, 130, 246, 0.1)'
                                            : 'rgba(var(--muted), 0.05)',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Today Badge */}
                                    {shift.isToday && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '8px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            backgroundColor: 'rgb(59, 130, 246)',
                                            color: 'white',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Bugün
                                        </span>
                                    )}

                                    {/* Date Box */}
                                    <div style={{
                                        flexShrink: 0,
                                        width: '3rem',
                                        height: '3rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: shift.isToday
                                            ? 'rgb(59, 130, 246)'
                                            : 'var(--background)',
                                        border: shift.isToday
                                            ? 'none'
                                            : '1px solid var(--card-border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: shift.isToday ? 'white' : 'var(--foreground)'
                                    }}>
                                        <span style={{
                                            fontSize: '8px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            opacity: shift.isToday ? 0.9 : 0.6,
                                            letterSpacing: '0.1em'
                                        }}>
                                            {shift.monthName}
                                        </span>
                                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{shift.dayNumber}</span>
                                    </div>

                                    {/* Day Name & Person */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontWeight: shift.isToday ? 600 : 500,
                                            fontSize: '0.875rem',
                                            color: shift.isToday ? 'rgb(59, 130, 246)' : 'var(--foreground)'
                                        }}>
                                            {shift.dayName}
                                        </p>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--muted-foreground)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {shift.name}
                                        </p>
                                    </div>

                                    {/* Status Badge */}
                                    {shift.name !== 'Nöbetçi yok' && (
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            backgroundColor: shift.isToday
                                                ? 'rgba(34, 197, 94, 0.15)'
                                                : 'rgba(var(--muted), 0.3)',
                                            color: shift.isToday
                                                ? 'rgb(34, 197, 94)'
                                                : 'var(--muted-foreground)',
                                            border: shift.isToday
                                                ? '1px solid rgba(34, 197, 94, 0.3)'
                                                : '1px solid var(--card-border)'
                                        }}>
                                            {shift.isToday ? 'Aktif' : 'Planlandı'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* My Upcoming Shifts */}
                    <div className="phase-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.025em' }}>Yaklaşan Nöbetlerim</h3>
                            <Calendar size={14} style={{ color: 'var(--muted-foreground)' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {myUpcomingShifts.length === 0 ? (
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                                    Bu ay nöbetiniz yok
                                </p>
                            ) : (
                                myUpcomingShifts.map((shift, i) => {
                                    const dateInfo = formatDate(shift.date);
                                    return (
                                        <div key={i} style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--card-border)',
                                            cursor: 'default',
                                            transition: 'background-color 200ms'
                                        }}>
                                            <div style={{
                                                flexShrink: 0,
                                                width: '2.5rem',
                                                height: '2.5rem',
                                                borderRadius: '0.5rem',
                                                backgroundColor: 'var(--background)',
                                                border: '1px solid var(--card-border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.1em' }}>
                                                    {dateInfo.month}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{dateInfo.day}</span>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ fontWeight: 500, fontSize: '0.875rem' }}>{dateInfo.dayName}</h4>
                                                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{shift.shiftName}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="phase-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.025em', marginBottom: '1rem' }}>Hızlı İşlemler</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                onClick={() => onNavigate?.('schedule')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--card-border)',
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}
                            >
                                <span>Nöbet Takvimi</span>
                                <ArrowRight size={14} />
                            </button>
                            <button
                                onClick={() => onNavigate?.('requests')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--card-border)',
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}
                            >
                                <span>Değişim Talepleri</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
