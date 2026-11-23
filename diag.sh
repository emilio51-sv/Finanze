#!/usr/bin/env bash
set -e

echo "=========================================="
echo "   FINANZE PWA - DIAGNOSTICA COMPLETA"
echo "=========================================="
echo ""

# 1. Verifica presenza file chiave
echo "[1] Controllo file del repository:"
files=("index.html" "sw.js" "manifest.json" "styles.css" "app.js")
for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    size=$(wc -c < "$f" | tr -d ' ')
    lines=$(wc -l < "$f" | tr -d ' ')
    echo "  ✔ $f ($size bytes, $lines righe)"
  else
    echo "  ✖ $f (NON PRESENTE)"
  fi
done
echo ""

# 2. Verifica sintassi JSON e JS
echo "[2] Verifica sintassi:"
if [ -f "manifest.json" ]; then
  if command -v jq >/dev/null 2>&1; then
    jq empty manifest.json 2>/dev/null && echo "  ✔ manifest.json: JSON valido" || echo "  ✖ manifest.json: ERRORE SINTASSI JSON"
  elif command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync('manifest.json'))" 2>/dev/null && echo "  ✔ manifest.json: JSON valido" || echo "  ✖ manifest.json: ERRORE SINTASSI JSON"
  else
    echo "  ℹ jq/node non trovati, salto test sintassi JSON"
  fi
fi

if command -v node >/dev/null 2>&1; then
  for jsfile in "sw.js" "app.js"; do
    if [ -f "$jsfile" ]; then
      node --check "$jsfile" 2>/dev/null && echo "  ✔ $jsfile: Sintassi JS valida" || echo "  ✖ $jsfile: ERRORE SINTASSI JS"
    fi
  done
fi
echo ""

# 3. Analisi Viste nel DOM di index.html
echo "[3] Analisi Viste e Componenti in index.html:"
if [ -f "index.html" ]; then
  for view in "view-oggi" "view-movimenti" "view-fisse" "view-impostazioni"; do
    if grep -q "$view" index.html; then
      echo "  ✔ Trovata vista: $view"
    else
      echo "  ✖ MANCA vista: $view"
    fi
  done
  
  # Controllo header/pillola del ciclo
  if grep -qi "28 ott" index.html || grep -qi "ciclo" index.html; then
    echo "  ℹ Sezione ciclo finanziario rilevata nel markup"
  fi
  
  # Controllo service worker registration
  if grep -q "serviceWorker" index.html; then
    echo "  ✔ Registrazione Service Worker presente in index.html"
  else
    echo "  ✖ Registrazione Service Worker ASSENTE in index.html"
  fi
fi
echo ""

# 4. Versione Cache in sw.js
echo "[4] Versione Cache Service Worker:"
if [ -f "sw.js" ]; then
  cache_ver=$(grep -E "(CACHE_NAME|const CACHE|CACHE =)" sw.js || echo "Non trovata stringa standard CACHE")
  echo "  -> $cache_ver"
fi
echo ""

# 5. Estrazione mirata della sezione "Oggi" per il restyling
echo "[5] Generazione estratto per il restyling estetico..."
OUTPUT_FILE="diagnostica_oggi.txt"

{
  echo "=== ESTRATTO SEZIONE OGGI (HEADER + HERO CARD) ==="
  echo ""
  if [ -f "index.html" ]; then
    # Estrae il blocco tra id="view-oggi" e la chiusura della card o l'inizio dei movimenti
    awk '/id="view-oggi"/, /id="ultimi-movimenti"|id="recent-transactions"|class="card"/' index.html | head -n 120
  fi
  echo ""
  echo "=== ESTRATTO STILI PER CARD / DISPONIBILE ==="
  if [ -f "styles.css" ]; then
    grep -E -A 10 "(card|hero|disponibile|budget|ritmo)" styles.css | head -n 80
  else
    # Se il CSS è inline in index.html
    grep -E -A 10 "(\.card|\.hero|\.disponibile|\.budget)" index.html | head -n 80
  fi
} > "$OUTPUT_FILE"

echo "  ✔ File '$OUTPUT_FILE' creato con successo!"
echo "=========================================="
echo "Istruzioni: Apri '$OUTPUT_FILE' o copia il suo contenuto qui."
echo "=========================================="
