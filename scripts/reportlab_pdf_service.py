#!/usr/bin/env python3
"""ReportLab companion for StructureCo calculation reports.

The browser remains authoritative for calculations and for the complete report copied from
Copia-web. This process receives that PDF plus its signed portable payload, builds a vector
diagram appendix with ReportLab, and merges both documents without recalculating the model.

Run as a local HTTP companion:
    python scripts/reportlab_pdf_service.py --serve 127.0.0.1:8765

Or enhance an existing native StructureCo PDF:
    python scripts/reportlab_pdf_service.py input.pdf output.pdf
"""

from __future__ import annotations

import argparse
import base64
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
import math
from pathlib import Path
from typing import Any, Iterable, Sequence

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


PAGE_W, PAGE_H = A4
MARGIN = 42.0

# Canonical StructureCo instrument palette. The appendix deliberately uses the same
# warm, matte language as the app rather than a generic technical-report theme.
APP = HexColor("#F3EEE4")
CANVAS = HexColor("#FBF8F2")
SURFACE = HexColor("#F7F1E8")
INK = HexColor("#102B2D")
MUTED = HexColor("#587071")
RULE = HexColor("#D8D1C5")
GRID = HexColor("#EAE3D8")
ACCENT = HexColor("#007D61")
AXIAL = HexColor("#2F73C8")
SHEAR = HexColor("#168A6C")
MOMENT = HexColor("#D85C4A")
DISTRIBUTED = HexColor("#65A323")
APPLIED_MOMENT = HexColor("#C65F86")
DEFORMATION = HexColor("#7657D5")
WARN = HexColor("#B26B91")

QUANTITIES = (
    ("axial", "N - Fuerza axial", AXIAL, "force"),
    ("shear", "V - Fuerza cortante", SHEAR, "force"),
    ("moment", "M - Momento flector", MOMENT, "moment"),
)

UNIT_DATA = {
    "kN-m": {"length": (1.0, "m"), "force": (1.0, "kN"), "moment": (1.0, "kN*m"), "distributedForce": (1.0, "kN/m")},
    "N-mm": {"length": (1000.0, "mm"), "force": (1000.0, "N"), "moment": (1_000_000.0, "N*mm"), "distributedForce": (1.0, "N/mm")},
    "kgf-m": {"length": (1.0, "m"), "force": (101.9716212978, "kgf"), "moment": (101.9716212978, "kgf*m"), "distributedForce": (101.9716212978, "kgf/m")},
    "kip-ft": {"length": (3.28083989501312, "ft"), "force": (0.22480894387096, "kip"), "moment": (0.73756214927727, "kip*ft"), "distributedForce": (0.06852176585679, "kip/ft")},
}


def finite(value: Any, fallback: float = 0.0) -> float:
    try:
        number = float(value)
        return number if math.isfinite(number) else fallback
    except (TypeError, ValueError):
        return fallback


def fmt(value: Any, digits: int = 4) -> str:
    number = finite(value)
    if abs(number) < 10 ** (-(digits + 1)):
        number = 0.0
    magnitude = abs(number)
    if magnitude and (magnitude >= 1e7 or magnitude < 1e-4):
        return f"{number:.{digits}e}"
    text = f"{number:.{digits}f}".rstrip("0").rstrip(".")
    return "0" if text in {"-0", ""} else text


def unit(units: str, quantity: str) -> tuple[float, str]:
    return UNIT_DATA.get(units, UNIT_DATA["kN-m"])[quantity]


def displayed(value: Any, units: str, quantity: str) -> float:
    factor, _ = unit(units, quantity)
    return finite(value) * factor


def poly(coefficients: Sequence[Any], local_x: float) -> float:
    result = 0.0
    power = 1.0
    for coefficient in coefficients:
        result += finite(coefficient) * power
        power *= local_x
    return result


def equation(name: str, coefficients: Sequence[Any], x0: float, units: str, quantity: str) -> str:
    factor, label = unit(units, quantity)
    terms: list[str] = []
    for order, raw in enumerate(coefficients):
        coefficient = finite(raw) * factor
        if abs(coefficient) < 1e-12:
            continue
        magnitude = fmt(abs(coefficient), 5)
        variable = "" if order == 0 else "*s" if order == 1 else f"*s^{order}"
        term = f"{magnitude}{variable}"
        if not terms:
            terms.append(f"-{term}" if coefficient < 0 else term)
        else:
            terms.append((" - " if coefficient < 0 else " + ") + term)
    body = "".join(terms) or "0"
    x_factor, x_label = unit(units, "length")
    return f"{name}(s) = {body} {label}; s = x - {fmt(x0 * x_factor)} {x_label}"


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def panel(c: canvas.Canvas, x: float, y: float, w: float, h: float, *, fill: Color = SURFACE, radius: float = 10.0, stroke: Color | None = RULE) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(0.55)
    c.roundRect(x, y, w, h, radius, stroke=1 if stroke else 0, fill=1)


