"""Fetch pinned MIT runtime; verify npm integrity before extracting required files."""
import base64, hashlib, io, json, tarfile, urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
meta=json.load(urllib.request.urlopen('https://registry.npmjs.org/@8thwall%2fengine/0.1.0',timeout=30))
data=urllib.request.urlopen(meta['dist']['tarball'],timeout=90).read()
expected='sha512-Ww+evUePP6PlrPx37fVilcRc0rt9vyAHcuh5rTZemLGdRmVWH2HrZOY6EaF9swvbE5JYouy3u9VIsHicA8uwWQ=='
actual='sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()
if actual!=expected:raise RuntimeError('Unexpected engine package integrity')
destination=root/'experiments/eighthwall/vendor/engine'
with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
    for name in ['LICENSE','README.md','package.json','dist/xr.js','dist/xr-tracking.js']:
        member=archive.getmember('package/'+name)
        target=destination/Path(name)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(archive.extractfile(member).read())
print('Verified @8thwall/engine 0.1.0 MIT runtime saved to',destination)
