"""
Genera los datos de todos los juegos a partir de una única fuente.

  players.json (main.py)          ─┐                          ┌─> dle/data/players.json
  worlds_rosters.json (worlds_…)  ─┼─> players_master.json  ──┼─> rostergues/js/data/rosters.js
  curated/carrera.json, grid.json ─┤                          ├─> carrera/js/data/players.js
  Leaguepedia Cargo               ─┘                          └─> grid/data/players.json

El maestro usa la página de Leaguepedia como clave (el ID no es único: hay
varios "Viper", "Caps"...). Incluye a los jugadores tier 1 de main.py y a los
que aparecen en rostergues, carrera y grid. De Cargo se toman los datos vivos:
nacionalidad, fecha de nacimiento, equipo actual, si está retirado, la región
del equipo (de ahí sale la liga actual; `home_league` es la histórica) y el
historial de equipos. Los títulos de Worlds/MSI salen de las plantillas.

Lo único escrito a mano está en curated/: qué jugadores salen en carrera
(con su pista) y en grid (con su emoji).

El dle recibe a los jugadores de main.py en activo, con la liga exacta de su
equipo, su tier (1 = liga con plaza a Worlds) y su región.

Lo único escrito a mano sobre los datos de un jugador está en curated/player_fixes.json
(nombre real, país o fecha de nacimiento que falten o estén mal en Leaguepedia).

Uso:
    python build.py             # solo descarga lo que ha cambiado desde la última vez
    python build.py --refresh   # lo descarga todo de nuevo

La actualización es incremental: cache/sync_state.json guarda cuándo fue la última, y
fetch_changes() pregunta a Leaguepedia qué páginas se han editado desde entonces y qué
fichajes ha habido; solo eso se vuelve a descargar. Además, cada dato caduca por su
cuenta (REFRESH_DAYS, STABLE_REFRESH_DAYS), así que cada día se renueva una parte por
si algún cambio no se detecta. Sin cache/ (o si hace > 80 días) se descarga todo.
"""
import argparse
import datetime
import html
import json
import os
import random
import re
import time
import unicodedata
import zlib
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
EXTRA_CARGO_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_extra_players.json")
REDIRECTS_CACHE_PATH   = os.path.join(SCRIPT_DIR, "cache", "roster_redirects.json")
TENURES_CACHE_PATH     = os.path.join(SCRIPT_DIR, "cache", "cargo_tenures.json")
ALIASES_CACHE_PATH     = os.path.join(SCRIPT_DIR, "cache", "cargo_aliases.json")
LEAGUE_TITLES_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_league_titles.json")
LEAGUE_INFO_CACHE_PATH   = os.path.join(SCRIPT_DIR, "cache", "cargo_leagues.json")
MAJOR_LEAGUES_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_major_leagues.json")
CHAMPIONS_CACHE_PATH   = os.path.join(SCRIPT_DIR, "cache", "cargo_champions.json")
TEAM_TOURNAMENTS_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_team_tournaments.json")
CHAMPION_REDIRECTS_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "champion_redirects.json")
TIER2_PLAYERS_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_tier2_players.json")
BIRTH_YEARS_CACHE_PATH   = os.path.join(SCRIPT_DIR, "cache", "birth_years.json")
TIER2_TEAMS_CACHE_PATH   = os.path.join(SCRIPT_DIR, "cache", "cargo_tier2_teams.json")
SYNC_STATE_PATH          = os.path.join(SCRIPT_DIR, "cache", "sync_state.json")
PLAYER_FIXES_PATH        = os.path.join(SCRIPT_DIR, "curated", "player_fixes.json")
CURATED_CARRERA_PATH   = os.path.join(SCRIPT_DIR, "curated", "carrera.json")
CURATED_GRID_PATH      = os.path.join(SCRIPT_DIR, "curated", "grid.json")
ROSTERGUES_PATH  = os.path.join(ROOT, "rostergues", "js", "data", "rosters.js")
CARRERA_PATH     = os.path.join(ROOT, "carrera", "js", "data", "players.js")
GRID_PATH        = os.path.join(ROOT, "grid", "data", "players.json")
GRID_CATEGORIES_PATH = os.path.join(ROOT, "grid", "data", "categories.json")
GRID_SCHEDULE_PATH   = os.path.join(ROOT, "grid", "data", "schedule.json")
WORDLE_WORDS_PATH    = os.path.join(ROOT, "wordle", "data", "words.json")
WORDLE_SCHEDULE_PATH = os.path.join(ROOT, "wordle", "data", "schedule.json")
LEAGUE_HISTORY_CACHE_PATH = os.path.join(SCRIPT_DIR, "cache", "cargo_league_history.json")

CARGO_URL   = "https://lol.fandom.com/wiki/Special:CargoExport"
API_URL     = "https://lol.fandom.com/api.php"
CARGO_BATCH = 100
CARGO_DELAY = 1.5
# Actualización incremental: cada día se mira qué ha cambiado en Leaguepedia
# (fetch_changes) y solo se descarga eso; además, cada dato se renueva por tandas
# como mucho cada REFRESH_DAYS, por si algún cambio no se detecta.
REFRESH_DAYS        = 7    # equipos, torneos, títulos, etapas
STABLE_REFRESH_DAYS = 30   # datos propios del jugador (nombre, país, nacimiento)
ROSTER_CHANGES_DAYS = 30   # fichajes que se miran (a veces se apuntan con fecha pasada)
RECENT_CHANGES_MAX_DAYS = 80   # la wiki guarda ~90 días de cambios: si no, todo de nuevo
HEADERS     = {"User-Agent": "sonesdle-scraper (build)"}

FREE_AGENT   = "Free Agent"
RETIRED      = "Retired"
PLAYER_ROLES = {"top", "jungle", "mid", "bot", "support"}

PLAYER_FIELDS = ("OverviewPage,ID,Name,Country,Nationality,NationalityPrimary,"
                 "Birthdate,Team,Role,IsRetired,IsSubstitute")

# Liga actual de un equipo: la de mejor tier en la que ha jugado en el último año
# de LEAGUE_YEARS con alguna liga (si empatan, la más reciente).
#   tier 1: ligas con plaza directa a Worlds
#   tier 2: resto de ligas oficiales de primera división (ERL, LCK CL, NACL, LJL...)
#   tier 3: segundas divisiones, academias, universitarias y no oficiales
LEAGUE_YEARS = ("2025", "2026")
TIER1_LEAGUES = {"LCK": "LCK", "LPL": "LPL", "LEC": "LEC", "LCP": "LCP", "LCS": "LCS",
                 "CBLOL": "CBLOL", "LTA N": "LCS", "LTA S": "CBLOL"}
# Grid "Campeón de liga": títulos de una liga tier 1, con sus nombres antiguos
# (LTC = Champions, LPLOL = LPL, PCS y LMS antes de la LCP)
TIER1_TITLE_LEAGUES = {"LCK", "LTC", "LPL", "LPLOL", "LEC", "EU LCS", "LCS", "NA LCS",
                       "LTA", "LTA N", "LTA S", "CBLOL", "LCP", "PCS", "LMS"}
# No son la liga de un equipo: internacionales, copas entre ligas, exhibiciones
NOT_A_LEAGUE = {"EM", "KeSPA Cup", "AM", "AME", "AG", "AC", "EWC", "WSCI", "WLRQ"}
NOT_A_LEAGUE_RE = re.compile(r"cup|showmatch|invitational|all-?star|nations|games\b|retirement",
                             re.IGNORECASE)
LOWER_DIVISION_RE = re.compile(r"2nd division|division 2|3rd division|academy|rising|"
                               r"college|university", re.IGNORECASE)
# Región de Leaguepedia (de la liga o del equipo) -> región del dle
REGION_CODES = {
    "Korea": "KR", "China": "CN", "Europe": "EMEA", "EMEA": "EMEA", "Turkey": "EMEA",
    "North America": "NA", "Brazil": "BR", "Latin America": "LATAM",
    "Asia Pacific": "PAC", "Asia": "PAC", "Japan": "PAC", "Vietnam": "PAC",
    "PCS": "PAC", "LMS": "PAC", "Oceania": "PAC", "Southeast Asia": "PAC",
}
LEAGUE_REGION = {"LTA N": "NA", "LTA S": "BR", "CD": "BR"}   # ligas con región "Americas"
HISTORY_LEAGUE_REGION = {"LEC": "EMEA", "LCK": "KR", "LPL": "CN", "LCP": "PAC",
                         "LCS": "NA", "CBLOL": "BR", "LLA": "LATAM"}

