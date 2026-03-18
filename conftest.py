import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env so DEVELOPER_USER, DEVELOPER_PASSWORD, DEVELOPER_DB are available.
# override=False means real env vars (e.g. CI) take precedence.
load_dotenv(Path(__file__).parent / ".env", override=False)

sys.path.insert(0, str(Path(__file__).parent / "prefect_workflows"))