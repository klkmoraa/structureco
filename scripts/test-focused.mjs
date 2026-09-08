#!/usr/bin/env node
/**
 * Ejecutor de pruebas mínimas necesarias según los archivos modificados.
 *
 * Implementa la política de verificación mínima de AGENTS.md:
 * - No ejecutar la suite completa por rutina.
 * - Cambios puramente visuales, estilos, copy o docs no ejecutan suites de tests.
 * - Cambios de código ejecutan únicamente las pruebas directamente relacionadas
 *   con los archivos modificados (o el dominio mínimo afectado si no hay test unitario directo).
 *
 * Uso:
 *   node scripts/test-focused.mjs            # Ejecuta pruebas para archivos modificados
 *   node scripts/test-focused.mjs --all      # Ejecuta toda la suite completa
 *   node scripts/test-focused.mjs <ruta...>  # Ejecuta pruebas para rutas específicas
 */
import { spawnSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

export const resolveVitestCli = () =>
  path.resolve(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

export const runVitest = (targets) => {
  const cli = resolveVitestCli();
  const cliArgs = [cli, 'run', ...targets, '--maxWorkers=1', '--pool=threads', '--no-file-parallelism'];
  const result = spawnSync(process.execPath, cliArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 0;
};

export const getChangedFiles = (cwd = ROOT) => {
  const files = new Set();
  try {
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
    for (const line of status.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.substring(3).split(' -> ');
      const filePath = parts[parts.length - 1].trim();
      if (filePath) files.add(filePath);
    }
  } catch {
    // Si falla git status
  }

  try {
    const diff = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf8' });
    for (const line of diff.split('\n')) {
      const filePath = line.trim();
      if (filePath) files.add(filePath);
    }
  } catch {
    // Ignorar si no hay commits
  }

  return Array.from(files);
};

export const resolveMinTestsForFiles = (changedFiles, cwd = ROOT) => {
  if (changedFiles.length === 0) return { type: 'clean', targets: [] };

  const isDocOnly = (f) => f.startsWith('docs/') || f.startsWith('reports/') || f.endsWith('.md');
  const isStyleOnly = (f) => f.endsWith('.css');
  const isConfigOnly = (f) =>
    f === 'package.json' ||
    f.includes('.config.') ||
    f.startsWith('tsconfig') ||
    f.startsWith('.oxlint') ||
    f.startsWith('.github/');
  const isScriptOnly = (f) => f.startsWith('scripts/') && !f.endsWith('.test.mjs');

  const sourceFiles = changedFiles.filter((f) =>
    (f.startsWith('src/') || f.endsWith('.test.mjs') || f.endsWith('.test.ts') || f.endsWith('.test.tsx')) &&
    !isDocOnly(f) &&
    !isStyleOnly(f)
  );

  if (sourceFiles.length === 0) {
    if (changedFiles.every(isDocOnly)) return { type: 'docs', targets: [] };
    if (changedFiles.every((f) => isStyleOnly(f) || isDocOnly(f))) return { type: 'styles', targets: [] };
    if (changedFiles.every((f) => isConfigOnly(f) || isDocOnly(f) || isScriptOnly(f))) return { type: 'config', targets: [] };
    return { type: 'non-source', targets: [] };
  }

  const testTargets = new Set();

  for (const file of sourceFiles) {
    const fullPath = path.join(cwd, file);

    // 0. Si es un directorio modificado
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      testTargets.add(file);
      continue;
    }

    // 1. Si el archivo modificado ya es un test
    if (/\.(test|spec)\.(ts|tsx|mjs|js)$/.test(file)) {
      if (existsSync(fullPath)) {
        testTargets.add(file);
      }
      continue;
    }

    const dir = path.dirname(file);
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    const fullDir = path.join(cwd, dir);

    let foundExact = false;

    // 2. Buscar tests directos: [base].test.ts(x) o [base].spec.ts(x)
    for (const testExt of ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']) {
      const candidate = path.join(dir, `${basename}${testExt}`);
      if (existsSync(path.join(cwd, candidate))) {
        testTargets.add(candidate);
        foundExact = true;
      }
    }

    // 3. Buscar subtests que compartan prefijo: [base].*.test.ts(x)
    if (existsSync(fullDir)) {
      try {
        const dirEntries = readdirSync(fullDir);
        const prefix = `${basename}.`;
        for (const entry of dirEntries) {
          if (entry.startsWith(prefix) && /\.(test|spec)\.(ts|tsx)$/.test(entry)) {
            testTargets.add(path.join(dir, entry));
            foundExact = true;
          }
        }
      } catch {
        // Ignorar si readdirSync falla
      }
    }

    // 4. Si no hay test exacto, mapear al dominio o carpeta inmediata
    if (!foundExact) {
      if (file.startsWith('src/engine/') || file.startsWith('src/workers/')) {
        testTargets.add('src/engine');
      } else if (file.startsWith('src/space3d/') || file.startsWith('src/features/space3d/')) {
        testTargets.add('src/space3d');
        testTargets.add('src/features/space3d');
      } else if (existsSync(fullDir)) {
        testTargets.add(dir);
      }
    }
  }

  // Deduplicación y optimización de jerarquía:
  // Si un directorio padre ya está en testTargets, omitir archivos hijos dentro de él
  const targets = Array.from(testTargets);
  const dirs = targets.filter((t) => {
    const full = path.join(cwd, t);
    return existsSync(full) && statSync(full).isDirectory();
  });

  const finalTargets = targets.filter((t) => {
    if (/\.(test|spec)\.(ts|tsx|mjs|js)$/.test(t)) {
      for (const d of dirs) {
        if (t.startsWith(d + '/') || t.startsWith(d + path.sep)) {
          return false;
        }
      }
    }
    return true;
  });

  return { type: 'tests', targets: finalTargets };
};

// Si se ejecuta como script principal
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso:
  npm test                         Ejecuta pruebas mínimas para archivos modificados
  npm run test:changed             Igual a npm test
  npm run test:all                 Ejecuta la suite completa de pruebas
  npm test -- <ruta...>            Ejecuta pruebas sobre rutas o archivos específicos

Opciones:
  --all, -a    Ejecutar toda la suite sin filtrar por git diff
  --help, -h   Mostrar esta ayuda
`);
    process.exit(0);
  }

  if (args.includes('--all') || args.includes('-a')) {
    console.log('🚀 Ejecutando la suite completa de pruebas (solicitada explícitamente)...');
    process.exit(runVitest([]));
  }

  const explicitTargets = args.filter((arg) => !arg.startsWith('-'));
  if (explicitTargets.length > 0) {
    const testTargets = [];
    const filesToResolve = [];
    for (const t of explicitTargets) {
      if (t.includes('.test.') || t.includes('.spec.')) {
        testTargets.push(t);
      } else {
        filesToResolve.push(t);
      }
    }
    if (filesToResolve.length > 0) {
      const resolved = resolveMinTestsForFiles(filesToResolve);
      if (resolved.type === 'tests' && resolved.targets.length > 0) {
        testTargets.push(...resolved.targets);
      } else if (resolved.type === 'docs' && testTargets.length === 0) {
        console.log('📄 Objetivos puramente documentales. Pruebas omitidas según AGENTS.md.');
        process.exit(0);
      } else if (resolved.type === 'styles' && testTargets.length === 0) {
        console.log('🎨 Objetivos puramente de estilos/CSS. Pruebas omitidas según AGENTS.md.');
        process.exit(0);
      } else if (resolved.type === 'config' && testTargets.length === 0) {
        console.log('⚙️ Objetivos de scripts o configuración. Pruebas unitarias omitidas según AGENTS.md.');
        process.exit(0);
      } else {
        testTargets.push(...filesToResolve);
      }
    }
    const finalTargets = [...new Set(testTargets)];
    console.log(`🎯 Ejecutando pruebas para objetivos especificados: ${finalTargets.join(', ')}`);
    process.exit(runVitest(finalTargets));
  }

  const changed = getChangedFiles();
  const resolution = resolveMinTestsForFiles(changed);

  switch (resolution.type) {
    case 'clean':
      console.log('✨ Árbol de trabajo limpio: no hay archivos modificados.');
      console.log('   (Usa "npm run test:all" para ejecutar la suite completa).');
      process.exit(0);
      break;

    case 'docs':
      console.log('📄 Cambios puramente documentales. Pruebas omitidas según AGENTS.md.');
      process.exit(0);
      break;

    case 'styles':
      console.log('🎨 Cambios puramente de estilos/CSS. Pruebas omitidas según AGENTS.md.');
      console.log('   (Ejecuta "npm run verify:styles" para validar presupuesto de estilos).');
      process.exit(0);
      break;

    case 'config':
      console.log('⚙️ Cambios únicamente en scripts o configuración. Pruebas unitarias omitidas según AGENTS.md.');
      process.exit(0);
      break;

    case 'non-source':
      console.log('ℹ️ No se detectaron cambios en lógica de producto que requieran pruebas unitarias.');
      process.exit(0);
      break;

    case 'tests':
      if (resolution.targets.length === 0) {
        console.log('ℹ️ No se encontraron pruebas directamente asociadas a los archivos modificados.');
        process.exit(0);
      }
      console.log(`🎯 Pruebas mínimas necesarias (${resolution.targets.length} objetivo(s)):`);
      for (const t of resolution.targets) {
        console.log(`   · ${t}`);
      }
      console.log('');
      process.exit(runVitest(resolution.targets));
      break;
  }
}
