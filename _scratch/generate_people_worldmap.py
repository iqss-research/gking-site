#!/usr/bin/env python3
"""Generate standalone people world-map preview. Run from repo root."""
from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RG_PATH = REPO / "EditMe/People/Data/research_group.json"
PROFILES = REPO / "EditMe/People/Profiles"
OUT = Path(__file__).resolve().parent / "people-worldmap-preview.html"

# lat, lng, label
GEO: dict[str, tuple[float, float, str]] = {
    "Harvard University": (42.3770, -71.1167, "Cambridge, MA"),
    "Harvard Kennedy School": (42.3710, -71.1210, "Cambridge, MA"),
    "Harvard Medical School": (42.3356, -71.1025, "Boston, MA"),
    "Harvard T.H. Chan School of Public Health": (42.3356, -71.1025, "Boston, MA"),
    "Stanford University": (37.4275, -122.1697, "Stanford, CA"),
    "Stanford Law School": (37.4241, -122.1669, "Stanford, CA"),
    "Stanford University School of Medicine": (37.4333, -122.1761, "Stanford, CA"),
    "MIT": (42.3601, -71.0942, "Cambridge, MA"),
    "Massachusetts Institute of Technology": (42.3601, -71.0942, "Cambridge, MA"),
    "MIT Sloan School of Management": (42.3608, -71.1040, "Cambridge, MA"),
    "MIT Libraries": (42.3601, -71.0942, "Cambridge, MA"),
    "MIT-IBM Watson AI Lab": (42.3601, -71.0942, "Cambridge, MA"),
    "Columbia University": (40.8075, -73.9626, "New York, NY"),
    "Princeton University": (40.3431, -74.6551, "Princeton, NJ"),
    "Yale University": (41.3163, -72.9223, "New Haven, CT"),
    "Yale Law School": (41.3114, -72.9251, "New Haven, CT"),
    "University of Pennsylvania": (39.9522, -75.1932, "Philadelphia, PA"),
    "New York University": (40.7295, -73.9965, "New York, NY"),
    "NYU": (40.7295, -73.9965, "New York, NY"),
    "NYU Abu Dhabi": (24.5240, 54.4340, "Abu Dhabi, UAE"),
    "NYU University": (40.7295, -73.9965, "New York, NY"),
    "University of Washington": (47.6553, -122.3035, "Seattle, WA"),
    "University of California, Berkeley": (37.8719, -122.2585, "Berkeley, CA"),
    "UC Berkeley": (37.8719, -122.2585, "Berkeley, CA"),
    "University of California, San Diego": (32.8801, -117.2340, "San Diego, CA"),
    "UC San Diego": (32.8801, -117.2340, "San Diego, CA"),
    "University of California, Irvine": (33.6405, -117.8443, "Irvine, CA"),
    "University of California, Riverside": (33.9737, -117.3281, "Riverside, CA"),
    "University of California, Santa Barbara": (34.4140, -119.8489, "Santa Barbara, CA"),
    "UC Santa Barbara": (34.4140, -119.8489, "Santa Barbara, CA"),
    "University of California": (37.8719, -122.2585, "California, USA"),
    "UCLA": (34.0689, -118.4452, "Los Angeles, CA"),
    "UCLA School of Law": (34.0716, -118.4468, "Los Angeles, CA"),
    "University of Texas at Austin": (30.2849, -97.7341, "Austin, TX"),
    "UT Austin": (30.2849, -97.7341, "Austin, TX"),
    "University of Texas": (30.2849, -97.7341, "Austin, TX"),
    "University of Texas at Dallas": (32.9857, -96.7502, "Richardson, TX"),
    "University of Texas at El Paso": (31.7690, -106.5051, "El Paso, TX"),
    "Texas A&M University": (30.6187, -96.3365, "College Station, TX"),
    "University of Chicago": (41.7886, -87.5987, "Chicago, IL"),
    "NORC at the University of Chicago": (41.7886, -87.5987, "Chicago, IL"),
    "University of Michigan": (42.2780, -83.7382, "Ann Arbor, MI"),
    "University of Wisconsin-Madison": (43.0766, -89.4125, "Madison, WI"),
    "University of Wisconsin, Madison": (43.0766, -89.4125, "Madison, WI"),
    "University of Wisconsin - Madison": (43.0766, -89.4125, "Madison, WI"),
    "Washington University in St. Louis": (38.6488, -90.3108, "St. Louis, MO"),
    "Duke University": (41.2980, -75.8820, "Durham, NC"),
    "Northwestern University": (42.0565, -87.6753, "Evanston, IL"),
    "Cornell University": (42.4534, -76.4735, "Ithaca, NY"),
    "Dartmouth College": (43.7044, -72.2887, "Hanover, NH"),
    "Dartmouth Tuck School of Business": (43.7044, -72.2887, "Hanover, NH"),
    "Brown University": (41.8268, -71.4025, "Providence, RI"),
    "Boston University": (42.3505, -71.1054, "Boston, MA"),
    "Boston College": (42.3355, -71.1685, "Chestnut Hill, MA"),
    "Northeastern University": (42.3398, -71.0892, "Boston, MA"),
    "Purdue University": (40.4237, -86.9212, "West Lafayette, IN"),
    "Rice University": (29.7174, -95.4018, "Houston, TX"),
    "University of Houston": (29.7199, -95.3422, "Houston, TX"),
    "American University": (38.9362, -77.0890, "Washington, DC"),
    "Georgetown University": (38.9076, -77.0723, "Washington, DC"),
    "University of Rochester": (43.1289, -77.6266, "Rochester, NY"),
    "Johns Hopkins University": (39.3299, -76.6205, "Baltimore, MD"),
    "Johns Hopkins Bloomberg School of Public Health": (39.2976, -76.5929, "Baltimore, MD"),
    "University of Oxford": (51.7548, -1.2544, "Oxford, UK"),
    "University of Cambridge": (52.2043, 0.1149, "Cambridge, UK"),
    "London School of Economics": (51.5144, -0.1167, "London, UK"),
    "University of Mannheim": (49.4875, 8.4660, "Mannheim, Germany"),
    "University of Essex": (51.8806, 0.9269, "Colchester, UK"),
    "University of Zurich": (47.3744, 8.5480, "Zurich, Switzerland"),
    "European University Institute": (43.8076, 11.2921, "Florence, Italy"),
    "RWTH Aachen University": (50.9222, 6.0567, "Aachen, Germany"),
    "Peking University": (39.9928, 116.3109, "Beijing, China"),
    "Singapore Management University": (1.2974, 103.8498, "Singapore"),
    "Korea University": (37.5890, 127.0324, "Seoul, South Korea"),
    "Sungkyunkwan University": (37.5872, 126.9939, "Seoul, South Korea"),
    "Tunghai University, Taiwan": (24.1827, 120.6005, "Taichung, Taiwan"),
    "The University of Melbourne": (37.7963, 144.9610, "Melbourne, Australia"),
    "University of Akureyri": (65.6835, -18.0878, "Akureyri, Iceland"),
    "University of New Zealand": (-41.2865, 174.7762, "Wellington, New Zealand"),
    "Università dell'Insubria": (45.8206, 8.8251, "Varese, Italy"),
    "World Health Organization": (46.2270, 6.1400, "Geneva, Switzerland"),
    "World Bank": (38.8990, -77.0421, "Washington, DC"),
    "Inter-American Development Bank": (38.8933, -77.0146, "Washington, DC"),
    "Bill & Melinda Gates Foundation": (47.6205, -122.3493, "Seattle, WA"),
    "Simons Foundation": (40.7410, -73.9896, "New York, NY"),
    "The Rand Corporation": (34.0095, -118.4905, "Santa Monica, CA"),
    "American Enterprise Institute": (38.9012, -77.0386, "Washington, DC"),
    "Analyst Institute": (38.9072, -77.0369, "Washington, DC"),
    "Google": (37.4220, -122.0841, "Mountain View, CA"),
    "Google Research": (37.4220, -122.0841, "Mountain View, CA"),
    "Google DeepMind": (51.5332, -0.1255, "London, UK"),
    "Meta": (37.4848, -122.1484, "Menlo Park, CA"),
    "Microsoft": (47.6423, -122.1391, "Redmond, WA"),
    "Microsoft AI": (47.6423, -122.1391, "Redmond, WA"),
    "OpenAI": (37.7606, -122.4094, "San Francisco, CA"),
    "Anthropic": (37.7789, -122.4153, "San Francisco, CA"),
    "Netflix": (37.2568, -121.9637, "Los Gatos, CA"),
    "Airbnb": (37.7718, -122.4058, "San Francisco, CA"),
    "Pinterest": (37.7670, -122.3977, "San Francisco, CA"),
    "Spotify": (59.3356, 18.0632, "Stockholm, Sweden"),
    "Pfizer, Inc.": (40.7546, -73.9829, "New York, NY"),
    "Fidelity Investments": (42.3565, -71.0520, "Boston, MA"),
    "How We Feel Project": (42.3601, -71.0589, "Boston, MA"),
    "JSTOR": (40.8176, -73.9482, "New York, NY"),
    "YouGov": (51.5033, -0.1195, "London, UK"),
    "YouGov/Polimetrix": (51.5033, -0.1195, "London, UK"),
    "Brandwatch": (50.8225, -0.1372, "Brighton, UK"),
    "Scripps Research": (32.8895, -117.2501, "La Jolla, CA"),
    "Broad Institute": (42.3621, -71.0843, "Cambridge, MA"),
    "Ariadne Labs": (42.3362, -71.1030, "Boston, MA"),
    "Barcelona Supercomputing Center": (41.3888, 2.1770, "Barcelona, Spain"),
    "U.S. Air Force": (38.8719, -77.0563, "Washington, DC"),
    "U.S. Naval War College": (41.5061, -71.3126, "Newport, RI"),
    "Pennsylvania State University": (40.7982, -77.8599, "State College, PA"),
    "Penn State University": (40.7982, -77.8599, "State College, PA"),
    "Ohio State University": (40.0067, -83.0305, "Columbus, OH"),
    "University of Florida": (29.6436, -82.3549, "Gainesville, FL"),
    "University of Virginia": (38.0336, -78.5080, "Charlottesville, VA"),
    "University of Arkansas": (36.0686, -94.1746, "Fayetteville, AR"),
    "University of Kentucky": (38.0307, -84.5040, "Lexington, KY"),
    "University of Notre Dame": (41.7052, -86.2350, "Notre Dame, IN"),
    "Notre Dame": (41.7052, -86.2350, "Notre Dame, IN"),
    "University of Colorado Boulder": (40.0076, -105.2659, "Boulder, CO"),
    "University of Colorado": (39.7406, -104.8309, "Denver, CO"),
    "University of Colorado Anschutz Medical Campus": (39.7465, -104.8370, "Aurora, CO"),
    "Caltech": (34.1377, -118.1253, "Pasadena, CA"),
    "UCSF": (37.7629, -122.4576, "San Francisco, CA"),
    "UC Davis": (38.5382, -121.7617, "Davis, CA"),
    "Instituto Nacional de Salud Pública": (18.9685, -99.2506, "Cuernavaca, Mexico"),
    "Instituto Mexicano del Seguro Social": (19.4326, -99.1332, "Mexico City, Mexico"),
    "Secretaría de Salud, Mexico": (19.4326, -99.1332, "Mexico City, Mexico"),
    "NITI Aayog, Government of India": (28.6139, 77.2090, "New Delhi, India"),
    "Community Empowerment Lab": (26.8467, 80.9462, "Lucknow, India"),
    "Population Services International": (38.9041, -77.0487, "Washington, DC"),
    "Hertie School Berlin": (52.5200, 13.4050, "Berlin, Germany"),
    "Tokyo Foundation for Policy Research": (35.6762, 139.6503, "Tokyo, Japan"),
    "Independent": (42.3601, -71.0589, "Unspecified region"),
    "Crimson Hexagon": (42.3601, -71.0589, "Boston, MA"),
    "European Commission Joint Research Centre": (45.1847, 7.6717, "Ispra, Italy"),
    "Institute for Advanced Study": (40.3300, -74.6590, "Princeton, NJ"),
    "Institute of Public Finance": (-1.2921, 36.8219, "Nairobi, Kenya"),
    "The Kavli Foundation": (34.1478, -118.1445, "Pasadena, CA"),
    "Global Alliance for Improved Nutrition": (46.2044, 6.1432, "Geneva, Switzerland"),
    "CCBRT": (-6.8160, 39.2803, "Dar es Salaam, Tanzania"),
    "Emory University": (33.7925, -84.3235, "Atlanta, GA"),
    "Loyola Marymount University": (33.9697, -118.4187, "Los Angeles, CA"),
    "Wayne State University": (42.3594, -83.0669, "Detroit, MI"),
    "Wellesley College": (42.2935, -71.3059, "Wellesley, MA"),
    "Western University": (43.0096, -81.2737, "London, ON, Canada"),
    "University of Waterloo": (43.4723, -80.5449, "Waterloo, ON, Canada"),
    "Willamette University": (44.9350, -123.0304, "Salem, OR"),
    "SUNY at Stony Brook": (40.9176, -73.1234, "Stony Brook, NY"),
    "UMass Chan Medical School": (42.2759, -71.7615, "Worcester, MA"),
    "University of Illinois at Urbana-Champaign": (40.1020, -88.2272, "Urbana, IL"),
    "University of Maryland School of Medicine": (39.2891, -76.6262, "Baltimore, MD"),
    "University of Mississippi": (34.3647, -89.5380, "Oxford, MS"),
    "University of North Texas": (33.2075, -97.1526, "Denton, TX"),
    "Bridgewater State University": (41.9882, -70.9700, "Bridgewater, MA"),
    "Valdosta State University": (30.8466, -83.2890, "Valdosta, GA"),
    "New College of Florida": (27.3845, -82.5633, "Sarasota, FL"),
    "Minerva University": (37.7879, -122.4075, "San Francisco, CA"),
    "The Catholic University of America": (38.9362, -77.0669, "Washington, DC"),
    "Zayed University": (25.0657, 55.1713, "Dubai, UAE"),
    "Jawaharlal Nehru Medical College, Belgaum": (15.8497, 74.4977, "Belgaum, India"),
    "Cook County Board of Commissioners": (41.8781, -87.6298, "Chicago, IL"),
    "New Jersey Office of the Attorney General": (40.2206, -74.7597, "Trenton, NJ"),
    "Harris for President 2024": (38.9072, -77.0369, "Washington, DC"),
    "Executive Director at America Asia Alliances": (38.9072, -77.0369, "Washington, DC"),
    "OpenDP": (42.3770, -71.1167, "Harvard / OpenDP"),
    "Atmire, Inc.": (50.8503, 4.3517, "Brussels, Belgium"),
    "Corr Analytics Inc.": (38.9072, -77.0369, "Washington, DC"),
    "D. E. Shaw Group": (40.7614, -73.9776, "New York, NY"),
    "Epsilon Economics": (42.3601, -71.0589, "Boston, MA"),
    "Novartis Biomedical Research": (42.3601, -71.0589, "Cambridge, MA"),
    "Optum": (44.9778, -93.2650, "Minneapolis, MN"),
    "Reexpress AI, Inc.": (42.3601, -71.0589, "Boston, MA"),
    "Nanocentury AI": (37.3861, -122.0839, "Silicon Valley, CA"),
    "SmartEquip": (40.7128, -74.0060, "New York, NY"),
    "SportsMEDIA Technology": (35.2271, -80.8431, "Charlotte, NC"),
    "Perscient": (40.7128, -74.0060, "New York, NY"),
    "R.care": (37.7749, -122.4194, "San Francisco, CA"),
    "Clutch.win": (37.7749, -122.4194, "San Francisco, CA"),
}