def chip(c: canvas.Canvas, text: str, x: float, y: float, *, color: Color = ACCENT, width: float | None = None) -> float:
    size = 6.8
    width = width or stringWidth(text, "Helvetica-Bold", size) + 16
    c.setFillColor(color)
    c.roundRect(x, y, width, 15, 7.5, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", size)
    c.drawCentredString(x + width / 2, y + 4.3, text.upper())
    return width


def arrow(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, color: Color = INK, width: float = 1.3) -> None:
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    length = 7.5
    spread = 0.42
    tip = c.beginPath()
    tip.moveTo(x2, y2)
    tip.lineTo(x2 - length * math.cos(angle - spread), y2 - length * math.sin(angle - spread))
    tip.lineTo(x2 - length * math.cos(angle + spread), y2 - length * math.sin(angle + spread))
    tip.close()
    c.drawPath(tip, stroke=0, fill=1)


@dataclass
class Document:
    c: canvas.Canvas
    project_name: str
    page: int = 0
    section: str = ""

    def new_page(self, section: str, bare: bool = False) -> None:
        if self.page:
            self.c.showPage()
        self.page += 1
        self.section = section
        self.c.setFillColor(CANVAS)
        self.c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        if bare:
            return
        self.c.setFillColor(ACCENT)
        self.c.circle(MARGIN + 3, PAGE_H - 31, 3, stroke=0, fill=1)
        self.c.setFillColor(INK)
        self.c.setFont("Helvetica-Bold", 7.2)
        self.c.drawString(MARGIN + 11, PAGE_H - 33.5, self.project_name[:65].upper())
        self.c.setFillColor(MUTED)
        self.c.setFont("Helvetica-Bold", 7.1)
        self.c.drawRightString(PAGE_W - MARGIN, PAGE_H - 33.5, section[:58].upper())
        self.c.setStrokeColor(RULE)
        self.c.setLineWidth(0.55)
        self.c.line(MARGIN, PAGE_H - 43, PAGE_W - MARGIN, PAGE_H - 43)

    def footer(self) -> None:
        self.c.setStrokeColor(RULE)
        self.c.setLineWidth(0.5)
        self.c.line(MARGIN, 40, PAGE_W - MARGIN, 40)
        self.c.setFillColor(MUTED)
        self.c.setFont("Helvetica", 7)
        self.c.drawString(MARGIN, 28, "StructureCo / expediente calculado / vectorial")
        self.c.setFont("Helvetica-Bold", 7.5)
        self.c.drawRightString(PAGE_W - MARGIN, 28, f"{self.page:02d}")


def active_factor(case_id: str, factors: dict[str, Any]) -> float:
    return finite(factors.get(case_id, 0.0))


def model_transform(nodes: Sequence[dict[str, Any]], box: tuple[float, float, float, float]):
    x, y, w, h = box
    xs = [finite(node.get("x")) for node in nodes] or [0.0]
    ys = [finite(node.get("y")) for node in nodes] or [0.0]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span_x = max(max_x - min_x, 1.0)
    span_y = max(max_y - min_y, 1.0)
    scale = min(w / span_x, h / span_y)
    offset_x = x + (w - span_x * scale) / 2 - min_x * scale
    offset_y = y + (h - span_y * scale) / 2 - min_y * scale
    return lambda px, py: (offset_x + finite(px) * scale, offset_y + finite(py) * scale), scale


def draw_support(c: canvas.Canvas, x: float, y: float, support: dict[str, Any]) -> None:
    kind = support.get("type", "none")
    if kind == "none":
        return
    c.saveState()
    c.translate(x, y)
    c.setStrokeColor(INK)
    c.setFillColor(CANVAS)
    c.setLineWidth(1.15)
    if kind == "fixed":
        c.setStrokeColor(ACCENT)
        c.setLineWidth(2.8)
        c.line(-12, -5, 12, -5)
        c.setStrokeColor(INK)
        c.setLineWidth(0.8)
        for dx in range(-11, 13, 4):
            c.line(dx, -6, dx - 4, -12)
    else:
        path = c.beginPath()
        path.moveTo(0, -2)
        path.lineTo(-10, -14)
        path.lineTo(10, -14)
        path.close()
        c.drawPath(path, stroke=1, fill=1)
        if kind == "roller":
            c.setFillColor(ACCENT)
            c.circle(-5, -17, 2.35, stroke=1, fill=1)
            c.circle(5, -17, 2.35, stroke=1, fill=1)
            c.setStrokeColor(INK)
            c.line(-12, -21, 12, -21)
        else:
            c.line(-12, -16, 12, -16)
    c.restoreState()


def draw_global_model(doc: Document, payload: dict[str, Any], factors: dict[str, Any]) -> None:
    project = payload["project"]
    analysis = payload["analysis"]
    nodes = project.get("nodes", [])
    members = project.get("members", [])
    node_by_id = {str(node.get("id")): node for node in nodes}
    result_by_node = {str(item.get("nodeId")): item for item in analysis.get("nodeResults", [])}
    units = payload.get("metadata", {}).get("units", "kN-m")

    doc.new_page("DCL global ReportLab")
    c = doc.c
    chip(c, "modelo y equilibrio", MARGIN, PAGE_H - 79, color=ACCENT)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 21)
    c.drawString(MARGIN, PAGE_H - 112, "DCL global")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.8)
    c.drawString(MARGIN, PAGE_H - 129, "Geometria, apoyos, acciones combinadas y reacciones del escenario activo.")

    box = (MARGIN, 382, PAGE_W - 2 * MARGIN, 306)
    panel(c, *box, fill=SURFACE, radius=12)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.8)
    c.drawString(box[0] + 15, box[1] + box[3] - 19, "VISTA ESTRUCTURAL")
    c.setFillColor(DISTRIBUTED)
    c.circle(box[0] + box[2] - 108, box[1] + box[3] - 16, 3, stroke=0, fill=1)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.7)
    c.drawString(box[0] + box[2] - 101, box[1] + box[3] - 18.5, "acciones distribuidas")
    map_point, scale = model_transform(nodes, (box[0] + 28, box[1] + 34, box[2] - 56, box[3] - 72))
    c.setStrokeColor(INK)
    c.setLineWidth(2.6)
    for member in members:
        ni = node_by_id.get(str(member.get("i")))
        nj = node_by_id.get(str(member.get("j")))
        if not ni or not nj:
            continue
        x1, y1 = map_point(ni.get("x"), ni.get("y"))
        x2, y2 = map_point(nj.get("x"), nj.get("y"))
        c.line(x1, y1, x2, y2)
        c.setFillColor(CANVAS)
        c.roundRect((x1 + x2) / 2 - 13, (y1 + y2) / 2 + 3, 26, 11, 5.5, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 6.4)
        c.drawCentredString((x1 + x2) / 2, (y1 + y2) / 2 + 6.6, str(member.get("id", ""))[:18])
    for node in nodes:
        x, y = map_point(node.get("x"), node.get("y"))
        c.setFillColor(CANVAS)
        c.setStrokeColor(INK)
        c.circle(x, y, 3, stroke=1, fill=1)
        draw_support(c, x, y, node.get("support") or {})
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x + 5, y + 5, str(node.get("id", ""))[:16])

    # Member actions are drawn from the same scenario factors as the browser report. Local
    # components are rotated through the member axis before their arrow reaches the model.
    for load in project.get("memberLoads", []):
        factor = active_factor(str(load.get("caseId")), factors)
        member = next((item for item in members if str(item.get("id")) == str(load.get("memberId"))), None)
        if not factor or not member:
            continue
        ni = node_by_id.get(str(member.get("i")))
        nj = node_by_id.get(str(member.get("j")))
        if not ni or not nj:
            continue
        x1, y1 = map_point(ni.get("x"), ni.get("y"))
        x2, y2 = map_point(nj.get("x"), nj.get("y"))
        dx, dy = x2 - x1, y2 - y1
        screen_length = max(math.hypot(dx, dy), 1e-9)
        ex, ey = dx / screen_length, dy / screen_length
        nx, ny = -ey, ex

        def vector(local_x: float, local_y: float) -> tuple[float, float]:
            if load.get("coordinateSystem") == "local":
                return ex * local_x + nx * local_y, ey * local_x + ny * local_y
            return local_x, local_y

        kind = load.get("type")
        if kind == "distributed":
            start, end = finite(load.get("start")), finite(load.get("end"), 1.0)
            samples = 7
            magnitudes: list[float] = []
            tails: list[tuple[float, float]] = []
            for index in range(samples):
                ratio = start + (end - start) * index / max(1, samples - 1)
                qx = (finite(load.get("qxStart")) + (finite(load.get("qxEnd")) - finite(load.get("qxStart"))) * index / max(1, samples - 1)) * factor
                qy = (finite(load.get("qyStart")) + (finite(load.get("qyEnd")) - finite(load.get("qyStart"))) * index / max(1, samples - 1)) * factor
                vx, vy = vector(qx, qy)
                magnitude = math.hypot(vx, vy)
                magnitudes.append(magnitude)
                px, py = x1 + dx * ratio, y1 + dy * ratio
                if magnitude <= 1e-12:
                    tails.append((px, py))
                    continue
                length = 25 + 15 * magnitude / max(max(magnitudes), magnitude)
                tx, ty = px - vx / magnitude * length, py - vy / magnitude * length
                tails.append((tx, ty))
                arrow(c, tx, ty, px, py, DISTRIBUTED, 1.15)
            if len(tails) > 1:
                c.setStrokeColor(DISTRIBUTED)
                c.setLineWidth(0.8)
                for left, right in zip(tails, tails[1:]):
                    c.line(left[0], left[1], right[0], right[1])
            peak = max(magnitudes or [0.0])
            if peak:
                c.setFillColor(DISTRIBUTED)
                c.setFont("Helvetica-Bold", 7)
                c.drawString(x1 + dx * 0.70, max(point[1] for point in tails) + 7, f"q = {fmt(displayed(peak, units, 'distributedForce'))} {unit(units, 'distributedForce')[1]}")
        elif kind == "point":
            ratio = finite(load.get("position"), 0.5)
            vx, vy = vector(finite(load.get("px")) * factor, finite(load.get("py")) * factor)
            magnitude = math.hypot(vx, vy)
            if magnitude > 1e-12:
                px, py = x1 + dx * ratio, y1 + dy * ratio
                length = 42
                tx, ty = px - vx / magnitude * length, py - vy / magnitude * length
                arrow(c, tx, ty, px, py, AXIAL, 1.45)
                c.setFillColor(AXIAL)
                c.setFont("Helvetica-Bold", 7)
                c.drawString(tx - 10, ty + 12, f"P = {fmt(displayed(magnitude, units, 'force'))} {unit(units, 'force')[1]}")
        elif kind == "moment":
            ratio = finite(load.get("position"), 0.5)
            value = finite(load.get("moment")) * factor
            if abs(value) > 1e-12:
                px, py = x1 + dx * ratio, y1 + dy * ratio
                start_angle, extent = (35, 285) if value > 0 else (325, -285)
                c.setStrokeColor(APPLIED_MOMENT)
                c.setLineWidth(1.4)
                c.arc(px - 16, py - 16, px + 16, py + 16, start_angle, extent)
                c.setFillColor(APPLIED_MOMENT)
                c.setFont("Helvetica-Bold", 7)
                c.drawString(px + 18, py + 12, f"M = {fmt(displayed(value, units, 'moment'))} {unit(units, 'moment')[1]}")

    load_scale = max(20.0, min(52.0, scale * 0.22))
    for load in project.get("nodalLoads", []):
        factor = active_factor(str(load.get("caseId")), factors)
        if not factor:
            continue
        node = node_by_id.get(str(load.get("nodeId")))
        if not node:
            continue
        x, y = map_point(node.get("x"), node.get("y"))
        fx, fy = finite(load.get("fx")) * factor, finite(load.get("fy")) * factor
        magnitude = math.hypot(fx, fy)
        if magnitude > 1e-12:
            dx, dy = fx / magnitude * load_scale, fy / magnitude * load_scale
            arrow(c, x - dx, y - dy, x, y, AXIAL, 1.5)
            force_value = displayed(magnitude, units, "force")
            c.setFillColor(AXIAL)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(x - dx + 3, y - dy + 3, f"{fmt(force_value)} {unit(units, 'force')[1]}")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, 352, "Reacciones del modelo")
    rows = []
    for node in nodes:
        result = result_by_node.get(str(node.get("id")))
        if not result or node.get("support", {}).get("type") == "none":
            continue
        rows.append((
            str(node.get("id")),
            displayed(result.get("rx"), units, "force"),
            displayed(result.get("ry"), units, "force"),
            displayed(result.get("rm"), units, "moment"),
        ))
    y = 329
    headers = ("Nudo", f"Rx [{unit(units, 'force')[1]}]", f"Ry [{unit(units, 'force')[1]}]", f"Mz [{unit(units, 'moment')[1]}]")
    widths = (95, 125, 125, 125)
    c.setFillColor(INK)
    c.roundRect(MARGIN, y - 4, sum(widths), 20, 6, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    cursor = MARGIN + 6
    for header, width in zip(headers, widths):
        c.drawString(cursor, y + 3, header)
        cursor += width
    y -= 23
    c.setFont("Helvetica", 8)
    for row in rows[:11]:
        if int((329 - y) / 18) % 2 == 0:
            c.setFillColor(SURFACE)
            c.roundRect(MARGIN, y - 6, sum(widths), 17, 4, stroke=0, fill=1)
        cursor = MARGIN + 6
        c.setFillColor(INK)
        for value, width in zip((row[0], fmt(row[1]), fmt(row[2]), fmt(row[3])), widths):
            c.drawString(cursor, y, str(value))
            cursor += width
        c.setStrokeColor(RULE)
        c.line(MARGIN, y - 5, MARGIN + sum(widths), y - 5)
        y -= 18
    eq = analysis.get("equilibrium") or {}
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN, 104, "Cierre de equilibrio")
    c.setFont("Helvetica", 8.5)
    c.drawString(MARGIN, 87, f"Sum Fx = {fmt(displayed(eq.get('sumFx'), units, 'force'))} {unit(units, 'force')[1]}")
    c.drawString(MARGIN + 165, 87, f"Sum Fy = {fmt(displayed(eq.get('sumFy'), units, 'force'))} {unit(units, 'force')[1]}")
    c.drawString(MARGIN + 330, 87, f"Sum M = {fmt(displayed(eq.get('sumM'), units, 'moment'))} {unit(units, 'moment')[1]}")
    c.setFillColor(ACCENT if finite(eq.get("normalizedResidual")) <= 1e-6 else WARN)
    c.drawRightString(PAGE_W - MARGIN, 67, f"Residual normalizado = {fmt(eq.get('normalizedResidual'), 3)}")
    doc.footer()


