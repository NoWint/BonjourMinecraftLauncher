import re

for fname in ['src/services/world.rs', 'src/services/java_detector.rs']:
    with open(fname, 'r') as f:
        content = f.read()
    
    # Fix Err("...".to_string()) -> Err(crate::errors::internal("..."))
    content = re.sub(
        r'Err\("([^"]+)"\.to_string\(\)\)',
        r'Err(crate::errors::internal("\1"))',
        content
    )
    
    # Fix Err(format!(...)) -> Err(crate::errors::internal(format!(...)))
    # But need to handle the extra closing paren
    # Find lines with Err(format!( and not already using errors::internal
    if 'Err(format!(' in content and 'errors::internal(format!(' not in content:
        lines = content.split('\n')
        fixed_lines = []
        for line in lines:
            if 'Err(format!(' in line and 'errors::internal' not in line:
                line = line.replace('Err(format!(', 'Err(crate::errors::internal(format!(')
                # Need to add extra ) before the ? or ;
                # Find the closing )) and add one more )
                line = re.sub(r'\)\)\?', r')))?', line)
            fixed_lines.append(line)
        content = '\n'.join(fixed_lines)
    
    with open(fname, 'w') as f:
        f.write(content)
    print('Fixed: ' + fname)
