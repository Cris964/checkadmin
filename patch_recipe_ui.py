import os
import traceback

path = r'C:\Users\keine\.gemini\antigravity\scratch\checkadmin\frontend\src\pages\Production.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

try:
    start_str = '<div className="border-t pt-3">\n                <p className="text-sm font-semibold mb-2">Ingredientes ({recipeForm.ingredients.length})</p>'
    start_idx = content.find(start_str)
    
    end_str = 'Añadir</button>\n                </div>'
    if end_str not in content:
        # Fallback to just "Añadir</button>"
        end_idx = content.find('Añadir</button>') + len('Añadir</button>')
        end_idx = content.find('</div>', end_idx) + 6
    else:
        end_idx = content.find(end_str) + len(end_str)
        
    ingredients_block = content[start_idx:end_idx]
    
    packaging_block = ingredients_block.replace(
        'Ingredientes ({recipeForm.ingredients.length})', 
        'Materiales de Empaque ({recipeForm.packaging_materials.length})'
    )
    packaging_block = packaging_block.replace('recipeForm.ingredients', 'recipeForm.packaging_materials')
    packaging_block = packaging_block.replace('newIngredient', 'newPackaging')
    packaging_block = packaging_block.replace('addIngredient', 'handleAddPackaging')
    packaging_block = packaging_block.replace('handleAddIngredient', 'handleAddPackaging')
    packaging_block = packaging_block.replace('Añadir material...', 'Añadir empaque...')
    
    new_content = content[:end_idx] + '\n\n                {/* EMPAQUE */}\n                ' + packaging_block + content[end_idx:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully duplicated ingredients UI for packaging_materials.")
except Exception as e:
    traceback.print_exc()
