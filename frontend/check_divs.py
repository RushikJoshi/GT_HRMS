
import re

def check_nesting(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tokens = re.findall(r'<div|</div', content)
    stack = []
    for i, token in enumerate(tokens):
        if token == '<div':
            stack.append(i)
        else:
            if not stack:
                print(f"Extra closing div at token {i}")
            else:
                stack.pop()
    
    if stack:
        print(f"Unclosed divs at tokens: {stack}")
    else:
        print("All divs balanced")

if __name__ == "__main__":
    check_nesting('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
