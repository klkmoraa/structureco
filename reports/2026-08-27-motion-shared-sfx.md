# Efectos de audio compartidos de motion

Se consolidaron los efectos reutilizados por las diez composiciones en
`motion/_shared/sfx/`. Cada composición conserva en su `assets/` únicamente su
`bed.mp3`, que continúa siendo la cama asignada específicamente a esa pieza.

`click-soft.mp3` y `click.mp3` eran archivos idénticos. Se eliminó el alias
`click-soft.mp3` y todas sus referencias ahora consumen el nombre canónico
`click.mp3`; el volumen de cada elemento `<audio>` sigue expresando las variantes
suaves que necesita cada mezcla.

La comprobación estática se puede repetir desde la raíz del repositorio con:

```bash
python3 motion/_shared/validate-audio-paths.py
```

El validador recorre todos los HTML bajo `motion/`, resuelve cada MP3 local con
respecto al documento que lo consume, exige que el archivo exista y rechaza
copias de efectos compartidos dentro de cualquier `assets/` de composición.