def segment_samples(segment: dict[str, Any], quantity: str, count: int = 48) -> list[tuple[float, float]]:
    x0, x1 = finite(segment.get("x0")), finite(segment.get("x1"))
    coefficients = segment.get(quantity) or []
    if x1 <= x0 or not coefficients:
        return []
    return [
        (x0 + (x1 - x0) * index / count, poly(coefficients, (x1 - x0) * index / count))
        for index in range(count + 1)
    ]


def draw_chart(
    c: canvas.Canvas,
    result: dict[str, Any],
    quantity: str,
    title: str,
    color: Color,
    unit_quantity: str,
    units: str,
    box: tuple[float, float, float, float],
) -> None:
    x, y, w, h = box
    factor, label = unit(units, unit_quantity)
    length_factor, length_label = unit(units, "length")
    segments = result.get("diagramSegments", [])
    paths = [[(px * length_factor, py * factor) for px, py in segment_samples(segment, quantity)] for segment in segments]
    paths = [path for path in paths if path]
    values = [value for path in paths for _, value in path]
    length = max(finite(result.get("length")) * length_factor, 1e-9)
    maximum = max([abs(value) for value in values] + [1e-12])
    chart_x, chart_y, chart_w, chart_h = x + 52, y + 27, w - 68, h - 58
    zero_y = chart_y + chart_h / 2

    panel(c, x, y, w, h, fill=SURFACE, radius=10)
    c.setFillColor(color)
    c.roundRect(x + 12, y + h - 24, 5, 11, 2.5, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.3)
    c.drawString(x + 23, y + h - 20.5, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.7)
    c.drawRightString(x + w - 13, y + h - 20.5, f"MAX {fmt(maximum)} {label}")
    c.setStrokeColor(GRID)
    c.setLineWidth(0.55)
    for ratio in (0.16, 0.33, 0.66, 0.84):
        grid_y = chart_y + chart_h * ratio
        c.line(chart_x, grid_y, chart_x + chart_w, grid_y)
    c.line(chart_x, zero_y, chart_x + chart_w, zero_y)
    for ratio in (0.0, 0.25, 0.5, 0.75, 1.0):
        sx = chart_x + chart_w * ratio
        c.setStrokeColor(GRID)
        c.line(sx, chart_y, sx, chart_y + chart_h)
        c.setStrokeColor(MUTED)
        c.line(sx, zero_y - 3, sx, zero_y + 3)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.3)
        c.drawCentredString(sx, y + 10.5, f"{fmt(length * ratio, 3)}")
    c.setFont("Helvetica-Bold", 6.1)
    c.drawRightString(x + w - 12, y + 10.5, length_label)
    c.setFillColor(MUTED)
    c.drawRightString(chart_x - 7, chart_y + chart_h - 2, f"+{fmt(maximum, 2)}")
    c.drawRightString(chart_x - 7, chart_y - 2, f"-{fmt(maximum, 2)}")

    def screen(point: tuple[float, float]) -> tuple[float, float]:
        px, py = point
        return chart_x + chart_w * px / length, zero_y + (chart_h * 0.42) * py / maximum

    c.setFillColor(Color(color.red, color.green, color.blue, alpha=0.12))
    c.setLineWidth(1.9)
    for path in paths:
        if len(path) < 2:
            continue
        fill_path = c.beginPath()
        start_x, start_y = screen(path[0])
        fill_path.moveTo(start_x, zero_y)
        fill_path.lineTo(start_x, start_y)
        for point in path[1:]:
            px, py = screen(point)
            fill_path.lineTo(px, py)
        end_x, _ = screen(path[-1])
        fill_path.lineTo(end_x, zero_y)
        fill_path.close()
        c.drawPath(fill_path, stroke=0, fill=1)
        line_path = c.beginPath()
        line_path.moveTo(start_x, start_y)
        for point in path[1:]:
            px, py = screen(point)
            line_path.lineTo(px, py)
        c.setStrokeColor(color)
        c.drawPath(line_path, stroke=1, fill=0)

    points = [
        point for point in result.get("criticalPoints", [])
        if point.get("quantity") == quantity and point.get("kind") in {"maximum", "minimum", "jump", "end"}
    ]
    points.sort(key=lambda point: (0 if point.get("kind") in {"maximum", "minimum"} else 1, finite(point.get("x"))))
    unique_points: list[dict[str, Any]] = []
    seen: set[tuple[float, float]] = set()
    for point in points:
        key = (round(finite(point.get("x")), 9), round(finite(point.get("value")), 9))
        if key not in seen:
            seen.add(key)
            unique_points.append(point)
    for index, point in enumerate(unique_points[:5]):
        px = displayed(point.get("x"), units, "length")
        py = displayed(point.get("value"), units, unit_quantity)
        sx, sy = screen((px, py))
        c.setFillColor(CANVAS)
        c.circle(sx, sy, 4.0, stroke=0, fill=1)
        c.setFillColor(color)
        c.circle(sx, sy, 2.15, stroke=0, fill=1)
        offset = 8 if index % 2 == 0 else -13
        label_text = f"{fmt(py, 3)}"
        label_w = stringWidth(label_text, "Helvetica-Bold", 5.9) + 8
        c.setFillColor(CANVAS)
        c.roundRect(sx - label_w / 2, sy + offset - 2, label_w, 9, 4.5, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 6.2)
        c.setFillColor(INK)
        c.drawCentredString(sx, sy + offset + 0.6, label_text)


