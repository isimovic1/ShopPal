# Postavljanje Firebasea za ShopPal

ShopPal sprema zajednički popis u Firebase (Googleov besplatni "Spark" plan je dovoljan).
Ovo se radi jednom, traje oko 5 minuta i može se napraviti s mobitela u browseru.

1. **Projekt** — otvori <https://console.firebase.google.com>, *Add project* / *Dodaj projekt*,
   ime npr. `shoppal`. Google Analytics nije potreban.
2. **Prijava** — *Build → Authentication → Get started → Sign-in method* → uključi **Anonymous**.
   (Aplikacija svakog korisnika tiho prijavi anonimno; nema emaila ni lozinke.)
3. **Baza** — *Build → Firestore Database → Create database* → **Production mode**,
   lokacija **europe-west** (npr. `europe-west3`, Frankfurt).
4. **Pravila** — u Firestoreu otvori karticu *Rules*, zamijeni sadržaj s datotekom
   [`firestore.rules`](firestore.rules) iz ovog repozitorija i klikni *Publish*.
5. **Web aplikacija** — *Project settings* (zupčanik) → *Your apps* → ikona **`</>`** (Web) →
   nadimak npr. `shoppal` → *Register app* (Hosting nije potreban).
   Prikazat će se `firebaseConfig` objekt s vrijednostima:

   ```
   apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
   ```

6. **Upis u aplikaciju** — tih šest vrijednosti upiši u `src/lib/firebaseConfig.ts`
   (ili ih pošalji pa ih upišem), commit i push na `develop` — GitHub Actions napravi novi APK.

Te vrijednosti nisu tajne (svaka web/mobilna Firebase aplikacija ih sadrži); pristup podacima
kontroliraju pravila iz koraka 4.

Dok konfiguracija nije upisana, aplikacija se pokrene i prikaže poruku da Firebase još nije povezan.