def strip_institution(role: str) -> str:
    if not role:
        return ""
    s = role.strip()
    for sep in ("(", ";", " / "):
        i = s.find(sep)
        if i > 0:
            s = s[:i].strip()
    return re.sub(r"\s+", " ", s).strip()


def leading_university(s: str) -> str:
    if not s:
        return ""
    m = re.match(r"^((?:The\s+)?University of [^,]+,\s*[^,;()]+)", s, re.I)
    if m:
        return m.group(1).strip()
    m = re.match(r"^((?:The\s+)?University of\s+[^,;]+)", s, re.I)
    if m:
        return m.group(1).strip()
    m = re.match(r"^((?:The\s+)?(?:[A-Z][A-Za-z0-9.'&-]+\s+)+University)\b", s)
    if m:
        return m.group(1).strip()
    m = re.search(r"\b(University of\s+[^,;]+)\b", s, re.I)
    if m:
        return m.group(1).strip()
    return s.strip()


def resolve_affiliation(raw: str) -> str:
    if not raw:
        return ""
    if "," in raw and "University" in raw:
        for part in raw.split(","):
            part = part.strip()
            if "university" in part.lower():
                return leading_university(part) or part
    if "Daniel L. Kiskis" in raw or "Orit Kedar" in raw:
        if "University of Michigan" in raw:
            return "University of Michigan"
        if "Princeton University" in raw:
            return "Princeton University"
    return leading_university(raw) or raw


