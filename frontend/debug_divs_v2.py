
import re

def debug_nesting_v2(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    opens = list(re.finditer(r'<div[\s>]', content))
    closes = list(re.finditer(r'</div[\s>]', content))
    
    events = []
    for m in opens:
        events.append((m.start(), 'open', m.group()))
    for m in closes:
        events.append((m.start(), 'close', m.group()))
    
    events.sort()
    
    stack = []
    for pos, type, text in events:
        line_no = content.count('\n', 0, pos) + 1
        if line_no == 2819:
            print(f"DEBUG: Found close at 2819: {text}")
        if type == 'open':
            stack.append((line_no, pos))
        else:
            if not stack:
                print(f"Extra closing div at line {line_no} ({text})")
            else:
                last_open_line, _ = stack.pop()
                if line_no > 2800:
                    print(f"DEBUG: Line {line_no} closed div from line {last_open_line}")
    
    for line_no, pos in stack:
        print(f"Unclosed div opened at line {line_no}")

if __name__ == "__main__":
    debug_nesting_v2('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
