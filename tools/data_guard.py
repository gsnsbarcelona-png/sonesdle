#!/usr/bin/env python3
"""Revisa los cambios que ha generado build.py antes de publicarlos.

El workflow diario descarga datos de Leaguepedia, que cualquiera puede editar. Este script
compara los ficheros de datos del directorio de trabajo con el último commit y decide si el
cambio es el de un día normal (se publica solo) o si es raro y necesita que lo mire una persona.

Solo usa la biblioteca estándar. Uso:

    python3 tools/data_guard.py --markdown guard.md --github-output "$GITHUB_OUTPUT"

Escribe `changed=true|false` y `safe=true|false` en --github-output. Siempre sale con código 0:
que el cambio sea sospechoso no es un error del script, es una decisión que va al workflow.
"""
import argparse
import datetime
import json
import re
import subprocess
import sys

# Un día normal toca unos pocos jugadores (el máximo visto en el historial son ~15).
# Los límites dejan margen, pero un cambio masivo (nueva temporada, vandalismo, error del
# scraper) los supera y pasa a revisión manual.
LIMITS = {
    "dle_total": 60,        # jugadores nuevos + quitados + modificados
    "dle_added": 25,
    "dle_removed": 15,
    "dle_images": 40,       # fotos nuevas, cambiadas o quitadas
    "grid_total": 30,
    "words_total": 30,      # respuestas de wordle nuevas, quitadas o modificadas
    "guesses_total": 200,   # palabras válidas añadidas o quitadas
    "schedule_added": 70,   # días nuevos de calendario
    "js_lines": 150,        # líneas cambiadas en cada fichero .js de datos
}

# Solo las fotos de este host se pintan (coincide con img-src de la CSP en vercel.json)
ALLOWED_HOSTS = {"static.wikia.nocookie.net"}

FILES = [
    "dle/data/players.json",
    "rostergues/js/data/rosters.js",
    "carrera/js/data/players.js",
    "grid/data/players.json",
    "grid/data/schedule.json",
    "wordle/data/words.json",
    "wordle/data/schedule.json",
]

# Texto que no debería aparecer en nombres, equipos ni descripciones
SUSPICIOUS = re.compile(r"[<>`]|javascript:|data:text|\bon[a-z]+\s*=|\\u003c|\\x3c|[\x00-\x08\x0b\x0c\x0e-\x1f]", re.I)
URL = re.compile(r"https?://([A-Za-z0-9.-]+)", re.I)


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=check).stdout