# Región de un equipo (Teams.Region) -> liga, para el historial
TEAM_REGION_LEAGUE = {
    "Korea": "LCK", "China": "LPL", "Europe": "LEC", "EMEA": "LEC",
    "North America": "LCS", "Americas": "LCS", "Brazil": "CBLOL", "Latin America": "LLA",
    "Latin America North": "LLA", "Latin America South": "LLA",
    "PCS": "LCP", "LMS": "LCP", "Asia Pacific": "LCP", "Vietnam": "LCP",
    "Japan": "LCP", "Oceania": "LCP", "Southeast Asia": "LCP",
}
MERGE_GAP_DAYS = 31   # etapas seguidas en el mismo equipo se unen si hay menos hueco

# Equipos de las categorías de grid (nombre completo en minúsculas)
GRID_TEAMS = {
    "t1":     r"sk telecom t1( 2| k| s)?|t1",
    "geng":   r"samsung (galaxy|white|blue|ozone)|ksv( esports)?|gen\.g",
    "g2":     r"g2 esports|gamers2",
    "fnatic": r"fnatic",
    "c9":     r"cloud9",
    "drx":    r"drx|dragonx|kingzone dragonx|longzhu gaming|incredible miracle",
    "kt":     r"kt rolster|kt bullets|kt arrows",
    "damwon": r"damwon gaming|dwg kia|damwon kia|dplus kia|dplus",
    "tl":     r"team liquid( honda)?",
    "edg":    r"edward gaming",
    "tsm":    r"team solomid|tsm( ftx)?",
    "fpx":    r"funplus phoenix",
    "tpa":    r"taipei assassins",
    "mad":    r"mad lions( koi)?",
    "h2k":    r"h2k([- ]gaming)?",
}
GRID_NAT = {"South Korea": "korean", "China": "chinese", "Taiwan": "taiwanese",
            "Hong Kong": "taiwanese", "United States": "na", "Canada": "na"}
EUROPE = {"Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark",
          "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland",
          "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Netherlands",
          "Norway", "Poland", "Portugal", "Romania", "Serbia", "Slovakia", "Slovenia",
          "Spain", "Sweden", "Switzerland", "United Kingdom", "Belarus", "Ukraine",
          "North Macedonia", "Bosnia and Herzegovina", "Albania", "Montenegro"}
CARRERA_REGIONS = {"LCK", "LPL", "LEC", "LCS"}
# Las cuatro ligas mayores con sus nombres históricos en Leaguepedia. Un jugador
# "jugó en" una si tiene al menos MIN_MAJOR_TOURNAMENTS torneos en ella (descarta
# invitaciones puntuales, como CLG en OGN Champions 2012).
MAJOR_LEAGUES = {
    "lck": ["LoL Champions Korea", "LoL The Champions"],
    "lpl": ["Tencent LoL Pro League"],
    "lec": ["LoL EMEA Championship", "Europe League Championship Series"],
    "lcs": ["League of Legends Championship Series", "North America League Championship Series",
            "League of Legends Championship of The Americas North"],
}
MIN_MAJOR_TOURNAMENTS = 3

# Wordle: todos los que han jugado cada liga tier 1 (con sus nombres antiguos).
# "PCS" (PCS + LMS, antecesoras de la LCP) solo sale en el modo libre, con la LCP.
WORDLE_LEAGUES = {
    "LCK":   ["LoL Champions Korea", "LoL The Champions"],
    "LPL":   ["Tencent LoL Pro League"],
    "LEC":   ["LoL EMEA Championship", "Europe League Championship Series"],
    "LCS":   ["League of Legends Championship Series", "North America League Championship Series",
              "League of Legends Championship of The Americas North"],
    "CBLOL": ["Circuit Brazilian League of Legends",
              "League of Legends Championship of The Americas South"],
    "LCP":   ["League of Legends Championship Pacific"],
    "PCS":   ["Pacific Championship Series", "LoL Master Series"],
}
WORDLE_DAILY_LEAGUES = ["LCK", "LPL", "LEC", "LCS", "CBLOL", "LCP"]
WORDLE_SCHEDULE_DAYS = 60   # días del calendario diario que se dejan asignados por delante
WORD_RE = re.compile(r"[A-Za-z]{4,6}")
# El reto diario va rotando de largo (5, 6, 4, 5...) y solo usa jugadores conocidos:
# en activo en una liga tier 1, o con al menos este número de torneos en ellas
WORDLE_DAILY_LENGTHS = [5, 6, 4]
WORDLE_DAILY_MIN_TOURNAMENTS = 8
WORDLE_EPOCH = datetime.date(2026, 1, 1)
# Clasificatorios, promociones y descensos no cuentan como haber jugado la liga
WORDLE_SKIP_RE = re.compile(r"promotion|qualif|relegation|regional", re.IGNORECASE)
DISAMBIG_RE = re.compile(r"\s*\(.*\)$")   # "Clear (Song Hyeon-min)" -> "Clear"
MIN_TENURE_DAYS = 60   # carrera ignora pruebas y cesiones muy cortas
# Fases de un torneo de liga que no dan título (si no son playoffs)
REGULAR_STAGE_RE = re.compile(r"season|preseason|group|stage|qualifier|regional|opening",
                              re.IGNORECASE)
RECENT_FREE_AGENT_DAYS = 90   # el dle mantiene a los agentes libres de hace menos tiempo

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


def expired(key, fetched_at, max_days):
    """Cada clave caduca entre max_days/2 y max_days según su hash, para que no
    se renueven todas el mismo día (cada día se descarga solo una parte)."""
    spread = 0.5 + (zlib.crc32(key.encode("utf-8")) % 1000) / 2000
    return time.time() - fetched_at > max_days * 86400 * spread


def cached_by_key(path, refresh, keys, fetch, max_days=REFRESH_DAYS, stale=()):
    """Como `cached`, pero por claves: `fetch(claves)` devuelve {clave: datos}.
    Se descargan solo las claves nuevas, las que han caducado (`expired`) y las de
    `stale` (han cambiado en Leaguepedia; sin distinguir mayúsculas). Las claves
    sin datos también se recuerdan."""
    keys = {str(k) for k in keys}
    cache = {"keys": {}, "data": {}}
    if not refresh and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            stored = json.load(f)
        if isinstance(stored.get("keys"), list):   # formato antiguo: una fecha para todas
            stored["keys"] = dict.fromkeys(stored["keys"], stored["fetched_at"])
        if isinstance(stored.get("keys"), dict):
            cache = stored
    stale = {s.lower() for s in stale}
    todo = sorted(k for k in keys if k not in cache["keys"] or k.lower() in stale
                  or expired(k, cache["keys"][k], max_days))
    if todo:
        fresh = fetch(todo)
        for k in todo:   # lo que ya no está en Leaguepedia se borra
            cache["data"].pop(k, None)
        cache["data"].update(fresh)
        cache["keys"].update(dict.fromkeys(todo, time.time()))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    return {k: cache["data"][k] for k in keys if k in cache["data"]}


def group_by_page(by_alias, alias_page):
    """{alias: [filas]} -> {página en minúsculas: [filas sin repetir]}."""
    grouped = defaultdict(dict)
    for alias, rows in by_alias.items():
        page = alias_page.get(alias)
        for row in rows if page else []:
            grouped[page.lower()][json.dumps(row, sort_keys=True)] = row
    return {page: list(rows.values()) for page, rows in grouped.items()}


def cached(path, refresh, fn, max_days=1):
    """Resultado de fn(), guardado en `path` durante `max_days` días."""
    if not refresh and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cache = json.load(f)
        if time.time() - cache["fetched_at"] < max_days * 86400 - 3600:   # margen: el cron no cae a la misma hora exacta
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


def fetch_team_tournaments(teams):
    """{equipo: [[liga, fila de Leagues, fecha]]} de los torneos de LEAGUE_YEARS."""
    session = requests.Session()
    teams = sorted(set(teams))
    result = defaultdict(list)
    years = ",".join(cargo_quote(y) for y in LEAGUE_YEARS)
    for i in range(0, len(teams), 50):
        print(f"\r  Torneos [{min(i + 50, len(teams))}/{len(teams)}]", end="", flush=True)
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentRosters=TR,Tournaments=T",
            "join_on": "TR.OverviewPage=T.OverviewPage",
            "fields": "TR.Team=Team,T.League=League,T.DateStart=DateStart",
            "where": f"T.Year IN ({years}) AND TR.Team IN (%s)"
                     % ",".join(cargo_quote(t) for t in teams[i:i + 50]),
            "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        for row in r.json():
            if row.get("League"):
                result[str(row["Team"])].append([row["League"], row.get("DateStart")])
    print()

    info = fetch_league_info({league for entries in result.values() for league, _ in entries})
    # Todos los equipos pedidos, aunque no tengan torneos (así la caché sabe que ya se miraron)
    return {team: [[league, info.get(league), date] for league, date in result.get(team, [])]
            for team in teams}


