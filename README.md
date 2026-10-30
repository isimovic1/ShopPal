# ShopPal

Zajednička aplikacija za kućanstvo za dvoje (ili više) — Expo / React Native, Android, iOS i web.
Popis za kupovinu, mjesečni računi, kućanski poslovi i jela koja želite skuhati. Što god jedno upiše,
drugo odmah vidi na svom mobitelu.

## Mogućnosti

- **Kućanstvo s kodom** — jedno napravi kućanstvo i dobije kod od 6 znakova, drugo ga upiše. Bez emaila i lozinki
  (anonimna Firebase prijava).
- **Više popisa** — npr. Namirnice, Lidl, dm; artikli se mogu premjestiti s popisa na popis.
- **Brzi unos** — artikl se odmah sprema i pojavljuje kod oboje, automatski razvrstan po odjelu trgovine
  (voće i povrće, pekara, mliječni…), uz ime onoga tko ga je dodao.
- **U trgovini** — dodir označi artikl kupljenim ("U košarici"), "Očisti kupljeno" ih makne.
  Gumb **"Idem u trgovinu"** drugoj osobi prikaže "Ana je u trgovini", da zna da još može dodati stvari.
- **Prijedlozi** — aplikacija pamti kad se što kupuje; kad nešto kupite barem dvaput, predloži ga kad prođe
  uobičajeni razmak (npr. mlijeko svakih 5 dana), plus brzi izbor često kupljenog (link "💡 Prijedlozi" na Popisu).
- **Računi** — mjesečni (najam, struja, internet…) ili jednokratni računi s danom dospijeća. Za svaki mjesec
  kvačicom označite plaćeno/neplaćeno i vidi se **tko je platio** i kad; neplaćeni nakon roka su crveni.
  Mjesečni račun se sam pojavljuje svaki mjesec s *uobičajenim iznosom*; dodir na iznos postavlja **iznos samo za
  taj mjesec** (npr. struja ovaj mjesec 63,40 €), uz opciju "Spremi i kao uobičajeni iznos". Pregled mjeseca:
  ukupno, plaćeno, ostalo i koliko je tko platio.
- **Poslovi** — kućanski poslovi (čišćenje, smeće, usisavanje…): kome je dodijeljen (ili bilo kome), rok i
  ponavljanje (svaki dan / tjedan / mjesec). Kad se ponavljajući posao obavi, rok se pomakne na sljedeći termin
  (zadržava ritam i kad kasni) i zapamti tko ga je zadnji napravio. Grupe Kasni / Danas / Uskoro / Bez roka,
  filtar Svi / Moji / partner.
- **Jela** — popis jela koja želite skuhati da se ne zaborave: naziv, **link na recept** (Instagram, TikTok,
  YouTube, bilo koja stranica — može se zalijepiti cijeli podijeljeni tekst, link se sam izvuče), sastojci i
  napomena. "Dodaj sastojke na popis" ih prebaci na popis za kupovinu, "Skuhali smo" bilježi kad ste ga
  zadnji put kuhali, a **"🎲 Što danas kuhamo?"** predloži nasumično jelo (češće ona koja dugo niste kuhali).

Push obavijesti (kad netko doda artikl ili krene u trgovinu) planirane su za sljedeću fazu.

## Postavljanje

Firebase projekt: vidi [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Dok nije upisan u `src/lib/firebaseConfig.ts`,
aplikacija prikaže uputu umjesto popisa.

```bash
npm install
npx expo start
npm run typecheck
npm test
```

Svaki push na `develop` pokreće GitHub Actions workflow koji builda Android APK i objavljuje ga pod **Releases**.

## Podaci (Firestore)

```
households/{code}                 name, members {uid: ime}, createdAt, shopping {uid, name, since} | null
households/{code}/lists/{id}      name, order, createdAt
households/{code}/items/{id}      listId, name, note?, category, done, addedBy, addedByName, addedAt,
                                  doneBy?, doneByName?, doneAt?
households/{code}/history/{key}   name, category, count, lastBought, purchases [zadnjih 10 vremena]
households/{code}/bills/{id}      name, amount? (uobičajeni iznos), dueDay?, repeat 'monthly'|'once', month?
                                  ('YYYY-MM' za jednokratne), note?, createdBy, createdAt
households/{code}/billMonths/{billId}_{YYYY-MM}
                                  billId, month, amount? (iznos samo za taj mjesec), paid?, paidBy?, paidByName?, paidAt?
households/{code}/tasks/{id}      title, note?, assignedTo (uid | null), repeat 'none'|'daily'|'weekly'|'monthly',
                                  dueDate? ('YYYY-MM-DD'), done, doneBy?, doneByName?, doneAt?,
                                  lastDoneBy?, lastDoneByName?, lastDoneAt?, createdBy, createdAt
households/{code}/meals/{id}      title, link?, ingredients? (jedan po retku), note?, addedBy, addedByName,
                                  createdAt, lastCooked?, cookedCount
```

Iznos računa za mjesec je `billMonths.amount` ako je postavljen, inače `bills.amount`.
`key` je normalizirani naziv artikla (mala slova, bez dijakritika). Vremena su milisekunde (`Date.now()`).
Pravila pristupa su u [`firestore.rules`](firestore.rules): samo članovi kućanstva čitaju i pišu, a tko zna kod
može se samo dodati u članove.