def old_text(path):
    r = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def new_text(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None


def by_key(rows, key):
    return {r[key]: r for r in rows}


def diff_records(old, new):
    """(añadidos, quitados, modificados) entre dos diccionarios clave -> registro."""
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    changed = sorted(k for k in set(old) & set(new) if old[k] != new[k])
    return added, removed, changed


def safe_name(s):
    """Texto externo apto para un PR: sin @ (avisaría a usuarios), # ni marcado."""
    return re.sub(r"[^\w .'\-]", "", str(s), flags=re.UNICODE)[:40] or "?"


def sample(names, n=12):
    names = [safe_name(x) for x in names[:n]]
    return ", ".join(f"`{x}`" for x in names) + ("…" if len(names) == n else "")


def changed_lines(path):
    out = git("diff", "--numstat", "HEAD", "--", path).split()
    return (int(out[0]) + int(out[1])) if len(out) >= 2 and out[0].isdigit() else 0


def added_lines(path):
    return [l[1:] for l in git("diff", "-U0", "HEAD", "--", path).splitlines()
            if l.startswith("+") and not l.startswith("+++")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--markdown", help="fichero donde escribir el resumen")
    ap.add_argument("--github-output", help="fichero de salidas de GitHub Actions")
    ap.add_argument("--today", help="fecha de hoy AAAA-MM-DD (para pruebas)")
    args = ap.parse_args()
    today = args.today or datetime.date.today().isoformat()
    tomorrow = (datetime.date.fromisoformat(today) + datetime.timedelta(days=1)).isoformat()

    touched = [p for p in FILES if old_text(p) != new_text(p)]
    rows, problems = [], []   # rows: (fichero, resumen); problems: motivos para revisar

    def check(cond, msg):
        if cond:
            problems.append(msg)

    for p in touched:
        old, new = old_text(p), new_text(p)
        if old is None or new is None:
            problems.append(f"`{p}` se ha creado o borrado entero")
            rows.append((p, "creado o borrado"))
            continue

        if p == "dle/data/players.json":
            o = by_key(json.loads(old)["players"], "name"); n = by_key(json.loads(new)["players"], "name")
            a, r, c = diff_records(o, n)
            imgs = [k for k in set(o) | set(n) if o.get(k, {}).get("image") != n.get(k, {}).get("image")]
            rows.append((p, f"{len(a)} nuevos, {len(r)} quitados, {len(c)} modificados; {len(imgs)} fotos distintas"))
            check(len(a) + len(r) + len(c) > LIMITS["dle_total"], f"dle: {len(a)+len(r)+len(c)} jugadores cambiados (máximo {LIMITS['dle_total']})")
            check(len(a) > LIMITS["dle_added"], f"dle: {len(a)} jugadores nuevos (máximo {LIMITS['dle_added']})")
            check(len(r) > LIMITS["dle_removed"], f"dle: {len(r)} jugadores quitados (máximo {LIMITS['dle_removed']})")
            check(len(imgs) > LIMITS["dle_images"], f"dle: {len(imgs)} fotos distintas (máximo {LIMITS['dle_images']})")
            if a or r or c:
                rows.append(("", f"Ejemplos: nuevos {sample(a) or '—'} · quitados {sample(r) or '—'} · modificados {sample(c) or '—'}"))

        elif p == "grid/data/players.json":
            o = by_key(json.loads(old), "key"); n = by_key(json.loads(new), "key")
            a, r, c = diff_records(o, n)
            rows.append((p, f"{len(a)} nuevos, {len(r)} quitados, {len(c)} modificados"))
            check(len(a) + len(r) + len(c) > LIMITS["grid_total"], f"grid: {len(a)+len(r)+len(c)} jugadores cambiados (máximo {LIMITS['grid_total']})")

        elif p == "wordle/data/words.json":
            jo, jn = json.loads(old), json.loads(new)
            a, r, c = diff_records(by_key(jo["answers"], "w"), by_key(jn["answers"], "w"))
            g = len(set(jo["guesses"]) ^ set(jn["guesses"]))
            rows.append((p, f"respuestas: {len(a)} nuevas, {len(r)} quitadas, {len(c)} modificadas; {g} palabras válidas distintas"))
            check(len(a) + len(r) + len(c) > LIMITS["words_total"], f"wordle: {len(a)+len(r)+len(c)} respuestas cambiadas (máximo {LIMITS['words_total']})")
            check(g > LIMITS["guesses_total"], f"wordle: {g} palabras válidas distintas (máximo {LIMITS['guesses_total']})")

        elif p in ("wordle/data/schedule.json", "grid/data/schedule.json"):
            o, n = json.loads(old), json.loads(new)
            a, r, c = diff_records(o, n)
            # El calendario solo debe crecer por el final: hoy y mañana ya están fijados
            tocados = [d for d in r + c if d <= tomorrow]
            rows.append((p, f"{len(a)} días nuevos, {len(r)} quitados, {len(c)} modificados"))
            check(tocados, f"{p}: cambia el calendario de días ya fijados ({', '.join(tocados[:5])})")
            check(len(a) > LIMITS["schedule_added"], f"{p}: {len(a)} días nuevos (máximo {LIMITS['schedule_added']})")

        else:  # ficheros .js: sin estructura que comparar, se mide por líneas
            n_lines = changed_lines(p)
            rows.append((p, f"{n_lines} líneas cambiadas"))
            check(n_lines > LIMITS["js_lines"], f"{p}: {n_lines} líneas cambiadas (máximo {LIMITS['js_lines']})")

        # Contenido añadido: nada que parezca marcado ni enlaces a hosts no permitidos
        for line in added_lines(p):
            if SUSPICIOUS.search(line):
                problems.append(f"`{p}`: texto sospechoso en una línea añadida")
                break
        for line in added_lines(p):
            hosts = {h.lower() for h in URL.findall(line)} - ALLOWED_HOSTS
            if hosts:
                problems.append(f"`{p}`: enlace a un host no permitido ({safe_name(sorted(hosts)[0])})")
                break

    changed = bool(touched)
    safe = changed and not problems

    md = ["## Cambios en los datos", ""]
    if not changed:
        md.append("Sin cambios.")
    else:
        md += ["| Fichero | Cambio |", "|---|---|"]
        md += [f"| {f and '`'+f+'`'} | {s} |" for f, s in rows]
        md.append("")
        if safe:
            md.append("**Dentro de los límites de un día normal: se publica solo.**")
        else:
            md.append("**Necesita revisión antes de publicarse:**")
            md += [f"- {m}" for m in problems]
        md += ["", "<details><summary>Límites</summary>", "", "```", json.dumps(LIMITS, indent=1), "```", "</details>"]
    text = "\n".join(md) + "\n"

    if args.markdown:
        with open(args.markdown, "w", encoding="utf-8") as f:
            f.write(text)
    if args.github_output:
        with open(args.github_output, "a", encoding="utf-8") as f:
            f.write(f"changed={'true' if changed else 'false'}\nsafe={'true' if safe else 'false'}\n")
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