def fetch_tier2_teams():
    """Equipos que han jugado una liga tier 2 en LEAGUE_YEARS (LFL, NACL, LCK CL...).
    main.py solo trae a quien ha pasado por una liga tier 1; sus jugadores actuales
    completan el modo libre del dle."""
    session = requests.Session()
    years = ",".join(cargo_quote(y) for y in LEAGUE_YEARS)
    rows, offset = [], 0
    while True:
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=90, params={
            "tables": "TournamentRosters=TR,Tournaments=T,Leagues=L",
            "join_on": "TR.OverviewPage=T.OverviewPage,T.League=L.League",
            "fields": "TR.Team=Team,T.League=League,T.Name=Name,L.League_Short=League_Short,"
                      "L.Region=Region,L.IsOfficial=IsOfficial",
            "where": f'T.Year IN ({years}) AND L.IsOfficial="Yes"',
            "format": "json", "limit": 5000, "offset": offset,
        })
        r.raise_for_status()
        batch = r.json()
        rows += batch
        offset += 5000
        if len(batch) < 5000:
            break
    return sorted({str(row["Team"]) for row in rows if row.get("Team")
                   and (league := classify_league(
                       html.unescape(row["Name"]),
                       {"League Short": row.get("League Short"), "Region": row.get("Region"),
                        "IsOfficial": row.get("IsOfficial")}))
                   and league[1] == 2})


def fetch_team_players(teams):
    """{equipo: [filas de Players]} de quien está ahora en cada equipo (staff incluido)."""
    session = requests.Session()
    players = {team: [] for team in teams}
    for i in range(0, len(teams), 30):   # ~10 filas por equipo: < 500 por consulta
        print(f"\r  Plantillas [{min(i + 30, len(teams))}/{len(teams)} equipos]", end="", flush=True)
        for row in cargo_query(session, "Team", teams[i:i + 30]):
            if row.get("Team") in players:
                players[row["Team"]].append(row)
    print()
    return players


def fetch_roster_changes():
    """[[id, jugador, equipo]] de los fichajes de los últimos ROSTER_CHANGES_DAYS."""
    time.sleep(CARGO_DELAY)
    since = (datetime.date.today() - datetime.timedelta(days=ROSTER_CHANGES_DAYS)).isoformat()
    r = requests.get(CARGO_URL, headers=HEADERS, timeout=60, params={
        "tables": "RosterChanges", "fields": "RosterChangeId,Player,Team",
        "where": f'Date_Sort >= "{since}"', "format": "json", "limit": 5000,
    })
    r.raise_for_status()
    return [[str(m["RosterChangeId"]), html.unescape(str(m.get("Player") or "")),
             html.unescape(str(m.get("Team") or ""))] for m in r.json()]


def fetch_changes(since, moves):
    """Qué ha cambiado en Leaguepedia desde `since` (ISO, UTC):
      pages:    páginas editadas, creadas o trasladadas (fichas de jugador, equipos...)
      players:  jugadores de los fichajes nuevos (`moves`: los que aún no se habían visto)
      teams:    equipos de esos fichajes, y los de los torneos editados
      majors:   jugadores de torneos editados de LCK, LPL, LEC o LCS
      winners:  jugadores de los equipos ganadores de los torneos editados"""
    session = requests.Session()
    pages, params = set(), {
        "action": "query", "list": "recentchanges", "rcnamespace": "0", "rcend": since,
        "rcprop": "title|loginfo", "rctype": "edit|new|log", "rclimit": "500", "format": "json",
    }
    while True:
        time.sleep(CARGO_DELAY)
        r = session.get(API_URL, headers=HEADERS, timeout=60, params=params)
        r.raise_for_status()
        data = r.json()
        for rc in data.get("query", {}).get("recentchanges", []):
            pages.add(rc["title"])
            target = (rc.get("logparams") or {}).get("target_title")
            if target:   # traslado: también la página nueva
                pages.add(target)
        if "continue" not in data:
            break
        params.update(data["continue"])

    players = {player for _, player, _ in moves if player}
    teams = {team for _, _, team in moves if team}

    # Torneos editados: de "LFL/2026 Season/Summer Playoffs/Scoreboards/Week 1" se
    # prueban todos los prefijos ("LFL/2026 Season/Summer Playoffs" es el torneo)
    prefixes = sorted({t.rsplit("/", n)[0] for t in pages if "/" in t
                       for n in range(1, t.count("/") + 1)} | {t for t in pages if "/" in t})
    major_names = {n for names in MAJOR_LEAGUES.values() for n in names}
    majors, winners = set(), set()
    for i in range(0, len(prefixes), 40):
        batch = ",".join(cargo_quote(p) for p in prefixes[i:i + 40])
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentPlayers=TP,Tournaments=T",
            "join_on": "TP.OverviewPage=T.OverviewPage",
            "fields": "TP.Link=Link,TP.Team=Team,T.League=League",
            "where": f"TP.OverviewPage IN ({batch})", "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        for row in r.json():
            if row.get("Team"):
                teams.add(html.unescape(str(row["Team"])))
            if row.get("Link") and row.get("League") in major_names:
                majors.add(html.unescape(str(row["Link"])))
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentResults=TR,TournamentPlayers=TP",
            "join_on": "TR.OverviewPage=TP.OverviewPage,TR.Team=TP.Team",
            "fields": "TP.Link=Link",
            "where": f'TR.Place = "1" AND TR.OverviewPage IN ({batch})',
            "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        winners |= {html.unescape(str(row["Link"])) for row in r.json() if row.get("Link")}
    print(f"  Cambios: {len(pages)} páginas editadas, {len(moves)} fichajes, "
          f"{len(teams)} equipos, {len(winners)} jugadores de equipos campeones")
    return {"pages": pages, "players": players, "teams": teams,
            "majors": majors, "winners": winners}


def fetch_birth_years(pages):
    """{página: "2006"} de jugadores sin fecha completa en Cargo: algunas fichas solo
    tienen el año (|birth_date_year=), que Cargo no guarda como Birthdate."""
    session = requests.Session()
    years = {}
    pages = sorted(set(pages))
    for i in range(0, len(pages), 50):
        time.sleep(CARGO_DELAY)
        r = session.get(API_URL, headers=HEADERS, timeout=60, params={
            "action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main",
            "titles": "|".join(pages[i:i + 50]), "redirects": 1, "format": "json",
        })
        r.raise_for_status()
        query = r.json()["query"]
        # La respuesta usa el título final: se vuelve al pedido (redirecciones y normalizaciones)
        back = {}
        for step in query.get("normalized", []) + query.get("redirects", []):
            back[step["to"]] = back.get(step["from"], step["from"])
        for pg in query["pages"].values():
            text = (pg.get("revisions") or [{}])[0].get("slots", {}).get("main", {}).get("*", "")
            m = re.search(r"^\|\s*birth_date_year\s*=\s*(\d{4})\s*$", text, re.MULTILINE)
            if m:
                years[back.get(pg["title"], pg["title"])] = m.group(1)
    return years


def fetch_aliases(pages):
    """{página: [alias en minúsculas]}. Las tablas de Leaguepedia a veces usan un
    alias en vez de la página ("Broken Blade" -> "BrokenBlade", "caPs" -> "Caps")."""
    session = requests.Session()
    pages = sorted(set(pages))
    aliases = {p: {p.lower()} for p in pages}
    for i in range(0, len(pages), CARGO_BATCH):
        print(f"\r  Alias [{min(i + CARGO_BATCH, len(pages))}/{len(pages)}]", end="", flush=True)
        for row in cargo_query(session, "OverviewPage", pages[i:i + CARGO_BATCH],
                               table="PlayerRedirects", fields="AllName,OverviewPage"):
            if row["OverviewPage"] in aliases:
                aliases[row["OverviewPage"]].add(str(row["AllName"]).lower())
    print()
    return {page: sorted(a) for page, a in aliases.items()}


def alias_to_page(aliases_by_page):
    """{alias: página}. Si un alias es de varios jugadores ("doran"), gana el que
    se llama exactamente así; si ninguno, se descarta por ambiguo."""
    owners = defaultdict(set)
    for page, aliases in aliases_by_page.items():
        for alias in aliases:
            owners[alias].add(page)
    result = {}
    for alias, pages in owners.items():
        exact = [p for p in pages if p.lower() == alias]
        if exact or len(pages) == 1:
            result[alias] = (exact or list(pages))[0]
    return result


