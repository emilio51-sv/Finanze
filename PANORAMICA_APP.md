# 📱 Finanze App — Panoramica Completa del Progetto

> **Documento di Handover Tecnico e di Prodotto**  
> **Repository GitHub:** `emilio51-sv/Finanze`  
> **Hosting Live:** `https://emilio51-sv.github.io/Finanze/`  
> **Target:** PWA iOS nativa per iPhone (Safari "Aggiungi alla schermata Home").

---

## 1. VISIONE E MODELLO FINANZIARIO

L'app risponde a UNA sola domanda quotidiana in meno di 2 secondi:  
**"Quanto posso spendere questo mese e oggi?"**

### Profilo Utente Attuale:
- **Ciclo stipendio:** Ogni ciclo decorre dalla data effettiva di un accredito alla vigilia del successivo. Data e importo si registrano per ogni stipendio; fino al prossimo accredito il termine del ciclo è stimato automaticamente a circa un mese.
- **Avanzo e debito:** Quando viene registrato il nuovo accredito, il ciclo precedente si chiude e il suo saldo viene salvato con uno snapshot immutabile: l'avanzo confluisce nei risparmi e il disavanzo viene riportato come debito. Modifiche successive a spese fisse, PAC o movimenti non alterano i cicli già chiusi.
- **Vitto e Alloggio:** Non presenti al momento (zero affitto/mutuo/spesa fissa casa).
- **Spese Fisse Ricorrenti:** Quota fissa Auto (250,00 €/mese con addebito il 15 del mese).
- **Risparmio / PAC:** Piano di Accumulo protetto (200,00 €/mese).
- **Spese Variabili tipiche:** Benzina/Carburante, Svago, Acquisti, Lavoro, Salute.

### Formula Maestra del Calcolo:
$$\text{Disponibile Ciclo} = (\text{Entrata Base} + \text{Entrate Extra}) - \text{Quota PAC per ciclo} - \text{Spese Fisse per ciclo} - \text{Spese Variabili Fatte} - \text{Debito riportato}$$

$$\text{Budget di Oggi} = \max\left(0, \frac{\text{Disponibile}}{\text{Giorni Rimanenti nel Ciclo (oggi incluso)}}\right)$$

$$\text{Spesa Attesa ad Oggi} = \frac{\text{Budget Variabile Pianificato}}{\text{Giorni Totali Ciclo}} \times \text{Giorni Trascorsi}$$
$$\text{Ritmo di Marcia} = \text{Spesa Attesa ad Oggi} - \text{Spese Variabili Effettive}$$

---

## 2. VINCOLI TECNICI NON NEGOZIABILI

