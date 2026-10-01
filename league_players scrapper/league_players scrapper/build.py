"""
Genera los datos de todos los juegos a partir de una única fuente.

  players.json (main.py)  ─┐
  Leaguepedia Cargo        ├─>  players_master.json  ─>  dle/data/players.json
  player_list (caché)     ─┘
  worlds_rosters.json (worlds_scraper.py) + Cargo  ─>  rostergues/js/data/rosters.js

El maestro usa la página de Leaguepedia como clave (el ID no es único: hay
varios "Viper", "Caps"...). De Cargo se toman los datos vivos: nacionalidad,
fecha de nacimiento, equipo actual, si está retirado y la región del equipo
(de ahí sale la liga actual; `home_league` es la liga histórica).

El dle solo recibe jugadores en activo.

Uso:
    python build.py             # usa la caché de Cargo si tiene < 24 h
    python build.py --refresh   # vuelve a descargar Cargo
"""
import argparse
import html
import json
import os
import re
import time
import unicodedata
from collections import Counter, defaultdict
from urllib.parse import unquote

import requests

SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
ROOT             = os.path.join(SCRIPT_DIR, "..", "..")
SCRAPED_PATH     = os.path.join(SCRIPT_DIR, "players.json")
PLAYER_LIST_PATH = os.path.join(SCRIPT_DIR, "cache", "player_list.json")
CARGO_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_players.json")
TEAMS_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_teams.json")
MASTER_PATH      = os.path.join(SCRIPT_DIR, "players_master.json")
DLE_PATH         = os.path.join(ROOT, "dle", "data", "players.json")
ROSTERS_PATH     = os.path.join(SCRIPT_DIR, "worlds_rosters.json")
ROSTER_CARGO_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_roster_players.json")
REDIRECTS_CACHE_PATH    = os.path.join(SCRIPT_DIR, "cache", "roster_redirects.json")
ROSTERGUES_PATH  = os.path.join(ROOT, "rostergues", "js", "data", "rosters.js")

CARGO_URL   = "https://lol.fandom.com/wiki/Special:CargoExport"
API_URL     = "https://lol.fandom.com/api.php"
CARGO_BATCH = 100
CARGO_DELAY = 1.5
CACHE_TTL   = 24 * 3600
HEADERS     = {"User-Agent": "sonesdle-scraper (build)"}

FREE_AGENT   = "Free Agent"
RETIRED      = "Retired"
PLAYER_ROLES = {"top", "jungle", "mid", "bot", "support"}

PLAYER_FIELDS = ("OverviewPage,ID,Name,Country,Nationality,NationalityPrimary,"
                 "Birthdate,Team,Role,IsRetired,IsSubstitute")

# Región del equipo en Leaguepedia -> ligas posibles del dle (la primera es la
# de por defecto). Leaguepedia agrupa a los equipos de la LLA en Brazil/NA.
REGION_LEAGUES = {
    "Korea":         ["LCK"],
    "China":         ["LPL"],
    "EMEA":          ["LEC"],
    "Asia Pacific":  ["LCP"],
    "Brazil":        ["CBLOL", "LLA"],
    "North America": ["LCS", "LLA"],
}

COUNTRY_ISO = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
    "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
    "Belgium": "BE", "Bolivia": "BO", "Brazil": "BR", "Bulgaria": "BG",
    "Canada": "CA", "Chile": "CL", "China": "CN", "Colombia": "CO",
    "Croatia": "HR", "Czech Republic": "CZ", "Denmark": "DK",
    "Ecuador": "EC", "Egypt": "EG", "Estonia": "EE", "Finland": "FI",
    "France": "FR", "Germany": "DE", "Greece": "GR", "Hong Kong": "HK",
    "Hungary": "HU", "Iceland": "IS", "Indonesia": "ID", "Ireland": "IE",
    "Israel": "IL", "Italy": "IT", "Japan": "JP", "Kazakhstan": "KZ",
    "Latvia": "LV", "Lithuania": "LT", "Luxembourg": "LU",
    "Malaysia": "MY", "Mexico": "MX", "Mongolia": "MN", "Morocco": "MA",
    "Netherlands": "NL", "New Zealand": "NZ", "Norway": "NO",
    "Peru": "PE", "Philippines": "PH", "Poland": "PL", "Portugal": "PT",
    "Romania": "RO", "Russia": "RU", "Saudi Arabia": "SA", "Serbia": "RS",
    "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
    "South Korea": "KR", "Spain": "ES", "Sweden": "SE",
    "Switzerland": "CH", "Taiwan": "TW", "Thailand": "TH",
    "Turkey": "TR", "Ukraine": "UA", "United Kingdom": "GB",
    "United States": "US", "Uruguay": "UY", "Venezuela": "VE",
    "Vietnam": "VN",
    "Bangladesh": "BD", "Belarus": "BY", "Cambodia": "KH", "Costa Rica": "CR",
    "Dominican Republic": "DO", "India": "IN", "Iran": "IR", "Lebanon": "LB",
    "Macao": "MO", "North Macedonia": "MK", "Sri Lanka": "LK", "Syria": "SY",
}

