"""Independent OGR geometry readback and GeographicLib spherical distances.

Run create_import_evidence.js first. This is driver/math QA, not QGIS GUI QA.
"""
import json
import math
import os
from pathlib import Path
import sys

if os.name == 'nt' and os.environ.get('DALIL_QGIS_BIN'):
    dll_directory = os.add_dll_directory(os.environ['DALIL_QGIS_BIN'])
from osgeo import gdal, ogr
from geographiclib.geodesic import Geodesic
import geographiclib

gdal.UseExceptions()
gdal.SetConfigOption('SHAPE_RESTORE_SHX', 'YES')  # Fixture includes the standalone SHP only.
directory = Path(sys.argv[1])
expected = json.loads((directory / 'expected.json').read_text(encoding='utf-8'))
checked = []
for geometry in expected['geometry']:
    for suffix in ['.shp', '.geojson', '.kml', '.kmz']:
        name = geometry['type'].lower() + suffix
        data = ogr.Open(str(directory / name))
        assert data is not None, name
        found = [feature.GetGeometryRef().ExportToJson() for layer in data for feature in layer]
        assert len(found) == 1, (name, found)
        readback = json.loads(found[0])
        assert readback['type'] == geometry['type'], (name, readback)
        def xy(coords):
            return coords[:2] if isinstance(coords[0], (int, float)) else [xy(c) for c in coords]
        assert xy(readback['coordinates']) == geometry['coordinates'], (name, readback)
        checked.append(name)

sphere = Geodesic(6371008.8, 0)
max_error = 0
for item in expected['cases']:
    a, b, p = item['start'], item['end'], item['point']
    inverse = sphere.Inverse(a[1], a[0], b[1], b[0])
    line = sphere.Line(a[1], a[0], inverse['azi1'])
    length = inverse['s12']
    def distance(along):
        q = line.Position(along)
        return sphere.Inverse(q['lat2'], q['lon2'], p[1], p[0])['s12']
    # Independent 1D search on GeographicLib's geodesic, with endpoint caps.
    lo, hi = 0.0, length
    ratio = (math.sqrt(5) - 1) / 2
    for _ in range(110):
        left, right = hi - ratio * (hi-lo), lo + ratio * (hi-lo)
        if distance(left) < distance(right):
            hi = right
        else:
            lo = left
    reference = min(distance(0), distance(length), distance((lo+hi)/2))
    error = abs(reference - item['meters'])
    assert error < 0.001, (item, reference, error)
    max_error = max(max_error, error)
report = {'status': 'passed', 'gdal': gdal.__version__, 'geographiclib': geographiclib.__version__,
          'readback': checked, 'distance_cases': len(expected['cases']), 'max_error_meters': max_error,
          'model': 'mean-radius sphere 6371008.8 m; not ellipsoidal WGS84 distances'}
(directory / 'native-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
