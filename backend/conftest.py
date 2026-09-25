import sys
from pathlib import Path

# Ensure repo root is available in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Evict any namespace 'rag' module if present
if "rag" in sys.modules and not hasattr(sys.modules["rag"], "__file__"):
    sys.modules.pop("rag", None)
