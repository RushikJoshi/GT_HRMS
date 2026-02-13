
import re

def check_nesting_robust(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Match <div followed by space or >
    opens = list(re.finditer(r'<div[\s>]', content))
    # Match </div followed by space or >
    closes = list(re.finditer(r'</div[\s>]', content))
    
    events = []
    for m in opens:
        events.append((m.start(), 'open'))
    for m in closes:
        events.append((m.start(), 'close'))
    
    events.sort()
    
    stack = []
    for pos, type in events:
        # Find line number for pos
        line_no = content.count('\n', 0, pos) + 1
        if type == 'open':
            stack.append(line_no)
        else:
            if not stack:
                print(f"Extra closing div at line {line_no}")
            else:
                stack.pop()
    
    if stack:
        print(f"Unclosed divs opened at lines: {stack}")
    else:
        print("All divs balanced")

if __name__ == "__main__":
    check_nesting_robust('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
