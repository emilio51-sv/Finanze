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
- **Giorno del mese finanziario:** **28 del mese** (il ciclo mensile decorre dal giorno 28 del mese corrente al 27 del successivo).
- **Stipendio per ciclo:** L'importo preciso dello stipendio è inserito nelle Impostazioni. Il ciclo viene rilevato automaticamente in base alla data odierna e al giorno stipendio configurato.
- **Vitto e Alloggio:** Non presenti al momento (zero affitto/mutuo/spesa fissa casa).
- **Spese Fisse Ricorrenti:** Quota fissa Auto (250,00 €/mese con addebito il 15 del mese).
- **Risparmio / PAC:** Piano di Accumulo protetto (200,00 €/mese).
- **Spese Variabili tipiche:** Benzina/Carburante, Svago, Acquisti, Lavoro, Salute.

### Formula Maestra del Calcolo:
$$\text{Disponibile Mese} = (\text{Entrata Base} + \text{Entrate Extra}) - \text{Quota PAC Mensile} - \text{Spese Fisse Mensilizzate} - \text{Spese Variabili Fatte}$$

$$\text{Budget di Oggi} = \max\left(0, \frac{\text{Disponibile}}{\text{Giorni Rimanenti nel Ciclo (oggi incluso)}}\right)$$

$$\text{Spesa Attesa ad Oggi} = \frac{\text{Budget Variabile Pianificato}}{\text{Giorni Totali Ciclo}} \times \text{Giorni Trascorsi}$$
$$\text{Ritmo di Marcia} = \text{Spesa Attesa ad Oggi} - \text{Spese Variabili Effettive}$$

---

## 2. VINCOLI TECNICI NON NEGOZIABILI

1. **Zero dipendenze esterne:** Solo HTML5, CSS3 vanilla e JavaScript moderno (ES2020+). Nessun bundler (Webpack/Vite), nessun framework (React/Vue), nessuna CDN. L'app deve funzionare offline al 100%.
2. **Architettura Single-File compatta (`index.html`):** Tutto il CSS e il JS dell'interfaccia sono incapsulati in `index.html` per evitare disallineamenti di cache o mancato caricamento del foglio di stile su GitHub Pages e Safari iOS.
3. **Data Storage sul Dispositivo:** Solo `localStorage` locale con schema dati versionato (`finanze_pwa_master_v3`). Nessun backend, nessun server, nessun account.
4. **Precisione in Centesimi:** Tutti gli importi sono memorizzati come numeri interi (`amountCents`) per evitare errori di virgola mobile; la conversione in euro avviene solo in fase di rendering con `Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" })`.
5. **Date Locali Rigorose:** Date memorizzate sempre in formato `YYYY-MM-DD` calcolate con `getFullYear()`, `getMonth()` e `getDate()` locali (MAI usare `toISOString()` che restituisce UTC e sbaglia fuso orario attorno a mezzanotte).
6. **Ottimizzazioni iOS / Safari:**
   - Meta tag: `viewport-fit=cover`, `maximum-scale=1.0`, `user-scalable=no`.
   - Font-size input $\ge 16\text{px}$ per impedire lo zoom automatico di Safari.
   - `-webkit-tap-highlight-color: transparent` e `touch-action: manipulation`.
   - Supporto safe-area: `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.

---

## 3. DESIGN SYSTEM (COPILOT MONEY & APPLE DESIGN AWARD AESTHETICS)

L'estetica è ispirata alla celebre app iOS **Copilot Money**:
- **Sfondo & Atmosfera:** Mesh gradient d'atmosfera celeste chiarissimo in alto (`#CDE2FF` $\rightarrow$ `#F4F6FA`) che sfuma dolcemente verso il basso.
- **Card "Puffy Pillows":** Superfici bianco ottico (`#FFFFFF`) con bordi morbidi (`border-radius: 26px`), bordo hairline invisibile (`0.5px solid rgba(17,24,39,0.05)`) e ombra soffice multistrato (`--shadow-puffy`).
- **Tipografia:** `-apple-system` puro (SF Pro Display / Text), pesi slanciati (`600` / `400`), assenza di grassetti pesanti o font "rounded" infantili. Titolo "Finanze" in *Large Title* nativo iOS con data ciclo sottile e discreta sotto.
- **Dock Bar Sospesa (5 Slot Simmetrici):**  
  Layout diviso esattamente in 5 colonne (20% ciascuna):
  `[ Oggi ]` `[ Movimenti ]` `[ + Centrale ]` `[ Fisse & PAC ]` `[ Menu ]`.  
  Il tasto `+` è matematicamente al centro geometrico: cerchio blu elettrico Copilot (`#0066FF`, 44x44px) con icona bianca, leggermente rialzato con ombra morbida.

