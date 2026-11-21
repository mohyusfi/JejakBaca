# Issue tracker: GitHub

Issues dan spesifikasi untuk repo ini (`mohyusfi/project-based2-api`) dikelola sebagai GitHub Issues. Gunakan `gh` CLI untuk seluruh operasi.

> **Bahasa**: Seluruh judul issue, deskripsi/body, spesifikasi, dan komentar **wajib ditulis dalam Bahasa Indonesia**.

## Konvensi

- **Buat issue**: `gh issue create --repo mohyusfi/project-based2-api --title "..." --body "..."`. Gunakan heredoc untuk body multi-baris.
- **Baca issue**: `gh issue view <number> --repo mohyusfi/project-based2-api --comments`, filter komentar dengan `jq` dan ambil juga labelnya.
- **Daftar issue**: `gh issue list --repo mohyusfi/project-based2-api --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` dengan filter `--label` dan `--state` yang sesuai.
- **Komentar di issue**: `gh issue comment <number> --repo mohyusfi/project-based2-api --body "..."`
- **Tambah / hapus label**: `gh issue edit <number> --repo mohyusfi/project-based2-api --add-label "..."` / `--remove-label "..."`
- **Tutup issue**: `gh issue close <number> --repo mohyusfi/project-based2-api --comment "..."`

Jika `gh` dijalankan di dalam clone repo yang sudah memiliki `git remote -v` ke `git@github.com:mohyusfi/project-based2-api.git`, flag `--repo` dapat diabaikan.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Ubah ke `yes` jika repo ini memperlakukan PR eksternal sebagai feature request; `/triage` membaca flag ini.)_

## Saat skill meminta "publish to the issue tracker"

Buat GitHub issue baru dalam Bahasa Indonesia.

## Saat skill meminta "fetch the relevant ticket"

Jalankan `gh issue view <number> --repo mohyusfi/project-based2-api --comments`.

## Wayfinding operations

Digunakan oleh `/wayfinder`. **Map** adalah satu issue dengan **child** issue sebagai tiket.

- **Map**: satu issue berlabel `wayfinder:map`, berisi Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Child ticket**: issue yang ditautkan ke map sebagai GitHub sub-issue (`gh api` pada endpoint sub-issues). Jika sub-issues tidak aktif, tambahkan child ke task list di body map dan tulis `Part of #<map>` di bagian atas body child. Label: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Setelah diklaim, tugaskan ke dev yang mengerjakan.
- **Blocking**: **native issue dependencies** GitHub. Tambahkan edge dengan `gh api --method POST repos/mohyusfi/project-based2-api/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, di mana `<blocker-db-id>` adalah **database id** numerik blocker (`gh api repos/mohyusfi/project-based2-api/issues/<n> --jq .id`, bukan `#number` atau `node_id`).
- **Frontier query**: daftar child terbuka dari map (`gh issue list --state open`), kecualikan yang memiliki blocker terbuka (`issue_dependencies_summary.blocked_by > 0`) atau sudah memiliki assignee; urutan pertama di map yang dipilih.
- **Claim**: `gh issue edit <n> --add-assignee @me`, sebagai write pertama di sesi.
- **Resolve**: `gh issue comment <n> --body "<jawaban>"`, lalu `gh issue close <n>`, lalu tambahkan ringkasan + link ke Decisions-so-far di map.