def fetch_tenures(aliases):
    """{alias en minúsculas: [{team, role, from, to}]}: cada etapa en un equipo
    con el rol del fichaje ("Mid", "Mid/Owner", "Coach"...). `to` es None si sigue."""
    tenures = defaultdict(list)
    session = requests.Session()
    aliases = sorted(aliases)
    batch = 40   # ~10 etapas por alias: caben en una respuesta
    for i in range(0, len(aliases), batch):
        print(f"\r  Tenures [{min(i + batch, len(aliases))}/{len(aliases)}]", end="", flush=True)
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "Tenures=T,RosterChanges=RC",
            "join_on": "T.RosterChangeIdJoin=RC.RosterChangeId",
            "fields": "T.Player=Player,T.Team=Team,T.DateJoin=DateJoin,"
                      "T.DateLeave=DateLeave,RC.Role=Role",
            "where": "T.Player IN (%s)" % ",".join(cargo_quote(a) for a in aliases[i:i + batch]),
            "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        for t in r.json():
            tenures[str(t["Player"]).lower()].append({
                "team": t["Team"], "role": t.get("Role") or "",
                "from": t.get("DateJoin"), "to": t.get("DateLeave"),
            })
    print()
    return dict(tenures)


def fetch_league_titles(aliases):
    """{alias en minúsculas: [[liga, torneo, año]]}: torneos de
    liga ganados (puesto 1) que cuentan como título: playoffs, o el torneo entero
    en las ligas antiguas sin playoffs. Excluye fases regulares y clasificatorios."""
    session = requests.Session()
    aliases = sorted(aliases)
    titles = defaultdict(set)
    batch = 40
    for i in range(0, len(aliases), batch):
        print(f"\r  Títulos [{min(i + batch, len(aliases))}/{len(aliases)}]", end="", flush=True)
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentResults=TR,TournamentPlayers=TP,Tournaments=T",
            "join_on": "TR.OverviewPage=TP.OverviewPage,TR.Team=TP.Team,"
                       "TR.OverviewPage=T.OverviewPage",
            "fields": "TP.Link=Link,TP.Role=Role,TR.OverviewPage=Page,T.League=League,"
                      "T.Year=Year,T.IsPlayoffs=IsPlayoffs,T.IsQualifier=IsQualifier",
            "where": 'TR.Place = "1" AND TP.Link IN (%s)'
                     % ",".join(cargo_quote(a) for a in aliases[i:i + batch]),
            "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        for t in r.json():
            link = str(t.get("Link") or "").lower()
            stage = str(t["Page"]).rsplit("/", 1)[-1]
            roles = {x.strip().lower() for x in (t.get("Role") or "").split(",")}
            if (not link or not t.get("League") or t.get("IsQualifier") == 1
                    or not roles & PLAYER_ROLES):
                continue
            if t.get("IsPlayoffs") != 1 and REGULAR_STAGE_RE.search(stage):
                continue
            titles[link].add((t["League"], str(t["Page"]), t.get("Year")))
    print()
    return {link: [list(t) for t in sorted(ts)] for link, ts in titles.items()}


def fetch_major_leagues(aliases):
    """{alias en minúsculas: [[liga mayor, torneo]]}: torneos jugados en LCK, LPL,
    LEC o LCS (con sus nombres antiguos)."""
    session = requests.Session()
    aliases = sorted(aliases)
    names = ",".join(cargo_quote(n) for names in MAJOR_LEAGUES.values() for n in names)
    by_name = {n: code for code, names in MAJOR_LEAGUES.items() for n in names}
    result = defaultdict(list)
    batch = 50
    for i in range(0, len(aliases), batch):
        print(f"\r  Ligas mayores [{min(i + batch, len(aliases))}/{len(aliases)}]", end="", flush=True)
        time.sleep(CARGO_DELAY)
        r = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentPlayers=TP,Tournaments=T",
            "join_on": "TP.OverviewPage=T.OverviewPage",
            "fields": "TP.Link=Link,T.League=League,TP.OverviewPage=Page,TP.Role=Role",
            "where": f"T.League IN ({names}) AND TP.Link IN (%s)"
                     % ",".join(cargo_quote(a) for a in aliases[i:i + batch]),
            "format": "json", "limit": 5000,
        })
        r.raise_for_status()
        for t in r.json():
            roles = {x.strip().lower() for x in (t.get("Role") or "").split(",")}
            if t.get("Link") and roles & PLAYER_ROLES:
                result[str(t["Link"]).lower()].append([by_name[t["League"]], str(t["Page"])])
    print()
    return dict(result)


def fetch_league_history():
    """{liga del Wordle: [[jugador, torneo, rol, equipo]]}: todos los que han jugado
    cada liga tier 1, sin filtrar por jugador (paginado de 5000 en 5000)."""
    session = requests.Session()
    result = {}
    for code, names in WORDLE_LEAGUES.items():
        rows, offset = [], 0
        while True:
            print(f"\r  Histórico {code} [{len(rows)}]", end="", flush=True)
            time.sleep(CARGO_DELAY)
            r = session.get(CARGO_URL, headers=HEADERS, timeout=90, params={
                "tables": "TournamentPlayers=TP,Tournaments=T",
                "join_on": "TP.OverviewPage=T.OverviewPage",
                "fields": "TP.Link=Link,TP.OverviewPage=Page,TP.Role=Role,TP.Team=Team",
                "where": "T.League IN (%s)" % ",".join(cargo_quote(n) for n in names),
                "format": "json", "limit": 5000, "offset": offset,
            })
            r.raise_for_status()
            batch = r.json()
            rows += batch
            offset += 5000
            if len(batch) < 5000:
                break
        result[code] = [[html.unescape(str(t["Link"])), str(t["Page"]), t.get("Role") or "",
                         html.unescape(str(t.get("Team") or ""))]
                        for t in rows if t.get("Link")]
        print()
    return result


def fetch_league_info(names):
    """{liga: fila de Leagues (nombre corto, región, nivel, si es oficial)}.
    Si un lote falla (algún nombre que Cargo no acepta), se reintenta de uno en uno."""
    session = requests.Session()
    names = sorted(set(names))
    info = {}

    def query(batch):
        for row in cargo_query(session, "League", batch, table="Leagues",
                               fields="League,League_Short,Region,Level,IsOfficial"):
            info[html.unescape(row["League"])] = row

    for i in range(0, len(names), 30):
        batch = names[i:i + 30]
        try:
            query(batch)
        except (requests.RequestException, ValueError):
            for name in batch:
                try:
                    query([name])
                except (requests.RequestException, ValueError):
                    print(f"  ! Leagues: no se pudo consultar {name!r}")
    return info


def tournament_year(name):
    m = re.match(r"(\d{4}) ", name) or re.match(r"Season (\d+) ", name)
    if not m:
        return None
    n = int(m.group(1))
    return n if n > 2000 else 2010 + n   # "Season 3 World Championship" -> 2013


def fetch_champions():
    """{página o enlace: {"worlds": [años], "msi": [años]}}: todos los jugadores
    (suplentes incluidos) de los equipos campeones de Worlds y MSI."""
    session = requests.Session()
    time.sleep(CARGO_DELAY)
    winners = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
        "tables": "TournamentResults", "fields": "OverviewPage,Team",
        "where": '((OverviewPage LIKE "%World Championship" AND (OverviewPage LIKE "% Season World%" '
                 'OR OverviewPage LIKE "Season %")) OR OverviewPage LIKE "%Mid-Season Invitational") '
                 'AND Place = "1"',
        "format": "json", "limit": 500,
    }).json()
    winners = [w for w in winners if w.get("Team")]
    champions = defaultdict(lambda: {"worlds": [], "msi": []})
    for w in winners:
        time.sleep(CARGO_DELAY)
        players = session.get(CARGO_URL, headers=HEADERS, timeout=60, params={
            "tables": "TournamentPlayers", "fields": "Link,Role",
            "where": f'OverviewPage LIKE {cargo_quote(w["OverviewPage"] + "%")} '
                     f'AND Team = {cargo_quote(w["Team"])}',
            "format": "json", "limit": 50,
        }).json()
        kind = "msi" if "Mid-Season" in w["OverviewPage"] else "worlds"
        year = tournament_year(w["OverviewPage"])
        for p in players:
            roles = {r.strip().lower() for r in (p.get("Role") or "").split(",")}
            link = str(p.get("Link") or "")
            if link and roles & PLAYER_ROLES and year not in champions[link][kind]:
                champions[link][kind].append(year)
    return dict(champions)


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


def classify_league(name, info):
    """(nombre corto, tier, región) de una liga, o None si no es la liga de un
    equipo (torneo internacional, copa...). `info` es su fila de Leagues."""
    short = (info or {}).get("League Short") or name
    if short in NOT_A_LEAGUE or (info or {}).get("Region") == "International" \
            or NOT_A_LEAGUE_RE.search(name):
        return None
    region = LEAGUE_REGION.get(short) or REGION_CODES.get((info or {}).get("Region"))
    if short in TIER1_LEAGUES:
        return TIER1_LEAGUES[short], 1, region
    if (info or {}).get("IsOfficial") == "Yes" and not LOWER_DIVISION_RE.search(name):
        return short, 2, region
    if LOWER_DIVISION_RE.search(name) and short == (info or {}).get("League Short"):
        short = name   # "Prime League 2nd Division" comparte "PRM" con la 1ª división
    return short, 3, region


