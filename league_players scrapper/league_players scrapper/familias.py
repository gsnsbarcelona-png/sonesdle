"""Datos del juego de las familias (un "Connections" de pro players de LoL).

Cada puzle tiene 16 jugadores con foto repartidos en 4 familias de 4 que comparten algo
(equipo, nacionalidad, haber jugado en un equipo un año, campeones del mundo, apellido...).
La gracia es que algunos jugadores encajan en dos familias: por eso cada puzle se comprueba
con un solucionador y solo se acepta si hay UNA ÚNICA forma de repartirlos en 4 grupos válidos.

Este módulo no descarga nada: `build.py` le pasa el maestro (`players_master.json`), las fotos y
los nombres visibles, y escribe lo que devuelve:

    familias/data/players.json   {clave: {"n": apodo, "i": foto}}   solo los usados en algún puzle
    familias/data/schedule.json  {fecha: puzle}                     reto diario, 60 días por delante
    familias/data/bank.json      [puzle, ...]                       puzles del modo libre

Un puzle es {"id", "groups": [{"level", "id", "es", "en", "players": [4 claves]}, ...]}.
Los días ya fijados del calendario no se tocan; los futuros y el banco se revalidan en cada
ejecución (un traspaso puede dejar falsa una familia) y se sustituyen solo los que dejan de valer.
"""
import datetime
import json
import os
import itertools
import random
import re
import unicodedata
from collections import Counter, defaultdict

MIN_OVERLAP_DAYS = 90      # días en un equipo, dentro de un año, para contar como "jugó en X en ese año"
FIRST_YEAR = 2012
MIN_MEMBERS = 4            # una familia necesita al menos 4 jugadores
SCHEDULE_DAYS = 60         # días de reto diario por delante
BANK_SIZE = 150
BANK_MAX_FAMILY_USES = 3   # veces que una misma familia puede salir en el banco
RECENT_DAYS = 10           # no repetir familia en días cercanos del calendario
# Mismo equipo con varios nombres en Leaguepedia: se cuentan como uno
TEAM_ALIASES = {
    "SK Telecom T1": "T1", "SKT T1": "T1", "SK Telecom T1 2": "T1", "SK Telecom T1 K": "T1",
    "Gen.G Esports": "Gen.G", "Samsung Galaxy": "Gen.G", "Samsung Galaxy Blue": "Gen.G",
    "Longzhu Gaming": "Gen.G", "Team Vitality": "Vitality", "Misfits Gaming": "Misfits",
    "Fnatic Academy": "Fnatic", "G2 Esports": "G2", "FunPlus Phoenix": "FPX",
    "EDG Youth Team": "EDG", "EDward Gaming": "EDG", "KT Academy": "KT Rolster", "Invictus Gaming": "iG", "Royal Never Give Up": "RNG", "Edward Gaming": "EDG",
    "Cloud9 Blue": "Cloud9", "Cloud9 Academy": "Cloud9", "Team Liquid Academy": "Team Liquid",
}
MIN_TEAM_FAME = {"daily": 10, "free": 5}   # jugadores del conjunto que han pasado por el equipo
ATTEMPTS = 60              # intentos para fabricar un puzle antes de rendirse
FROZEN_DAYS = 1            # hoy y mañana no se tocan aunque cambien los datos
SURNAME_FIRST_COUNTRIES = {"South Korea", "China", "Vietnam"}   # el apellido va primero
LEVEL_COLORS = {1: "yellow", 2: "green", 3: "blue", 4: "purple"}
ROLE_ES = {"Top": "Top", "Jungle": "Jungla", "Mid": "Mid", "ADC": "ADC", "Support": "Support"}
COUNTRY_ES = {
    "South Korea": "Corea del Sur", "China": "China", "Spain": "España", "France": "Francia",
    "Germany": "Alemania", "Denmark": "Dinamarca", "Sweden": "Suecia", "Poland": "Polonia",
    "United States": "Estados Unidos", "Canada": "Canadá", "Brazil": "Brasil", "Vietnam": "Vietnam",
    "Taiwan": "Taiwán", "Turkey": "Turquía", "Netherlands": "Países Bajos", "Belgium": "Bélgica",
    "United Kingdom": "Reino Unido", "Greece": "Grecia", "Italy": "Italia", "Portugal": "Portugal",
    "Slovenia": "Eslovenia", "Croatia": "Croacia", "Bulgaria": "Bulgaria", "Czech Republic": "Chequia",
    "Norway": "Noruega", "Finland": "Finlandia", "Hungary": "Hungría", "Romania": "Rumanía",
    "Serbia": "Serbia", "Mexico": "México", "Argentina": "Argentina", "Chile": "Chile",
    "Colombia": "Colombia", "Peru": "Perú", "Japan": "Japón", "Thailand": "Tailandia",
    "Philippines": "Filipinas", "Australia": "Australia", "Singapore": "Singapur", "Russia": "Rusia",
    "Ukraine": "Ucrania", "Israel": "Israel", "Lithuania": "Lituania", "Estonia": "Estonia",
    "Latvia": "Letonia", "Ireland": "Irlanda", "Austria": "Austria", "Switzerland": "Suiza",
    "Hong Kong": "Hong Kong", "Indonesia": "Indonesia", "Malaysia": "Malasia", "Uruguay": "Uruguay",
}


