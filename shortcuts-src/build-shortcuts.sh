#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/shortcuts-dist"
CHERRI_BIN="${CHERRI_BIN:-/opt/homebrew/bin/cherri}"

if [[ ! -x "${CHERRI_BIN}" ]]; then
  echo "cherri executable not found: ${CHERRI_BIN}" >&2
  echo "Set CHERRI_BIN=/path/to/cherri or install cherri before building." >&2
  exit 1
fi

mkdir -p "${DIST_DIR}"

build_shortcut() {
  local source_file="$1"
  local output_name="$2"
  local source_path="${SCRIPT_DIR}/${source_file}"
  local output_path="${DIST_DIR}/${output_name}"

  if [[ ! -f "${source_path}" ]]; then
    echo "Source file not found: ${source_path}" >&2
    exit 1
  fi

  echo "Building ${source_file} -> shortcuts-dist/${output_name}"
  "${CHERRI_BIN}" "${source_path}" \
    --output="${output_path}" \
    --share=anyone \
    --no-ansi
}

build_shortcut "ask-my-marginnote.cherri" "问问我的MarginNote.shortcut"
build_shortcut "collect-to-marginnote.cherri" "收藏到MarginNote.shortcut"
build_shortcut "export-current-tree.cherri" "导出当前知识树.shortcut"

find "${SCRIPT_DIR}" "${DIST_DIR}" -name "*_unsigned.shortcut" -type f -delete

echo "Done. Shortcuts are signed for Anyone."
