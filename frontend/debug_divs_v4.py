
import re

def debug_nesting_v4(filepath):
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
        if type == 'open':
            stack.append((line_no, pos))
        else:
            if not stack:
                print(f"Extra closing div at line {line_no} ({text})")
            else:
                last_open_line, _ = stack.pop()
                # Print any close that happens MUCH later than its open
                if line_no - last_open_line > 100:
                    print(f"Line {line_no} closes div from line {last_open_line} (LARGE GAP)")
    
    for line_no, pos in stack:
        print(f"Unclosed div opened at line {line_no}")

if __name__ == "__main__":
    debug_nesting_v4('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