POSITION_MAP = {
    "top laner": "Top",
    "top":       "Top",
    "jungler":   "Jungle",
    "jungle":    "Jungle",
    "mid laner": "Mid",
    "middle":    "Mid",
    "mid":       "Mid",
    "bot laner": "ADC",
    "ad carry":  "ADC",
    "bot":       "ADC",
    "adc":       "ADC",
    "support":   "Support",
    "sup":       "Support",
}
_POS_KEYS = sorted(POSITION_MAP, key=len, reverse=True)

LTA_CBLOL = re.compile(r"cblol|brazil|brasil|lta south", re.IGNORECASE)
LTA_LCS   = re.compile(r"\blcs\b|na lcs|lcs spring|lcs summer|lta north", re.IGNORECASE)
LTA_LLA   = re.compile(r"\blla\b|liga latinoamerica|\bcls\b|copa latinoamerica|\blln\b", re.IGNORECASE)

NA_COUNTRIES    = {"United States", "Canada"}
CBLOL_COUNTRIES = {"Brazil"}
LLA_COUNTRIES   = {"Argentina", "Chile", "Peru", "Colombia", "Ecuador", "Mexico",
                   "Venezuela", "Uruguay", "Bolivia"}


def to_flag(country):
    code = COUNTRY_ISO.get(country)
    if not code:
        return "🏳"
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in code)


def normalize_position(raw):
    lower = raw.lower().strip()
    for key in _POS_KEYS:
        if key in lower:
            return POSITION_MAP[key]
    return raw


def detect_league(p):
    region = p.get("region", "")
    if region != "LTA":
        return region
    combined = " ".join(
        p.get("titulos_nacionales", []) +
        [e.get("equipo", "") for e in p.get("historial_equipos", [])]
    )
    if LTA_CBLOL.search(combined):
        return "CBLOL"
    if LTA_LCS.search(combined):
        return "LCS"
    if LTA_LLA.search(combined):
        return "LLA"
    country = p.get("nacionalidad", "")
    if country in NA_COUNTRIES:
        return "LCS"
    if country in CBLOL_COUNTRIES:
        return "CBLOL"
    if country in LLA_COUNTRIES:
        return "LLA"
    return "LTA"



# ------------------------------------------------------------ Cargo (vivo)

def page_title(page_name):
    return unquote(page_name).replace("_", " ")


def cargo_quote(s):
    return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')


def cargo_query(session, field, values, table="Players", fields=PLAYER_FIELDS):
    time.sleep(CARGO_DELAY)
    r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
        "tables": table,
        "fields": fields,
        "where": f"{field} IN (%s)" % ",".join(cargo_quote(v) for v in values),
        "format": "json", "limit": 500,
    })
    r.raise_for_status()
    rows = r.json()
    for row in rows:
        # Cargo devuelve "113" como número y escapa el HTML de los nombres
        for k in ("OverviewPage", "ID"):
            if k in row:
                row[k] = str(row[k])
        if row.get("Name"):
            row["Name"] = html.unescape(html.unescape(row["Name"])).replace("\xa0", " ")
    return rows


def cached(path, refresh, fn):
    """Resultado de fn(), guardado en `path` durante CACHE_TTL."""
    if not refresh and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cache = json.load(f)
        if time.time() - cache["fetched_at"] < CACHE_TTL:
            return cache["data"]
    data = fn()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": time.time(), "data": data}, f, ensure_ascii=False)
    return data


