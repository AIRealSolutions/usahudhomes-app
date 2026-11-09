"""
Build src/data/economicRegionsUS.json — economic regions for every state except NC.

Each region is an OMB metropolitan statistical area plus the nearest rural counties in the
same state, so every county lands in exactly one region (states with fewer than three
metros also use micropolitan areas). Connecticut is written by hand: HUD still uses its
eight pre-2022 counties.

Inputs (download from www2.census.gov into DIR):
  programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx
  geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip  (unzip into DIR/gaz)

Usage: python3 scripts/generate_economic_regions.py DIR src/data/economicRegionsUS.json
Requires openpyxl.
"""
import csv, json, math, re, sys, unicodedata
from collections import defaultdict
import openpyxl
D, OUT = sys.argv[1], sys.argv[2]
gaz = {}
for r in csv.DictReader(open(f'{D}/gaz/2024_Gaz_counties_national.txt', encoding='utf-8'), delimiter='\t'):
    r = {k.strip(): v.strip() for k, v in r.items()}
    gaz[r['GEOID']] = dict(st=r['USPS'], name=r['NAME'], lat=float(r['INTPTLAT']), lng=float(r['INTPTLONG']))
wb = openpyxl.load_workbook(f'{D}/list1_2023.xlsx', read_only=True)
rows = list(wb.active.iter_rows(values_only=True))[3:]
deln = {}
csa_has_metro = set()
for r in rows:
    if not r[0] or not r[9]: continue
    geoid = f'{r[9]}{r[10]}'
    deln[geoid] = dict(cbsa=r[0], title=r[3], metro=r[4].startswith('Metro'), csa=r[2], csa_title=r[6])
    if r[2] and r[4].startswith('Metro'): csa_has_metro.add(r[2])

SUFFIX = re.compile(r'\s+(County|Parish|Borough|City and Borough|Census Area|Municipality|Municipio)$')
def short(n): return SUFFIX.sub('', n)
def ascii_(s): return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
def dist(a, b): return math.hypot(a['lat'] - b['lat'], (a['lng'] - b['lng']) * math.cos(math.radians(a['lat'])))
def area_name(title):
    parts = [p for p in title.split(', ')[0].replace('--', '-').split('-') if p]
    return '-'.join(parts[:2]) + ' area'
def slug(s): return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', ascii_(s).lower())).strip('-')[:60]

by_state = defaultdict(list)
for g, c in gaz.items(): by_state[c['st']].append(dict(geoid=g, **c))

out = []
for st, counties in sorted(by_state.items()):
    if st in ('NC', 'CT'): continue          # NC: Prosperity Zones; CT: handled by hand (old counties)
    def anchor(c, allow_micro):
        d = deln.get(c['geoid'])
        if not d: return None
        if d['metro'] or allow_micro: return ('CBSA' + d['cbsa'], d['title'])
        return None
    allow_micro = len({a for c in counties if (a := anchor(c, False))}) < 3
    groups, names, rural = defaultdict(list), {}, []
    for c in counties:
        a = anchor(c, allow_micro)
        if a: groups[a[0]].append(c); names[a[0]] = a[1]
        else: rural.append(c)
    if not groups:  # no CBSA at all (shouldn't happen) -> one statewide region
        groups['ALL'] = counties; names['ALL'] = st; rural = []
    core = {k: list(v) for k, v in groups.items()}
    for c in rural:
        k = min(core, key=lambda k: min(dist(c, x) for x in core[k]))
        groups[k].append(c)
    regs = []
    for k, cs in groups.items():
        nm = area_name(names[k])
        regs.append(dict(name=nm, cs=cs, core=len(core[k])))
    # names can collide (two CBSAs with the same first city) -> add county count
    seen = defaultdict(int)
    for r in regs: seen[r['name']] += 1
    regs.sort(key=lambda r: r['name'])
    for i, r in enumerate(regs, 1):
        cnames = []
        for c in sorted(r['cs'], key=lambda c: c['name']):
            n = short(c['name'])
            cnames.append(n)
            if ascii_(n) != n: cnames.append(ascii_(n))
            # VA independent cities: HUD sometimes drops "city" when no county shares the name
            if c['name'].endswith(' city'):
                bare = c['name'][:-5]
                if not any(short(x['name']) == bare for x in counties): cnames.append(bare)
        out.append(dict(state=st, slug=slug(r['name']), name=r['name'], sort=i, counties=cnames,
                        desc=f"Metro-area region (OMB 2023 metropolitan statistical area): {r['core']} metro counties + {len(r['cs']) - r['core']} nearest rural counties"))

# Connecticut: HUD still uses the eight pre-2022 counties; include the planning regions too
CT = [
  ('Bridgeport-Stamford area', ['Fairfield', 'Greater Bridgeport', 'Western Connecticut']),
  ('Hartford area', ['Hartford', 'Tolland', 'Middlesex', 'Capitol', 'Lower Connecticut River Valley']),
  ('New Haven-Waterbury area', ['New Haven', 'South Central Connecticut', 'Naugatuck Valley']),
  ('Norwich-New London area', ['New London', 'Windham', 'Southeastern Connecticut', 'Northeastern Connecticut']),
  ('Northwest Hills', ['Litchfield', 'Northwest Hills']),
]
for i, (n, cs) in enumerate(CT, 1):
    out.append(dict(state='CT', slug=slug(n), name=n, sort=i, counties=cs, desc='Metro-area region (OMB), by pre-2022 county and planning region'))

final = []
for r in sorted(out, key=lambda r: (r['state'], r['sort'])):
    m = re.match(r'.*: (\d+) metro counties \+ (\d+) nearest rural counties', r['desc'])
    if m:
        a, b = int(m[1]), int(m[2])
        desc = f"OMB metro area ({a} {'county' if a == 1 else 'counties'})" + (f" + {b} nearest rural {'county' if b == 1 else 'counties'}" if b else '')
    else:
        desc = r['desc']
    final.append(dict(state=r['state'], slug=r['slug'], name=r['name'], description=desc, sort_order=r['sort'], counties=r['counties']))
json.dump({'source': 'OMB metropolitan statistical areas (Census delineation file list1_2023, July 2023) plus nearest rural counties by Census 2024 Gazetteer centroids; CT by pre-2022 counties and planning regions. NC uses its Prosperity Zones and is not in this file.', 'regions': final}, open(OUT, 'w'), separators=(',', ':'))
print(len(final), 'regions')