def geocode(aff: str) -> tuple[float, float, str] | None:
    if not aff:
        return None
    if aff in GEO:
        return GEO[aff]
    low = aff.lower()
    if low.startswith("harvard"):
        return GEO["Harvard University"]
    if low.startswith("stanford"):
        return GEO["Stanford University"]
    if re.match(r"^mit\b", low) or low.startswith("massachusetts institute"):
        return GEO["MIT"]
    if low.startswith("yale"):
        return GEO["Yale University"]
    if low.startswith("princeton"):
        return GEO["Princeton University"]
    if low.startswith("columbia"):
        return GEO["Columbia University"]
    if "new york university" in low or low.startswith("nyu"):
        return GEO["New York University"]
    if "university of california" in low and "san diego" in low:
        return GEO["UC San Diego"]
    if "university of california" in low and "berkeley" in low:
        return GEO["UC Berkeley"]
    if "university of california" in low and "irvine" in low:
        return GEO["University of California, Irvine"]
    if "university of california" in low and "santa barbara" in low:
        return GEO["UC Santa Barbara"]
    if "university of texas" in low:
        return GEO["University of Texas at Austin"]
    if "university of wisconsin" in low:
        return GEO["University of Wisconsin-Madison"]
    if "university of washington" in low:
        return GEO["University of Washington"]
    if "university of michigan" in low:
        return GEO["University of Michigan"]
    if "university of chicago" in low:
        return GEO["University of Chicago"]
    if "university of colorado" in low:
        return GEO["University of Colorado Boulder"]
    if "secretar" in low and "salud" in low:
        return GEO["Secretaría de Salud, Mexico"]
    if "insubria" in low:
        return GEO["Università dell'Insubria"]
    return None


