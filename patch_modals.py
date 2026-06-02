import re

def patch_modals(path):
    print(f"Patching {path}")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to match <div className="modal-overlay" onClick={...}> and remove the onClick
    # Also matches className="modal-overlay z-[100]" and similar
    # We want to replace <div className="modal-overlay..." onClick={...}> with <div className="modal-overlay...">
    
    # Matches <div className="modal-overlay[any characters]" onClick={...}>
    pattern = r'(<div\s+className="modal-overlay[^"]*")\s+onClick=\{[^}]+\}\s*>'
    new_content = re.sub(pattern, r'\1>', content)
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully patched {path}")
    else:
        print(f"No changes made to {path}")

patch_modals(r'C:\Users\keine\.gemini\antigravity\scratch\checkadmin\frontend\src\pages\Production.jsx')
patch_modals(r'C:\Users\keine\.gemini\antigravity\scratch\checkadmin\frontend\src\pages\Inventory.jsx')