def draw_member_page(doc: Document, payload: dict[str, Any], member: dict[str, Any], result: dict[str, Any]) -> None:
    units = payload.get("metadata", {}).get("units", "kN-m")
    member_id = str(member.get("id", result.get("memberId", "")))
    doc.new_page(f"Diagramas exactos - {member_id}")
    c = doc.c
    chip(c, "respuesta interna", MARGIN, PAGE_H - 79, color=DEFORMATION)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(MARGIN, PAGE_H - 112, f"Miembro {member_id}")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.2)
    length = displayed(result.get("length"), units, "length")
    member_kind = {"frame": "marco", "truss": "cercha", "beam": "viga"}.get(str(member.get("type", "")).lower(), str(member.get("type", "miembro")))
    c.drawString(MARGIN, PAGE_H - 129, "Curvas exactas del solver con escala individual y estaciones criticas.")
    chip(c, f"{member.get('i')}  a  {member.get('j')}", MARGIN, PAGE_H - 156, color=INK)
    chip(c, f"L  {fmt(length)} {unit(units, 'length')[1]}", MARGIN + 102, PAGE_H - 156, color=ACCENT)
    chip(c, member_kind, MARGIN + 200, PAGE_H - 156, color=MUTED)

    chart_height = 174
    top = PAGE_H - 170
    for index, (quantity, title, color, unit_quantity) in enumerate(QUANTITIES):
        draw_chart(c, result, quantity, title, color, unit_quantity, units, (MARGIN, top - (index + 1) * chart_height, PAGE_W - 2 * MARGIN, chart_height - 10))

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN, 106, "Ecuaciones reales por tramo")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.8)
    lines: list[str] = []
    names = {"axial": "N", "shear": "V", "moment": "M"}
    unit_quantity = {"axial": "force", "shear": "force", "moment": "moment"}
    for segment in result.get("diagramSegments", []):
        x0 = finite(segment.get("x0"))
        for quantity in ("axial", "shear", "moment"):
            coefficients = segment.get(quantity) or []
            if coefficients:
                lines.append(equation(names[quantity], coefficients, x0, units, unit_quantity[quantity]))
    y = 92
    for line in lines[:5]:
        c.drawString(MARGIN, y, line[:132])
        y -= 10
    if len(lines) > 5:
        c.drawRightString(PAGE_W - MARGIN, 52, f"{len(lines) - 5} ecuaciones adicionales conservadas en los datos del expediente")
    doc.footer()


