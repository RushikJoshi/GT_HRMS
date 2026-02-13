
import re

def check_nesting_with_lines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    stack = []
    for line_no, line in enumerate(lines, 1):
        tokens = re.findall(r'<div|</div', line)
        for token in tokens:
            if token == '<div':
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
    check_nesting_with_lines('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