def team_league(entries, team_region):
    """{league, tier, region} del equipo a partir de sus torneos recientes
    [(liga, info, fecha)]. Sin torneos: tier 3 y la región del equipo."""
    candidates = [(*league, date or "") for name, info, date in entries
                  if (league := classify_league(name, info))]
    fallback = REGION_CODES.get(team_region)
    if not candidates:
        return {"league": None, "tier": 3, "region": fallback}
    # Solo el último año con liga: un equipo que ha bajado no conserva la del año anterior
    last_year = max(c[3][:4] for c in candidates)
    candidates = [c for c in candidates if c[3][:4] == last_year]
    # La liga oficial (tier 1-2) más reciente, no la mejor: una invitación puntual
    # (Karmine Corp Blue en el LEC Versus) no convierte a un equipo de LFL en LEC.
    # Los torneos tier 3 (exhibiciones, ligas menores) solo cuentan si no hay otra.
    official = [c for c in candidates if c[1] <= 2] or candidates
    best = max(official, key=lambda c: c[3])
    return {"league": best[0], "tier": best[1], "region": best[2] or fallback}


def tenure_role(role):
    """"Mid/Owner" -> "Mid"; "Coach", "Shareholder"... -> None."""
    for token in re.split(r"[/,]", role or ""):
        if token.strip().lower() in PLAYER_ROLES:
            return token.strip().capitalize()
    return None


def history_from_tenures(tenures, team_regions):
    """Solo etapas como jugador. Las del mismo equipo separadas por menos de
    MERGE_GAP_DAYS se unen, aunque haya otra etapa solapada en medio (una
    cesión, p. ej.). Un equipo sin región hereda la liga de la etapa vecina."""
    history = []
    for t in tenures:
        role = tenure_role(t["role"])
        start = _date(t["from"])
        if not role:
            continue
        same = next((h for h in reversed(history) if h["team"] == t["team"]), None)
        end = _date(same["to"]) if same else None
        if same and start and (same["to"] is None or (end and (start - end).days <= MERGE_GAP_DAYS)):
            if same["to"] is not None and (t["to"] is None or t["to"] > same["to"]):
                same["to"] = t["to"]
            same["days"][role] = same["days"].get(role, 0) + tenure_days(t)
            continue
        history.append({"team": t["team"],
                        "league": TEAM_REGION_LEAGUE.get(team_regions.get(t["team"])),
                        "from": t["from"], "to": t["to"],
                        "days": {role: tenure_days(t)}})
    for i, h in enumerate(history):
        h["role"] = max(h["days"], key=h["days"].get)
        if not h["league"]:
            neighbours = history[i - 1:i][::-1] + history[i + 1:i + 2]
            h["league"] = next((n["league"] for n in neighbours if n["league"]), None)
    return history


def tenure_days(t):
    start, end = _date(t["from"]), _date(t["to"]) or datetime.date.today()
    return max((end - start).days, 1) if start else 1


def roles_from_history(history, min_share=0.15):
    """Posiciones ordenadas por tiempo jugado ("Bot" -> "ADC"); solo las que
    suman al menos `min_share` de la carrera."""
    days = Counter()
    for h in history:
        days.update(h["days"])
    total = sum(days.values())
    return [normalize_position(r) for r, d in days.most_common() if total and d / total >= min_share]


def home_league_from_history(history):
    """La liga en la que más tiempo ha jugado (aprox. por número de etapas)."""
    leagues = Counter(h["league"] for h in history if h["league"])
    return leagues.most_common(1)[0][0] if leagues else None


def league_titles(won, league_info):
    """Títulos de liga regional (tier 1 o 2) de entre los torneos ganados."""
    titles = []
    for league, tournament, year in won:
        classified = classify_league(league, league_info.get(league))
        if classified and classified[1] <= 2:
            titles.append({"league": classified[0], "tournament": tournament, "year": year})
    return titles


def master_entry(page, cargo, scraped, ctx):
    """`ctx`: tenures, team_regions, team_tournaments, league_titles y achievements de Cargo."""
    status, team = status_and_team(cargo, scraped or {})
    history = history_from_tenures(ctx["tenures"].get((page or "").lower(), []),
                                   ctx["team_regions"])
    roles = roles_from_history(history)
    if scraped:   # el dle sigue usando la posición y liga de main.py
        position = normalize_position(scraped.get("posicion", ""))
        home = detect_league(scraped)
    else:
        position = roles[0] if roles else normalize_position((cargo or {}).get("Role") or "")
        home = home_league_from_history(history)
    for h in history:
        del h["days"]
    years = [int(h["from"][:4]) for h in history if (h["from"] or "")[:4].isdigit()]
    # Agente libre desde hace poco: el dle lo sigue usando con su último equipo
    last = max(history, key=lambda h: h["to"] or "9999") if history else None
    left = _date(last["to"]) if last else None
    recent_fa = bool(status == "free_agent" and left
                     and (datetime.date.today() - left).days <= RECENT_FREE_AGENT_DAYS)
    game_team = team if status in ("player", "sub") else last["team"] if recent_fa else None
    if game_team:
        current = team_league(ctx["team_tournaments"].get(game_team, []),
                              ctx["team_regions"].get(game_team))
        if not current["region"]:   # equipo pequeño sin región: la de su última etapa
            last_league = next((h["league"] for h in reversed(history) if h["league"]), None)
            current["region"] = HISTORY_LEAGUE_REGION.get(last_league)
    else:
        current = {"league": None, "tier": None, "region": None}
    return {
        "page":        page,
        "id":          (scraped or {}).get("id") or (cargo or {}).get("ID"),
        "scraped":     scraped is not None,   # viene de main.py (jugadores de ligas tier 1)
        "real":        (cargo or {}).get("Name") or (scraped or {}).get("nombre_real", ""),
        "country":     nationality(cargo, scraped or {}),
        "birthdate":   (cargo or {}).get("Birthdate"),
        "positions":   [position] if position in POSITION_MAP.values() else [],
        "roles":       roles,   # todas las posiciones de su carrera, por tiempo jugado
        "status":      status,
        "team":        team,
        # En los juegos: equipo actual, o el último si es agente libre desde hace poco
        "game_team":   game_team,
        "left_team_on": last["to"] if recent_fa else None,
        "league":      current["league"],   # liga exacta de game_team (LEC, LFL, LCK CL...)
        "tier":        current["tier"],
        "region":      current["region"],   # EMEA, KR, CN, PAC, NA, BR, LATAM
        "home_league": home,                # liga histórica principal
        "debut":       min(years) if years else (scraped or {}).get("debut"),
        "achievements": ctx["achievements"].get(page, {"worlds": [], "msi": []}),
        "titles":      league_titles(ctx["league_titles"].get((page or "").lower(), []),
                                     ctx["league_info"]),
        # Ligas mayores en las que ha jugado de verdad (lck, lpl, lec, lcs)
        "major_leagues": sorted(code for code, n in Counter(
            code for code, _ in ctx["major_leagues"].get((page or "").lower(), [])).items()
            if n >= MIN_MAJOR_TOURNAMENTS),
        "history":     history,
    }


FIXABLE_FIELDS = ("real", "country", "birthdate")


def apply_player_fixes(master):
    """Datos corregidos a mano en curated/player_fixes.json ({página: {campo: valor}}):
    ganan siempre a Leaguepedia, así no se pierden al actualizar."""
    if not os.path.exists(PLAYER_FIXES_PATH):
        return
    with open(PLAYER_FIXES_PATH, encoding="utf-8") as f:
        fixes = json.load(f)["players"]
    by_page = {m["page"]: m for m in master if m["page"]}
    for page, fields in fixes.items():
        if page not in by_page:
            print(f"  ! player_fixes: no hay ningún jugador con la página {page!r}")
            continue
        for field, value in fields.items():
            if field in FIXABLE_FIELDS:
                by_page[page][field] = value
            else:
                print(f"  ! player_fixes: {page}: el campo {field!r} no se puede corregir")


def current_page(page, cargo_rows):
    """Página actual del jugador según Cargo (main.py guarda la de cuando scrapeó)."""
    row = cargo_rows.get(page) if page else None
    return row["OverviewPage"] if row else page


def build_master(scraped, pages, cargo_rows, extra_pages, ctx):
    master = [master_entry(current_page(page, cargo_rows), cargo_rows.get(page) if page else None,
                           r, ctx)
              for r, page in zip(scraped, pages)]
    known = {m["page"] for m in master if m["page"]}
    for page in sorted(set(extra_pages)):
        if page in cargo_rows and current_page(page, cargo_rows) not in known:
            master.append(master_entry(current_page(page, cargo_rows), cargo_rows[page], None, ctx))
            known.add(current_page(page, cargo_rows))
    return master