UNKNOWN_GEO = (0.0, -28.0, "Affiliation not geocoded")

# Extra affiliations so every list member gets a pin
GEO.update(
    {
        "Secretar\\u00eda de Salud": (19.4326, -99.1332, "Mexico City, Mexico"),
        "University of Washington and Interdisciplinary Scientific Research": (
            47.6553,
            -122.3035,
            "Seattle, WA",
        ),
        "Cleveland Clinic Foundation Orit Kedar, University of Michigan": (
            42.2780,
            -83.7382,
            "Ann Arbor, MI",
        ),
        "Princeton University Daniel L. Kiskis, University of Michigan": (
            40.3431,
            -74.6551,
            "Princeton, NJ",
        ),
    }
)


def apply_jitter(markers: list[dict]) -> None:
    """Spread pins that share the same institution coordinates."""
    groups: dict[tuple[float, float], list[int]] = defaultdict(list)
    for i, m in enumerate(markers):
        key = (round(m["lat"], 5), round(m["lng"], 5))
        groups[key].append(i)

    for indices in groups.values():
        n = len(indices)
        if n <= 1:
            continue
        base_lat = markers[indices[0]]["lat"]
        base_lng = markers[indices[0]]["lng"]
        cos_lat = max(0.25, math.cos(math.radians(base_lat)))
        radius_deg = min(0.14, 0.012 * math.sqrt(n))
        for j, idx in enumerate(indices):
            angle = (2 * math.pi * j) / n
            markers[idx]["lat"] = base_lat + radius_deg * math.cos(angle)
            markers[idx]["lng"] = base_lng + (radius_deg * math.sin(angle)) / cos_lat


