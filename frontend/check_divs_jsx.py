
import re

def check_div_balance_jsx(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    
    # Track nesting
    stack = []
    # Match all <div ... > or <div ... /> or </div>
    # Using a simple state machine or finding all tags
    tags = re.finditer(r'<(/?div|div.*?(/?))> ', content, re.DOTALL)
    
    # Actually, let's just use a more targeted approach for Applicants.jsx
    opens = 0
    closes = 0
    
    # Find all <div
    for m in re.finditer(r'<div[\s>]', content):
        # Check if it's self-closing
        # Look ahead for the next >
        end_pos = content.find('>', m.start())
        if end_pos != -1:
            if content[end_pos-1] == '/':
                # Self-closing
                continue
            else:
                opens += 1
                line_no = content.count('\n', 0, m.start()) + 1
                stack.append(line_no)
    
    # Find all </div
    for m in re.finditer(r'</div[\s>]', content):
        closes += 1
        if stack:
            stack.pop()
    
    print(f"Opens: {opens}, Closes: {closes}")
    if stack:
        print(f"Unclosed divs opened at lines: {stack}")
    else:
        print("Balanced")

if __name__ == "__main__":
    check_div_balance_jsx('c:/HRMS/frontend/src/pages/HR/Applicants.jsx')
