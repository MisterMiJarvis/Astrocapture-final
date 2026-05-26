#!/usr/bin/env python3
"""
Image Optimizer for AstroCapture
Converts gallery images to WebP for better loading performance.

Usage:
  python3 optimize-images.py --scan          # Scan and report image sizes
  python3 optimize-images.py --convert       # Convert images to WebP
  python3 optimize-images.py --clean       # Remove original images after conversion
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from PIL import Image

# Directories to scan
IMAGE_DIRS = [
    "/home/ubuntu/astrocapture/public/uploads",
    "/home/ubuntu/astrocapture/public/images",
]

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif'}

def get_image_size(filepath):
    """Get file size in KB."""
    return os.path.getsize(filepath) / 1024

def scan_images():
    """Scan all images and report sizes."""
    print("🔍 Scanning images...\n")
    
    total_size = 0
    total_files = 0
    large_files = []
    
    for img_dir in IMAGE_DIRS:
        dir_path = Path(img_dir)
        if not dir_path.exists():
            continue
        
        for ext in SUPPORTED_EXTENSIONS:
            for filepath in dir_path.rglob(f"*{ext}"):
                size_kb = get_image_size(filepath)
                total_size += size_kb
                total_files += 1
                
                if size_kb > 500:  # Flag images > 500KB
                    large_files.append((filepath, size_kb))
    
    print(f"📊 Found {total_files} images, total: {total_size/1024:.1f} MB")
    
    if large_files:
        print(f"\n⚠️  {len(large_files)} images > 500KB (candidates for optimization):")
        for filepath, size in sorted(large_files, key=lambda x: x[1], reverse=True)[:10]:
            print(f"   {filepath}: {size:.0f} KB")
    
    return total_files, total_size

def convert_to_webp(filepath, quality=85):
    """Convert an image to WebP format."""
    try:
        webp_path = filepath.with_suffix('.webp')
        
        with Image.open(filepath) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if image is very large (max 2000px on longest side)
            max_size = 2000
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            img.save(webp_path, 'WEBP', quality=quality, method=6)
        
        original_size = get_image_size(filepath)
        webp_size = get_image_size(webp_path)
        savings = (original_size - webp_size) / original_size * 100
        
        print(f"✅ {filepath.name}: {original_size:.0f}KB → {webp_size:.0f}KB ({savings:.0f}% reduction)")
        return webp_path, savings
    
    except Exception as e:
        print(f"❌ Failed to convert {filepath}: {e}")
        return None, 0

def convert_all_images(dry_run=True):
    """Convert all supported images to WebP."""
    print(f"🚀 {'DRY RUN - ' if dry_run else ''}Converting images to WebP...\n")
    
    converted = 0
    total_savings = 0
    
    for img_dir in IMAGE_DIRS:
        dir_path = Path(img_dir)
        if not dir_path.exists():
            continue
        
        for ext in SUPPORTED_EXTENSIONS:
            for filepath in dir_path.rglob(f"*{ext}"):
                # Skip if WebP already exists
                webp_path = filepath.with_suffix('.webp')
                if webp_path.exists():
                    continue
                
                if dry_run:
                    print(f"   [DRY RUN] Would convert: {filepath}")
                    converted += 1
                else:
                    _, savings = convert_to_webp(filepath)
                    if savings > 0:
                        converted += 1
                        total_savings += savings
    
    print(f"\n{'='*50}")
    print(f"{'DRY RUN - ' if dry_run else ''}Converted {converted} images")
    if not dry_run:
        print(f"Average savings: {total_savings/converted:.0f}%" if converted else "No images converted")
    print(f"{'='*50}")

def clean_originals():
    """Remove original images after WebP conversion."""
    print("🧹 Removing original images (keeping WebP versions)...\n")
    
    removed = 0
    for img_dir in IMAGE_DIRS:
        dir_path = Path(img_dir)
        if not dir_path.exists():
            continue
        
        for ext in SUPPORTED_EXTENSIONS:
            for filepath in dir_path.rglob(f"*{ext}"):
                webp_path = filepath.with_suffix('.webp')
                if webp_path.exists():
                    os.remove(filepath)
                    removed += 1
                    print(f"   Removed: {filepath}")
    
    print(f"\n✅ Removed {removed} original images")

def main():
    parser = argparse.ArgumentParser(description='Optimize AstroCapture images')
    parser.add_argument('--scan', action='store_true', help='Scan and report image sizes')
    parser.add_argument('--convert', action='store_true', help='Convert images to WebP')
    parser.add_argument('--clean', action='store_true', help='Remove original images')
    parser.add_argument('--quality', type=int, default=85, help='WebP quality (1-100)')
    
    args = parser.parse_args()
    
    if not (args.scan or args.convert or args.clean):
        parser.print_help()
        sys.exit(1)
    
    if args.scan:
        scan_images()
    
    if args.convert:
        # Auto-proceed without prompt for non-interactive use
        print("🚀 Converting images to WebP...")
        convert_all_images(dry_run=False)
    
    if args.clean:
        print("🧹 Removing original images (keeping WebP versions)...")
        clean_originals()

if __name__ == '__main__':
    main()
