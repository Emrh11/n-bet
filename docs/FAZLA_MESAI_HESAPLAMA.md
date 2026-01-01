# Fazla Mesai Hesaplama Mantığı (Mobil İçin)

Bu doküman, web ve mobil uygulamada tutarlı fazla mesai hesaplaması yapabilmek için kesin kuralları tanımlar.

## Temel Kavramlar

| Terim | Açıklama |
|-------|----------|
| **Çalışma** | O gün fiilen çalışılan saat |
| **Beklenen** | O gün çalışılması gereken saat |
| **Eksik** | Beklenen - Çalışma (eğer negatifse) |
| **Fazla** | Çalışma - Beklenen (eğer pozitifse) |
| **Net Fazla** | Toplam Fazla - Toplam Eksik |

---

## Gün Tipleri ve Hesaplama Kuralları

### 1. Normal Mesai Günü (Hafta İçi - Vardiya Yok)
```
Giriş: 08:00
Çıkış: 18:00
Çalışma: 10 saat
Beklenen: 10 saat
Eksik: 0
Fazla: 0
```

### 2. Hafta Sonu (Cumartesi/Pazar - Vardiya Yok)
```
Giriş: -
Çıkış: -
Çalışma: 0
Beklenen: 0
Eksik: 0
Fazla: 0
Vardiya: "Off"
```

### 3. Nöbet Günü (Normal Gün)
```
Giriş: 08:00
Çıkış: 23:59
Çalışma: 16 saat
Beklenen: 10 saat (hafta içi) / 0 saat (hafta sonu)
Fazla: Çalışma - Beklenen
```

**Örnek (Pazartesi Nöbeti):**
- Çalışma: 16
- Beklenen: 10
- **Fazla: +6 saat**

### 4. Nöbet Ertesi (Normal Gün)
```
Giriş: 00:00
Çıkış: 08:00
Çalışma: 8 saat
Beklenen: 10 saat (hafta içi) / 0 saat (hafta sonu)
```

**Örnek (Salı - Nöbet Ertesi, Hafta İçi):**
- Çalışma: 8
- Beklenen: 10
- **Eksik: -2 saat**

**Örnek (Cumartesi - Nöbet Ertesi):**
- Çalışma: 8
- Beklenen: 0
- **Fazla: +8 saat**

---

## Resmi Tatil Kuralları

### 5. Resmi Tatil (Tam Gün - Vardiya Yok)
```
Giriş: -
Çıkış: -
Çalışma: 0
Beklenen: 0
Eksik: 0
Fazla: 0
```

### 6. Resmi Tatil Nöbeti
```
Giriş: 08:00
Çıkış: 23:59
Çalışma: 16 saat
Beklenen: 0 (tatil olduğu için)
Fazla: +16 saat (tamamı fazla mesai)
```

### 7. Resmi Tatil Sonrası Nöbet Ertesi
```
Giriş: 00:00
Çıkış: 08:00
Çalışma: 8 saat
Beklenen: 0 (tatilden sonra kesinti yok)
Fazla: +8 saat
```

---

## Arife Günleri (Yarım Gün)

### 8. Arife Günü (31 Aralık, Bayram Arifeleri - Vardiya Yok)
```
Giriş: 08:00
Çıkış: 12:00
Çalışma: 4 saat
Beklenen: 4 saat
Eksik: 0
Fazla: 0
```

### 9. Arife Günü Nöbeti (örn: 31 Aralık Nöbeti)
```
Giriş: 08:00
Çıkış: 23:59
Çalışma: 16 saat
Beklenen: 6 saat (sadece 12:00'a kadar normal mesai)
Fazla: +10 saat
```

### 10. Arife Sonrası Nöbet Ertesi (örn: 1 Ocak)
```
Giriş: 00:00
Çıkış: 08:00
Çalışma: 8 saat
Beklenen: 0 (tatil günü + arife sonrası kesinti yok)
Fazla: +8 saat
```

---

## Haftalık Beklenen Saat Tablosu

| Gün | Beklenen Saat |
|-----|---------------|
| Pazartesi | 10 |
| Salı | 10 |
| Çarşamba | 10 |
| Perşembe | 10 |
| Cuma | 10 |
| Cumartesi | 0 |
| Pazar | 0 |

---

## Hesaplama Algoritması (Pseudocode)

