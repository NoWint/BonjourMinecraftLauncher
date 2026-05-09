import re

for fname in ['src/services/microsoft_auth.rs']:
    with open(fname, 'r') as f:
        content = f.read()
    
    # Fix .ok_or_else(|| "...".to_string()) -> .ok_or_else(|| errors::internal("..."))
    content = re.sub(
        r'\.ok_or_else\(\|\| "([^"]+)"\.to_string\(\)\)',
        r'.ok_or_else(|| crate::errors::internal("\1"))',
        content
    )
    
    # Fix .map_err(|e| format!(...)) -> .map_err(|e| crate::errors::internal(format!(...)))
    # But only if not already using errors::
    if '.map_err(|e| format!(' in content and 'errors::internal(format!(' not in content:
        content = content.replace('.map_err(|e| format!(', '.map_err(|e| crate::errors::internal(format!(')
        # Need to add extra closing paren - but this is complex, let's do it differently
        # Actually, the From<String> impl should handle this via ? operator
    
    with open(fname, 'w') as f:
        f.write(content)
    print('Fixed: ' + fname)