def category_label(cats: list[str]) -> str:
    if not cats:
        return "Collaborators"
    parts = []
    if "alumni_students" in cats:
        parts.append("Alumni: Students")
    if "alumni_postdocs" in cats:
        parts.append("Alumni: Post-Docs")
    if "collaborators" in cats:
        parts.append("Collaborators")
    return ", ".join(parts) if parts else "Collaborators"


def main() -> None:
    rg = json.loads(RG_PATH.read_text(encoding="utf-8"))
    roles: dict[str, str] = {}
    for path in PROFILES.glob("*/index.md"):
        text = path.read_text(encoding="utf-8")
        m = re.search(r'^role:\s*["\']?(.*?)["\']?\s*$', text, re.M)
        if m:
            roles[path.parent.name] = m.group(1)

    people = []
    for e in rg:
        role_raw = roles.get(e["slug"]) or e.get("affiliation") or ""
        aff = resolve_affiliation(strip_institution(role_raw))
        geo = geocode(aff)
        if not geo:
            geo = UNKNOWN_GEO
            geocoded = False
        else:
            geocoded = True
        people.append(
            {
                "name": e["name"],
                "slug": e["slug"],
                "affiliation": aff or "(none)",
                "categories": category_label(e.get("research_group_categories") or []),
                "lat": geo[0],
                "lng": geo[1],
                "place": geo[2],
                "geocoded": geocoded,
            }
        )

    markers = [
        {
            "name": p["name"],
            "affiliation": p["affiliation"],
            "categories": p["categories"],
            "place": p["place"],
            "lat": p["lat"],
            "lng": p["lng"],
            "geocoded": p["geocoded"],
        }
        for p in people
    ]
    apply_jitter(markers)

    geocoded_n = sum(1 for m in markers if m["geocoded"])
    data = {
        "generated": "research_group.json + profile roles",
        "total": len(markers),
        "geocoded": geocoded_n,
        "fallback_pins": len(markers) - geocoded_n,
        "markers": markers,
    }

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Research Group — World Map Preview (temporary)</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #222; }}
    header {{
      padding: 1rem 1.25rem;
      background: #1a3a5c;
      color: #fff;
    }}
    header h1 {{ margin: 0 0 0.35rem; font-size: 1.35rem; }}
    header p {{ margin: 0; font-size: 0.9rem; opacity: 0.9; max-width: 52rem; }}
    .banner {{
      padding: 0.6rem 1.25rem;
      background: #fff8e6;
      border-bottom: 1px solid #f0d78c;
      font-size: 0.85rem;
    }}
    #map {{ height: calc(100vh - 140px); min-height: 420px; }}
    .leaflet-popup-content {{ font-size: 0.85rem; max-height: 220px; overflow-y: auto; }}
    .leaflet-popup-content ul {{ margin: 0.4rem 0 0; padding-left: 1.1rem; }}
    .leaflet-popup-content li {{ margin: 0.2rem 0; }}
    .stat {{ font-weight: 600; }}
  </style>