def resolve_redirects(titles):
    """{título: título actual} siguiendo las redirecciones de la wiki."""
    resolved = {}
    session = requests.Session()
    titles = sorted(set(titles))
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        time.sleep(CARGO_DELAY)
        data = session.get(API_URL, headers=HEADERS, timeout=60, params={
            "action": "query", "titles": "|".join(batch), "redirects": 1, "format": "json",
        }).json().get("query", {})
        steps = {s["from"]: s["to"] for s in data.get("normalized", []) + data.get("redirects", [])}
        for t in batch:
            cur, seen = t, set()
            while cur in steps and cur not in seen:
                seen.add(cur)
                cur = steps[cur]
            resolved[t] = cur
    return resolved


def same_country(row, country):
    nats = [row.get("NationalityPrimary"), row.get("Country"), *(row.get("Nationality") or [])]
    return country in nats


def fetch_players(entries):
    """{página: fila de la tabla Players}.
    `entries` = [(página, id, nombre real[, país])]; el nombre real o el país
    sirven para elegir al jugador correcto si la página ya no existe."""
    rows = {}
    session = requests.Session()
    pages = sorted({e[0] for e in entries})
    for i in range(0, len(pages), CARGO_BATCH):
        print(f"\r  Cargo [{min(i + CARGO_BATCH, len(pages))}/{len(pages)}]", end="", flush=True)
        for row in cargo_query(session, "OverviewPage", pages[i:i + CARGO_BATCH]):
            rows[row["OverviewPage"]] = row
    print()

    # Páginas renombradas: se busca por ID y se elige por nombre real
    missing = [e for e in entries if e[0] not in rows]
    if missing:
        ids = sorted({i for _, pid, *_ in missing for i in (pid, pid.lstrip("0") or pid)})
        by_id = defaultdict(list)
        for j in range(0, len(ids), CARGO_BATCH):
            for row in cargo_query(session, "ID", ids[j:j + CARGO_BATCH]):
                by_id[row["ID"].lower()].append(row)
        for page, pid, real, *rest in missing:
            country = rest[0] if rest else ""
            cands = list({c["OverviewPage"]: c for key in {pid, pid.lstrip("0")}
                          for c in by_id.get(key.lower(), [])}.values())
            if real:
                match = [c for c in cands if _key(c.get("Name"))[:6] == _key(real)[:6]]
            elif country:
                match = [c for c in cands if same_country(c, country)]
            else:
                match = cands
            if len(match) == 1:
                rows[page] = match[0]
    return rows


def fetch_team_regions(teams):
    """{equipo: región de Leaguepedia}. MediaWiki pone en mayúscula la primera
    letra del título ("paiN Gaming" -> "PaiN Gaming")."""
    titles = {t[:1].upper() + t[1:]: t for t in teams}
    regions = {}
    session = requests.Session()
    keys = sorted(titles)
    for i in range(0, len(keys), CARGO_BATCH):
        rows = cargo_query(session, "OverviewPage", keys[i:i + CARGO_BATCH],
                           table="Teams", fields="OverviewPage,Region")
        for row in rows:
            if row["OverviewPage"] in titles and row.get("Region"):
                regions[titles[row["OverviewPage"]]] = row["Region"]
    return regions


# ----------------------------------------------------------------- maestro

def _key(s):
    return re.sub(r"\W", "", unicodedata.normalize("NFKC", s or "")).lower()


def resolve_pages(scraped, player_list):
    """Asocia cada registro de main.py con su página de Leaguepedia."""
    by_id = defaultdict(dict)
    for p in player_list:
        by_id[p["id"]][p["page_name"]] = p

    pages = []
    for r in scraped:
        cands = list(by_id.get(r["id"], {}).values())
        full = _key(r.get("nombre_real"))
        real = full[:6]
        if len(cands) > 1:
            cands = ([c for c in cands if full and _key(c["real_name"])
                      and (full.startswith(_key(c["real_name"])) or _key(c["real_name"]).startswith(full))]
                     or [c for c in cands if real and _key(c["real_name"])[:6] == real]
                     or [c for c in cands if real and real in _key(page_title(c["page_name"]))]
                     or [c for c in cands if _key(c["team"]) == _key(r.get("equipo_actual"))]
                     or cands)
        pages.append(page_title(cands[0]["page_name"]) if len(cands) == 1 else None)
    return pages