# -------------------------------------------------------------- por juego

def display_names(master):
    """El ID si es único; si no, el título de la página ("Viper (Park Do-hyeon)")."""
    counts = Counter(p["id"].lower() for p in master)
    return [p["page"] if counts[p["id"].lower()] > 1 and p["page"] else p["id"]
            for p in master]


def build_dle(master, birth_years):
    """Jugadores de main.py en activo o agentes libres desde hace menos de
    RECENT_FREE_AGENT_DAYS (con su último equipo): todos tienen equipo que comparar.
    `tier` dice si su liga actual es tier 1 (reto diario) o inferior (modo libre).
    Los que no vienen de main.py solo entran si su equipo es tier 2 (no tocan el reto diario)."""
    active = [p for p in master if p["game_team"] and (p["scraped"] or p["tier"] == 2)]
    players = []
    for p, name in zip(active, display_names(active)):
        players.append({
            "name":      name,
            "real":      p["real"],
            "country":   p["country"],
            "flag":      to_flag(p["country"]),
            "league":    p["league"],
            "tier":      p["tier"],
            "region":    p["region"],
            "position":  p["positions"],
            "titles":    bool(p["titles"]),   # ha ganado una liga regional (tier 1 o 2)
            "worlds":    bool(p["achievements"]["worlds"] or p["achievements"]["msi"]),
            # "YYYY-MM-DD", o solo "YYYY" si la ficha no tiene más (edad aproximada)
            "birthdate": p["birthdate"] or birth_years.get(p["page"]),
            "team":      p["game_team"],
            "free_agent": p["status"] == "free_agent",   # sigue con su último equipo
        })
    return players


def roster_player_info(cargo, fallback_country):
    country = nationality(cargo, {"nacionalidad": fallback_country}) if cargo else fallback_country
    return {"real": (cargo or {}).get("Name") or "", "country": country, "flag": to_flag(country)}


def assign_roster_pages(rosters, canonical):
    """Pone en cada jugador de las plantillas su página actual (siguiendo
    redirecciones). Los de 2011-2014 no tienen página: se asocian por nombre
    a los de las plantillas modernas si la coincidencia es única."""
    by_key = defaultdict(set)
    for r in rosters:
        for p in r["players"]:
            if p.get("page"):
                p["page"] = canonical.get(p["page"], p["page"])
                by_key[_key(p["name"])].add(p["page"])
    for r in rosters:
        for p in r["players"]:
            if not p.get("page") and len(by_key.get(_key(p["name"]), ())) == 1:
                p["page"] = next(iter(by_key[_key(p["name"])]))
    return rosters


def build_rostergues_js(rosters, cargo_rows):
    """rosters.js con los datos de cada jugador una sola vez (PLAYERS) y las
    plantillas apuntando a su página (ver assign_roster_pages).

    El nombre es el que tenía en el torneo (Incarnati0n en 2015, no Jensen),
    pero las variantes de mayúsculas/espacios se unifican con el ID de
    Leaguepedia ("Hans sama", "HansSama" -> "Hans Sama"). Los jugadores sin
    página llevan sus datos en línea."""
    players, raw = {}, []
    for r in rosters:
        entries = []
        for p in r["players"]:
            page = p.get("page")
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


def _date(s):
    return datetime.date.fromisoformat(s) if s and re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) else None


def career_from_history(history):
    """Etapas de carrera: "2016–18" + equipo + región (LCK|LPL|LEC|LCS|OTHER).
    Se saltan pruebas/cesiones de menos de MIN_TENURE_DAYS."""
    today = datetime.date.today()
    rows = []
    for h in history:
        start, end = _date(h["from"]), _date(h["to"]) or today
        if not start:
            continue
        rows.append((start, end, h))
    long_enough = [r for r in rows if (r[1] - r[0]).days >= MIN_TENURE_DAYS] or rows
    career = []
    for start, end, h in long_enough:
        year = str(start.year) if start.year == end.year else f"{start.year}–{str(end.year)[2:]}"
        region = h["league"] if h["league"] in CARRERA_REGIONS else "OTHER"
        career.append({"year": year, "team": h["team"], "region": region})
    return career


def build_carrera_js(curated, by_page):
    players, missing = [], []
    for c in curated:
        p = by_page.get(c["page"])
        if not p or not p["history"]:
            missing.append(c["page"])
            continue
        main_role = (p["roles"] or p["positions"] or [""])[0]
        position = {"ADC": "Bot"}.get(main_role, main_role)
        players.append({"name": p["id"], "position": position, "hint": c["hint"],
                        "career": career_from_history(p["history"])})
    J = lambda v: json.dumps(v, ensure_ascii=False)
    lines = ["// Generado por build.py (curated/carrera.json + Leaguepedia). No editar a mano.",
             "// Para añadir un jugador: añádelo a curated/carrera.json y ejecuta build.py.",
             "",
             "/**",
             " * @typedef {{ year: string, team: string, region: string }} CareerEntry",
             " * @typedef {{ name: string, position: string, hint: string, career: CareerEntry[] }} Player",
             " * Regions: LCK | LPL | LEC | LCS | OTHER",
             " */",
             "",
             "/** @type {Player[]} */",
             "export const PLAYERS = ["]
    lines += [f"  {J(p)}," for p in players]
    lines += ["];", ""]
    return "\n".join(lines), missing


def grid_nat(country):
    return GRID_NAT.get(country) or ("european" if country in EUROPE else "other")


def grid_entry(p, name, emoji=None):
    teams = {t["team"].lower() for t in p["history"]}
    groups = [g for g, rx in GRID_TEAMS.items() if any(re.fullmatch(rx, t) for t in teams)]
    comps = ([k for k in ("worlds", "msi") if p["achievements"][k]]
             + (["league_title"] if any(t["league"] in TIER1_TITLE_LEAGUES for t in p["titles"]) else [])
             + p["major_leagues"])
    entry = {"key": name.lower(), "name": name, "pos": [x.lower() for x in p["roles"] or p["positions"]],
             "nat": grid_nat(p["country"]), "teams": groups, "comps": comps}
    return {**entry, "em": emoji} if emoji else entry


def build_grid(curated, master):
    """Los jugadores de curated/grid.json (con su emoji) y, como respuestas
    válidas, todos los que han jugado en LCK, LPL, LEC o LCS."""
    by_page = {m["page"]: m for m in master if m["page"]}
    curated_pages = {c["page"] for c in curated}
    pool = [by_page[c["page"]] for c in curated if c["page"] in by_page]
    pool += [m for m in master if m["page"] not in curated_pages and m["major_leagues"]
             and (m["roles"] or m["positions"])]
    names = {m["page"]: name for m, name in zip(pool, display_names(pool))}
    emojis = {c["page"]: c["em"] for c in curated}
    players = [grid_entry(m, names[m["page"]], emojis.get(m["page"])) for m in pool]
    missing = [c["page"] for c in curated if c["page"] not in by_page]
    return players, missing


def tournament_order(page):
    """Clave para ordenar torneos en el tiempo: (año, split)."""
    year = re.search(r"(?:19|20)\d\d", page)
    low = page.lower()
    split = re.search(r"split (\d)", low)
    order = (int(split.group(1)) if split else
             0 if "winter" in low else 1 if "spring" in low else 3 if "summer" in low else
             4 if "fall" in low or "autumn" in low else 2)
    return (int(year.group()) if year else 0, order, page)


