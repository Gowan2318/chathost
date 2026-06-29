import json
from graphify.cache import check_semantic_cache
from pathlib import Path

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
all_files = []
for ftype, flist in detect['files'].items():
    if ftype != 'code':
        all_files.extend(flist)

print(f"Non-code files to check: {len(all_files)}")
for f in all_files:
    print(f"  {f}")

cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(all_files)
if cached_nodes or cached_edges or cached_hyperedges:
    Path('graphify-out/.graphify_cached.json').write_text(
        json.dumps({'nodes': cached_nodes, 'edges': cached_edges, 'hyperedges': cached_hyperedges}, ensure_ascii=False),
        encoding='utf-8')
Path('graphify-out/.graphify_uncached.txt').write_text('\n'.join(uncached), encoding='utf-8')
print(f'\nCache: {len(all_files)-len(uncached)} hit, {len(uncached)} need extraction')