def nationality(cargo, scraped):
    if cargo:
        nats = [n for n in cargo.get("Nationality") or [] if n]
        country = cargo.get("NationalityPrimary") or (nats[0] if nats else None) or cargo.get("Country")
        if country:
            return country
    return scraped.get("nacionalidad", "")


def status_and_team(cargo, scraped):
    if not cargo:
        return "unknown", scraped.get("equipo_actual", "")
    role = (cargo.get("Role") or "").lower()
    if cargo.get("IsRetired") or (role and role not in PLAYER_ROLES):
        return "retired", RETIRED          # retirado o ahora es staff
    if not cargo.get("Team"):
        return "free_agent", FREE_AGENT
    if cargo.get("IsSubstitute"):
        return "sub", cargo["Team"]
    return "player", cargo["Team"]


def current_league(region, home_league):
    """Liga del equipo actual; si la región no lo deja claro, la histórica."""
    leagues = REGION_LEAGUES.get(region)
    if not leagues:
        return home_league
    return home_league if home_league in leagues else leagues[0]


def build_master(scraped, pages, cargo_rows, team_regions):
    master = []
    for r, page in zip(scraped, pages):
        cargo = cargo_rows.get(page) if page else None
        status, team = status_and_team(cargo, r)
        position = normalize_position(r.get("posicion", ""))
        home = detect_league(r)
        master.append({
            "page":      page,
            "id":        r["id"],
            "real":      (cargo or {}).get("Name") or r.get("nombre_real", ""),
            "country":   nationality(cargo, r),
            "birthdate": (cargo or {}).get("Birthdate"),
            "positions": [position] if position else [],
            "league":    current_league(team_regions.get(team), home),
            "home_league": home,
            "status":    status,
            "team":      team,
            "debut":     r.get("debut"),
            "titles": {
                "international": r.get("titulos_internacionales", []),
                "national":      r.get("titulos_nacionales", []),
            },
            "history": [{"team": h["equipo"], "from": h["desde"], "to": h["hasta"]}
                        for h in r.get("historial_equipos", [])],
        })
    return master


# -------------------------------------------------------------- por juego

def display_names(master):
    """El ID si es único; si no, el título de la página ("Viper (Park Do-hyeon)")."""
    counts = Counter(p["id"].lower() for p in master)
    return [p["page"] if counts[p["id"].lower()] > 1 and p["page"] else p["id"]
            for p in master]


def build_dle(master):
    """Solo jugadores en activo: así todos tienen equipo real que comparar."""
    active = [p for p in master if p["status"] in ("player", "sub")]
    players = []
    for p, name in zip(active, display_names(active)):
        players.append({
            "name":      name,
            "real":      p["real"],
            "country":   p["country"],
            "flag":      to_flag(p["country"]),
            "league":    p["league"],
            "position":  p["positions"],
            "titles":    any(re.search(r"playoff|finals", t, re.IGNORECASE)
                             for t in p["titles"]["national"]),
            "worlds":    any("play-in" not in t.lower() for t in p["titles"]["international"]),
            "birthdate": p["birthdate"],
            "team":      p["team"],
        })
    return players


def roster_player_info(cargo, fallback_country):
    country = nationality(cargo, {"nacionalidad": fallback_country}) if cargo else fallback_country
    return {"real": (cargo or {}).get("Name") or "", "country": country, "flag": to_flag(country)}


