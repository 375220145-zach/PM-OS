#!/usr/bin/env python3
"""Extract embedded images from 知识库.xlsx and save as PNG files.

Usage: python3 extract-kb-images.py
Output: ./public/kb-images/row_XX.png
"""

import os
import sys
from openpyxl import load_workbook
from PIL import Image
import io

EXCEL_PATH = os.path.expanduser('~/Desktop/蓝深/知识库.xlsx')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../public/kb-images')

def main():
    print(f'Loading: {EXCEL_PATH}')
    wb = load_workbook(EXCEL_PATH)
    ws = wb['知识库']

    images = ws._images
    print(f'Found {len(images)} embedded images')

    if not images:
        print('No images to extract.')
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Build row→image mapping by checking image anchor positions
    # openpyxl images have anchor._from.row (0-indexed)
    extracted = 0
    for i, img in enumerate(images):
        try:
            # Get image data
            img_data = img._data()

            # Try to determine row from anchor
            row_idx = None
            if hasattr(img, 'anchor') and hasattr(img.anchor, '_from'):
                anchor = img.anchor._from
                if hasattr(anchor, 'row'):
                    row_idx = anchor.row  # 0-indexed
                elif hasattr(anchor, 'col'):
                    # Not a cell anchor — might be absolute anchor
                    pass

            if row_idx is not None:
                # Excel row number = 0-indexed anchor.row + 1
                excel_row = row_idx + 1
                filename = f'row_{excel_row:02d}.png'
            else:
                filename = f'image_{i:02d}.png'

            filepath = os.path.join(OUTPUT_DIR, filename)

            # Convert to PNG and save
            image = Image.open(io.BytesIO(img_data))
            image.save(filepath, 'PNG')
            print(f'  [{i}] → {filename} ({image.size[0]}x{image.size[1]})')
            extracted += 1
        except Exception as e:
            print(f'  [{i}] ERROR: {e}')

    print(f'\nExtracted {extracted} images to {OUTPUT_DIR}')

if __name__ == '__main__':
    main()
