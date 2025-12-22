# Prompt: Generate Project Blueprint

> **Cara Penggunaan:**
> 1. Copy seluruh isi prompt di bawah ini
> 2. Isi bagian `[ISI DI SINI]` dengan informasi proyek Anda
> 3. Paste ke AI Assistant (ChatGPT, Claude, Gemini, dll)
> 4. AI akan generate `blueprint.md` yang lengkap

---

## 🚀 THE PROMPT

```
Anda adalah Perfectionist Senior Software Architect.

Tugas Anda adalah membuat dokumen `blueprint.md` yang komprehensif untuk proyek di bawah ini. Blueprint harus menjadi "Single Source of Truth" yang akan dibaca oleh AI coding agents untuk memahami dan mengembangkan proyek.

---

## PROJECT BRIEF

### Nama Proyek
[ISI DI SINI: nama proyek, contoh: "SchoolHub", "TokoPedia Clone", "MyFinance App"]

### Deskripsi Singkat
[ISI DI SINI: 1-3 kalimat menjelaskan apa yang ingin dibuat, contoh: "Platform manajemen sekolah lengkap dengan website publik, portal guru, portal siswa, dan admin panel"]

### Tipe Proyek
[PILIH SATU atau LEBIH:]
- [ ] Website
- [ ] Web Application (SPA/PWA)
- [ ] Mobile App (Android/iOS)
- [ ] Desktop App
- [ ] API/Backend Only
- [ ] Fullstack Application
- [ ] Other: [ISI DI SINI]

### Target Users
[ISI DI SINI: siapa yang akan menggunakan aplikasi ini, contoh:
- Admin sekolah
- Guru
- Siswa
- Orang tua
]

---

## TECH STACK PREFERENCES

### Bahasa Pemrograman
[ISI DI SINI atau tulis "Rekomendasi", contoh: "TypeScript", "Python", "Kotlin"]

### Frontend Framework
[ISI DI SINI atau tulis "Rekomendasi", contoh: "React", "Vue", "Next.js", "Flutter", "React Native"]

### Backend Framework
[ISI DI SINI atau tulis "Rekomendasi", contoh: "Node.js", "Express", "Cloudflare Workers", "Django", "FastAPI"]

### Database
[ISI DI SINI atau tulis "Rekomendasi", contoh: "PostgreSQL", "MongoDB", "Supabase", "Firebase"]

### Hosting/Deployment
[ISI DI SINI atau tulis "Rekomendasi", contoh: "Vercel", "Cloudflare", "AWS", "Railway"]

### Budget Constraint
[PILIH SATU:]
- [ ] Gratis (Free tier only)
- [ ] Low budget (< $20/bulan)
- [ ] Medium budget ($20-100/bulan)
- [ ] No limit

---

## FITUR UTAMA

### Core Features (WAJIB ADA)
[ISI DI SINI: list fitur utama yang harus ada, contoh:
1. User registration & login
2. Dashboard admin
3. Manajemen siswa (CRUD)
4. Manajemen guru (CRUD)
5. Jadwal pelajaran
6. Nilai siswa
7. Laporan kehadiran
]

### Nice-to-Have Features (OPSIONAL)
[ISI DI SINI: fitur tambahan jika memungkinkan, contoh:
1. Notifikasi WhatsApp
2. Mobile responsive
3. Dark mode
4. Export PDF/Excel
]

### Out of Scope (TIDAK TERMASUK)
[ISI DI SINI: fitur yang TIDAK akan dibuat, contoh:
1. Video conferencing
2. E-learning/LMS lengkap
3. Multi-tenant untuk banyak sekolah
]

---

## USER ROLES & ACCESS

[ISI DI SINI: daftar role dan apa yang bisa mereka akses, contoh:

| Role | Akses |
|------|-------|
| Super Admin | Full access, manage all |
| Admin Sekolah | Manage guru, siswa, jadwal |
| Guru | Lihat jadwal, input nilai, absensi |
| Siswa | Lihat nilai, jadwal, pengumuman |
| Orang Tua | Lihat nilai anak, laporan |
]

---

## SECURITY REQUIREMENTS

[PILIH YANG BERLAKU:]
- [ ] Basic (email/password login)
- [ ] OAuth (Google, Facebook, etc.)
- [ ] Two-Factor Authentication (2FA)
- [ ] Role-based Access Control (RBAC)
- [ ] Rate Limiting
- [ ] Data Encryption

Additional Security Notes:
[ISI DI SINI jika ada requirement khusus]

---

## INTEGRATIONS (OPSIONAL)

[ISI DI SINI: integrasi dengan layanan external, contoh:
- Payment Gateway: Midtrans QRIS
- Email: SendGrid
- Storage: Cloudflare R2
- Analytics: Google Analytics
- WhatsApp: Fonnte API
]

---

## DESIGN PREFERENCES (OPSIONAL)

### UI Style
[PILIH SATU:]
- [ ] Modern/Minimalist
- [ ] Corporate/Professional
- [ ] Playful/Colorful
- [ ] Dark Theme
- [ ] Custom: [ISI DI SINI]

### Design Reference (jika ada)
[ISI DI SINI: URL website/app yang bisa jadi referensi design]

---

## TIMELINE & PRIORITY

### Development Priority
[URUTKAN 1-5, 1 = paling penting:]
- [ ] Speed to market (cepat launch)
- [ ] Code quality & maintainability
- [ ] Performance & scalability
- [ ] UI/UX polish
- [ ] Comprehensive testing

### Estimated Timeline
[PILIH SATU:]
- [ ] MVP dalam 1-2 minggu
- [ ] Full version dalam 1 bulan
- [ ] Enterprise-grade dalam 2-3 bulan
- [ ] Flexible/No deadline

---

## OUTPUT REQUIREMENTS

Buatkan `blueprint.md` dengan struktur berikut:

1. **Project Info** - Nama, deskripsi, dan overview
2. **Tech Stack** - Tabel lengkap teknologi yang digunakan dengan justifikasi
3. **Architecture** - Folder structure, coding standards, design patterns
4. **User Roles** - Tabel roles dan permissions
5. **Features** - Breakdown fitur per module/page
6. **Database Schema** - SQL schema lengkap dengan relasi
7. **API Endpoints** - Daftar semua endpoints yang dibutuhkan
8. **Environment Variables** - Daftar env vars dengan deskripsi
9. **Security** - Authentication, authorization, dan security measures
10. **Deployment** - Hosting setup dan CI/CD requirements
11. **Out of Scope** - Fitur yang tidak termasuk V1
12. **Agent Instructions** - Do's and Don'ts untuk AI coding agents

Blueprint harus:
- Komprehensif dan detail
- Actionable (bisa langsung diimplementasi)
- Konsisten dengan best practices
- Menyertakan SQL schema yang siap dijalankan
- Menyertakan contoh API response format
```

