---
status: accepted
---

# Gunakan node:sqlite dan node --test Bawaan Node.js v24

Backend menggunakan modul bawaan **`node:sqlite` (`DatabaseSync`)** dengan kueri SQL murni untuk akses SQLite dan **`node --test`** sebagai *test runner* resmi, alih-alih `better-sqlite3` dan `jest` yang sebelumnya tercantum sebagai placeholder di `package.json`.

## Considered Options

- **Driver SQLite**: Memilih `node:sqlite` daripada `better-sqlite3` karena sudah tersedia langsung di Node.js `v24.21.0` tanpa dependensi eksternal maupun risiko gagal kompilasi addon native C++ (`node-gyp`) di Windows.
- **Test Runner**: Memilih `node --test` daripada `jest` untuk menghindari konfigurasi eksperimental ESM (`--experimental-vm-modules`) terhadap modul bawaan `node:sqlite`.

## Consequences

- Saat mengimplementasikan backend nanti, skrip `"test"` di `backend/package.json` perlu diperbarui dari `"jest"` menjadi `"node --test"`.
- Node.js v24 dapat menampilkan peringatan *experimental* sekali saat `node:sqlite` dimuat.
