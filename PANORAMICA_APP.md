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
2. **Architettura Single-File compatta (`index.html`):** Tutto il CSS e il JS dell'interfaccia sono incapsulati in `index.html` per evitare disallineamenti di cache o mancato caricamento del foglio di stile su GitHub Pages e Safari iOS.
3. **Data Storage sul Dispositivo:** Solo `localStorage` locale con schema dati versionato (`finanze_pwa_master_v3`). Nessun backend, nessun server, nessun account.
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
- **Attività Recenti:** ultime 5 transazioni.

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

## 5. STATO DEI FILE DEL REPOSITORY

- `index.html`: File principale unico contenente tutto l'HTML, il CSS in blocco `<style>` e la logica JS in blocco `<script>`.
- `manifest.json`: Configurazione PWA standalone con icone SVG Data-URI.
- `sw.js`: Service worker per il funzionamento offline e pulizia automatica delle vecchie cache.
- `.nojekyll`: File vuoto che impedisce a GitHub Pages di ignorare file di sistema.