def build_rostergues_js(rosters, cargo_rows, canonical):
    """rosters.js con los datos de cada jugador una sola vez (PLAYERS) y las
    plantillas apuntando a su página.

    El nombre es el que tenía en el torneo (Incarnati0n en 2015, no Jensen),
    pero las variantes de mayúsculas/espacios se unifican con el ID de
    Leaguepedia ("Hans sama", "HansSama" -> "Hans Sama"). Los jugadores de las
    plantillas 2011-2014 (sin página) se asocian por nombre a los de las
    modernas; si no hay coincidencia llevan sus datos en línea."""
    by_key = defaultdict(set)
    for r in rosters:
        for p in r["players"]:
            if p.get("page"):
                by_key[_key(p["name"])].add(canonical.get(p["page"], p["page"]))

    players, raw = {}, []
    for r in rosters:
        entries = []
        for p in r["players"]:
            page = canonical.get(p.get("page"), p.get("page"))
            if not page and len(by_key.get(_key(p["name"]), ())) == 1:
                page = next(iter(by_key[_key(p["name"])]))
            cargo = cargo_rows.get(page) if page else None
            name = cargo["ID"] if cargo and _key(cargo["ID"]) == _key(p["name"]) else p["name"]
            entry = {"name": name, "position": p["position"]}
            if page:
                entry["page"] = page
                if page not in players:
                    players[page] = roster_player_info(cargo, p.get("country", ""))
            else:
                entry.update({k: p.get(k, "") for k in ("real", "country", "flag")})
            entries.append(entry)
        raw.append({k: r[k] for k in ("id", "team", "year", "event", "region")}
                   | {"placement": r.get("placement", "groups"), "players": entries})

    J = lambda v: json.dumps(v, ensure_ascii=False)
    lines = ["// Generado por build.py (worlds_rosters.json + Leaguepedia). No editar a mano.",
             "", "const PLAYERS = {"]
    lines += [f"  {J(page)}: {J(info)}," for page, info in sorted(players.items())]
    lines += ["};", "", "const RAW = ["]
    lines += [f"  {J(r)}," for r in raw]
    lines += ["];", "",
              "export const ROSTERS = RAW.map(r => ({",
              "  ...r,",
              "  players: r.players.map(p => ({ ...PLAYERS[p.page], ...p })),",
              "}));", ""]
    return "\n".join(lines), players


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh", action="store_true", help="vuelve a descargar Cargo")
    args = ap.parse_args()

    with open(SCRAPED_PATH, encoding="utf-8") as f:
        scraped = json.load(f)["players"]
    with open(PLAYER_LIST_PATH, encoding="utf-8") as f:
        player_list = json.load(f)

    pages = resolve_pages(scraped, player_list)
    print(f"{sum(p is not None for p in pages)}/{len(pages)} jugadores asociados a su página")

    entries = [(page, r["id"], r.get("nombre_real", "")) for r, page in zip(scraped, pages) if page]
    cargo_rows = cached(CARGO_CACHE_PATH, args.refresh, lambda: fetch_players(entries))

    teams = sorted({row["Team"] for row in cargo_rows.values() if row.get("Team")})
    team_regions = cached(TEAMS_CACHE_PATH, args.refresh, lambda: fetch_team_regions(teams))
    master = build_master(scraped, pages, cargo_rows, team_regions)
    missing = [m["id"] for m in master if m["status"] == "unknown"]
    print(f"{len(master) - len(missing)}/{len(master)} con datos de Cargo"
          + (f" (sin datos: {', '.join(missing[:10])})" if missing else ""))

    write_json(MASTER_PATH, {"built_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                             "players": master})
    print(f"Maestro -> {MASTER_PATH}")

    dle = build_dle(master)
    write_json(DLE_PATH, {"players": dle})
    print(f"dle -> {DLE_PATH} ({len(dle)} jugadores)")
    for status, n in Counter(m["status"] for m in master).most_common():
        print(f"  {status}: {n}")

    # rostergues: jugadores de las plantillas que no están en el maestro
    with open(ROSTERS_PATH, encoding="utf-8") as f:
        rosters = json.load(f)
    roster_pages = {p["page"] for r in rosters for p in r["players"] if p.get("page")}
    canonical = cached(REDIRECTS_CACHE_PATH, args.refresh, lambda: resolve_redirects(roster_pages))
    roster_entries = {(canonical.get(p["page"], p["page"]), p["name"], "", p.get("country", ""))
                      for r in rosters for p in r["players"] if p.get("page")}
    roster_entries = sorted(e for e in roster_entries if e[0] not in cargo_rows)
    extra = cached(ROSTER_CARGO_CACHE_PATH, args.refresh, lambda: fetch_players(roster_entries))
    js, roster_players = build_rostergues_js(rosters, {**extra, **cargo_rows}, canonical)
    with open(ROSTERGUES_PATH, "w", encoding="utf-8") as f:
        f.write(js)
    no_real = sum(1 for p in roster_players.values() if not p["real"])
    print(f"rostergues -> {ROSTERGUES_PATH} ({len(rosters)} plantillas, "
          f"{len(roster_players)} jugadores, {no_real} sin nombre real)")


if __name__ == "__main__":
    main()