def draw_system_diagrams_page(doc: Document, payload: dict[str, Any]) -> None:
    """Draw N, V and M across the actual topology, as a structural drawing.

    A member-by-member plot remains useful for equations, but it hides the continuity
    that an engineer checks first. This sheet preserves each member's orientation and
    places the result directly on the corresponding physical member.
    """
    project = payload["project"]
    analysis = payload["analysis"]
    nodes = project.get("nodes", [])
    members = project.get("members", [])
    node_by_id = {str(node.get("id")): node for node in nodes}
    result_by_id = {str(item.get("memberId")): item for item in analysis.get("memberResults", [])}
    units = payload.get("metadata", {}).get("units", "kN-m")

    doc.new_page("Diagramas globales")
    c = doc.c
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(MARGIN, PAGE_H - 79, "07 / RESPUESTA INTERNA")
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.5)
    c.line(MARGIN, PAGE_H - 87, PAGE_W - MARGIN, PAGE_H - 87)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(MARGIN, PAGE_H - 117, "Diagramas de fuerzas internas")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(MARGIN, PAGE_H - 134, "La geometria se conserva para leer continuidad, signo y magnitud por miembro.")

    def diagram_panel(quantity: str, title: str, color: Color, unit_quantity: str, box: tuple[float, float, float, float]) -> None:
        x, y, w, h = box
        c.setStrokeColor(RULE)
        c.setLineWidth(0.65)
        c.line(x, y + h, x + w, y + h)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y + h - 18, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.9)
        c.drawRightString(x + w, y + h - 17.5, unit(units, unit_quantity)[1])
        map_point, _ = model_transform(nodes, (x + 36, y + 18, w - 72, h - 54))

        raw_paths: list[tuple[dict[str, Any], dict[str, Any], list[list[tuple[float, float]]]]] = []
        maximum = 0.0
        for member in members:
            result = result_by_id.get(str(member.get("id")))
            if not result:
                continue
            paths = [segment_samples(segment, quantity, 28) for segment in result.get("diagramSegments", [])]
            paths = [path for path in paths if path]
            maximum = max(maximum, *(abs(value) for path in paths for _, value in path), 0.0)
            raw_paths.append((member, result, paths))
        maximum = max(maximum, 1e-9)

        # Neutral structural geometry stays visible beneath each result curve.
        c.setStrokeColor(HexColor("#9DAEAA"))
        c.setLineWidth(1.0)
        for member in members:
            ni = node_by_id.get(str(member.get("i")))
            nj = node_by_id.get(str(member.get("j")))
            if not ni or not nj:
                continue
            x1, y1 = map_point(ni.get("x"), ni.get("y"))
            x2, y2 = map_point(nj.get("x"), nj.get("y"))
            c.line(x1, y1, x2, y2)
        for node in nodes:
            nx, ny = map_point(node.get("x"), node.get("y"))
            draw_support(c, nx, ny, node.get("support") or {})
            c.setFillColor(INK)
            c.circle(nx, ny, 1.8, stroke=0, fill=1)

        amplitude = min(54.0, (h - 50) * 0.38) / maximum
        fill_color = Color(color.red, color.green, color.blue, alpha=0.16)
        for member, result, paths in raw_paths:
            ni = node_by_id.get(str(member.get("i")))
            nj = node_by_id.get(str(member.get("j")))
            if not ni or not nj:
                continue
            x1, y1 = map_point(ni.get("x"), ni.get("y"))
            x2, y2 = map_point(nj.get("x"), nj.get("y"))
            dx, dy = x2 - x1, y2 - y1
            member_length = max(math.hypot(dx, dy), 1e-9)
            ex, ey = dx / member_length, dy / member_length
            nx, ny = -ey, ex
            physical_length = max(finite(result.get("length")), 1e-9)

            def screen(local_x: float, value: float) -> tuple[float, float]:
                ratio = max(0.0, min(1.0, local_x / physical_length))
                return x1 + dx * ratio + nx * value * amplitude, y1 + dy * ratio + ny * value * amplitude

            for path in paths:
                if len(path) < 2:
                    continue
                baseline_start = screen(path[0][0], 0.0)
                start = screen(*path[0])
                filled = c.beginPath()
                filled.moveTo(*baseline_start)
                filled.lineTo(*start)
                for point in path[1:]:
                    filled.lineTo(*screen(*point))
                baseline_end = screen(path[-1][0], 0.0)
                filled.lineTo(*baseline_end)
                filled.close()
                c.setFillColor(fill_color)
                c.drawPath(filled, stroke=0, fill=1)
                outline = c.beginPath()
                outline.moveTo(*start)
                for point in path[1:]:
                    outline.lineTo(*screen(*point))
                c.setStrokeColor(color)
                c.setLineWidth(1.45)
                c.drawPath(outline, stroke=1, fill=0)

            # End values are the compact labels needed for a first-pass check.
            samples = [point for path in paths for point in (path[:1] + path[-1:])]
            for index, (local_x, value) in enumerate(samples[:2]):
                sx, sy = screen(local_x, value)
                shown = displayed(value, units, unit_quantity)
                label = fmt(shown, 3)
                c.setFillColor(CANVAS)
                c.roundRect(sx - 12, sy + (5 if index == 0 else -14), 24, 9, 4, stroke=0, fill=1)
                c.setFillColor(color)
                c.setFont("Helvetica-Bold", 5.8)
                c.drawCentredString(sx, sy + (7.4 if index == 0 else -11.6), label)

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.3)
        c.drawString(x, y + 5, f"Escala grafica: |max| = {fmt(displayed(maximum, units, unit_quantity), 3)} {unit(units, unit_quantity)[1]}")

    panel_h = 178
    for index, (quantity, title, color, unit_quantity) in enumerate(QUANTITIES):
        diagram_panel(quantity, title, color, unit_quantity, (MARGIN, PAGE_H - 165 - (index + 1) * panel_h, PAGE_W - 2 * MARGIN, panel_h - 12))
    doc.footer()


