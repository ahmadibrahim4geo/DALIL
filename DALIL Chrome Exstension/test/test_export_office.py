"""Independent openpyxl/XML/PNG readback; no Microsoft Excel UI claim."""
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path
import openpyxl
from PIL import Image

directory = Path(sys.argv[1]).resolve()
expected = json.loads((directory / 'expected.json').read_text(encoding='utf-8'))
for language in ['ar', 'en']:
    workbook = openpyxl.load_workbook(directory / ('places_' + language + '.xlsx'), data_only=True)
    sheet = workbook.worksheets[0]
    assert sheet.max_row == expected['records'] + 1
    assert sheet.cell(2, 2).value == expected['firstName']
    assert sheet.cell(3, 4).value == 0 and sheet.cell(3, 4).data_type == 'n'
    assert sheet.freeze_panes == 'A2'
    assert sheet.sheet_view.rightToLeft == (language == 'ar')
    assert sheet.auto_filter.ref
    assert sheet.cell(3, 4).number_format == '0.000000'
    assert sheet.cell(6, 2).value == expected['longName']
    workbook.close()
ET.parse(directory / 'places.kml')
with zipfile.ZipFile(directory / 'places.kmz') as archive:
    assert archive.testzip() is None
    root = ET.fromstring(archive.read('doc.kml'))
    for href in root.findall('.//{http://www.opengis.net/kml/2.2}href'):
        assert href.text in archive.namelist()
        image = Image.open(BytesIO(archive.read(href.text)))
        assert image.size == (64, 64) and image.format == 'PNG'
print(json.dumps({'verified': True, 'openpyxl': openpyxl.__version__, 'xlsx': ['ar', 'en'], 'frozen_header': True, 'numeric_XY': True, 'unicode': True, 'kmz_png_readback': True}))
