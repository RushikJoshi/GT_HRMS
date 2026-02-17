
import re

def debug_parens(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tokens = re.finditer(r'\(|\)', content)
    stack = []
    for m in tokens:
        line_no = content.count('\n', 0, m.start()) + 1
        if m.group() == '(':
            stack.append(line_no)
        else:
            if not stack:
                print(f"Extra closing paren at line {line_no}")
            else:
                last_open = stack.pop()
                if line_no > 2200 and line_no < 2230:
                    print(f"Line {line_no} closes paren from line {last_open}")
    
    for line_no in stack:
        print(f"Unclosed paren opened at line {line_no}")

if __name__ == "__main__":
    debug_parens('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