---

## 4. STRUTTURA DELLE SCHERMATE E FUNZIONALITÀ ATTIVE

### A. Scheda "Oggi" (Dashboard)
- **Hero Card Disponibile:** Cifra monumentale pulita (€, intero, decimali attenuati) e barra di avanzamento satinata graduata.
- **Duo Metriche:** *Budget di Oggi* (dinamico, si auto-regola) e *Ritmo di Spesa* (verde se in anticipo, rosso se sopra la media).
- **Spese per Categoria:** Anelli di attività orizzontali stile Copilot/Apple Watch con icona al centro e importo REALE speso nel ciclo. (Scompare in automatico se si attiva la Modalità Rapida).
- **Composizione Ciclo:** Estratto sintetico delle entrate previste, quota PAC, spese fisse ammortizzate e uscite registrate.
- **Attività Recenti:** Lista delle ultime 5 transazioni.

### B. Scheda "Movimenti"
- **Andamento Grafico:** Card in cima con istogramma a barre verticali giorno per giorno delle ultime 2 settimane e media giornaliera calcolata.
- **Selettore Mese:** Navigazione `‹ Mese ›` tra i cicli passati e futuri.
- **Filtri:** Ricerca testuale live e filtro per categoria.
- **Lista Raggruppata:** Movimenti ordinati per giorno con subtotale giornaliero. Tocco su un movimento per aprirlo in modifica o cancellarlo.

### C. Scheda "Fisse & PAC"
- **Sottotab Spese Fisse:** Gestione di rate, canoni e spese periodiche con supporto a frequenza **mensile**, **trimestrale (/3)** e **annuale (/12)** (ammortamento automatico).
- **Sottotab PAC & Target:** Gestione piani di accumulo e riserva con quota mensile accantonata e totale raggiunto.

### D. Scheda "Menu / Impostazioni"
- **Modalità Rapida (Switch Toggle):** Se attivata, nasconde le categorie sia dalla Home che dal form di inserimento, permettendo di registrare uscite digitando solo la cifra al volo in 1 tocco.
- **Parametri Ciclo:** Modifica del giorno di stipendio (default: 28) e dell'importo preciso dello stipendio del ciclo rilevato automaticamente.
- **Dati & Salvataggio:**
  - Card orizzontale iOS pulita con icona e data dell'ultimo salvataggio per esportare il file `finanze-backup-YYYY-MM-DD.json`.
  - Voce isolata in basso in rosso testuale per **"Azzera tutti i dati"** con doppia conferma.

### E. Bottom Sheet di Inserimento Rapido (Tasto +)
- Switch rapido Uscita / Entrata Extra.
- Tastierino grande `inputmode="decimal"` con focus automatico.
- Mosaico categorie a 8 chip con icone SVG pure (Benzina, Auto, Svago, Acquisti, Servizi, Salute, Lavoro, Varie) — nascosto in Modalità Rapida.
- Data odierna preimpostata e descrizione facoltativa.
- Banner "Annulla" per 5 secondi per annullare all'istante l'inserimento in caso di errore.

---

## 5. STATO DEI FILE DEL REPOSITORY

- `index.html`: File principale unico contenente tutto l'HTML, il CSS in blocco `<style>` e la logica JS in blocco `<script>`.
- `manifest.json`: Configurazione PWA standalone con icone SVG Data-URI.
- `sw.js`: Service worker per il funzionamento offline e pulizia automatica delle vecchie cache.
- `.nojekyll`: File vuoto che impedisce a GitHub Pages di ignorare file di sistema.