```javascript
function hesaplaGunlukFazlaMesai(tarih, vardiya, oncekiGunVardiya) {
    const haftaSonu = tarih.getDay() === 0 || tarih.getDay() === 6;
    const resmiTatil = isResmiTatil(tarih);
    const arife = isArife(tarih);
    
    let calisma = 0;
    let beklenen = 0;
    let giris = '-';
    let cikis = '-';
    
    // 1. NÖBET GÜNÜ
    if (vardiya && vardiya.tip === 'NOBET') {
        giris = '08:00';
        cikis = '23:59';
        calisma = 16;
        
        if (resmiTatil) {
            beklenen = 0; // Tatil - tümü fazla
        } else if (arife) {
            beklenen = 6; // Yarım gün
        } else if (haftaSonu) {
            beklenen = 0;
        } else {
            beklenen = 10; // Normal hafta içi
        }
    }
    // 2. NÖBET ERTESİ
    else if (oncekiGunVardiya && oncekiGunVardiya.tip === 'NOBET') {
        giris = '00:00';
        cikis = '08:00';
        calisma = 8;
        
        if (resmiTatil || isArife(oncekiGun) || isResmiTatil(oncekiGun)) {
            beklenen = 0; // Tatil sonrası kesinti yok
        } else if (haftaSonu) {
            beklenen = 0;
        } else {
            beklenen = 10; // Normal hafta içi
        }
    }
    // 3. RESMİ TATİL
    else if (resmiTatil) {
        calisma = 0;
        beklenen = 0;
    }
    // 4. ARİFE (Yarım Gün)
    else if (arife) {
        giris = '08:00';
        cikis = '12:00';
        calisma = 4;
        beklenen = 4;
    }
    // 5. HAFTA SONU
    else if (haftaSonu) {
        calisma = 0;
        beklenen = 0;
    }
    // 6. NORMAL MESAİ
    else {
        giris = '08:00';
        cikis = '18:00';
        calisma = 10;
        beklenen = 10;
    }
    
    // FARK HESAPLA
    const fark = calisma - beklenen;
    const eksik = fark < 0 ? Math.abs(fark) : 0;
    const fazla = fark > 0 ? fark : 0;
    
    return { giris, cikis, calisma, beklenen, eksik, fazla };
}

function hesaplaAylikToplam(personelId, ay, yil) {
    let toplamCalisma = 0;
    let toplamBeklenen = 0;
    let toplamEksik = 0;
    let toplamFazla = 0;
    
    const gunSayisi = new Date(yil, ay, 0).getDate();
    
    for (let gun = 1; gun <= gunSayisi; gun++) {
        const tarih = new Date(yil, ay - 1, gun);
        const vardiya = getVardiya(personelId, tarih);
        const oncekiGunVardiya = getVardiya(personelId, oncekiGun(tarih));
        
        const sonuc = hesaplaGunlukFazlaMesai(tarih, vardiya, oncekiGunVardiya);
        
        toplamCalisma += sonuc.calisma;
        toplamBeklenen += sonuc.beklenen;
        toplamEksik += sonuc.eksik;
        toplamFazla += sonuc.fazla;
    }
    
    const netFazla = toplamFazla - toplamEksik;
    
    return {
        toplamCalisma,
        toplamBeklenen,
        toplamEksik,
        toplamFazla,
        netFazla
    };
}
```

---

## Resmi Tatiller Listesi (2025-2027)

API Endpoint: `GET https://nobettakip.site/api/holidays.php?year=2025`

Fallback olarak hardcoded liste:

```javascript
const RESMI_TATILLER = {
    // 2025
    '2025-01-01': { adi: 'Yılbaşı', tip: 'tam_gun' },
    '2025-03-30': { adi: 'Ramazan Bayramı Arifesi', tip: 'yarim_gun' },
    '2025-03-31': { adi: 'Ramazan Bayramı 1. Gün', tip: 'tam_gun' },
    // ... devamı
    '2025-12-31': { adi: 'Yılbaşı Arifesi', tip: 'yarim_gun' },
};
```

---

## Örnek Senaryo: Yılbaşı Nöbeti

**31 Aralık 2025 (Çarşamba - Arife + Nöbet):**
- Çalışma: 16 saat
- Beklenen: 6 saat (arife, sadece 12:00'a kadar)
- **Fazla: +10 saat**

**1 Ocak 2026 (Perşembe - Yılbaşı + Nöbet Ertesi):**
- Çalışma: 8 saat
- Beklenen: 0 (resmi tatil, kesinti yok)
- **Fazla: +8 saat**

**Toplam Net Fazla: +18 saat**

---

## Kontrol Noktaları

1. ✅ Hafta sonu (Cmt/Paz) beklenen = 0
2. ✅ Resmi tatil beklenen = 0
3. ✅ Arife beklenen = 6 (nöbet varsa) veya 4 (normal mesai)
4. ✅ Nöbet ertesi hafta içi beklenen = 10, hafta sonu = 0
5. ✅ Tatil/arife sonrası nöbet ertesi beklenen = 0 (kesinti yok)
6. ✅ Net Fazla = Toplam Fazla - Toplam Eksik
