import re

with open('src/commands/advanced.rs', 'r') as f:
    content = f.read()

# Replace all Result<T, String> with Result<T, AppError>
content = re.sub(r'Result<([^,>]+),\s*String\s*>', r'Result<\1, AppError>', content)

# Add import if not present
if 'use crate::errors' not in content:
    lines = content.split('\n')
    new_lines = []
    inserted = False
    for line in lines:
        new_lines.append(line)
        if not inserted and line.startswith('use '):
            new_lines.append('use crate::errors::{self, AppError};')
            inserted = True
    content = '\n'.join(new_lines)

with open('src/commands/advanced.rs', 'w') as f:
    f.write(content)

remaining = len(re.findall(r'Result<[^,>]+,\s*String\s*>', content))
print(f"Remaining Result<_, String>: {remaining}")