def build_appendix(payload: dict[str, Any], scenario_factors: dict[str, Any] | None = None) -> bytes:
    project = payload.get("project") or {}
    analysis = payload.get("analysis") or {}
    if payload.get("format") != "structureco-portable" or not project or not analysis:
        raise ValueError("El payload no es un expediente StructureCo compatible.")
    factors = scenario_factors or {
        str(case.get("id")): 1.0 for case in project.get("loadCases", []) if case.get("active", True)
    }
    stream = BytesIO()
    c = canvas.Canvas(stream, pagesize=A4, pageCompression=1)
    doc = Document(c=c, project_name=str(project.get("name", "StructureCo")))

    doc.new_page("Anexo ReportLab", bare=True)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN, PAGE_H - 61, "STRUCTURECO / EXPEDIENTE DE CALCULO")
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.6)
    c.line(MARGIN, PAGE_H - 70, PAGE_W - MARGIN, PAGE_H - 70)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 27)
    c.drawString(MARGIN, PAGE_H - 116, "Diagramas de calculo")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    for index, line in enumerate(wrap(str(project.get("name", "Proyecto")), "Helvetica", 12, PAGE_W - 2 * MARGIN)):
        c.drawString(MARGIN, PAGE_H - 142 - index * 16, line)
    c.setStrokeColor(RULE)
    c.setLineWidth(0.65)
    c.line(MARGIN, PAGE_H - 173, PAGE_W - MARGIN, PAGE_H - 173)
    # The N/V/M key is technical notation, not a dashboard treatment.
    motif_y = PAGE_H - 218
    c.setStrokeColor(INK)
    c.setLineWidth(2.2)
    c.line(MARGIN + 4, motif_y, MARGIN + 170, motif_y)
    c.setFillColor(INK)
    c.circle(MARGIN + 4, motif_y, 3, stroke=0, fill=1)
    c.circle(MARGIN + 170, motif_y, 3, stroke=0, fill=1)
    for index, color in enumerate((AXIAL, SHEAR, MOMENT)):
        x = MARGIN + 218 + index * 72
        c.setFillColor(color)
        c.circle(x, motif_y, 5, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x + 11, motif_y - 3.2, ("N  axial", "V  cortante", "M  flector")[index])
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(MARGIN, PAGE_H - 282, "Contenido del anexo")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN, PAGE_H - 299, "Trazabilidad numerica y lectura grafica de las acciones internas del modelo.")
    bullets = (
        "DCL global con apoyos, acciones combinadas y reacciones del analisis.",
        "Diagramas N-V-M vectoriales para cada miembro, sin rasterizar curvas.",
        "Etiquetas de extremos, saltos y valores criticos con estaciones reales.",
        "Ecuaciones polinomiales con los coeficientes numericos que publico el solver.",
    )
    y = PAGE_H - 332
    for index, bullet in enumerate(bullets):
        c.setFillColor((ACCENT, AXIAL, SHEAR, MOMENT)[index])
        c.circle(MARGIN + 3, y + 3, 2.5, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 8.8)
        c.drawString(MARGIN + 15, y + 0.3, bullet)
        y -= 26
    c.setStrokeColor(RULE)
    c.line(MARGIN, 231, PAGE_W - MARGIN, 231)
    panel(c, MARGIN, 101, PAGE_W - 2 * MARGIN, 105, fill=SURFACE, radius=6)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 16, 181, "TRAZABILIDAD DEL EXPEDIENTE")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    metadata = payload.get("metadata") or {}
    provenance = payload.get("provenance") or {}
    checksum = payload.get("checksum") or {}
    rows = (
        f"Escenario: {metadata.get('scenarioName', 'casos activos')}",
        f"Modelo: {metadata.get('nodeCount', 0)} nudos / {metadata.get('memberCount', 0)} miembros / {metadata.get('loadCount', 0)} acciones",
        f"Generado: {provenance.get('generatedAt', '-')}",
        f"SHA-256: {str(checksum.get('value', '-'))[:32]}...",
    )
    for index, row in enumerate(rows):
        c.drawString(MARGIN + 16, 159 - index * 17, row)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 71, "ReportLab compone la geometria; StructureCo conserva la autoridad numerica.")

    draw_global_model(doc, payload, factors)
    draw_system_diagrams_page(doc, payload)
    member_by_id = {str(member.get("id")): member for member in project.get("members", [])}
    for result in analysis.get("memberResults", []):
        member = member_by_id.get(str(result.get("memberId")))
        if member and result.get("diagramSegments"):
            draw_member_page(doc, payload, member, result)
    c.save()
    return stream.getvalue()


