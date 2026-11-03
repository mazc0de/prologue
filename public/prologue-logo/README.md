# Prologue — Logo Kit

## Isi
- svg/  : logo vektor (mark, horizontal, vertikal, wordmark, ikon aplikasi), versi light & dark
- png/  : ekspor PNG resolusi tinggi
- favicon/ : favicon.ico (16/32/48), favicon.svg (otomatis light/dark), favicon PNG,
             apple-touch-icon, ikon Android, site.webmanifest

## Pemakaian di <head>
Salin semua isi folder favicon/ ke root situs (folder public/), lalu:

<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#111111">

## Warna
Hijau tua  #116329  (versi gelap: #4AD06F)
Hijau      #2DA44E
Hijau pucat #C9EBCF (versi gelap: #1F4D2E)
Kotak kosong #EBEDF0 (versi gelap: #2A2E33)
Tinta      #111111 / #FFFFFF

## Tipografi
Wordmark: Space Grotesk SemiBold (600), letter-spacing -2%, sudah dikonversi ke outline.
Font berlisensi SIL Open Font License.

## Catatan
- Favicon memakai versi sederhana 4x5 kotak (tanpa kotak kosong) agar tetap tajam di 16 px.
- Ruang kosong minimal di sekitar logo: selebar 1 kotak grid.
