# Issue tracker: GitHub

Issue dan spesifikasi untuk repo ini disimpan sebagai GitHub Issues. Gunakan `gh` CLI untuk semua operasi.

> **Bahasa**: Semua judul, isi, dan komentar issue ditulis dalam **Bahasa Indonesia**.

## Konvensi

- **Buat issue**: `gh issue create --title "..." --body "..."`. Gunakan heredoc untuk isi multi-baris.
- **Baca issue**: `gh issue view <nomor> --comments`, filter komentar dengan `jq` dan ambil juga labelnya.
- **Daftar issue**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` dengan filter `--label` dan `--state` yang sesuai.
- **Komentar di issue**: `gh issue comment <nomor> --body "..."`
- **Tambah / hapus label**: `gh issue edit <nomor> --add-label "..."` / `--remove-label "..."`
- **Tutup issue**: `gh issue close <nomor> --comment "..."`

Deteksi repo secara otomatis dari `git remote -v`; `gh` melakukannya otomatis saat dijalankan di dalam clone repo.

## Pull request sebagai permukaan triage

**PRs as a request surface: no.** _(Ubah ke `yes` jika repo ini memperlakukan PR eksternal sebagai permintaan fitur; `/triage` membaca flag ini.)_

Jika disetel ke `yes`, PR mengikuti label dan status yang sama dengan issue menggunakan padanan `gh pr`:

- **Baca PR**: `gh pr view <nomor> --comments` dan `gh pr diff <nomor>` untuk diff.
- **Daftar PR eksternal untuk triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` lalu simpan hanya `authorAssociation` bernilai `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, atau `NONE` (abaikan `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Komentar / label / tutup**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub berbagi satu ruang nomor untuk issue dan PR, sehingga `#42` bisa berupa salah satunya: periksa dengan `gh pr view 42` lalu fallback ke `gh issue view 42`.

## Saat skill menyebut "publish to the issue tracker"

Buat GitHub issue (dalam Bahasa Indonesia).

## Saat skill menyebut "fetch the relevant ticket"

Jalankan `gh issue view <nomor> --comments`.

## Operasi Wayfinding

Digunakan oleh `/wayfinder`. **Map** adalah satu issue dengan **child** issue sebagai tiket.

- **Map**: satu issue berlabel `wayfinder:map`, berisi bagian Catatan / Keputusan sejauh ini / Fog. `gh issue create --label wayfinder:map`.
- **Child ticket**: issue yang ditautkan ke map sebagai GitHub sub-issue (`gh api` pada endpoint sub-issues). Jika sub-issue tidak aktif, tambahkan child ke task list di body map dan tulis `Part of #<map>` di bagian atas body child. Label: `wayfinder:<tipe>` (`research`/`prototype`/`grilling`/`task`). Setelah diklaim, tiket di-assign ke developer yang mengerjakan.
- **Blocking**: **native issue dependencies** GitHub sebagai representasi kanonis yang terlihat di UI. Tambahkan edge dengan `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, di mana `<blocker-db-id>` adalah **database id** numerik milik blocker (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _bukan_ `#number` atau `node_id`). GitHub melaporkan `issue_dependencies_summary.blocked_by` (hanya blocker yang masih terbuka). Jika dependencies tidak tersedia, fallback ke baris `Blocked by: #<n>, #<n>` di bagian atas body child. Tiket terbuka blokirnya jika semua blocker sudah ditutup.
- **Frontier query**: daftar child map yang masih terbuka (`gh issue list --state open`, dalam cakupan sub-issues / task list map), buang yang memiliki blocker terbuka (`issue_dependencies_summary.blocked_by > 0`, atau issue terbuka di baris `Blocked by`) atau sudah memiliki assignee; urutan pertama di map menang.
- **Klaim**: `gh issue edit <n> --add-assignee @me`, sebagai penulisan pertama sesi.
- **Selesaikan**: `gh issue comment <n> --body "<jawaban>"`, lalu `gh issue close <n>`, lalu tambahkan pointer konteks (ringkasan + tautan) ke bagian Keputusan sejauh ini di map.
