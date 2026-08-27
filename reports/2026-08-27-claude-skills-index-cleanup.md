# Limpieza del índice de skills personales

Se retiraron del índice de Git todos los archivos bajo `.claude/skills/`, sin borrar las copias locales. La regla `.claude/skills/` permanece en `.gitignore`, por lo que nuevas skills personales no entrarán accidentalmente al repositorio.

Se conservaron `.claude/launch.json` y `.claude/settings.json`: los perfiles de desarrollo y preview son útiles para ambos agentes, y la configuración desactiva commit/push automáticos y exige confirmación antes de publicar.

La política compartida de trabajo y handoff queda únicamente en `AGENTS.md` y `reports/README.md`. También se corrigieron dos pasos de planes históricos para que ningún push indicado allí pueda interpretarse como autorizado sin permiso explícito del usuario.

## Verificación

- `git ls-files .claude/skills` no devuelve archivos.
- `git check-ignore -v --no-index .claude/skills/verification/new-skill.md` confirma que `.gitignore` excluye nuevas skills.
- `.claude/launch.json` y `.claude/settings.json` siguen rastreados.
