import json, glob
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
save_manifest(detect.get('all_files') or detect['files'])

extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
cost = json.loads(cost_path.read_text(encoding='utf-8')) if cost_path.exists() else {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'This run: {input_tok:,} input / {output_tok:,} output tokens')

# Clean up temp files
for f in ['graphify-out/.graphify_detect.json', 'graphify-out/.graphify_extract.json',
          'graphify-out/.graphify_ast.json', 'graphify-out/.graphify_semantic.json',
          'graphify-out/.graphify_analysis.json', 'graphify-out/.graphify_cached.json',
          'graphify-out/.graphify_uncached.txt', 'graphify-out/.graphify_semantic_new.json']:
    Path(f).unlink(missing_ok=True)
for c in glob.glob('graphify-out/.graphify_chunk_*.json'):
    Path(c).unlink(missing_ok=True)
print('Temp files cleaned up')
