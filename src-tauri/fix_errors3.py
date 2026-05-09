import re

for fname in ['src/commands/modpack.rs', 'src/services/microsoft_auth.rs', 'src/commands/server.rs']:
    with open(fname, 'r') as f:
        content = f.read()
    
    # Fix: errors::internal(format!(...)); -> errors::internal(format!(...)));
    # Match the pattern where format! has simple content (no nested parens in the format string)
    content = re.sub(
        r'errors::internal\(format!\(([^)]+)\)\);',
        r'errors::internal(format!(\1)));',
        content
    )
    
    # Also fix errors::internal("..."); -> errors::internal("..."));
    content = re.sub(
        r'errors::internal\("([^"]+)"\);',
        r'errors::internal("\1"));',
        content
    )
    
    # Also fix errors::internal(e.to_string()); -> errors::internal(e.to_string()));
    content = re.sub(
        r'errors::internal\(e\.to_string\(\)\);',
        r'errors::internal(e.to_string()));',
        content
    )
    
    with open(fname, 'w') as f:
        f.write(content)
    print('Fixed: ' + fname)
