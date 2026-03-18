"""
Test that the repository folder structure is correct.
Catches accidental commits of junk/personal directories.
"""

from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]

ALLOWED_TOP_LEVEL_DIRS = {
    "data",
    "docker",
    "frontend",
    "logs",
    "prefect_workflows",
    "shared",
    "src",
    "tests",
}

# Dirs that may exist locally but are gitignored / not present in CI.
# Tolerated if found, but never required.
GENERATED_TOP_LEVEL_DIRS = {
    # build / packaging artefacts
    "capstone.egg-info",
    "dist",
    "build",
    # virtual environments
    "env",
    "venv",
    # database volumes (local docker)
    "postgres_data",
    "redis_data",
    # misc ignored folders
    "notebooks",
    "bin",
    "secrets",  # gitignored — exists locally only
}

# ── Required sub-directory trees ─────────────────────────────────────────────
REQUIRED_DIRS = [
    # data lake layers
    "data/raw",
    "data/interim",
    "data/processed",
    "data/external",
    # docker service folders
    "docker/api",
    "docker/database",
    "docker/db-init-scripts",
    "docker/flows_package",
    "docker/nginx",
    # frontend source
    "frontend/src",
    "frontend/public",
    # prefect workflow packages
    "prefect_workflows/flows",
    "prefect_workflows/tasks",
    "prefect_workflows/database",
    # application source
    "src/api",
    "src/api/database",
    "src/models",
    # test suites
    "tests/test_api_health",
    "tests/test_flows",
    "tests/test_ingestion",
    "tests/test_transforms",
    # shared utilities
    "shared",
]


class TestTopLevelStructure:
    """No surprise folders should appear at the repo root."""

    def _visible_top_dirs(self) -> set[str]:
        """Return visible (non-hidden, non-generated) top-level directory names."""
        return {
            p.name
            for p in ROOT.iterdir()
            if p.is_dir()
            and not p.name.startswith(".")
            and not p.name.startswith("__")
            and p.name not in GENERATED_TOP_LEVEL_DIRS
        }

    def test_no_unexpected_top_level_dirs(self):
        """
        Only directories listed in ALLOWED_TOP_LEVEL_DIRS should exist at
        the repo root.  Add a directory to that set if it is intentional;
        delete it if it was pushed by mistake.
        """
        actual = self._visible_top_dirs()
        unexpected = actual - ALLOWED_TOP_LEVEL_DIRS

        if unexpected:
            pytest.fail(
                "\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "  UNEXPECTED TOP-LEVEL FOLDER(S) DETECTED\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "\n"
                "  The following folder(s) are not part of the agreed project\n"
                "  structure and should NOT be committed:\n"
                "\n" + "\n".join(f"    📁  {d}/" for d in sorted(unexpected)) + "\n"
                "\n"
                "  Before pushing a new top-level folder you MUST:\n"
                "    1. Discuss the change with your team.\n"
                "    2. Get agreement on its purpose and location.\n"
                "    3. Add it to ALLOWED_TOP_LEVEL_DIRS in\n"
                "       tests/test_folder_structure.py as part of the same PR.\n"
                "\n"
                "  If this folder was added by mistake, remove it with:\n"
                "    git rm -r --cached <folder>/\n"
                "    git commit -m 'Remove <folder> from tracking'\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                pytrace=False,
            )

    def test_all_required_top_level_dirs_present(self):
        """All expected top-level directories must exist."""
        actual = self._visible_top_dirs()
        missing = ALLOWED_TOP_LEVEL_DIRS - actual

        if missing:
            pytest.fail(
                "\nRequired top-level director(ies) are missing:\n"
                + "\n".join(f"  {ROOT / d}" for d in sorted(missing)),
                pytrace=False,
            )


class TestRequiredSubDirectories:
    """Key sub-directories must exist so service code can be located reliably."""

    @pytest.mark.parametrize("rel_path", REQUIRED_DIRS)
    def test_required_dir_exists(self, rel_path: str):
        target = ROOT / rel_path
        assert target.is_dir(), (
            f"Required directory is missing: {target}\n"
            "Either restore it or remove it from REQUIRED_DIRS in "
            "tests/test_folder_structure.py"
        )