1. **Zero dipendenze esterne:** Solo HTML5, CSS3 vanilla e JavaScript moderno (ES2020+). Nessun bundler (Webpack/Vite), nessun framework (React/Vue), nessuna CDN. L'app deve funzionare offline al 100%.
2. **Moduli ES nativi, senza build:** `index.html` contiene solo la struttura e lo script del tema; CSS in `css/app.css`, logica in `js/` caricata con `<script type="module">`. Per evitare file di versioni diverse mescolati in cache, il service worker scarica tutti i file insieme in una cache versionata (`CACHE` in `sw.js`, con `cache: "reload"`): **ogni modifica a un file richiede di alzare `CACHE`** e ogni nuovo file va aggiunto ad `ASSETS` (un test lo verifica). In locale l'app va aperta da un server (es. `python3 -m http.server`), non con doppio clic: i moduli non funzionano da `file://`.
3. **Data Storage sul Dispositivo:** Solo `localStorage`, chiave `finanze_pwa_master_v3` (invariata per compatibilità), con versione dello schema nel campo `version` (attuale: **4**). Ogni caricamento e ogni import passano da `migrate()`: valori predefiniti, conversione dei formati vecchi, importi resi interi e record non validi spostati in `quarantine` invece di essere persi. Prima di una migrazione di versione la copia grezza resta in `finanze_pwa_premigration_v<n>`. Nessun backend, nessun server, nessun account.
4. **Precisione in Centesimi:** Tutti gli importi sono memorizzati come numeri interi (`amountCents`) per evitare errori di virgola mobile; la conversione in euro avviene solo in fase di rendering con `formatValuta()`, che produce sempre il formato `1.234,56 €` con separatore delle migliaia e segno meno tipografico (`−`). Gli importi digitati passano da `parseEuroToCents()`, che accetta `1.234,56`, `1234.56` e `25`.
5. **Date Locali Rigorose:** Date memorizzate sempre in formato `YYYY-MM-DD` calcolate con `getFullYear()`, `getMonth()` e `getDate()` locali (MAI usare `toISOString()` che restituisce UTC e sbaglia fuso orario attorno a mezzanotte).
6. **Ottimizzazioni iOS / Safari:**
   - Meta tag: `viewport-fit=cover`. Lo zoom resta consentito per accessibilità (WCAG 1.4.4).
   - Font-size input $\ge 16\text{px}$ per impedire lo zoom automatico di Safari.
   - `-webkit-tap-highlight-color: transparent`.
   - Supporto safe-area: `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
   - Tema applicato da uno script nel `<head>` prima del primo disegno, per evitare lampi di colore.

---

## 3. DESIGN SYSTEM (LIQUID GLASS · v4)

- **Due temi:** *Lumen* (chiaro: sfera iridescente, anello conico e capsula dietro il vetro, su sfondo lavanda) e *Obsidian* (scuro: luci blu e magenta, prisma conico, griglia sottile). Il tema segue il sistema oppure la scelta in Menu → Aspetto (`settings.theme`: `auto` · `light` · `dark`).
- **Materiale vetro (`.gl`):** gradiente semitrasparente con grana, `backdrop-filter: blur(18px) saturate(1.9)`, bordo luminoso in maschera sugli angoli e riflesso radiale in alto. Le forme della scena sono nitide, così il vetro le sfoca e le deforma in modo visibile.
- **Token:** tutti i colori sono variabili CSS in `:root` (Lumen) e ridefiniti in `:root[data-theme="dark"]` (Obsidian). Accento a gradiente `--a1 → --a2`; colori semantici `--pos`, `--neg`, `--warn` separati dall'accento.
- **Tipografia:** font di sistema (SF Pro su iOS), nessun font esterno. Cifre tabulari ovunque.
- **Dock:** capsula di vetro flottante con 4 tab (`Oggi`, `Movimenti`, `Fisse & PAC`, `Menu`) e una lente che scivola sulla tab attiva; il `+` è un cerchio separato a destra.
- **Accessibilità:** focus visibile, contrasto AA sul testo secondario, `aria-current` sulla tab attiva, fogli con `role="dialog"` e app sottostante `inert`, chiusura con Esc, righe utilizzabili da tastiera, rispetto di `prefers-reduced-motion` e `prefers-reduced-transparency`.

---

## 4. STRUTTURA DELLE SCHERMATE E FUNZIONALITÀ ATTIVE

### A. Scheda "Oggi" (Dashboard)
- **Barra in alto:** avatar (apre il Menu), ricerca movimenti, occhio per nascondere gli importi (`settings.maskAmounts`), `+`.
- **Card di primo avvio:** compare finché non è registrato uno stipendio maggiore di zero e porta ai parametri.
- **Hero Disponibile:** cifra animata, stato (In linea · Sopra il ritmo · In deficit), frase con speso e budget variabile, grafico della spesa cumulata con linea del budget e proiezione a fine ciclo (rossa se supera il budget), esplorabile col dito; barra di avanzamento e giorni rimasti.
- **Quattro metriche:** *Budget oggi*, *Ritmo mese*, *Spesa a fine ciclo*, *Resto stimato*.
- **Risparmi accantonati:** avanzi dei cicli chiusi.
- **Piani di accumulo:** quota mensile, accantonato e barra verso l'obiettivo (`targetCents`).
- **Spese per categoria:** barra a segmenti e righe con percentuale; le categorie senza spese sono raccolte dietro "Mostra tutte". Toccare una categoria apre i suoi movimenti. Nascosta in Modalità Rapida.
- **Composizione Ciclo:** entrate, debito riportato, PAC, spese fisse ammortizzate, uscite variabili.
- **Attività Recenti:** ultime 5 transazioni, ordinate per data (la più recente in alto) e, a parità di data, per ora di inserimento.

### B. Scheda "Movimenti"
- **Selettore ciclo:** `‹ Mese ›` con intervallo date; il calcolo del mese di riferimento non salta più il 29–31.
- **Andamento Grafico:** istogramma degli ultimi 14 giorni trascorsi del ciclo e media giornaliera (sui cicli conclusi conta l'intero ciclo), totale uscite ed entrate extra.
- **Filtri:** ricerca su nota e nome categoria, filtro per categoria.
- **Lista Raggruppata:** movimenti per giorno con subtotale. Tocco per modificare o eliminare (eliminazione annullabile).

### C. Scheda "Fisse & PAC"
- **Spese Fisse:** frequenza **mensile**, **trimestrale (/3)** e **annuale (/12)**; per le non mensili è mostrata la quota mensile. Totale mensile accantonato.
- **PAC & obiettivi:** nome, quota mensile, già accantonati, obiettivo finale opzionale. Totale mensile protetto.

### D. Scheda "Menu"
- **Profilo:** foto (ritagliata a 256 px), ciclo attuale.
- **Aspetto:** Automatico · Chiaro · Scuro.
- **Modalità Rapida.**
- **Parametri Ciclo:** data e importo di ogni accredito.
- **Dati & Salvataggio:** backup JSON, **ripristino da backup** (con validazione e conferma), **"Azzera tutti i dati"** che scarica prima un backup e chiede di scrivere AZZERA.

### E. Foglio di Inserimento (Tasto +)
- Uscita / Entrata extra (il titolo del foglio segue la scelta).
- Importo grande con errore visibile se vuoto o zero.
- **Inserimento vocale** con riconoscimento di numeri composti ("venticinque e cinquanta", "duemilacinquecento", "dodici euro e trenta centesimi").
- 8 categorie con icona e colore propri, nascoste in Modalità Rapida.
- Data odierna preimpostata e descrizione facoltativa.
- Toast "Annulla" per 5 secondi dopo inserimento ed eliminazione.

---

## 5. STRUTTURA DEL CODICE

```
index.html            struttura HTML, script del tema nel <head>, <script type="module" src="js/app.js">
css/app.css           token Liquid Glass v4, materiale vetro, componenti
js/app.js             avvio: crea lo Store, collega le schermate, navigazione, service worker
js/core/              calcolo PURO: nessun DOM, nessuno storage, la data è sempre un argomento
  money.js            formatValuta, parseEuroToCents, limiti sugli importi
  dates.js            date locali YYYY-MM-DD
  cycle.js            cicli di stipendio e giorni del ciclo
  budget.js           disponibile, budget di oggi, ritmo, chiusura cicli, debito, proiezioni, liste
  voice.js            importi detti a voce in italiano