</head>
<body>
  <header>
    <h1>Research group — world map (preview)</h1>
    <p>Temporary visualization for Gary King&rsquo;s People tab data. One pin per person; overlapping institutions are jittered. Affiliations are institution HQ, not home addresses.</p>
  </header>
  <div class="banner">
    <span class="stat">{data["total"]}</span> pins (one per person).
    <span class="stat">{data["geocoded"]}</span> geocoded from affiliation;
    <span class="stat">{data["fallback_pins"]}</span> placed at Atlantic fallback (unrecognized affiliation).
    Not part of the live site.
  </div>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const DATA = {json.dumps(data, ensure_ascii=False)};
    const map = L.map("map", {{
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 18
    }});
    L.tileLayer("https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png", {{
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }}).addTo(map);

    const layer = L.layerGroup();
    DATA.markers.forEach(function(m) {{
      const color = m.geocoded ? "#337ab7" : "#c0392b";
      const marker = L.circleMarker([m.lat, m.lng], {{
        radius: 4,
        fillColor: color,
        color: "#1a3a5c",
        weight: 1,
        opacity: 0.85,
        fillOpacity: 0.75
      }});
      marker.bindPopup(
        "<strong>" + m.name + "</strong><br>" +
        "<span style='color:#555'>" + m.affiliation + "</span><br>" +
        "<span style='color:#888;font-size:0.85em'>" + m.place + "</span><br>" +
        "<span style='color:#888;font-size:0.8em'>" + m.categories + "</span>"
      );
      layer.addLayer(marker);
    }});
    layer.addTo(map);

    if (DATA.markers.length) {{
      const bounds = L.latLngBounds(DATA.markers.map(function(m) {{ return [m.lat, m.lng]; }}));
      map.fitBounds(bounds, {{ padding: [24, 24], maxZoom: 2 }});
    }} else {{
      map.setView([20, 0], 2);
    }}
  </script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Pins {len(markers)}; geocoded {geocoded_n}; fallback {len(markers) - geocoded_n}")


if __name__ == "__main__":
    main()
