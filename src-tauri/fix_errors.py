import re
import sys

for fname in ['src/commands/modpack.rs', 'src/services/microsoft_auth.rs', 'src/commands/server.rs']:
    try:
        with open(fname, 'r') as f:
            content = f.read()
        content = re.sub(r'Err\(format!\(', r'Err(errors::internal(format!(', content)
        content = re.sub(r'Err\("([^"]+)"\.to_string\(\)\)', r'Err(errors::internal("\1"))', content)
        content = re.sub(r'Err\(e\.to_string\(\)\)', r'Err(errors::internal(e.to_string()))', content)
        with open(fname, 'w') as f:
            f.write(content)
        print('Fixed: ' + fname)
    except FileNotFoundError:
        print('Not found: ' + fname)
