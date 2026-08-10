#!/usr/bin/env python3
"""Construye `oracles/manifest.json` a partir del corpus ya generado.

Cada caso declara observables por grupo (`nodes.<id>` y `reactions.<id>`), que
la prueba `oracleComparison.test.ts` expande a los seis GDL. La prueba exige que
todo valor del archivo esperado quede cubierto por algun observable, de modo que
ningun numero pueda quedar sin comparar en silencio.

Las corridas externas se registran con `status: "NOT_RUN"` hasta que exista una
salida real con version y hash. Este script nunca inventa `outputSha256`.

Uso:  python validation/space3d/build-manifest.py
"""
from __future__ import annotations

import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
ORACLES = ROOT / "oracles"
EXPECTED = ORACLES / "expected"

TOLERANCES = {
    "nodes.fixed": {"unit": "m, rad", "atol": 1e-15, "rtol": 0.0},
    "nodes.free": {"unit": "m, rad", "atol": 1e-12, "rtol": 1e-9},
    "reactions.fixed": {"unit": "kN, kN·m", "atol": 1e-9, "rtol": 1e-9},
    "reactions.free": {"unit": "kN, kN·m", "atol": 1e-15, "rtol": 0.0},
}


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    cases = []
    external = []
    for path in sorted(EXPECTED.glob("*.project.json")):
        model = json.loads(path.read_text(encoding="utf-8"))
        case_id = model["id"]
        fixed = [n["id"] for n in model["nodes"] if any(n["restraints"].values())]
        free = [n["id"] for n in model["nodes"] if not any(n["restraints"].values())]

        observables = []
        for node_id in free:
            observables.append({"path": f"nodes.{node_id}", **TOLERANCES["nodes.free"]})
        for node_id in fixed:
            observables.append({"path": f"nodes.{node_id}", **TOLERANCES["nodes.fixed"]})
        for node_id in fixed:
            observables.append({"path": f"reactions.{node_id}", **TOLERANCES["reactions.fixed"]})
        for node_id in free:
            observables.append({"path": f"reactions.{node_id}", **TOLERANCES["reactions.free"]})

        cases.append({
            "id": case_id,
            "source": "manual",
            "target": "LC1",
            "model": f"expected/{case_id}.project.json",
            "result": f"expected/{case_id}.result.json",
            "modelSha256": sha256(path),
            "resultSha256": sha256(EXPECTED / f"{case_id}.result.json"),
            "observables": observables,
        })

        for oracle, folder, extension in (("opensees", "opensees", "tcl"), ("frame3dd", "frame3dd", "3dd")):
            source = ORACLES / folder / f"{case_id}.{extension}"
            external.append({
                "caseId": case_id,
                "oracle": oracle,
                "status": "NOT_RUN",
                "reason": "oracle executable unavailable",
                "input": f"{folder}/{case_id}.{extension}",
                "inputSha256": sha256(source),
                "output": None,
                "outputSha256": None,
                "version": None,
                "os": None,
                "command": None,
                "units": "kN, m",
                "axes": "X, Y, Z globales; Y vertical (identico a structureCo)",
                "signMap": None,
                "observables": None,
            })

    manifest = {
        "schemaVersion": 1,
        "generatedBy": "validation/space3d/build-manifest.py",
        "engine": "structureCo 0.8.2 · src/space3d",
        "notes": [
            "Los casos `manual` comparan el solver contra formas cerradas derivadas en manual-cases.md.",
            "Los valores esperados los produce validation/space3d/derive-expected.py, que no usa el solver.",
            "Una corrida externa sólo pasa a PASS cuando tiene output, versión y hash reales.",
        ],
        "cases": cases,
        "externalRuns": external,
    }
    (ORACLES / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"manifest with {len(cases)} manual cases and {len(external)} external runs")


if __name__ == "__main__":
    main()