def merge_report(base_pdf: bytes, payload: dict[str, Any], scenario_factors: dict[str, Any] | None = None) -> bytes:
    base_reader = PdfReader(BytesIO(base_pdf))
    appendix_reader = PdfReader(BytesIO(build_appendix(payload, scenario_factors)))
    writer = PdfWriter()
    # Clone the original root instead of re-parsing pdf-lib's outline destinations through
    # PdfWriter.append. Some destinations intentionally use null coordinates; append coerces
    # those names to floats and emits one warning per bookmark. Cloning preserves the outline,
    # metadata and existing portable attachment byte-for-byte at the object level.
    writer.clone_document_from_reader(base_reader)
    appendix_start = len(writer.pages)
    writer.append(appendix_reader, import_outline=False)
    writer.add_outline_item("Anexo vectorial ReportLab", appendix_start)
    metadata = dict(base_reader.metadata or {})
    metadata["/Producer"] = "StructureCo + ReportLab 4"
    metadata["/StructureCoReportEngine"] = "Copia-web renderer + ReportLab vector appendix"
    writer.add_metadata({str(key): str(value) for key, value in metadata.items() if value is not None and str(value) != "/null"})
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def payload_from_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    reader = PdfReader(BytesIO(pdf_bytes))
    attachments = getattr(reader, "attachments", {}) or {}
    candidates = attachments.get("structureco-payload.json") or []
    if isinstance(candidates, (bytes, bytearray)):
        candidates = [candidates]
    if not candidates:
        raise ValueError("El PDF no contiene structureco-payload.json.")
    return json.loads(bytes(candidates[0]).decode("utf-8"))


