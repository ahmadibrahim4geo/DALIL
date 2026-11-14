"""Independent GDAL/OGR readback of artifacts emitted by test_export_integrity.js.

Run with an installed GDAL Python host, passing the evidence directory. This is
native driver evidence; it is not a Google Earth, QGIS GUI or ArcGIS GUI test.
"""
import json
import sys
from pathlib import Path
from osgeo import gdal, ogr

directory = Path(sys.argv[1]).resolve()
expected = json.loads((directory / 'expected.json').read_text(encoding='utf-8'))
gdal.UseExceptions()
drivers = {}
for filename in ['places.shp', 'places.geojson', 'places.kml']:
    datasource = ogr.Open(str(directory / filename))
    assert datasource is not None, filename
    features = [feature for layer in datasource for feature in layer]
    assert len(features) == expected['features'], (filename, len(features))
    geometries = [feature.GetGeometryRef() for feature in features]
    assert all(ogr.GT_Flatten(geometry.GetGeometryType()) == ogr.wkbPoint for geometry in geometries), filename
    coordinates = {(round(geometry.GetX(), 6), round(geometry.GetY(), 6)) for geometry in geometries}
    assert (0.0, 10.0) in coordinates and (40.0, 0.0) in coordinates and (0.0, 0.0) in coordinates, filename
    names = [feature.GetField('NAME') if filename.endswith('.shp') else feature.GetField('name') if filename.endswith('.geojson') else feature.GetField('Name') for feature in features]
    assert expected['firstName'] in names, (filename, names)
    if filename.endswith('.shp'):
        layer = datasource.GetLayer(0)
        assert layer.GetSpatialRef().IsGeographic()
        assert layer.GetSpatialRef().GetAuthorityCode(None) == '4326'
    drivers[filename] = datasource.GetDriver().GetName()
    datasource = None
print(json.dumps({'verified': True, 'GDAL': gdal.VersionInfo('--version'), 'drivers': drivers, 'point_count': expected['features'], 'unicode': True, 'zero_axes': True, 'EPSG4326': True}, ensure_ascii=False))