# ---------------------------------------------------------------- jugadores

def slug(text):
    """Clave estable de un jugador: minúsculas, sin acentos ni símbolos."""
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _year(iso):
    m = re.match(r"(\d{4})", iso or "")
    return int(m.group(1)) if m else None


def _date(iso):
    try:
        return datetime.date.fromisoformat(iso) if iso else None
    except ValueError:
        return None


def seasons_from_history(history, today):
    """{equipo: {años}} en los que pasó al menos MIN_OVERLAP_DAYS en el equipo."""
    out = defaultdict(set)
    history = [dict(h, team=canon(h.get("team"))) for h in history]
    for h in history:
        start = _date(h.get("from"))
        end = _date(h.get("to")) or today
        if not start or not h.get("team"):
            continue
        for year in range(max(start.year, FIRST_YEAR), min(end.year, today.year) + 1):
            lo, hi = max(start, datetime.date(year, 1, 1)), min(end, datetime.date(year, 12, 31))
            if (hi - lo).days >= MIN_OVERLAP_DAYS:
                out[h["team"]].add(year)
    return out


FARM = re.compile(r"\s+(Academy|Youth Team|Youth|Junior|Challengers|Rookies|Prime)$", re.I)


def canon(team):
    """Nombre único del equipo: alias conocidos y sin sufijo de equipo filial."""
    team = TEAM_ALIASES.get(team, team)
    return TEAM_ALIASES.get(FARM.sub("", team or ""), FARM.sub("", team or "")) or team


