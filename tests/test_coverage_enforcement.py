from pathlib import Path
import pytest

FLOWS_DIR = Path("prefect_workflows/flows")
TESTS_DIR = Path("tests/test_flows")

EXCLUDED_FLOWS = {
    "__init__.py",
    "airports_extract.py",
    "flights_capture.py"
}


def get_flow_files() -> list[Path]:
    return [
        f
        for f in FLOWS_DIR.rglob("*.py")
        if f.name not in EXCLUDED_FLOWS and not f.name.startswith("_")
    ]


def get_test_files() -> set[str]:
    return {f.name for f in TESTS_DIR.rglob("test_*.py")}


class TestFlowCoverage:
    def test_every_flow_has_a_test_file(self):
        """
        Every file in prefect/flows/ must have a corresponding
        test_<filename> in tests/prefect/.

        If this fails, create the missing test file first.
        """
        flow_files = get_flow_files()
        test_files = get_test_files()

        missing = []
        for flow_file in flow_files:
            expected_test = f"test_{flow_file.name}"
            if expected_test not in test_files:
                missing.append(f"  tests/tests_prefect_workflows/test_{flow_file.name}")

        if missing:
            pytest.fail(
                "\nFlows missing test files:\n" + "\n".join(missing), pytrace=False
            )
