from pathlib import Path
text = Path('TaskPixel/js/taskDetail.js').read_text(encoding='utf-8')
print(text[-1200:])