def champion_slugs():
    """Nombres de campeones del juego (curated/campeones.json), para la familia 'apodo = campeón'."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "curated", "campeones.json")
    try:
        with open(path, encoding="utf-8") as f:
            return {slug(n) for n in json.load(f)["champions"]}
    except (OSError, ValueError):
        return set()


CHAMPIONS = champion_slugs()


def build_pool(master, images, names, today=None):
    """Jugadores del juego: los que tienen foto, equipo y nombre visible.
    `names` va de página a apodo (el mismo que usa el dle)."""
    today = today or datetime.date.today()
    pool = {}
    for m in master:
        page = m.get("page")
        if not page or not images.get(page) or not names.get(page) or not m.get("game_team"):
            continue
        name = names[page]
        key = slug(page)
        if not key or key in pool:
            continue
        history = m.get("history") or []
        ach = m.get("achievements") or {}
        pool[key] = {
            "key": key, "name": name, "page": page, "image": images[page],
            "real": m.get("real") or "", "country": m.get("country") or "",
            "team": canon(m["game_team"]), "region": m.get("region"), "league": m.get("league"),
            "tier": m.get("tier"), "roles": list(m.get("roles") or m.get("positions") or []),
            "debut": m.get("debut"), "worlds": bool(ach.get("worlds")),
            "majors": sorted(m.get("major_leagues") or []),
            "seasons": seasons_from_history(history, today),
            "teams": {canon(h["team"]) for h in history if h.get("team")} | {canon(m["game_team"])},
            "born": _year(m.get("birthdate")),
        }
    return pool


# ---------------------------------------------------------------- familias

def _family(fid, ftype, level, es, en, members, entities=()):
    return {"id": fid, "type": ftype, "level": level, "es": es, "en": en,
            "members": frozenset(members), "entities": frozenset(entities)}


def build_families(pool, fame=0):
    """Todas las familias posibles con al menos MIN_MEMBERS jugadores de `pool`.
    Nivel 1 (amarillo) fácil · 2 (verde) media · 3 (azul) difícil · 4 (morado) truco."""
    by = defaultdict(set)
    for p in pool.values():
        by[("team", p["team"])].add(p["key"])
        if p["country"]:
            by[("country", p["country"])].add(p["key"])
        if p["debut"]:
            by[("debut", p["debut"])].add(p["key"])
        if p["worlds"]:
            by[("worlds",)].add(p["key"])
        for pair in itertools.combinations(sorted(set(p["roles"])), 2):
            by[("roles", pair)].add(p["key"])
        for pair in itertools.combinations(sorted(set(p["majors"])), 2):
            by[("majors", pair)].add(p["key"])
        for team, years in p["seasons"].items():
            for y in years:
                by[("teamyear", team, y)].add(p["key"])
        for pair in itertools.combinations(sorted(p["teams"]), 2):
            by[("twoteams", pair)].add(p["key"])
        if p["real"] and p["country"] in SURNAME_FIRST_COUNTRIES:
            first = p["real"].split()[0].strip(",") if p["real"].split() else ""
            if first:
                by[("surname", first)].add(p["key"])
        if p["born"]:
            by[("born", p["born"])].add(p["key"])
        if slug(p["name"]) in CHAMPIONS:
            by[("champion",)].add(p["key"])
        if re.search(r"\d", p["name"]):
            by[("digit",)].add(p["key"])

    size = Counter(t for p in pool.values() for t in p["teams"])
    fams = []
    for k, members in by.items():
        if len(members) < MIN_MEMBERS:
            continue
        t = k[0]
        teams = {k[1]} if t in ("team", "teamyear") else set(k[1]) if t == "twoteams" else set()
        if any(size[x] < fame for x in teams):
            continue   # equipo que casi nadie reconoce
        if t == "team":
            fams.append(_family(f"team:{k[1]}", t, 1, f"Juegan en {k[1]}", f"Play for {k[1]}", members, {k[1]}))
        elif t == "country":
            c = k[1]
            fams.append(_family(f"country:{c}", t, 1, f"Son de {COUNTRY_ES.get(c, c)}", f"Are from {c}", members))
        elif t == "debut":
            fams.append(_family(f"debut:{k[1]}", t, 2, f"Debutaron en {k[1]}", f"Debuted in {k[1]}", members))
        elif t == "teamyear":
            fams.append(_family(f"teamyear:{k[1]}:{k[2]}", t, 2, f"Jugaron en {k[1]} en {k[2]}",
                                f"Played for {k[1]} in {k[2]}", members, {k[1]}))
        elif t == "worlds":
            fams.append(_family("worlds", t, 3, "Campeones del mundo", "World champions", members))
        elif t == "roles":
            a, b = k[1]
            fams.append(_family(f"roles:{a}:{b}", t, 3, f"Han jugado de {ROLE_ES.get(a, a)} y de {ROLE_ES.get(b, b)}",
                                f"Have played {a} and {b}", members))
        elif t == "majors":
            a, b = (x.upper() for x in k[1])
            fams.append(_family(f"majors:{a}:{b}", t, 3, f"Han jugado en la {a} y en la {b}",
                                f"Have played in the {a} and the {b}", members))
        elif t == "twoteams":
            a, b = k[1]
            fams.append(_family(f"twoteams:{a}:{b}", t, 4, f"Pasaron por {a} y por {b}",
                                f"Played for both {a} and {b}", members, {a, b}))
        elif t == "surname":
            fams.append(_family(f"surname:{k[1]}", t, 4, f"Se apellidan {k[1]}", f"Have the surname {k[1]}", members))
        elif t == "champion":
            fams.append(_family("champion", t, 4, "Su apodo es un campeón", "Their nickname is a champion", members))
        elif t == "digit":
            fams.append(_family("digit", t, 4, "Llevan un número en el apodo", "Have a number in their nickname", members))
        elif t == "born":
            fams.append(_family(f"born:{k[1]}", t, 4, f"Nacieron en {k[1]}", f"Were born in {k[1]}", members))
    return sorted(fams, key=lambda f: f["id"])


# ---------------------------------------------------------------- solucionador

def count_partitions(keys, fams_of, limit=2):
    """Formas de repartir 16 jugadores en 4 grupos de 4 donde cada grupo comparte alguna familia.
    Devuelve (nº de soluciones hasta `limit`, primera solución, todos los grupos válidos)."""
    idx = {k: i for i, k in enumerate(keys)}
    tokens = defaultdict(list)
    for k in keys:
        for fid in fams_of.get(k, ()):
            tokens[fid].append(idx[k])
    groups = set()
    for members in tokens.values():
        if len(members) >= 4:
            for c in itertools.combinations(sorted(members), 4):
                groups.add(sum(1 << i for i in c))
    by_low = defaultdict(list)
    for g in groups:
        by_low[(g & -g).bit_length() - 1].append(g)
    full = (1 << len(keys)) - 1
    found, first = [0], []

    def dfs(covered, chosen):
        if found[0] >= limit:
            return
        if covered == full:
            found[0] += 1
            if not first:
                first.extend(chosen)
            return
        low = (~covered & (covered + 1)).bit_length() - 1
        for g in by_low.get(low, ()):
            if not g & covered:
                dfs(covered | g, chosen + [g])

    dfs(0, [])
    return found[0], first, groups


def _mask(keys, members):
    idx = {k: i for i, k in enumerate(keys)}
    return sum(1 << idx[k] for k in members)


def check_puzzle(puzzle, pool, fams_by_id, fams_of):
    """True si el puzle sigue siendo válido con los datos actuales: jugadores con foto,
    cada grupo realmente en su familia y una única solución."""
    keys = [k for g in puzzle["groups"] for k in g["players"]]
    if len(keys) != 16 or len(set(keys)) != 16 or any(k not in pool for k in keys):
        return False
    for g in puzzle["groups"]:
        fam = fams_by_id.get(g["id"])
        if not fam or len(g["players"]) != 4 or not all(k in fam["members"] for k in g["players"]):
            return False
    n, first, _ = count_partitions(keys, fams_of)
    intended = {_mask(keys, g["players"]) for g in puzzle["groups"]}
    return n == 1 and set(first) == intended


# ---------------------------------------------------------------- generador

def _weighted_sample(rng, items, weights, k):
    items, weights = list(items), list(weights)
    out = []
    for _ in range(min(k, len(items))):
        total = sum(weights)
        r = rng.random() * total
        acc = 0
        for i, w in enumerate(weights):
            acc += w
            if acc >= r:
                out.append(items.pop(i))
                weights.pop(i)
                break
    return out


def _tier_weight(p):
    """Los de tier 1 se reconocen más: salen con más frecuencia."""
    return {1: 4.0, 2: 1.0}.get(p.get("tier"), 0.5) * (1.5 if p.get("worlds") else 1.0)


def make_puzzle(rng, pool, fams, fams_of, avoid=frozenset(), puzzle_id="", family_uses=None, max_uses=None):
    """Un puzle con una familia de cada color y una única solución, o None."""
    by_level = defaultdict(list)
    for f in fams:
        if f["id"] not in avoid and not (max_uses and (family_uses or {}).get(f["id"], 0) >= max_uses):
            by_level[f["level"]].append(f)
    if any(not by_level[l] for l in (1, 2, 3, 4)):
        return None
    best = None
    for _ in range(ATTEMPTS):
        chosen, used_entities, used_keys = [], set(), set()
        for level in (4, 3, 2, 1):   # las más escasas primero
            cands = [f for f in by_level[level]
                     if f["entities"].isdisjoint(used_entities) and len(f["members"] - used_keys) >= 4]
            if not cands:
                break
            f = rng.choice(cands)
            chosen.append(f)
            used_entities |= f["entities"]
            used_keys |= set()   # los miembros se reparten después
        if len(chosen) != 4:
            continue
        # Reparto de jugadores: los que encajan en dos familias elegidas pesan más (son los señuelos)
        overlap = Counter(k for f in chosen for k in f["members"])
        members_by_family, taken = {}, set()
        for f in sorted(chosen, key=lambda f: len(f["members"])):
            cand = sorted(f["members"] - taken)
            weights = [_tier_weight(pool[k]) * (2.5 if overlap[k] > 1 else 1.0) for k in cand]
            pick = _weighted_sample(rng, cand, weights, 4)
            if len(pick) < 4:
                break
            members_by_family[f["id"]] = pick
            taken |= set(pick)
        if len(members_by_family) != 4:
            continue
        groups = [{"level": f["level"], "id": f["id"], "es": f["es"], "en": f["en"],
                   "players": members_by_family[f["id"]]} for f in sorted(chosen, key=lambda f: f["level"])]
        puzzle = {"id": puzzle_id, "groups": groups}
        keys = [k for g in groups for k in g["players"]]
        n, first, valid = count_partitions(keys, fams_of)
        intended = {_mask(keys, g["players"]) for g in groups}
        if n != 1 or set(first) != intended:
            continue
        decoys = sum(1 for k in keys if sum(1 for g in valid if g & _mask(keys, [k])
                                            and g not in intended) > 0)
        score = (min(decoys, 4), -abs(decoys - 3))
        if best is None or score > best[0]:
            best = (score, puzzle)
        if decoys >= 3:
            break
    return best[1] if best else None


def index_families(fams):
    """{jugador: [id de familia]} y {id: familia}."""
    of = defaultdict(list)
    for f in fams:
        for k in f["members"]:
            of[k].append(f["id"])
    return of, {f["id"]: f for f in fams}


def update_schedule(schedule, pool, fams, fams_of, today, days=SCHEDULE_DAYS):
    """Calendario diario: conserva lo ya fijado y completa hasta `days` días por delante.
    Los días futuros que dejen de valer (traspasos) se rehacen; hoy y mañana no se tocan."""
    by_id = {f["id"]: f for f in fams}
    out = dict(schedule)
    frozen_until = today + datetime.timedelta(days=FROZEN_DAYS)
    for offset in range(days + 1):
        day = today + datetime.timedelta(days=offset)
        iso = day.isoformat()
        if iso in out and (day <= frozen_until or check_puzzle(out[iso], pool, by_id, fams_of)):
            continue
        recent = set()
        for back in range(1, RECENT_DAYS + 1):
            prev = out.get((day - datetime.timedelta(days=back)).isoformat())
            if prev:
                recent |= {g["id"] for g in prev["groups"]}
        puzzle = None
        for attempt in range(8):
            rng = random.Random(f"familias-daily-{iso}-{attempt}")
            puzzle = make_puzzle(rng, pool, fams, fams_of, avoid=recent if attempt < 6 else frozenset(), puzzle_id=iso)
            if puzzle:
                break
        if puzzle:
            out[iso] = puzzle
        else:
            out.pop(iso, None)
    return dict(sorted(out.items()))


def update_bank(bank, pool, fams, fams_of, size=BANK_SIZE):
    """Banco del modo libre: conserva los puzles que siguen valiendo y rellena hasta `size`."""
    by_id = {f["id"]: f for f in fams}
    out, uses = [], Counter()
    for puzzle in bank:
        if check_puzzle(puzzle, pool, by_id, fams_of):
            out.append(puzzle)
            uses.update(g["id"] for g in puzzle["groups"])
    seen = {frozenset(k for g in p["groups"] for k in g["players"]) for p in out}
    n = 0
    while len(out) < size and n < size * 20:
        n += 1
        rng = random.Random(f"familias-bank-{len(out)}-{n}")
        puzzle = make_puzzle(rng, pool, fams, fams_of, puzzle_id=f"b{n:04d}", family_uses=uses, max_uses=BANK_MAX_FAMILY_USES)
        if not puzzle:
            continue
        who = frozenset(k for g in puzzle["groups"] for k in g["players"])
        if who in seen:
            continue
        seen.add(who)
        out.append(puzzle)
        uses.update(g["id"] for g in puzzle["groups"])
    return out


def used_players(pool, schedule, bank):
    """{clave: {"n": apodo, "i": foto}} solo de quien sale en algún puzle."""
    keys = {k for p in list(schedule.values()) + list(bank) for g in p["groups"] for k in g["players"]}
    return {k: {"n": pool[k]["name"], "i": pool[k]["image"]} for k in sorted(keys) if k in pool}


def build(master, images, names, schedule, bank, today=None):
    """Punto de entrada: devuelve (jugadores, calendario, banco) listos para escribir.
    El diario usa solo jugadores de tier 1 o campeones del mundo (los que la gente conoce);
    el modo libre, todos los que tienen foto."""
    today = today or datetime.date.today()
    pool = build_pool(master, images, names, today)
    daily_pool = {k: p for k, p in pool.items() if p["tier"] == 1 or p["worlds"]}
    daily_fams = build_families(daily_pool, MIN_TEAM_FAME["daily"])
    free_fams = build_families(pool, MIN_TEAM_FAME["free"])
    d_of, _ = index_families(daily_fams)
    f_of, _ = index_families(free_fams)
    new_schedule = update_schedule(schedule, daily_pool, daily_fams, d_of, today)
    new_bank = update_bank(bank, pool, free_fams, f_of)
    return used_players(pool, new_schedule, new_bank), new_schedule, new_bank
