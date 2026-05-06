"""One-off script to remove all rows with a specific label from the dynamic signs CSV."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DYNAMIC_CSV = BASE_DIR / "data" / "dynamic_signs.csv"

# Label to remove: ൺ (U+0D7A); also match with leading zero-width spaces (U+200B) if present
TARGET_LABEL_EXACT = "\u200b\u200b\u0d7a"  # '\u200b\u200bൺ'
TARGET_LABEL_STRIPPED = "\u0d7a"  # 'ൺ' (as stored in CSV when zwsp not saved)

def main() -> None:
    if not DYNAMIC_CSV.exists():
        print(f"File not found: {DYNAMIC_CSV}")
        return

    df = pd.read_csv(DYNAMIC_CSV)
    # Last column is 'label'
    label_col = "label"
    if label_col not in df.columns:
        print(f"Column '{label_col}' not found. Columns: {list(df.columns[-3:])}")
        return

    before = len(df)
    # Remove rows matching either form of the label (with or without zero-width spaces)
    to_drop = (df[label_col] == TARGET_LABEL_EXACT) | (df[label_col] == TARGET_LABEL_STRIPPED)
    n_removed = to_drop.sum()

    df_new = df[~to_drop]
    after = len(df_new)

    df_new.to_csv(DYNAMIC_CSV, index=False)
    print(f"Removed {n_removed} row(s) with label (U+200B U+200B U+0D7A)")
    print(f"Rows: {before} -> {after}")

if __name__ == "__main__":
    main()
