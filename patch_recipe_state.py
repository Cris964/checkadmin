import re
import os

path = r'C:\Users\keine\.gemini\antigravity\scratch\checkadmin\frontend\src\pages\Production.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update recipeForm initialization
content = content.replace("ingredients: [] }", "ingredients: [], packaging_materials: [] }")
content = content.replace("ingredients: recipe.ingredients || []", "ingredients: recipe.ingredients || [], packaging_materials: recipe.packaging_materials || []")

# 2. Add newPackaging state
new_ing_state = "const [newIngredient, setNewIngredient] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'kg' });"
new_pkg_state = "const [newPackaging, setNewPackaging] = useState({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'unidades', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'unidades' });"
if new_pkg_state not in content:
    content = content.replace(new_ing_state, new_ing_state + "\n  " + new_pkg_state)

# 3. Add handleAddPackaging
add_ing_func = """  const handleAddIngredient = () => {
    if (!newIngredient.raw_material_id) return toast.error('Selecciona un material');
    if (!newIngredient.quantity || isNaN(newIngredient.quantity)) return toast.error('Ingresa una cantidad vlida');
    setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { ...newIngredient, quantity: parseFloat(newIngredient.quantity) || 0 }] });
    setNewIngredient({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'kg', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'kg' });
  };"""
  
add_pkg_func = """  const handleAddPackaging = () => {
    if (!newPackaging.raw_material_id) return toast.error('Selecciona un empaque');
    if (!newPackaging.quantity || isNaN(newPackaging.quantity)) return toast.error('Ingresa una cantidad vlida');
    setRecipeForm({ ...recipeForm, packaging_materials: [...recipeForm.packaging_materials, { ...newPackaging, quantity: parseFloat(newPackaging.quantity) || 0 }] });
    setNewPackaging({ raw_material_id: '', raw_material_name: '', quantity: '', unit: 'unidades', purchase_price: 0, purchase_quantity: 1, purchase_unit: 'unidades' });
  };"""

if "handleAddPackaging" not in content:
    content = content.replace(add_ing_func, add_ing_func + "\n" + add_pkg_func)
    # Handle possible encoding issues with valid/valida in string replacement
    content = re.sub(
        r"(const handleAddIngredient = \(\) => \{[\s\S]*?setNewIngredient[\s\S]*?\};\n)",
        r"\1\n" + add_pkg_func.replace('vlida', 'válida') + "\n",
        content
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched basic Recipe state and functions.")
