import re

for fname in ['src/commands/modpack.rs', 'src/commands/server.rs', 'src/commands/resource.rs', 'src/commands/world.rs']:
    with open(fname, 'r') as f:
        content = f.read()
    remaining = len(re.findall(r'Result<[^,>]+,\s*String\s*>', content))
    if remaining > 0:
        content = re.sub(r'Result<([^,>]+),\s*String\s*>', r'Result<\1, AppError>', content)
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
        with open(fname, 'w') as f:
            f.write(content)
        print(f'Fixed {fname}')
    else:
        print(f'OK {fname}')
