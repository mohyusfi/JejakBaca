## Agent skills

### Issue tracker

Issues dan spesifikasi untuk repo ini dikelola di GitHub Issues (`mohyusfi/project-based2-api`) menggunakan `gh` CLI dalam Bahasa Indonesia. Lihat `docs/agents/issue-tracker.md`.

### Triage labels

Menggunakan 5 label triage standar (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Lihat `docs/agents/triage-labels.md`.

### Domain docs

Multi-context (monorepo frontend & backend). Lihat `docs/agents/domain.md`.

## Git & Commit

- Seluruh commit message **wajib** ditulis dalam **Bahasa Indonesia** yang jelas dan ringkas.

## Arsitektur & Struktur Folder Frontend

Gunakan pendekatan **Layer-based** di dalam `src/` dengan stack **TanStack Router**, **TanStack Query + `fetch`**, dan **Tailwind CSS**:

- `src/routes/` — File-based routing menggunakan TanStack Router (`__root.tsx`, `index.tsx`, dll.).
- `src/components/` — Komponen UI reusable; primitif UI diletakkan di `src/components/ui/`.
- `src/services/` — Fungsi pemanggil API per resource menggunakan `fetch` wrapper dari `src/lib/api-client.ts`.
- `src/hooks/` — Custom hooks dan TanStack Query hooks (`useQuery`, `useMutation`) yang membungkus `services/`.
- `src/lib/` — Konfigurasi library & utilitas inti (`api-client.ts`, `query-client.ts`).
- `src/types/` — TypeScript interfaces/types global dan DTO API.
- `src/assets/` — Aset statis (gambar, ikon, font).
