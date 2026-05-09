import re

for fname in ['src/commands/modpack.rs', 'src/services/microsoft_auth.rs', 'src/commands/server.rs', 'src/commands/advanced.rs']:
    try:
        with open(fname, 'r') as f:
            content = f.read()
        
        # Fix missing closing paren in Err(errors::internal(format!(...))
        # Pattern: Err(errors::internal(format!(...))  -> should be Err(errors::internal(format!(...)))
        # We look for lines with unbalanced parens in Err() expressions
        
        lines = content.split('\n')
        fixed_lines = []
        for line in lines:
            if 'Err(errors::internal(' in line:
                # Count parens after Err(
                err_idx = line.find('Err(errors::internal(')
                depth = 0
                start = err_idx + 4  # after "Err("
                for i in range(start, len(line)):
                    if line[i] == '(':
                        depth += 1
                    elif line[i] == ')':
                        depth -= 1
                        if depth == 0:
                            break
                
                if depth != 0:
                    # Unbalanced - add closing paren before the semicolon or end
                    line = line.rstrip()
                    if line.endswith(';'):
                        line = line[:-1] + ');'
                    else:
                        line += ')'
            
            fixed_lines.append(line)
        
        content = '\n'.join(fixed_lines)
        
        with open(fname, 'w') as f:
            f.write(content)
        
        # Verify balance
        opens = content.count('{')
        closes = content.count('}')
        print(fname + ': braces {{ = ' + str(opens) + ' }} = ' + str(closes))
        
    except FileNotFoundError:
        print('Not found: ' + fname)
