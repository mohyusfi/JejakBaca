# Domain Docs

Aturan bagaimana skill engineering membaca dokumentasi domain repo ini saat mengeksplorasi codebase.

## Sebelum eksplorasi, baca file berikut

- **`CONTEXT.md`** di root repo, atau
- **`CONTEXT-MAP.md`** di root repo jika ada: menunjuk ke satu `CONTEXT.md` per konteks. Baca masing-masing yang relevan dengan topik.
- **`docs/adr/`**: baca ADR yang menyentuh area yang akan dikerjakan. Pada repo multi-context, periksa juga `src/<context>/docs/adr/` untuk keputusan khusus konteks.

Jika file-file ini belum ada, **lanjutkan tanpa menampilkan peringatan**. Jangan menandai ketiadaannya atau menyarankan pembuatannya di awal. Skill `/domain-modeling` (yang dipanggil lewat `/grill-with-docs` dan `/improve-codebase-architecture`) akan membuatnya secara malas (*lazy*) saat istilah atau keputusan benar-benar ditetapkan.

## Struktur file

Repo single-context (sebagian besar repo):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

## Gunakan kosakata glosarium

Saat output menamai konsep domain (di judul issue, proposal refactor, hipotesis, nama test), gunakan istilah sesuai definisi di `CONTEXT.md`. Jangan menyimpang ke sinonim yang dihindari glosarium.

Jika konsep yang dibutuhkan belum ada di glosarium, catat untuk `/domain-modeling`.

## Tandai konflik ADR

Jika output bertentangan dengan ADR yang ada, nyatakan secara eksplisit:

> _Bertentangan dengan ADR-0007 (event-sourced orders), namun layak dibuka kembali karena…_