def build_wordle(history, master):
    """Respuestas: jugadores con nombre de 5 letras y ≥3 torneos sumando las ligas tier 1
    (sin clasificatorios ni promociones), o que juegan ahora en una de ellas.
    Intentos válidos: cualquier pro player con nombre de 5 letras."""
    # En la wiki la primera letra del título no distingue mayúsculas ("uZent" = "UZent")
    page_key = lambda link: link[:1].upper() + link[1:]
    players = defaultdict(lambda: {"tournaments": defaultdict(set), "roles": Counter(),
                                   "stints": set(), "names": Counter()})
    guesses = set()
    for code, rows in history.items():
        for link, page, role, team in rows:
            name = DISAMBIG_RE.sub("", link).strip()
            if WORD_RE.fullmatch(name):
                guesses.add(name.upper())
            roles = {x.strip().lower() for x in role.split(",")} & PLAYER_ROLES
            if not roles or WORDLE_SKIP_RE.search(page):
                continue
            p = players[page_key(link)]
            p["names"][name] += 1
            p["tournaments"][code].add(page)
            p["roles"].update(roles)
            p["stints"].add((tournament_order(page), team, code))
    for m in master:
        if WORD_RE.fullmatch(m["id"] or ""):
            guesses.add(m["id"].upper())
    # En activo (o agente libre reciente) en una liga tier 1
    active = {page_key(m["page"]) for m in master
              if m["tier"] == 1 and m["status"] in ("player", "free_agent")}
    master_id = {page_key(m["page"]): m["id"] for m in master if m["page"] and m["id"]}

    answers = []
    for key, p in players.items():
        # Como lo escribe hoy el jugador ("ZekaS", "zynts"); si no está en el maestro, como en la wiki
        name = master_id.get(key) or p["names"].most_common(1)[0][0]
        n = sum(len(t) for t in p["tournaments"].values())
        if not WORD_RE.fullmatch(name) or (n < MIN_MAJOR_TOURNAMENTS and key not in active):
            continue
        # Recorrido: equipos en orden, sin repetir el mismo equipo seguido
        path = []
        for _, team, code in sorted(p["stints"]):
            if team and (not path or path[-1][0] != team):
                path.append([team, code])
        years = [k[0][0] for k in p["stints"] if k[0][0]]
        role = p["roles"].most_common(1)[0][0]
        leagues = [c for c in WORDLE_LEAGUES if p["tournaments"][c]]
        answers.append({
            "w": name.upper(), "name": name,
            "role": "ADC" if role == "bot" else role.capitalize(),
            "path": path,
            "years": [min(years), max(years)] if years else None,
            "leagues": leagues,
            "n": n,
            # Puede salir en el reto diario: conocido y de una liga tier 1 actual
            "daily": bool(set(leagues) & set(WORDLE_DAILY_LEAGUES))
                     and (n >= WORDLE_DAILY_MIN_TOURNAMENTS or key in active),
        })
    # El más conocido primero cuando dos jugadores comparten nombre
    answers.sort(key=lambda a: (a["w"], -a["n"]))
    return answers, sorted(guesses)


def wordle_day_length(day):
    """Largo de la palabra del reto diario de ese día (va rotando)."""
    days = (datetime.date.fromisoformat(day) - WORDLE_EPOCH).days
    return WORDLE_DAILY_LENGTHS[days % len(WORDLE_DAILY_LENGTHS)]


def update_wordle_schedule(answers, path):
    """Calendario del reto diario {fecha: palabra}. Hoy y los días pasados no cambian;
    un día futuro se reasigna si su palabra ya no vale o no tiene el largo que toca.
    No se repite ninguna palabra hasta haber usado todas las de su largo."""
    pools = {n: sorted({a["w"] for a in answers if a["daily"] and len(a["w"]) == n})
             for n in WORDLE_DAILY_LENGTHS}
    schedule = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            schedule = json.load(f)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    schedule = {day: w for day, w in schedule.items()
                if day <= today.isoformat() or w in pools[wordle_day_length(day)]}
    for i in range(WORDLE_SCHEDULE_DAYS + 1):
        day = (today + datetime.timedelta(days=i)).isoformat()
        if day in schedule:
            continue
        pool = pools[wordle_day_length(day)]
        used = [w for w in schedule.values() if len(w) == len(pool[0])]
        # Ronda actual: lo usado desde la última vez que se agotaron las palabras de ese largo
        cycle = set(used[len(used) - len(used) % len(pool):])
        schedule[day] = random.Random(day).choice([w for w in pool if w not in cycle])
    return dict(sorted(schedule.items()))


GRID_DAILY_MIN = 4          # respuestas mínimas por casilla en el reto diario
GRID_MAX_OVERLAP = 0.9      # cruce regalado (igual que RandomGridBuilder.js)
GRID_NO_SELF_CROSS = {"pos", "nat"}
GRID_MAX_SAME_TYPE = 2      # categorías del mismo tipo en un lado (no tres competiciones)


def grid_matches(cat, p):
    """Igual que LoLCategoryRepository.js."""
    return {"pos": lambda: cat["value"] in p["pos"], "nat": lambda: p["nat"] == cat["value"],
            "team": lambda: cat["value"] in p["teams"],
            "comp": lambda: cat["value"] in p["comps"]}[cat["type"]]()


