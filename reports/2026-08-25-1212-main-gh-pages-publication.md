# Publicación de Inicio y lienzo móvil

**Fecha:** 2026-08-25 12:12
**Agente:** Codex
**Rama:** main

## Qué cambió

Se actualizó `main` sin descartar el trabajo remoto que había avanzado hasta `0b6637279a9480aa25872495604cfa380cfebcc5`. Sobre ese árbol se integró la limpieza móvil de Inicio y lienzo; la corrección de precarga WebKit ya existía en `main` con un parche equivalente y no se duplicó.

El árbol funcional quedó en `d6b08db0c591e6387c88dfb5b93b546dab61794e` y se publicó por separado en GitHub Pages. `gh-pages` quedó en `2a7b19c6eedb5b18d7a02e592623716d7183643f`, construido exactamente con los 173 archivos de `dist/` más `.nojekyll`.

## Por qué

El usuario autorizó actualizar tanto `main` como GitHub Pages con todo el trabajo vigente, incluida la corrección solicitada desde capturas reales de iPhone. La integración aditiva evita reemplazar las 46 revisiones que habían llegado a `origin/main` después de abrir la rama móvil.

## Archivos tocados

- `reports/2026-08-25-1212-main-gh-pages-publication.md` — evidencia de integración, publicación y verificación.
- La publicación de `gh-pages` reemplazó sus artefactos generados por el `dist/` de `d6b08db`; no cambió código fuente adicional.

## Cómo verificar

- `git ls-remote origin refs/heads/main refs/heads/gh-pages` — confirma por separado las dos ramas publicadas.
- `gh api repos/klkmoraa/structureco/pages/builds/latest` — estado `built` para `2a7b19c6eedb5b18d7a02e592623716d7183643f`.
- `https://klkmoraa.github.io/structureco/` — HTTP 200 y carga `assets/index-Cde_UiHt.js` y `assets/index-BsNiVwRv.css`, ambos también con HTTP 200.
- Verificación previa a publicar: 8 archivos / 81 pruebas focales PASS; lint código 0 con seis advertencias existentes; PWA 17/17; i18n 10/10 y catálogo completo; frontera protegida de 40 archivos intacta; build de producción PASS; `git diff --check` PASS.

## Pendiente / siguiente paso

Nada pendiente para esta publicación. Este reporte se agrega como commit documental posterior al SHA funcional usado para construir Pages y no modifica el runtime desplegado.
