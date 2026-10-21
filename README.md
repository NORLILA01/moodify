# Moodify

Latihan respons konflik sekolah dengan bimbingan guru untuk remaja Malaysia berumur 13–15 tahun. Paparan dan bimbingan AI tersedia dalam Bahasa Melayu dan English.

Laman: https://norlila01.github.io/moodify/

Moodify ialah demonstrasi pada tahap reka bentuk. Keberkesanan pendidikan belum diuji. Pengesan setempat masih untuk bahasa Inggeris; BM/campuran bahasa dan RAG belum dilaksanakan.

## Jalankan

`python3 -m http.server 8765 --directory docs`

Buka http://localhost:8765. Bahasa paparan boleh ditukar melalui BM/EN. Draf diperiksa dalam pelayar; bimbingan AI pilihan menghantar draf kepada Worker Cloudflare dan OpenRouter. Jangan masukkan maklumat peribadi. Draf, renungan dan revisi tidak disimpan oleh aplikasi; pilihan bahasa disimpan dalam pelayar.

## AI

Endpoint: https://moodify.norlilachngwork.workers.dev/coach

Secret OPENROUTER_API_KEY disimpan dalam Cloudflare sahaja. Tiada secret dibundel dalam repositori. ALLOWED_ORIGINS mesti menyenaraikan origin tepat, tanpa path atau slash hujung. CORS Production: `http://localhost:8765,https://norlila01.github.io`. Preflight origin GitHub Pages disahkan 204 dengan Allow-Origin tepat pada 21 Oktober 2026. GitHub Pages menerbitkan branch `main`, folder `/docs` melalui HTTPS.

## Sumber dan lesen

Adaptasi kandungan daripada Think Before You Send oleh drMurtadha: https://github.com/drMurtadha/think-before-you-send, asas commit 007a51799f4d955647dff3a31a52bb20ea85a827. Lesen kod MIT dan notis asal dikekalkan dalam LICENSE. Identiti dan naratif Moodify oleh Norlila Binti Amin Chng bersama Zakiah Binti Mohamad Ashari, Universiti Teknologi Malaysia.

Logik engine, model dan prompt asal dikekalkan. Perubahan ialah kandungan BM/EN, markup/gaya dan konfigurasi alamat Worker serta origin CORS.

## Pengujian

`node --test tests/site.test.mjs` (memerlukan jsdom atau JSDOM_PATH)

`node --test worker/worker.test.mjs`

Asas: 28 ujian laman dan 14 Worker lulus. Dua panggilan AI sebenar BM/EN pada localhost berjaya pada 21 Oktober 2026. Ujian ini bukan penilaian menyeluruh terhadap ketepatan, bias atau keberkesanan pendidikan.

## Pengesahan laman sebenar 21 Oktober 2026

Laman awam https://norlila01.github.io/moodify/ berjaya diterbitkan. Ujian pelayar pada laman itu lulus bagi pemuatan pengesan/model, semakan mesej biasa, pemilihan senario, draf ditandakan, pertukaran bahasa tanpa kehilangan draf/renungan, perbandingan revisi, reset dan navigasi slaid BM/EN. Dua permintaan bimbingan AI sebenar dibuat melalui butang laman (BM dan EN), menggunakan draf rekaan bahasa Inggeris yang sama; kedua-duanya memaparkan empat medan cadangan dalam bahasa sasaran.

Contoh petua BM: “Anda boleh huraikan apa yang berlaku tanpa mengecam orang”. Contoh petua EN: “Describe the specific action needed instead of insulting”. Hasil ini mengesahkan integrasi bagi sampel ujian, bukan ketepatan atau keselamatan semua respons. Bahasa pengesan kekal bahasa Inggeris.

Kod laman diterbitkan pada commit 7a0422b75d736fcc149805d83e7f2e65524e3e60; rekod itu diikuti pembetulan mudah alih di bawah. API key kekal dalam Cloudflare Secret, bukan kod pelayar atau repositori.

## Semakan mudah alih dan slaid — 21 Oktober 2026

Laman utama BM/EN disemak pada lebar 320/390 piksel; semua lapan slaid disemak dalam BM (390 piksel) dan EN (320 piksel). Kawasan tatal setiap slaid kini berasingan supaya slaid baharu bermula dari atas. Jadual pada telefon kecil dan kontras bahasa dipilih diperbaiki. Pautan CSS diberi versi 20261021-3 untuk mengelakkan gaya lama tersimpan dalam cache. Tiada limpahan mendatar dikesan dalam semakan stabil.

Pembetulan diterbitkan sehingga commit 939ea5af85025b2ae2466b32343ee3834937287e. Enam hash JavaScript/model/Worker kekal sama dengan sebelum semakan ini; lapan aset laman awam sepadan dengan salinan tempatan. Pengujian menggunakan viewport pelayar, bukan peranti fizikal. Ujian AI tidak diulang untuk perubahan rupa ini; keputusan AI terdahulu di atas kekal sebagai rekod ujian sampel.

## Semakan akhir fungsi laman awam — 21 Oktober 2026

Semakan semula berjaya bagi mesej biasa, draf ditandakan, senario, contoh bergilir, butiran teknikal, renungan, revisi dan reset. Pertukaran BM/EN mengekalkan draf, renungan dan revisi serta menterjemahkan keputusan. Semua lapan slaid boleh dilalui maju/mundur dalam kedua-dua bahasa; Next dilumpuhkan pada slaid terakhir.

Dua respons AI sebenar baharu disahkan melalui butang laman, satu dalam BM dan satu dalam EN, menggunakan draf rekaan Inggeris yang sama. Petua BM: “Anda boleh huraikan tugasan yang tidak siap dan minta bantuan”. Petua EN: “Describe the specific action you need without insulting”. Empat medan cadangan lengkap diterima dalam kedua-dua bahasa. Satu permintaan BM tambahan dibuat semasa semakan pertukaran bahasa; penilaian respons yang direkodkan ialah dua respons lengkap di atas.

28 ujian laman dan 14 ujian Worker lulus (42/42). Lapan aset awam sepadan bait demi bait dengan salinan tempatan. Enam hash engine kekal sama. Tiada masalah baharu ditemui dan tiada perubahan kod diperlukan. Kegagalan rangkaian, had kadar, pembatalan permintaan dan paparan teks AI diuji dengan mock dalam regresi; kegagalan perkhidmatan tidak dicetuskan pada produksi. Hasil AI ini ialah ujian integrasi sampel, bukan pengesahan ketepatan semua jawapan; pengesan masih untuk bahasa Inggeris.


## Paparan bukti disembunyikan

Bahagian Bukti dan pautan navigasinya disembunyikan atas permintaan pengguna kerana Moodify belum diuji pada peserta sebenar. Kenyataan batas keberkesanan pada pengenalan kekal. Engine, model, Worker dan slaid tidak diubah.
