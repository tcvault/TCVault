#!/usr/bin/env bash
set -euo pipefail

source_repo="${1:-$(pwd)}"
target_dir="${2:-${source_repo%/}-local-copy}"

if [ ! -d "$source_repo/.git" ]; then
  echo "Error: source path '$source_repo' is not a git repository." >&2
  exit 1
fi

if [ -e "$target_dir" ]; then
  echo "Error: target path '$target_dir' already exists." >&2
  exit 1
fi

echo "Creating local copy from '$source_repo' to '$target_dir'..."
git clone --no-hardlinks "$source_repo" "$target_dir"
echo "Done. Local copy created at: $target_dir"