class Handler(BaseHTTPRequestHandler):
    server_version = "StructureCoReportLab/1.0"

    def _headers(self, status: int, content_type: str = "application/json", length: int = 0) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._headers(204)

    def do_GET(self) -> None:  # noqa: N802
        body = json.dumps({"ok": True, "engine": "reportlab", "version": 1}).encode("utf-8")
        self._headers(200 if self.path == "/health" else 404, length=len(body))
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/enhance":
            body = b'{"error":"not-found"}'
            self._headers(404, length=len(body))
            self.wfile.write(body)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 80 * 1024 * 1024:
                raise ValueError("Tamano de solicitud no permitido.")
            request = json.loads(self.rfile.read(size).decode("utf-8"))
            base_pdf = base64.b64decode(request["pdfBase64"], validate=True)
            payload = request["payload"]
            result = merge_report(base_pdf, payload, request.get("scenarioFactors"))
            self._headers(200, "application/pdf", len(result))
            self.wfile.write(result)
        except Exception as error:  # HTTP boundary: return a concise message to the browser.
            body = json.dumps({"error": str(error)}, ensure_ascii=False).encode("utf-8")
            self._headers(422, length=len(body))
            self.wfile.write(body)

    def log_message(self, format_: str, *args: Any) -> None:
        print(f"[reportlab] {self.address_string()} - {format_ % args}")


def parse_address(value: str) -> tuple[str, int]:
    host, separator, port = value.rpartition(":")
    if not separator:
        raise argparse.ArgumentTypeError("Use HOST:PORT.")
    return host or "127.0.0.1", int(port)


def main() -> None:
    parser = argparse.ArgumentParser(description="Enhance StructureCo PDFs with ReportLab diagrams.")
    parser.add_argument("input", nargs="?", type=Path)
    parser.add_argument("output", nargs="?", type=Path)
    parser.add_argument("--serve", type=parse_address, metavar="HOST:PORT")
    args = parser.parse_args()
    if args.serve:
        server = ThreadingHTTPServer(args.serve, Handler)
        print(f"StructureCo ReportLab listening at http://{args.serve[0]}:{args.serve[1]}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("StructureCo ReportLab stopped.")
        finally:
            server.server_close()
        return
    if not args.input or not args.output:
        parser.error("input and output are required without --serve")
    base_pdf = args.input.read_bytes()
    payload = payload_from_pdf(base_pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(merge_report(base_pdf, payload))
    print(args.output.resolve())


if __name__ == "__main__":
    main()
