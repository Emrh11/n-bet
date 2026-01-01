import { Calendar, ChevronLeft, ChevronRight, Download, Filter, Trash2, Wand2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Personnel } from '../../services/personnelService';
import { getAllPersonnel } from '../../services/personnelService';
import type { ShiftDefinition } from '../../services/shiftDefinitionsService';
import { getAllShiftDefinitions } from '../../services/shiftDefinitionsService';
import type { ShiftAPI } from '../../services/shiftsService';
import { clearMonthShifts, createBulkShifts, createShift, deleteShift, getShiftsByMonth } from '../../services/shiftsService';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { calculateStaffHakedis } from '../../utils/hakedisUtils';

export interface ShiftAssignment {
    id?: number;
    staffId: number;
    shiftCode: string;
    shiftDefinitionId?: number | null;
}

export interface ShiftsMap {
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
    const [, setIsLoading] = useState(true);
    const [, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedShiftType, setSelectedShiftType] = useState('');

    // Current user ID for highlighting in Excel export
    const currentUserId = Number(JSON.parse(localStorage.getItem('userData') || '{}')?.id) || 0;

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
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const hakedis = calculateStaffHakedis(staffId, month, year, shifts, shiftDefinitions);
        return hakedis.totalExcessHours - hakedis.totalMissingHours; // Net = Fazla - Eksik
    };


    // Excel Export - Full Month Professional Design
    const exportScheduleToExcel = async () => {
        const ExcelJS = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const dayNamesExcel = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        const monthName = monthNames[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        const today = new Date();
        const totalColumns = days + 2;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Nöbet Yönetim Sistemi';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Nöbet Çizelgesi', {
            properties: { tabColor: { argb: '10B981' } },
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });

        const colors = {
            primary: '0D9488', primaryDark: '115E59', primaryLight: 'CCFBF1',
            dark: '1F2937', medium: '6B7280', light: 'F3F4F6', white: 'FFFFFF',
            weekendBg: 'FEF2F2', weekendHeader: 'FECACA',
            nobetBg: 'FEE2E2', nobetText: 'DC2626',
            nobetErtesiBg: 'D1FAE5', nobetErtesiText: '059669',
            currentUserBg: 'FEF3C7', currentUserAccent: 'FDE68A', currentUserText: '92400E',
            totalBg: 'ECFDF5', totalText: '065F46'
        };

        const thinBorder = {
            top: { style: 'thin' as const, color: { argb: 'E5E7EB' } },
            left: { style: 'thin' as const, color: { argb: 'E5E7EB' } },
            bottom: { style: 'thin' as const, color: { argb: 'E5E7EB' } },
            right: { style: 'thin' as const, color: { argb: 'E5E7EB' } }
        };

        const getDayNameForDate = (day: number) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            return dayNamesExcel[date.getDay()];
        };

        const isWeekend = (day: number) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            return date.getDay() === 0 || date.getDay() === 6;
        };

        const getShiftStyle = (code: string, isCurrentUser: boolean) => {
            if (isCurrentUser) return { bg: colors.currentUserAccent, text: colors.currentUserText };
            if (code === 'N') return { bg: colors.nobetBg, text: colors.nobetText };
            if (code === 'NE') return { bg: colors.nobetErtesiBg, text: colors.nobetErtesiText };
            return { bg: colors.nobetErtesiBg, text: colors.nobetErtesiText };
        };

        const getStaffNobetCount = (staffId: number) => {
            let count = 0;
            for (let day = 1; day <= days; day++) {
                const dayShifts = getStaffShiftsForDay(staffId, day);
                dayShifts.forEach(s => { if (s.shiftCode === 'N') count++; });
            }
            return count;
        };

        let totalNobetCount = 0;
        let totalNobetErtesiCount = 0;
        staffList.forEach(staff => {
            for (let day = 1; day <= days; day++) {
                const dayShifts = getStaffShiftsForDay(staff.id, day);
                dayShifts.forEach(s => {
                    if (s.shiftCode === 'N') totalNobetCount++;
                    if (s.shiftCode === 'NE') totalNobetErtesiCount++;
                });
            }
        });

        let rowIndex = 1;

        // Title
        worksheet.mergeCells(rowIndex, 1, rowIndex, totalColumns);
        const titleCell = worksheet.getCell(rowIndex, 1);
        titleCell.value = `📋 ${monthName.toUpperCase()} ${year} NÖBET ÇİZELGESİ`;
        titleCell.font = { bold: true, size: 16, color: { argb: colors.white } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryDark } };
        worksheet.getRow(rowIndex).height = 32;
        rowIndex++;

        // Info Bar
        worksheet.mergeCells(rowIndex, 1, rowIndex, totalColumns);
        const infoCell = worksheet.getCell(rowIndex, 1);
        infoCell.value = `📅 ${today.toLocaleDateString('tr-TR')} ${today.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}   •   👥 ${staffList.length} Personel   •   🔴 ${totalNobetCount} Nöbet   •   🟢 ${totalNobetErtesiCount} Nöbet Ertesi`;
        infoCell.font = { size: 10, color: { argb: colors.medium } };
        infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };
        worksheet.getRow(rowIndex).height = 22;
        rowIndex += 2;

        // Day Numbers Header
        const dayNumberRow = worksheet.getRow(rowIndex);
        dayNumberRow.getCell(1).value = 'Personel';
        dayNumberRow.getCell(1).font = { bold: true, size: 10, color: { argb: colors.white } };
        dayNumberRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryDark } };
        dayNumberRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        dayNumberRow.getCell(1).border = thinBorder;

        for (let day = 1; day <= days; day++) {
            const cell = dayNumberRow.getCell(day + 1);
            cell.value = day;
            cell.font = { bold: true, size: 9, color: { argb: isWeekend(day) ? colors.nobetText : colors.dark } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isWeekend(day) ? colors.weekendHeader : colors.light } };
            cell.border = thinBorder;
        }

        dayNumberRow.getCell(days + 2).value = 'N';
        dayNumberRow.getCell(days + 2).font = { bold: true, size: 9, color: { argb: colors.white } };
        dayNumberRow.getCell(days + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.nobetText } };
        dayNumberRow.getCell(days + 2).alignment = { horizontal: 'center', vertical: 'middle' };
        dayNumberRow.getCell(days + 2).border = thinBorder;
        worksheet.getRow(rowIndex).height = 22;
        rowIndex++;

        // Day Names Row
        const dayNameRow = worksheet.getRow(rowIndex);
        dayNameRow.getCell(1).value = '';
        dayNameRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryLight } };
        dayNameRow.getCell(1).border = thinBorder;

        for (let day = 1; day <= days; day++) {
            const cell = dayNameRow.getCell(day + 1);
            cell.value = getDayNameForDate(day);
            cell.font = { size: 8, italic: true, color: { argb: isWeekend(day) ? colors.nobetText : colors.medium } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isWeekend(day) ? colors.weekendBg : colors.light } };
            cell.border = thinBorder;
        }

        dayNameRow.getCell(days + 2).value = 'Sayı';
        dayNameRow.getCell(days + 2).font = { size: 8, italic: true, color: { argb: colors.totalText } };
        dayNameRow.getCell(days + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalBg } };
        dayNameRow.getCell(days + 2).alignment = { horizontal: 'center', vertical: 'middle' };
        dayNameRow.getCell(days + 2).border = thinBorder;
        worksheet.getRow(rowIndex).height = 18;
        rowIndex++;

        // Data Rows
        staffList.forEach((staff, idx) => {
            const row = worksheet.getRow(rowIndex);
            const isCurrentUser = staff.id === currentUserId;
            const baseBg = isCurrentUser ? colors.currentUserBg : (idx % 2 === 0 ? colors.white : colors.light);
            const nobetCount = getStaffNobetCount(staff.id);

            row.getCell(1).value = (isCurrentUser ? '⭐ ' : '') + staff.name;
            row.getCell(1).font = { bold: true, size: 9, color: { argb: isCurrentUser ? colors.currentUserText : colors.dark } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
            row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
            row.getCell(1).border = thinBorder;

            for (let day = 1; day <= days; day++) {
                const dayShifts = getStaffShiftsForDay(staff.id, day);
                const codes = dayShifts.map(s => s.shiftCode).join(',');
                const cell = row.getCell(day + 1);
                cell.value = codes || '·';
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = thinBorder;

                if (codes) {
                    const mainCode = dayShifts[0]?.shiftCode || '';
                    const style = getShiftStyle(mainCode, isCurrentUser);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
                    cell.font = { bold: true, size: 9, color: { argb: style.text } };
                } else {
                    cell.font = { size: 8, color: { argb: 'D1D5DB' } };
                    if (isCurrentUser) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
                    else if (isWeekend(day)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.weekendBg } };
                    else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
                }
            }

            row.getCell(days + 2).value = nobetCount;
            row.getCell(days + 2).font = { bold: true, size: 10, color: { argb: colors.totalText } };
            row.getCell(days + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalBg } };
            row.getCell(days + 2).alignment = { horizontal: 'center', vertical: 'middle' };
            row.getCell(days + 2).border = thinBorder;
            worksheet.getRow(rowIndex).height = 20;
            rowIndex++;
        });

        // Totals Row
        const totalsRow = worksheet.getRow(rowIndex);
        totalsRow.getCell(1).value = '📊 TOPLAM';
        totalsRow.getCell(1).font = { bold: true, size: 10, color: { argb: colors.white } };
        totalsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryDark } };
        totalsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        totalsRow.getCell(1).border = thinBorder;

        for (let day = 1; day <= days; day++) {
            let dayTotal = 0;
            staffList.forEach(staff => {
                const dayShifts = getStaffShiftsForDay(staff.id, day);
                dayShifts.forEach(s => { if (s.shiftCode === 'N') dayTotal++; });
            });
            const cell = totalsRow.getCell(day + 1);
            cell.value = dayTotal || '·';
            cell.font = { bold: true, size: 9, color: { argb: dayTotal ? colors.primary : 'D1D5DB' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryLight } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
        }

        totalsRow.getCell(days + 2).value = totalNobetCount;
        totalsRow.getCell(days + 2).font = { bold: true, size: 11, color: { argb: colors.white } };
        totalsRow.getCell(days + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primary } };
        totalsRow.getCell(days + 2).alignment = { horizontal: 'center', vertical: 'middle' };
        totalsRow.getCell(days + 2).border = thinBorder;
        worksheet.getRow(rowIndex).height = 24;
        rowIndex += 2;

        // Legend
        worksheet.mergeCells(rowIndex, 1, rowIndex, Math.min(days + 2, 15));
        const legendCell = worksheet.getCell(rowIndex, 1);
        legendCell.value = '📌 Gösterim: N = Nöbet (Kırmızı) | NE = Nöbet Ertesi (Yeşil) | ⭐ = Sizin Satırınız (Sarı)';
        legendCell.font = { size: 9, color: { argb: colors.medium } };
        legendCell.alignment = { horizontal: 'left', vertical: 'middle' };
        legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };
        worksheet.getRow(rowIndex).height = 20;

        // Column widths
        worksheet.getColumn(1).width = 20;
        for (let i = 2; i <= days + 1; i++) worksheet.getColumn(i).width = 4;
        worksheet.getColumn(days + 2).width = 5;

        worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Nobet_Cizelgesi_${monthName}_${year}.xlsx`);
    };

    // Hakediş (Overtime Accrual) Export - Multi-sheet per personnel
    const exportHakedisToExcel = async () => {
        const ExcelJS = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const monthName = monthNames[currentDate.getMonth()];
        const year = currentDate.getFullYear();
        const today = new Date();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Nöbet Yönetim Sistemi';
        workbook.created = new Date();

        // Colors
        const colors = {
            headerBg: '10B981',
            headerText: 'FFFFFF',
            subHeaderBg: '34D399',
            titleBg: '065F46',
            dark: '1F2937',
            medium: '6B7280',
            light: 'F3F4F6',
            white: 'FFFFFF',
            weekendBg: 'FEF2F2',
            nobetBg: 'FEE2E2',
            nobetText: 'DC2626',
            nobetErtesiBg: 'D1FAE5',
            nobetErtesiText: '059669',
            summaryBg: 'ECFDF5',
            summaryText: '065F46',
            excessBg: 'DCFCE7',
            excessText: '166534',
            missingBg: 'FEE2E2',
            missingText: 'DC2626'
        };

        const thinBorder = {
            top: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
            left: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
            right: { style: 'thin' as const, color: { argb: 'D1D5DB' } }
        };

        // Create a sheet for each staff member
        staffList.forEach(staff => {
            // Sanitize sheet name (Excel doesn't allow certain characters)
            const sheetName = staff.name.replace(/[*?:/\\[\]]/g, '').substring(0, 31);
            const worksheet = workbook.addWorksheet(sheetName, {
                properties: { tabColor: { argb: colors.headerBg } }
            });

            let rowIndex = 1;

            // Title
            worksheet.mergeCells(rowIndex, 1, rowIndex, 10);
            const titleCell = worksheet.getCell(rowIndex, 1);
            titleCell.value = '🏆 NÖBETÇİ PERSONEL RAPORU';
            titleCell.font = { bold: true, size: 14, color: { argb: colors.headerText } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.titleBg } };
            worksheet.getRow(rowIndex).height = 28;
            rowIndex++;

            // Info row
            worksheet.mergeCells(rowIndex, 1, rowIndex, 3);
            worksheet.getCell(rowIndex, 1).value = `👤 Personel: ${staff.name}`;
            worksheet.getCell(rowIndex, 1).font = { bold: true, size: 11, color: { argb: colors.dark } };
            worksheet.getCell(rowIndex, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };

            worksheet.mergeCells(rowIndex, 4, rowIndex, 6);
            worksheet.getCell(rowIndex, 4).value = `📅 Dönem: ${monthName} ${year}`;
            worksheet.getCell(rowIndex, 4).font = { size: 10, color: { argb: colors.medium } };
            worksheet.getCell(rowIndex, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };

            worksheet.mergeCells(rowIndex, 7, rowIndex, 10);
            worksheet.getCell(rowIndex, 7).value = `📊 Rapor Tarihi: ${today.toLocaleDateString('tr-TR')} ${today.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
            worksheet.getCell(rowIndex, 7).font = { size: 10, color: { argb: colors.medium } };
            worksheet.getCell(rowIndex, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };
            worksheet.getRow(rowIndex).height = 22;
            rowIndex += 2;

            // Column Headers
            const headers = ['📆 Tarih', 'Gün', 'Personel', '⏰ Giriş', '⏰ Çıkış', '🏷️ Vardiya', '⏱️ Çalışma', '📊 Beklenen', '❌ Eksik', '💰 Fazla'];
            // Header styling
            const headerRow = worksheet.getRow(4);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
                cell.font = { bold: true, color: { argb: colors.headerText }, size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = thinBorder;
                // Column widths
                worksheet.getColumn(i + 1).width = i === 0 ? 15 : i === 5 ? 20 : 12;
            });

            // Summary titles on the right (Moved to L column)
            worksheet.getCell('L4').value = 'Top. Çalışma';
            worksheet.getCell('L5').value = 'Top. Beklenen';
            worksheet.getCell('L6').value = 'Top. Eksik';
            worksheet.getCell('L7').value = 'Top. Fazla';
            worksheet.getCell('L8').value = 'Net F.';
            ['L4', 'L5', 'L6', 'L7', 'L8'].forEach(cellRef => {
                const cell = worksheet.getCell(cellRef);
                cell.font = { bold: true, size: 9, color: { argb: colors.summaryText } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.summaryBg } };
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.border = thinBorder;
                worksheet.getColumn('L').width = 18;
                worksheet.getColumn('M').width = 15;
            });
            // Net F. özel stil
            worksheet.getCell('L8').font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell('L8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

            worksheet.getRow(rowIndex).height = 24;
            rowIndex++;

            // Data rows - one for each day
            // Accumulators removed as they are now provided by calculateStaffHakedis

            // Use the centralized calculation logic
            const hakedisSummary = calculateStaffHakedis(staff.id, currentDate.getMonth() + 1, currentDate.getFullYear(), shifts, shiftDefinitions);

            // Populate rows from the hakedis details
            hakedisSummary.dailyDetails.forEach((detail, dayIndex) => {
                const day = dayIndex + 1;
                const row = worksheet.getRow(rowIndex);
                const baseBg = detail.isWeekend ? colors.weekendBg : (day % 2 === 0 ? colors.light : colors.white);
                const isNobet = detail.shiftType.includes('Nöbet') && !detail.shiftType.includes('Ertesi');
                const isNobetErtesi = detail.shiftType.includes('Ertesi');
                const isNobetDevam = detail.shiftType.includes('devam');

                // Date column
                row.getCell(1).value = detail.date.split('-').reverse().join('.');
                row.getCell(2).value = detail.dayName;
                row.getCell(3).value = staff.name;
                row.getCell(4).value = detail.entryTime;
                row.getCell(5).value = detail.exitTime;
                row.getCell(6).value = detail.shiftType;
                row.getCell(7).value = Math.round(detail.workHours * 10) / 10;
                row.getCell(8).value = detail.expectedHours;
                row.getCell(9).value = detail.missingHours > 0 ? Math.round(detail.missingHours * 10) / 10 : '-';
                row.getCell(10).value = detail.excessHours > 0 ? Math.round(detail.excessHours * 10) / 10 : '-';

                // Formatting
                for (let col = 1; col <= 10; col++) {
                    const cell = row.getCell(col);
                    cell.border = thinBorder;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
                    cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' };
                    cell.font = { size: 9, color: { argb: colors.dark } };

                    if (col === 1) cell.font.bold = true;
                    if (col === 2 && detail.isWeekend) cell.font.color = { argb: colors.nobetText };
                    if (col === 6) {
                        cell.font.bold = true;
                        if (isNobet || isNobetDevam) cell.font.color = { argb: colors.nobetText };
                        if (isNobetErtesi) cell.font.color = { argb: colors.nobetErtesiText };
                    }
                    if (col === 9 && detail.missingHours > 0) {
                        cell.font.bold = true;
                        cell.font.color = { argb: colors.missingText };
                    }
                    if (col === 10 && detail.excessHours > 0) {
                        cell.font.bold = true;
                        cell.font.color = { argb: colors.excessText };
                    }
                }

                rowIndex++;
            });

            // Global summary totals in values column (M)
            worksheet.getCell('M4').value = Math.round(hakedisSummary.totalWorkHours * 10) / 10;
            worksheet.getCell('M5').value = hakedisSummary.totalExpectedHours;
            worksheet.getCell('M6').value = Math.round(hakedisSummary.totalMissingHours * 10) / 10;
            worksheet.getCell('M7').value = Math.round(hakedisSummary.totalExcessHours * 10) / 10;

            // Net Fazla hesaplama
            const netFazla = hakedisSummary.totalExcessHours - hakedisSummary.totalMissingHours;
            worksheet.getCell('M8').value = Math.round(netFazla * 10) / 10;

            // Styling summary values column
            ['M4', 'M5', 'M6', 'M7'].forEach((cellRef, idx) => {
                const c = worksheet.getCell(cellRef);
                const textColors = [colors.summaryText, colors.medium, colors.missingText, colors.excessText];

                c.font = { bold: true, color: { argb: textColors[idx] } };
                c.alignment = { horizontal: 'center' };
                c.border = thinBorder;
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
            });

            // Net F. özel stil (koyu mavi arka plan, beyaz yazı)
            worksheet.getCell('M8').font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            worksheet.getCell('M8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            worksheet.getCell('M8').alignment = { horizontal: 'center' };
            worksheet.getCell('M8').border = thinBorder;


            worksheet.getColumn('P').width = 22;
            worksheet.getColumn('Q').width = 15;

            // Column widths
            worksheet.getColumn(1).width = 12;
            worksheet.getColumn(2).width = 12;
            worksheet.getColumn(3).width = 18;
            worksheet.getColumn(4).width = 8;
            worksheet.getColumn(5).width = 8;
            worksheet.getColumn(6).width = 14;
            worksheet.getColumn(7).width = 10;
            worksheet.getColumn(8).width = 10;
            worksheet.getColumn(9).width = 8;
            worksheet.getColumn(10).width = 8;
            worksheet.getColumn(11).width = 3;
            worksheet.getColumn(12).width = 14;
            worksheet.getColumn(13).width = 12;
        });

        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Personel_Raporu_${monthName}_${year}_${today.toLocaleDateString('tr-TR').replace(/\./g, '')}_${today.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }).replace(':', '')}.xlsx`);
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
                    <button onClick={exportScheduleToExcel} className="phase-button">
                        <Download size={14} /> Excel
                    </button>
                    {userRole === 'admin' && (
                        <button
                            onClick={exportHakedisToExcel}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                cursor: 'pointer',
                                color: 'rgb(16, 185, 129)',
                                transition: 'all 200ms'
                            }}
                        >
                            <Download size={14} /> Hakediş
                        </button>
                    )}
                </div>
            </div>

            {/* Schedule Table */}
            <div className="phase-card" style={{ overflow: 'hidden' }}>
                <div className="thin-scrollbar" style={{ overflowX: 'auto' }}>
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
                                    const isToday = new Date().getFullYear() === currentDate.getFullYear() &&
                                        new Date().getMonth() === currentDate.getMonth() &&
                                        new Date().getDate() === day;
                                    return (
                                        <th key={day} style={{
                                            padding: '0.5rem 0.375rem',
                                            textAlign: 'center',
                                            minWidth: '45px',
                                            borderRight: '1px solid var(--card-border)',
                                            backgroundColor: isToday ? 'rgba(59, 130, 246, 0.15)' : 'var(--background)',
                                            borderBottom: isToday ? '3px solid rgba(59, 130, 246, 0.8)' : undefined
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: isToday ? 'rgb(59, 130, 246)' : getDayColor(dayName) }}>{dayName}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: isToday ? 'rgb(59, 130, 246)' : 'var(--foreground)' }}>{day}</span>
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
                                                <img
                                                    src={getAvatarUrl(staff.avatar, staff.name)}
                                                    alt={staff.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        const fallback = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(staff.name)}`;
                                                        if (target.src !== fallback) {
                                                            target.src = fallback;
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontWeight: 500, fontSize: '0.65rem', color: 'var(--foreground)', textTransform: 'uppercase', letterSpacing: '0.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{staff.name}</span>
                                        </div>
                                    </td>
                                    {Array.from({ length: days }).map((_, i) => {
                                        const day = i + 1;
                                        const dayShifts = getStaffShiftsForDay(staff.id, day);
                                        const dayName = getDayName(day);
                                        const isWeekend = dayName === 'CMT' || dayName === 'PAZ';
                                        const isToday = new Date().getFullYear() === currentDate.getFullYear() &&
                                            new Date().getMonth() === currentDate.getMonth() &&
                                            new Date().getDate() === day;

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