---

## 📋 TEMPLATE KOSONG (Quick Copy)

Jika ingin mengisi cepat, copy template ini:

```
## PROJECT BRIEF
- Nama: 
- Deskripsi: 
- Tipe: Website / Web App / Mobile / Desktop / API / Fullstack
- Target Users: 

## TECH STACK
- Language: 
- Frontend: 
- Backend: 
- Database: 
- Hosting: 
- Budget: Gratis / Low / Medium / No limit

## FITUR UTAMA
1. 
2. 
3. 

## USER ROLES
| Role | Akses |
|------|-------|
|  |  |

## SECURITY
- [ ] Basic Auth
- [ ] OAuth
- [ ] 2FA
- [ ] RBAC

## INTEGRATIONS
- Payment: 
- Email: 
- Storage: 

## PRIORITY
1. 
2. 
3. 
```

---

## 📝 CONTOH PENGISIAN

### Contoh 1: Website Sekolah

```
## PROJECT BRIEF
- Nama: SchoolHub
- Deskripsi: Platform manajemen sekolah dengan website publik, portal guru/siswa, dan admin panel
- Tipe: Fullstack Application
- Target Users: Admin, Guru, Siswa, Orang Tua

## TECH STACK
- Language: TypeScript
- Frontend: Astro + React
- Backend: Cloudflare Workers
- Database: PostgreSQL (Neon)
- Hosting: Cloudflare Pages
- Budget: Gratis

## FITUR UTAMA
1. Website publik (profil sekolah, pengumuman, kontak)
2. Login multi-role
3. Dashboard admin (manage all)
4. Portal guru (input nilai, absensi)
5. Portal siswa (lihat nilai, jadwal)
6. Manajemen jadwal pelajaran
7. Laporan (PDF export)

## USER ROLES
| Role | Akses |
|------|-------|
| Admin | Full access |
| Guru | Nilai, absensi, jadwal |
| Siswa | View only |

## SECURITY
- [x] Basic Auth
- [ ] OAuth
- [ ] 2FA
- [x] RBAC

## INTEGRATIONS
- Storage: Cloudflare R2
```

### Contoh 2: Android App

```
## PROJECT BRIEF
- Nama: MyFinance
- Deskripsi: Aplikasi pencatatan keuangan pribadi dengan budgeting dan analytics
- Tipe: Mobile App (Android)
- Target Users: Individu yang ingin track pengeluaran

## TECH STACK
- Language: Kotlin
- Frontend: Jetpack Compose
- Backend: Firebase
- Database: Firestore
- Hosting: Firebase Hosting (web dashboard)
- Budget: Gratis

## FITUR UTAMA
1. Catat pemasukan/pengeluaran
2. Kategorisasi transaksi
3. Budget per kategori
4. Grafik analytics bulanan
5. Recurring transactions
6. Export ke CSV

## USER ROLES
| Role | Akses |
|------|-------|
| User | Full access to own data |

## SECURITY
- [x] Basic Auth
- [x] OAuth (Google)
- [ ] 2FA
- [ ] RBAC

## INTEGRATIONS
- Analytics: Firebase Analytics
- Crash Report: Firebase Crashlytics
```

---

**Last Updated**: 2025-12-20
