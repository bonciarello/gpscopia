#!/usr/bin/env node
/**
 * Test della logica di conversione coordinate GPS
 * Verifica i criteri di accettazione e casi limite.
 */

const { strictEqual: eq, ok } = require('assert');

// ── Decimal → DMS (stessa logica dell'app) ──
function decimalToDMS(decimal, isLatitude) {
  const absolute = Math.abs(decimal);
  let degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesDecimal);
  let seconds = (minutesDecimal - minutes) * 60;
  let secondsRounded = Math.round(seconds * 10) / 10;

  if (secondsRounded >= 60) {
    secondsRounded = 0;
    minutes += 1;
    if (minutes >= 60) {
      minutes = 0;
      degrees += 1;
    }
  }

  const hemisphere = isLatitude
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');

  const minStr = String(minutes).padStart(2, '0');
  const secStr = secondsRounded.toFixed(1).padStart(4, '0');

  return {
    degrees,
    minutes,
    seconds: secondsRounded,
    hemisphere,
    formatted: `${degrees}°${minStr}′${secStr}″${hemisphere}`
  };
}

// ── DMS → Decimal ──
function dmsToDecimal(degrees, minutes, seconds, hemisphere) {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (hemisphere === 'S' || hemisphere === 'W') decimal = -decimal;
  return Math.round(decimal * 1000000) / 1000000;
}

// ──── TEST ────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

console.log('\nTest conversione Decimal → DMS\n');

// Criterio di accettazione 1
test('41.40338 → 41°24′12.2″N', () => {
  const r = decimalToDMS(41.40338, true);
  eq(r.formatted, '41°24′12.2″N');
  eq(r.degrees, 41);
  eq(r.minutes, 24);
  eq(r.seconds, 12.2);
  eq(r.hemisphere, 'N');
});

// Longitudine positiva
test('12.34567 → 12°20′44.4″E', () => {
  const r = decimalToDMS(12.34567, false);
  eq(r.formatted, '12°20′44.4″E');
  eq(r.hemisphere, 'E');
});

// Valore negativo (Sud)
test('-33.8688 → 33°52′07.7″S', () => {
  const r = decimalToDMS(-33.8688, true);
  eq(r.formatted, '33°52′07.7″S');
  eq(r.hemisphere, 'S');
});

// Valore negativo (Ovest)
test('-77.0369 → 77°02′12.8″W', () => {
  const r = decimalToDMS(-77.0369, false);
  eq(r.formatted, '77°02′12.8″W');
  eq(r.hemisphere, 'W');
});

// Zero
test('0 → 0°00′00.0″N', () => {
  const r = decimalToDMS(0, true);
  eq(r.formatted, '0°00′00.0″N');
});

// Minuti a una cifra (padding)
test('41.0508 → 41°03′02.9″N (padding minuti)', () => {
  const r = decimalToDMS(41.0508, true);
  eq(r.minutes, 3);
  eq(r.formatted, '41°03′02.9″N');
});

// Overflow secondi
test('Overflow secondi: 41.99999 → verifica correttezza', () => {
  const r = decimalToDMS(41.99999, true);
  eq(r.seconds < 60, true);
  eq(r.minutes < 60, true);
  // 0.99999 * 60 = 59.9994 min → 59' + 59.964'' → 60.0'' → overflow → 0'' + 60' → overflow → 42°00′00.0″N
  eq(r.degrees, 42);
  eq(r.minutes, 0);
  eq(r.seconds, 0);
  eq(r.formatted, '42°00′00.0″N');
});

// Valori limite
test('Latitudine 90°', () => {
  const r = decimalToDMS(90, true);
  eq(r.formatted, '90°00′00.0″N');
});

test('Latitudine -90°', () => {
  const r = decimalToDMS(-90, true);
  eq(r.formatted, '90°00′00.0″S');
});

test('Longitudine 180°', () => {
  const r = decimalToDMS(180, false);
  eq(r.formatted, '180°00′00.0″E');
});

test('Longitudine -180°', () => {
  const r = decimalToDMS(-180, false);
  eq(r.formatted, '180°00′00.0″W');
});

console.log('\nTest conversione DMS → Decimal\n');

// Roundtrip
test('Roundtrip: 41°24′12.2″N → decimal → DMS', () => {
  const dec = dmsToDecimal(41, 24, 12.2, 'N');
  eq(dec, 41.403389); // ~41.403389
  const dms = decimalToDMS(dec, true);
  eq(dms.formatted, '41°24′12.2″N');
});

test('Roundtrip: 12°20′44.4″E → decimal → DMS', () => {
  const dec = dmsToDecimal(12, 20, 44.4, 'E');
  eq(dec, 12.345667); // ~12.345667
  const dms = decimalToDMS(dec, false);
  eq(dms.formatted, '12°20′44.4″E');
});

test('DMS con emisfero Sud', () => {
  const dec = dmsToDecimal(33, 52, 7.7, 'S');
  eq(dec, -33.868806);
});

test('DMS con emisfero Ovest', () => {
  const dec = dmsToDecimal(77, 2, 12.8, 'W');
  eq(dec, -77.036889);
});

console.log(`\n${'═'.repeat(40)}`);
console.log(`  Passati: ${passed}  |  Falliti: ${failed}`);
console.log(`${'═'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
