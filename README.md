# ShopPal

Zajednički popis za kupovinu za dvoje (ili više) — Expo / React Native, Android i iOS.
Što god jedno upiše, drugo odmah vidi na svom mobitelu.

## Mogućnosti

- **Kućanstvo s kodom** — jedno napravi kućanstvo i dobije kod od 6 znakova, drugo ga upiše. Bez emaila i lozinki
  (anonimna Firebase prijava).
- **Više popisa** — npr. Namirnice, Lidl, dm; artikli se mogu premjestiti s popisa na popis.
- **Brzi unos** — artikl se odmah sprema i pojavljuje kod oboje, automatski razvrstan po odjelu trgovine
  (voće i povrće, pekara, mliječni…), uz ime onoga tko ga je dodao.
- **U trgovini** — dodir označi artikl kupljenim ("U košarici"), "Očisti kupljeno" ih makne.
  Gumb **"Idem u trgovinu"** drugoj osobi prikaže "Ana je u trgovini", da zna da još može dodati stvari.
- **Prijedlozi** — aplikacija pamti kad se što kupuje; kad nešto kupite barem dvaput, predloži ga kad prođe
  uobičajeni razmak (npr. mlijeko svakih 5 dana), plus brzi izbor često kupljenog.

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
```

`key` je normalizirani naziv artikla (mala slova, bez dijakritika). Vremena su milisekunde (`Date.now()`).
Pravila pristupa su u [`firestore.rules`](firestore.rules): samo članovi kućanstva čitaju i pišu, a tko zna kod
može se samo dodati u članove.