def update_grid_schedule(grid, categories, path):
    """Calendario del reto diario del grid {fecha: {"cols": [ids], "rows": [ids]}}, con las
    mismas reglas que el modo libre. Hoy y los días pasados no cambian; un día futuro
    se recalcula si alguna casilla se ha quedado con menos de GRID_DAILY_MIN respuestas."""
    members = {c["id"]: {p["key"] for p in grid if grid_matches(c, p)} for c in categories}
    by_id = {c["id"]: c for c in categories}

    def cell(a, b):
        return len(members[a] & members[b])

    def ok(a, b):
        ca, cb = by_id[a], by_id[b]
        if ca["type"] == cb["type"] and ca["type"] in GRID_NO_SELF_CROSS:
            return False
        small = min(len(members[a]), len(members[b]))
        return GRID_DAILY_MIN <= cell(a, b) < GRID_MAX_OVERLAP * small

    def varied(side):
        return max(Counter(by_id[c]["type"] for c in side).values()) <= GRID_MAX_SAME_TYPE

    def valid(board):
        return all(c in by_id for c in board["cols"] + board["rows"]) and \
            varied(board["cols"]) and varied(board["rows"]) and \
            all(ok(r, c) for r in board["rows"] for c in board["cols"])

    schedule = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            schedule = json.load(f)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    schedule = {d: b for d, b in schedule.items() if d <= today.isoformat() or valid(b)}
    ids = [c["id"] for c in categories]
    for i in range(WORDLE_SCHEDULE_DAYS + 1):
        day = (today + datetime.timedelta(days=i)).isoformat()
        if day in schedule:
            continue
        rng = random.Random("grid" + day)
        for _ in range(2000):
            pick = rng.sample(ids, 6)
            board = {"cols": pick[:3], "rows": pick[3:]}
            if valid(board):
                schedule[day] = board
                break
    return dict(sorted(schedule.items()))


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh", action="store_true",
                    help="lo descarga todo de nuevo (sin --refresh, solo lo que ha cambiado)")
    args = ap.parse_args()

    # ¿Qué ha cambiado desde la última vez? Sin estado (primera vez, caché perdida)
    # o si hace demasiado, se descarga todo.
    started = datetime.datetime.now(datetime.timezone.utc)
    state = {}
    if os.path.exists(SYNC_STATE_PATH):
        with open(SYNC_STATE_PATH, encoding="utf-8") as f:
            state = json.load(f)
    last_sync = state.get("last_sync")
    refresh = args.refresh or not last_sync or (
        started - datetime.datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
        > datetime.timedelta(days=RECENT_CHANGES_MAX_DAYS))
    # Fichajes: se recuerdan los ya vistos (la ventana de días se solapa de un día a otro)
    moves = fetch_roster_changes()
    seen_moves = set(state.get("roster_changes", []))
    if refresh:
        print("Descarga completa")
        changes = {"pages": set(), "players": set(), "teams": set(),
                   "majors": set(), "winners": set()}
    else:
        print(f"Cambios desde {last_sync}")
        changes = fetch_changes(last_sync, [m for m in moves if m[0] not in seen_moves])
    changed_pages = changes["pages"] | changes["players"]

    with open(SCRAPED_PATH, encoding="utf-8") as f:
        scraped = json.load(f)["players"]
    if all(r.get("page") for r in scraped):
        pages = [r["page"] for r in scraped]
    else:   # players.json antiguo, sin página: se deduce de la lista de main.py
        with open(PLAYER_LIST_PATH, encoding="utf-8") as f:
            pages = resolve_pages(scraped, json.load(f))
    print(f"{sum(p is not None for p in pages)}/{len(pages)} jugadores asociados a su página")

    entries = [(page, r["id"], r.get("nombre_real", "")) for r, page in zip(scraped, pages) if page]
    cargo_rows = cached_by_key(
        CARGO_CACHE_PATH, refresh, [e[0] for e in entries],
        lambda ks: fetch_players([e for e in entries if e[0] in set(ks)]),
        STABLE_REFRESH_DAYS, changed_pages)

    # Jugadores de rostergues, carrera y grid que no son tier 1
    with open(ROSTERS_PATH, encoding="utf-8") as f:
        rosters = json.load(f)
    roster_pages = {p["page"] for r in rosters for p in r["players"] if p.get("page")}
    canonical = cached_by_key(REDIRECTS_CACHE_PATH, refresh, roster_pages, resolve_redirects,
                              STABLE_REFRESH_DAYS, changes["pages"])
    rosters = assign_roster_pages(rosters, canonical)
    with open(CURATED_CARRERA_PATH, encoding="utf-8") as f:
        curated_carrera = json.load(f)
    with open(CURATED_GRID_PATH, encoding="utf-8") as f:
        curated_grid = json.load(f)

    extra_entries = {(p["page"], p["name"], "", p.get("country", ""))
                     for r in rosters for p in r["players"] if p.get("page")}
    extra_entries |= {(c["page"], c["page"], "") for c in curated_carrera + curated_grid}
    extra_entries = sorted(e for e in extra_entries if e[0] not in cargo_rows)
    extra = cached_by_key(EXTRA_CARGO_CACHE_PATH, refresh, [e[0] for e in extra_entries],
                          lambda ks: fetch_players([e for e in extra_entries if e[0] in set(ks)]),
                          STABLE_REFRESH_DAYS, changed_pages)
    cargo_rows = {**extra, **cargo_rows}
    extra_pages = [e[0] for e in extra_entries]
    # Plantillas actuales de las ligas tier 2, para el modo libre del dle
    tier2_teams = cached(TIER2_TEAMS_CACHE_PATH, refresh, fetch_tier2_teams)
    team_players = cached_by_key(TIER2_PLAYERS_CACHE_PATH, refresh, tier2_teams,
                                 fetch_team_players, REFRESH_DAYS, changes["teams"])
    tier2 = {row["OverviewPage"]: row for rows in team_players.values() for row in rows}
    cargo_rows = {**tier2, **cargo_rows}
    extra_pages += [p for p in tier2 if p not in extra_pages]

    # Página actual de cada jugador (la de main.py puede haberse renombrado)
    all_pages = sorted({current_page(p, cargo_rows) for p in pages + extra_pages if p})
    aliases_by_page = cached_by_key(ALIASES_CACHE_PATH, refresh, all_pages, fetch_aliases,
                                    STABLE_REFRESH_DAYS, changed_pages)
    alias_page = alias_to_page(aliases_by_page)
    # Alias de los jugadores que han cambiado (las tablas de torneos usan alias)
    changed_lower = {p.lower() for p in changed_pages}
    changed_aliases = {a for page, aliases in aliases_by_page.items()
                       if page.lower() in changed_lower for a in aliases} | changed_lower
    tenures = group_by_page(
        cached_by_key(TENURES_CACHE_PATH, refresh, alias_page, fetch_tenures,
                      REFRESH_DAYS, changed_aliases), alias_page)
    for ts in tenures.values():
        ts.sort(key=lambda t: t["from"] or "")
    won_titles = group_by_page(
        cached_by_key(LEAGUE_TITLES_CACHE_PATH, refresh, alias_page, fetch_league_titles,
                      REFRESH_DAYS, changes["winners"]), alias_page)
    major_leagues = group_by_page(
        cached_by_key(MAJOR_LEAGUES_CACHE_PATH, refresh, alias_page, fetch_major_leagues,
                      REFRESH_DAYS, changes["majors"]), alias_page)
    title_leagues = {league for ts in won_titles.values() for league, _, _ in ts}
    league_info = cached_by_key(LEAGUE_INFO_CACHE_PATH, refresh, title_leagues,
                                fetch_league_info, STABLE_REFRESH_DAYS)
    teams = sorted({row["Team"] for row in cargo_rows.values() if row.get("Team")}
                   | {t["team"] for ts in tenures.values() for t in ts if t["team"]})
    team_regions = cached_by_key(TEAMS_CACHE_PATH, refresh, teams, fetch_team_regions,
                                 STABLE_REFRESH_DAYS, changes["pages"])

    # Campeones de Worlds/MSI, con el enlace de cada jugador llevado a su página actual
    champions = cached(CHAMPIONS_CACHE_PATH, refresh, fetch_champions, REFRESH_DAYS)
    champion_pages = cached_by_key(CHAMPION_REDIRECTS_CACHE_PATH, refresh, champions,
                                   resolve_redirects, STABLE_REFRESH_DAYS, changes["pages"])
    achievements = {}
    for link, won in champions.items():
        page = champion_pages.get(link, link)
        merged = achievements.setdefault(page, {"worlds": [], "msi": []})
        for kind in merged:
            merged[kind] = sorted(set(merged[kind]) | set(won[kind]))

    # Equipos actuales y últimos equipos de quien lo ha dejado hace poco (agentes libres)
    cutoff = (datetime.date.today() - datetime.timedelta(days=RECENT_FREE_AGENT_DAYS)).isoformat()
    teams_needed = {row["Team"] for row in cargo_rows.values() if row.get("Team")}
    teams_needed |= {t["team"] for ts in tenures.values() for t in ts
                     if t["to"] and t["to"] >= cutoff and t["team"]}
    team_tournaments = cached_by_key(TEAM_TOURNAMENTS_CACHE_PATH, refresh, teams_needed,
                                     fetch_team_tournaments, REFRESH_DAYS, changes["teams"])

    ctx = {"tenures": tenures, "team_regions": team_regions,
           "team_tournaments": team_tournaments, "achievements": achievements,
           "league_titles": won_titles, "league_info": league_info,
           "major_leagues": major_leagues}
    master = build_master(scraped, pages, cargo_rows, extra_pages, ctx)
    apply_player_fixes(master)
    missing = [m["id"] for m in master if m["status"] == "unknown"]
    print(f"{len(master) - len(missing)}/{len(master)} con datos de Cargo"
          + (f" (sin datos: {', '.join(missing[:10])})" if missing else ""))
    print(f"  {sum(1 for m in master if m['history'])} con historial, "
          f"{sum(1 for m in master if not m['scraped'])} fuera de main.py")

    write_json(MASTER_PATH, {"built_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                             "players": master})
    print(f"Maestro -> {MASTER_PATH}")

    no_birthdate = [m["page"] for m in master if m["game_team"] and not m["birthdate"] and m["page"]]
    birth_years = cached_by_key(BIRTH_YEARS_CACHE_PATH, refresh, no_birthdate,
                                fetch_birth_years, STABLE_REFRESH_DAYS, changes["pages"])
    dle = build_dle(master, birth_years)
    with open(DLE_PATH, "w", encoding="utf-8") as f:   # un jugador por línea: pesa menos
        f.write('{"players": [\n' + ",\n".join(json.dumps(p, ensure_ascii=False) for p in dle)
                + "\n]}\n")
    print(f"dle -> {DLE_PATH} ({len(dle)} jugadores)")

    js, roster_players = build_rostergues_js(rosters, cargo_rows)
    with open(ROSTERGUES_PATH, "w", encoding="utf-8") as f:
        f.write(js)
    no_real = sum(1 for p in roster_players.values() if not p["real"])
    print(f"rostergues -> {ROSTERGUES_PATH} ({len(rosters)} plantillas, "
          f"{len(roster_players)} jugadores, {no_real} sin nombre real)")

    by_page = {m["page"]: m for m in master if m["page"]}
    js, missing = build_carrera_js(curated_carrera, by_page)
    with open(CARRERA_PATH, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"carrera -> {CARRERA_PATH} ({len(curated_carrera) - len(missing)} jugadores"
          + (f", sin datos: {', '.join(missing)}" if missing else "") + ")")

    grid, missing = build_grid(curated_grid, master)
    with open(GRID_PATH, "w", encoding="utf-8") as f:
        f.write("[\n" + ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in grid) + "\n]\n")
    print(f"grid -> {GRID_PATH} ({len(grid)} jugadores"
          + (f", sin datos: {', '.join(missing)}" if missing else "") + ")")
    with open(GRID_CATEGORIES_PATH, encoding="utf-8") as f:
        grid_schedule = update_grid_schedule(grid, json.load(f), GRID_SCHEDULE_PATH)
    write_json(GRID_SCHEDULE_PATH, grid_schedule)
    print(f"grid -> {GRID_SCHEDULE_PATH} (reto diario hasta {max(grid_schedule)})")

    history = cached(LEAGUE_HISTORY_CACHE_PATH, refresh, fetch_league_history, REFRESH_DAYS)
    answers, guesses = build_wordle(history, master)
    schedule = update_wordle_schedule(answers, WORDLE_SCHEDULE_PATH)
    os.makedirs(os.path.dirname(WORDLE_WORDS_PATH), exist_ok=True)
    with open(WORDLE_WORDS_PATH, "w", encoding="utf-8") as f:
        f.write('{"answers": [\n' + ",\n".join(json.dumps(a, ensure_ascii=False) for a in answers)
                + '\n],\n"guesses": ' + json.dumps(guesses) + "}\n")
    write_json(WORDLE_SCHEDULE_PATH, schedule)
    daily = Counter(len(w) for w in {a["w"] for a in answers if a["daily"]})
    print(f"wordle -> {WORDLE_WORDS_PATH} ({len(answers)} respuestas, para el diario "
          f"{dict(sorted(daily.items()))} por largo, {len(guesses)} intentos válidos; "
          f"calendario hasta {max(schedule)})")

    # Solo si todo ha ido bien: la próxima vez se miran los cambios desde aquí
    write_json(SYNC_STATE_PATH, {"last_sync": started.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                 "full": bool(refresh),
                                 "roster_changes": sorted(m[0] for m in moves)})


if __name__ == "__main__":
    main()
