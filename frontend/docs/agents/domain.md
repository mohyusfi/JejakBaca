# Domain Docs

Aturan bagaimana engineering skills membaca dokumentasi domain repo ini saat mengeksplorasi codebase.

## Sebelum eksplorasi, baca file berikut

- **`CONTEXT.md`** di root repo, atau
- **`CONTEXT-MAP.md`** di root repo jika ada: file ini menunjuk ke satu `CONTEXT.md` per context (misalnya `frontend` dan `backend`). Baca yang relevan dengan topik.
- **`docs/adr/`**: baca ADR yang menyentuh area yang akan dikerjakan. Di repo multi-context, cek juga `src/<context>/docs/adr/` untuk keputusan khusus context tersebut.

Jika file-file ini belum ada, **lanjutkan saja tanpa error**. Skill `/domain-modeling` (melalui `/grill-with-docs` dan `/improve-codebase-architecture`) akan membuatnya secara bertahap saat istilah atau keputusan sudah disepakati.

## Struktur file

Repo multi-context (monorepo `frontend` & `backend`):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← keputusan tingkat sistem
├── frontend/
│   ├── CONTEXT.md
│   └── docs/adr/                      ← keputusan khusus frontend
└── backend/
    ├── CONTEXT.md
    └── docs/adr/                      ← keputusan khusus backend
```

## Gunakan kosakata glosarium

Saat output menyebut konsep domain (judul issue, proposal refactor, hipotesis, nama test), gunakan istilah sesuai yang didefinisikan di `CONTEXT.md`.

## Tandai konflik ADR

Jika output bertentangan dengan ADR yang sudah ada, sebutkan secara eksplisit:

> _Bertentangan dengan ADR-0007 (...), namun layak dibuka kembali karena…_
