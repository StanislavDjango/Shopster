"""
Run pre-commit in an ephemeral git worktree.

This avoids touching the developer's working copy while still exercising
all hooks over the repository.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], cwd: Path) -> None:
    subprocess.run(cmd, cwd=cwd, check=True)


def main() -> None:
    worktree_dir = Path(
        tempfile.mkdtemp(prefix="precommit-safe-", dir=None)
    ).resolve()
    exit_code = 0
    try:
        run(["git", "worktree", "add", "--force", str(worktree_dir), "HEAD"], REPO_ROOT)
        result = subprocess.run(
            [sys.executable, "-m", "pre_commit", "run", "--all-files"],
            cwd=worktree_dir,
        )
        exit_code = result.returncode
        if exit_code != 0:
            diff = subprocess.run(
                ["git", "diff"], cwd=worktree_dir, check=True, capture_output=True
            )
            if diff.stdout:
                tmp_dir = REPO_ROOT / "tmp"
                tmp_dir.mkdir(exist_ok=True)
                patch_path = tmp_dir / "precommit-safe.patch"
                patch_path.write_bytes(diff.stdout)
                print(
                    f"[pre-commit-safe] Hooks modified files. Patch saved to {patch_path}."
                )
            else:
                print(
                    "[pre-commit-safe] Hooks failed but no diff was produced. "
                    "Check hook output above."
                )
    finally:
        run(["git", "worktree", "remove", "--force", str(worktree_dir)], REPO_ROOT)
        shutil.rmtree(worktree_dir, ignore_errors=True)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
