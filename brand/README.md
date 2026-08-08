# Activos oficiales de marca

Esta carpeta es la fuente versionada de los activos de identidad Clay entregados para structureCo:

- `brandbook-clay.html` — brandbook visual completo.
- `logo.svg` — logotipo suministrado, con un nombre descriptivo dentro del repositorio.
- `manifest.json` — tamaños y hashes SHA-256 para detectar cambios byte a byte.

## Regla de protección

No modifiques ni reemplaces estos archivos sin autorización explícita del propietario del repositorio. Todo cambio en `brand/**` debe conservar o actualizar `manifest.json` como parte de la misma revisión, y debe explicar la procedencia y el motivo de la sustitución.

`.github/CODEOWNERS` dirige los cambios de esta carpeta a `@klkmoraa`. La exigencia efectiva de revisión depende de que la rama de GitHub tenga habilitada la revisión obligatoria de Code Owners.

## Verificación local

Desde la raíz del repositorio, compara los hashes registrados con:

```powershell
Get-FileHash -Algorithm SHA256 "brand\brandbook-clay.html", "brand\logo.svg"
```

Los valores esperados están en `manifest.json`. No se debe editar el contenido del HTML o del SVG para adaptarlo a la aplicación: estos archivos se conservan como referencia oficial.