js/data/              livello dati
  schema.js           versione dello schema, chiavi, valori iniziali
  migrate.js          migrazioni e pulizia idempotente
  validate.js         controlli su importi digitati, record e backup
  store.js            unico accesso a localStorage (storage e orologio iniettabili)
js/ui/                una schermata per modulo: home, movimenti, fisse, menu, forms (fogli), sheets, theme, toast
tests/                test con node:test, nessuna dipendenza
```

Regole: la logica di calcolo vive solo in `js/core` ed è coperta da test; l'interfaccia legge i numeri da lì e non ricalcola nulla. Nessun modulo di `js/ui` scrive in `localStorage` direttamente: passa sempre dallo `Store`.

**Test:** `npm test` (Node 22, nessun pacchetto da installare). GitHub Actions li esegue a ogni push e pull request con fuso `Europe/Rome` e `UTC`.

**Per cambiare la forma dei dati:** alzare `SCHEMA_VERSION` in `schema.js`, aggiungere un passo in `STEPS` di `migrate.js` e un test in `tests/data.test.js`.

## 6. ALTRI FILE DEL REPOSITORY

- `manifest.json`: Configurazione PWA standalone con icone SVG Data-URI.
- `sw.js`: Service worker con cache versionata di tutti i file e pulizia automatica delle vecchie cache.
- `.nojekyll`: File vuoto che impedisce a GitHub Pages di ignorare file di sistema.
