import os
import traceback

path = r'C:\Users\keine\.gemini\antigravity\scratch\checkadmin\frontend\src\pages\Production.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

try:
    # 1. Import
    if 'AdvanceStageModal' not in content:
        content = content.replace("import { toast } from 'react-hot-toast';", "import { toast } from 'react-hot-toast';\nimport AdvanceStageModal from '../components/AdvanceStageModal';")

    # 2. Add state
    if 'advancingOrder' not in content:
        content = content.replace("const [uploading, setUploading] = useState(false);", "const [uploading, setUploading] = useState(false);\n  const [advancingOrder, setAdvancingOrder] = useState(null);")

    # 3. Modify OrderCard advance button
    # The original is: advanceOrder(o.id || o._id, nextStage)
    # We want to change the prop in OrderCard from advanceOrder to onOpenAdvance and call that
    # But wait, OrderCard is defined at the top. Let's just modify the OrderCard definition.
    content = content.replace(
        "advanceOrder(o.id || o._id, nextStage)",
        "setAdvancingOrder({ order: o, nextStage })"
    )
    
    # We must also pass setAdvancingOrder to OrderCard if it is passed from parent.
    # Ah! In Production, it renders `<OrderCard key={o.id} o={o} stages={stages} ... advanceOrder={advanceOrder} ... />`
    # Let's change `advanceOrder={advanceOrder}` to `advanceOrder={advanceOrder} setAdvancingOrder={setAdvancingOrder}`
    content = content.replace("advanceOrder={advanceOrder}", "advanceOrder={advanceOrder} setAdvancingOrder={setAdvancingOrder}")
    
    # And in OrderCard props:
    content = content.replace("advanceOrder, expandedOrder", "advanceOrder, setAdvancingOrder, expandedOrder")

    # 4. Insert Modal at the end of the return statement
    modal_jsx = """
      {advancingOrder && (
        <AdvanceStageModal 
          order={advancingOrder.order}
          currentStage={advancingOrder.order.stage}
          nextStage={advancingOrder.nextStage}
          onClose={() => setAdvancingOrder(null)}
          onAdvance={(orderId, nextStage, data) => {
            setAdvancingOrder(null);
            advanceOrder(orderId, nextStage, data);
          }}
        />
      )}
    """
    
    if "AdvanceStageModal" not in content.split("return (")[1]:
        # Insert before the last </div>
        last_div_idx = content.rfind("</div>")
        content = content[:last_div_idx] + modal_jsx + content[last_div_idx:]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully patched Production.jsx for AdvanceStageModal")
except Exception as e:
    traceback.print_exc()
