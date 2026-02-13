
import re

def check_parens(filepath):
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
                stack.pop()
    
    if stack:
        print(f"Unclosed parens opened at lines: {stack}")
    else:
        print("All parens balanced")

if __name__ == "__main__":
    check_parens('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
