#!/usr/bin/env node
/**
 * Comprueba que la web y el shell iOS hablan el mismo puente.
 *
 * El contrato vive en dos lenguajes y ningún compilador ve los dos a la vez:
 * `tsc` valida que la web no emita un mensaje que no declara, pero no sabe si
 * el lado Swift lo atiende. Sin este control, añadir un mensaje nuevo compila,
 * pasa las pruebas, se publica — y en el teléfono no hace nada, en silencio.
 * Ese es exactamente el fallo que un puente entre dos repositorios produce, y
 * la razón por la que el contrato vive del lado web.
 *
 * Dos reglas, y ninguna más:
 *   1. Todo `kind` saliente declarado en TypeScript tiene su `case` en Swift.
 *   2. Todo `kind` que Swift envía está declarado como entrante en TypeScript.
 *
 * Un entrante declarado y todavía sin emisor NO es un error: el contrato puede
 * reservar vocabulario antes de que el shell lo use. Se informa y ya está.
 *
 * Uso: node scripts/check-native-bridge-parity.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRIDGE = 'src/platform/nativeBridge.ts';
const SHELL = 'ios/StructureCo/Sources/WebHostController.swift';

/** Recorta la declaración de un tipo unión hasta la línea en blanco siguiente. */
const unionBlock = (source, typeName) => {
  const start = source.indexOf(`export type ${typeName} =`);
  if (start === -1) return null;
  const end = source.indexOf('\n\n', start);
  return source.slice(start, end === -1 ? source.length : end);
};

const kindsIn = (block) => new Set([...block.matchAll(/kind:\s*'([^']+)'/g)].map((match) => match[1]));

/** Los `case` del `switch` que despacha los mensajes entrantes en Swift. */
const swiftHandledKinds = (source) => {
  const start = source.indexOf('func userContentController');
  if (start === -1) return new Set();
  const end = source.indexOf('\n    // MARK:', start);
  const block = source.slice(start, end === -1 ? source.length : end);
  return new Set([...block.matchAll(/case\s+"([^"]+)"/g)].map((match) => match[1]));
};

/** Los `kind` que Swift construye para enviárselos a la web. */
const swiftSentKinds = (source) =>
  new Set([...source.matchAll(/"kind":\s*"([^"]+)"/g)].map((match) => match[1]));

export const checkBridgeParity = (root = ROOT) => {
  const problems = [];
  const notes = [];

  const bridgePath = path.join(root, BRIDGE);
  if (!existsSync(bridgePath)) return { problems: [`${BRIDGE}: contrato ausente.`], notes };
  const bridge = readFileSync(bridgePath, 'utf8');

  const outboundBlock = unionBlock(bridge, 'NativeOutboundMessage');
  const inboundBlock = unionBlock(bridge, 'NativeInboundMessage');
  if (!outboundBlock) problems.push(`${BRIDGE}: falta \`NativeOutboundMessage\`.`);
  if (!inboundBlock) problems.push(`${BRIDGE}: falta \`NativeInboundMessage\`.`);
  if (problems.length) return { problems, notes };

  const outbound = kindsIn(outboundBlock);
  const inbound = kindsIn(inboundBlock);

  const shellPath = path.join(root, SHELL);
  if (!existsSync(shellPath)) {
    // Sin shell no hay nada que contrastar, y eso es un estado legítimo: el
    // contrato web existe por sí solo.
    notes.push(`${SHELL} no existe; sólo se comprobó que el contrato está bien formado.`);
    return { problems, notes, outbound, inbound };
  }
  const shell = readFileSync(shellPath, 'utf8');

  const handled = swiftHandledKinds(shell);
  const sent = swiftSentKinds(shell);

  for (const kind of [...outbound].sort()) {
    if (!handled.has(kind)) problems.push(`\`${kind}\`: la web lo envía y ${SHELL} no lo atiende.`);
  }
  for (const kind of [...sent].sort()) {
    if (!inbound.has(kind)) problems.push(`\`${kind}\`: ${SHELL} lo envía y ${BRIDGE} no lo declara como entrante.`);
  }
  for (const kind of [...handled].sort()) {
    if (!outbound.has(kind)) problems.push(`\`${kind}\`: ${SHELL} lo atiende y ${BRIDGE} no lo declara como saliente.`);
  }
  for (const kind of [...inbound].sort()) {
    if (!sent.has(kind)) notes.push(`\`${kind}\`: declarado como entrante y todavía sin emisor en el shell.`);
  }

  return { problems, notes, outbound, inbound, handled, sent };
};

/**
 * Un `<a download>` no entrega NADA dentro de un `WKWebView`: no descarga, no
 * avisa, no falla. El usuario toca «exportar» y no pasa absolutamente nada.
 *
 * Por eso toda salida de archivo pasa por `platform/fileDelivery`, que elige la
 * hoja de compartir cuando hay anfitrión nativo. Esta regla impide que una ruta
 * de exportación nueva vuelva al enlace sintético sin darse cuenta: en un
 * navegador seguiría funcionando y la regresión sólo aparecería en el teléfono.
 */
const DELIVERY_OWNER = 'src/platform/fileDelivery.ts';
const ANCHOR_DOWNLOAD = /\.download\s*=/;

const sourceFiles = (root, relative = 'src') => {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(root, child);
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) ? [child] : [];
  });
};

export const checkFileDeliveryOwnership = (root = ROOT) => sourceFiles(root)
  .filter((file) => file !== DELIVERY_OWNER)
  .filter((file) => ANCHOR_DOWNLOAD.test(readFileSync(path.join(root, file), 'utf8')))
  .map((file) => `${file}: entrega un archivo con \`<a download>\`; usa \`${DELIVERY_OWNER}\`, que dentro de un WKWebView es lo único que entrega algo.`);

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { problems: bridgeProblems, notes, outbound = new Set(), inbound = new Set() } = checkBridgeParity();
  const problems = [...bridgeProblems, ...checkFileDeliveryOwnership()];
  for (const note of notes) console.log(`  · ${note}`);
  if (problems.length > 0) {
    console.error(`Puente nativo: ${problems.length} desajuste(s).`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Puente nativo en paridad: ${outbound.size} mensaje(s) saliente(s) y ${inbound.size} entrante(s); toda salida de archivo pasa por ${DELIVERY_OWNER}.`);
}
