import re

with open('src/services/microsoft_auth.rs', 'r') as f:
    content = f.read()

# The problem: .map_err(|e| crate::errors::internal(format!("...: {}", e))?;
# needs to be: .map_err(|e| crate::errors::internal(format!("...: {}", e)))?;
# i.e., we need an extra ) before the ?;

# Fix: replace ))?; with )))?; where the pattern is errors::internal(format!(...))
# Currently: errors::internal(format!("...", e))?;  -> missing one )
# Should be: errors::internal(format!("...", e)))?;

# Find all lines with errors::internal(format! and fix the closing parens
lines = content.split('\n')
fixed_lines = []
for line in lines:
    if 'errors::internal(format!(' in line and '))?' in line:
        # Count the depth of parens from the start of errors::internal(
        idx = line.find('errors::internal(')
        if idx >= 0:
            # Find the closing paren for errors::internal(
            depth = 0
            start = idx + len('errors::internal(')
            for i in range(start, len(line)):
                if line[i] == '(':
                    depth += 1
                elif line[i] == ')':
                    depth -= 1
                    if depth < 0:
                        # This closes errors::internal(
                        # Check what comes after
                        rest = line[i+1:]
                        if rest.lstrip().startswith('?'):
                            # Missing closing paren for Err(
                            line = line[:i+1] + ')' + line[i+1:]
                        break
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)

with open('src/services/microsoft_auth.rs', 'w') as f:
    f.write(content)

# Verify
with open('src/services/microsoft_auth.rs', 'r') as f:
    content = f.read()
opens = content.count('(')
closes = content.count(')')
print('Parens: ( = {}, ) = {}'.format(opens, closes))
