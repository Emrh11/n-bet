import { useState, useEffect } from 'react';
import { Plus, X, Check, XCircle, Trash2, Calendar, Users, RefreshCw, Loader2 } from 'lucide-react';
import { getAllExchanges, createExchange, approveExchange, rejectExchange, deleteExchange } from '../../services/exchangesService';
import { getShiftsByMonth } from '../../services/shiftsService';
import { getAllPersonnel } from '../../services/personnelService';
import type { ShiftExchangeAPI } from '../../services/exchangesService';
import type { ShiftAPI } from '../../services/shiftsService';
import type { Personnel } from '../../services/personnelService';

interface ShiftChangeContentProps {
    userRole: 'admin' | 'user';
}

const ShiftChangeContent = ({ userRole }: ShiftChangeContentProps) => {
    const [exchanges, setExchanges] = useState<ShiftExchangeAPI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [myShifts, setMyShifts] = useState<ShiftAPI[]>([]);
    const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
    const [exchangeType, setExchangeType] = useState<'mutual' | 'transfer'>('mutual');
    const [targetPersonId, setTargetPersonId] = useState<number | null>(null);
    const [targetShiftId, setTargetShiftId] = useState<number | null>(null);
    const [targetPersonShifts, setTargetPersonShifts] = useState<ShiftAPI[]>([]);

    // Current user - ensure it's a number for proper comparison
    const currentUserId = Number(JSON.parse(localStorage.getItem('userData') || '{}')?.id) || 0;

    // Fetch exchanges
    const fetchExchanges = async () => {
        setIsLoading(true);
        try {
            const data = await getAllExchanges();
            setExchanges(data);
        } catch (err) {
            console.error('Talepler yüklenemedi:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExchanges();
    }, []);

    // Modal açıldığında kullanıcının nöbetlerini ve personel listesini çek
    const openNewRequestModal = async () => {
        setIsModalOpen(true);
        setSelectedShiftId(null);
        setExchangeType('mutual');
        setTargetPersonId(null);
        setTargetShiftId(null);
        setTargetPersonShifts([]);

        try {
            // Get current and next month shifts for current user
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

            const [currentMonthShifts, nextMonthShifts, personnel] = await Promise.all([
                getShiftsByMonth(currentMonth, currentYear),
                getShiftsByMonth(nextMonth, nextYear),
                getAllPersonnel()
            ]);

            // Filter only my shifts (exclude nöbet ertesi - ID 3)
            const NOBET_ERTESI_ID = 3;
            const allShifts = [...currentMonthShifts, ...nextMonthShifts];
            const myOnlyShifts = allShifts.filter((s: ShiftAPI) =>
                s.personnel_id === currentUserId && s.shift_definition_id !== NOBET_ERTESI_ID
            );
            setMyShifts(myOnlyShifts);
            setAllPersonnel(personnel.filter(p => p.id !== currentUserId && p.is_on_duty));
        } catch (err) {
            console.error('Veriler yüklenemedi:', err);
        }
    };

    // Hedef kişi seçildiğinde onun nöbetlerini çek
    const handleTargetPersonChange = async (personId: number) => {
        setTargetPersonId(personId);
        setTargetShiftId(null);

        if (!personId) {
            setTargetPersonShifts([]);
            return;
        }

        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

            const [currentMonthShifts, nextMonthShifts] = await Promise.all([
                getShiftsByMonth(currentMonth, currentYear),
                getShiftsByMonth(nextMonth, nextYear)
            ]);

            // Exclude nöbet ertesi - ID 3
            const NOBET_ERTESI_ID = 3;
            const allShifts = [...currentMonthShifts, ...nextMonthShifts];
            const targetShifts = allShifts.filter((s: ShiftAPI) =>
                s.personnel_id === personId && s.shift_definition_id !== NOBET_ERTESI_ID
            );
            setTargetPersonShifts(targetShifts);
        } catch (err) {
            console.error('Hedef kişi nöbetleri yüklenemedi:', err);
        }
    };

    // Talep oluştur
    const handleCreateRequest = async () => {
        if (!selectedShiftId) {
            alert('Lütfen değiştirmek istediğiniz nöbeti seçin');
            return;
        }

        if (exchangeType === 'mutual' && (!targetPersonId || !targetShiftId)) {
            alert('Karşılıklı değişim için hedef kişi ve nöbet seçmelisiniz');
            return;
        }

        setIsSaving(true);
        try {
            await createExchange({
                requestedShiftId: selectedShiftId,
                targetId: targetPersonId,
                targetShiftId: targetShiftId,
                exchangeType
            });
            setIsModalOpen(false);
            fetchExchanges();
            alert('Talep başarıyla oluşturuldu!');
        } catch (err: any) {
            console.error('Talep oluşturulamadı:', err);
            alert(err.response?.data?.error || 'Talep oluşturulurken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    // Onayla
    const handleApprove = async (id: number) => {
        if (!confirm('Bu talebi onaylamak istediğinize emin misiniz?')) return;

        try {
            await approveExchange(id);
            fetchExchanges();
            alert('Talep onaylandı!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Onaylama sırasında hata oluştu');
        }
    };

    // Reddet
    const handleReject = async (id: number) => {
        const reason = prompt('Red sebebi (opsiyonel):');

        try {
            await rejectExchange(id, reason || undefined);
            fetchExchanges();
            alert('Talep reddedildi!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Reddetme sırasında hata oluştu');
        }
    };

    // Sil
    const handleDelete = async (id: number) => {
        if (!confirm('Bu talebi silmek istediğinize emin misiniz?')) return;

        try {
            await deleteExchange(id);
            fetchExchanges();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Silme sırasında hata oluştu');
        }
    };

    // Status badge
    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string; border: string }> = {
            pending: { bg: 'rgba(245, 158, 11, 0.1)', color: 'rgb(245, 158, 11)', border: 'rgba(245, 158, 11, 0.2)' },
            target_approved: { bg: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)', border: 'rgba(59, 130, 246, 0.2)' },
            approved: { bg: 'rgba(34, 197, 94, 0.1)', color: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.2)' },
            rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.2)' }
        };
        const labels: Record<string, string> = {
            pending: 'Hedef Onayı Bekliyor',
            target_approved: 'Admin Onayı Bekliyor',
            approved: 'Onaylandı',
            rejected: 'Reddedildi'
        };
        const style = styles[status] || styles.pending;

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '10px',
                fontWeight: 500,
                backgroundColor: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`
            }}>
                {labels[status] || status}
            </span>
        );
    };

    // Format date with day of week
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        const dayName = dayNames[date.getDay()];
        const formatted = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        return `${formatted} (${dayName})`;
    };

    // Format shift date for dropdown
    const formatShiftDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayName = dayNames[date.getDay()];
        const formatted = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        return `${formatted} - ${dayName}`;
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
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Nöbet Değişim Talepleri</h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                        Nöbet değişim taleplerini yönetin
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchExchanges} className="phase-button" style={{ padding: '0.5rem' }}>
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={openNewRequestModal} className="phase-button">
                        <Plus size={14} /> Yeni Talep
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                        <p>Yükleniyor...</p>
                    </div>
                ) : exchanges.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                        <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <p>Henüz değişim talebi yok</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left' }}>
                        <thead>
                            <tr style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                backgroundColor: 'rgba(var(--muted), 0.3)',
                                color: 'var(--muted-foreground)',
                                fontWeight: 600,
                                borderBottom: '1px solid var(--card-border)',
                                letterSpacing: '0.05em'
                            }}>
                                <th style={{ padding: '1rem 1.5rem' }}>Talep Eden</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Nöbet Tarihi</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Hedef Kişi</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Hedef Tarih</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Tip</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Durum</th>
                                <th style={{ padding: '1rem 1.5rem' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exchanges.map(exchange => (
                                <tr key={exchange.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--foreground)' }}>
                                            {exchange.requester_name || `ID: ${exchange.requester_id}`}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>
                                        {formatDate(exchange.requester_shift_date || '')}
                                        {exchange.requester_shift_name && <span style={{ marginLeft: '0.5rem', color: 'var(--foreground)' }}>({exchange.requester_shift_name})</span>}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>
                                            {exchange.target_name || '-'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--muted-foreground)' }}>
                                        {exchange.target_shift_date ? formatDate(exchange.target_shift_date) : '-'}
                                        {exchange.target_shift_name && <span style={{ marginLeft: '0.5rem', color: 'var(--foreground)' }}>({exchange.target_shift_name})</span>}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 500 }}>
                                        {exchange.exchange_type === 'mutual' ? 'Karşılıklı' : 'Transfer'}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        {getStatusBadge(exchange.status)}
                                        {exchange.rejection_reason && (
                                            <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                                                Sebep: {exchange.rejection_reason}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {/* Hedef kişi pending durumunda onaylayabilir */}
                                            {exchange.status === 'pending' && exchange.target_id === currentUserId && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(exchange.id)}
                                                        title="Onayla"
                                                        style={{
                                                            padding: '0.375rem',
                                                            borderRadius: '0.25rem',
                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                                            cursor: 'pointer',
                                                            color: 'rgb(34, 197, 94)'
                                                        }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(exchange.id)}
                                                        title="Reddet"
                                                        style={{
                                                            padding: '0.375rem',
                                                            borderRadius: '0.25rem',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            cursor: 'pointer',
                                                            color: 'rgb(239, 68, 68)'
                                                        }}
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {/* Admin target_approved durumunda son onayı verir */}
                                            {exchange.status === 'target_approved' && userRole === 'admin' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(exchange.id)}
                                                        title="Onayla (Son Onay)"
                                                        style={{
                                                            padding: '0.375rem',
                                                            borderRadius: '0.25rem',
                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                                            cursor: 'pointer',
                                                            color: 'rgb(34, 197, 94)'
                                                        }}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(exchange.id)}
                                                        title="Reddet"
                                                        style={{
                                                            padding: '0.375rem',
                                                            borderRadius: '0.25rem',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            cursor: 'pointer',
                                                            color: 'rgb(239, 68, 68)'
                                                        }}
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {/* Talep eden kişi veya admin pending durumunda silebilir */}
                                            {(userRole === 'admin' || exchange.requester_id === currentUserId) && exchange.status === 'pending' && (
                                                <button
                                                    onClick={() => handleDelete(exchange.id)}
                                                    title="Sil"
                                                    style={{
                                                        padding: '0.375rem',
                                                        borderRadius: '0.25rem',
                                                        background: 'rgba(var(--muted), 0.3)',
                                                        border: '1px solid var(--card-border)',
                                                        cursor: 'pointer',
                                                        color: 'var(--muted-foreground)'
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: '-64px',
                        left: '-240px',
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="phase-card"
                        style={{
                            width: '100%',
                            maxWidth: '32rem',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            backgroundColor: 'var(--background)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(var(--muted), 0.2)' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '-0.025em' }}>Yeni Değişim Talebi</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--muted-foreground)' }} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Benim Nöbetim */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={12} /> Değiştirmek İstediğim Nöbet
                                </label>
                                <select
                                    className="phase-input"
                                    value={selectedShiftId || ''}
                                    onChange={(e) => setSelectedShiftId(Number(e.target.value) || null)}
                                >
                                    <option value="">Nöbet seçin...</option>
                                    {myShifts.map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {formatShiftDate(shift.date)} - {shift.shift_name || shift.short_name || 'Nöbet'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Değişim Tipi */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Değişim Tipi</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="exchangeType"
                                            value="mutual"
                                            checked={exchangeType === 'mutual'}
                                            onChange={() => setExchangeType('mutual')}
                                        />
                                        <span style={{ fontSize: '0.875rem' }}>Karşılıklı Değişim</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="exchangeType"
                                            value="transfer"
                                            checked={exchangeType === 'transfer'}
                                            onChange={() => setExchangeType('transfer')}
                                        />
                                        <span style={{ fontSize: '0.875rem' }}>Devir (Tek Yönlü)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Hedef Kişi */}
                            {exchangeType === 'mutual' && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={12} /> Değişim Yapılacak Kişi
                                        </label>
                                        <select
                                            className="phase-input"
                                            value={targetPersonId || ''}
                                            onChange={(e) => handleTargetPersonChange(Number(e.target.value) || 0)}
                                        >
                                            <option value="">Kişi seçin...</option>
                                            {allPersonnel.map(person => (
                                                <option key={person.id} value={person.id}>{person.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Hedef Nöbet */}
                                    {targetPersonId && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={12} /> Hedef Kişinin Nöbeti
                                            </label>
                                            <select
                                                className="phase-input"
                                                value={targetShiftId || ''}
                                                onChange={(e) => setTargetShiftId(Number(e.target.value) || null)}
                                            >
                                                <option value="">Nöbet seçin...</option>
                                                {targetPersonShifts.map(shift => (
                                                    <option key={shift.id} value={shift.id}>
                                                        {formatShiftDate(shift.date)} - {shift.shift_name || shift.short_name || 'Nöbet'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--card-border)', backgroundColor: 'rgba(var(--muted), 0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>İptal</button>
                            <button
                                className="phase-button"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                onClick={handleCreateRequest}
                                disabled={isSaving}
                            >
                                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Oluşturuluyor...</> : 'Talep Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftChangeContent;
