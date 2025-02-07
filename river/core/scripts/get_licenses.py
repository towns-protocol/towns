#! /usr/bin/env python3

import os
import re
import json
import subprocess
import csv
import sys
import argparse


def parse_args():
    parser = argparse.ArgumentParser(description='List licenses of Go module dependencies')
    parser.add_argument('--show-path', action='store_true',
                       help='Show path to license files in output')
    return parser.parse_args()


def parse_go_mod(go_mod_path):
    """
    Parse the go.mod file to extract direct dependencies (not marked as indirect).
    Returns a list of module names.
    """
    direct_deps = []
    in_require_block = False
    try:
        with open(go_mod_path, 'r') as f:
            for line in f:
                stripped = line.strip()
                # Check for the start of a require block
                if stripped.startswith('require ('):
                    in_require_block = True
                    continue
                if in_require_block:
                    if stripped == ')':
                        in_require_block = False
                        continue
                    # A typical line: github.com/stretchr/testify v1.7.0 // indirect
                    m = re.match(r'(\S+)\s+(\S+)(?:\s+//\s*(.*))?', stripped)
                    if m:
                        mod, ver, comment = m.groups()
                        if comment and 'indirect' in comment:
                            continue
                        direct_deps.append(mod)
                else:
                    # Handle single-line require directives
                    if stripped.startswith('require '):
                        # e.g. require github.com/something v1.0.0
                        parts = stripped.split()
                        if len(parts) >= 3:
                            mod = parts[1]
                            comment = ' '.join(parts[3:]) if len(parts) > 3 else ''
                            if 'indirect' in comment:
                                continue
                            direct_deps.append(mod)
    except Exception as e:
        sys.stderr.write(f"Error reading {go_mod_path}: {e}\n")
        sys.exit(1)
    # Remove duplicates
    return list(set(direct_deps))


def get_module_dir(module):
    """
    Use 'go mod download -json <module>' to get the directory where the module is downloaded.
    Returns the directory path, or None on error.
    """
    try:
        result = subprocess.run(['go', 'mod', 'download', '-json', module], capture_output=True, text=True)
        if result.returncode != 0:
            sys.stderr.write(f"Error downloading module {module}: {result.stderr}\n")
            return None
        info = json.loads(result.stdout)
        return info.get('Dir')
    except Exception as e:
        sys.stderr.write(f"Exception for module {module}: {e}\n")
        return None


def find_license_file(module_dir):
    """
    Search for a file whose name starts with 'LICENSE' or 'COPYING' (case-insensitive) in the given directory.
    Returns the full path of the license file if found, else None.
    """
    try:
        for entry in os.listdir(module_dir):
            entry_lower = entry.lower()
            if entry_lower.startswith('license') or entry_lower == 'copying':
                return os.path.join(module_dir, entry)
    except Exception as e:
        sys.stderr.write(f"Error reading directory {module_dir}: {e}\n")
    return None


def guess_license(license_text):
    """
    Attempt to guess the license type from the text of the license file.
    Returns a string representing the license, or 'UNKNOWN' if not determined.
    """
    text = license_text.strip()
    if 'The Go Authors. All rights reserved.' in text or re.search(r'Copyright\s+\d+\s+The Go Authors', text):
        return 'BSD-3-Clause'
    if 'MIT License' in text or 'Permission is hereby granted, free of charge' in text:
        return 'MIT'
    if 'Apache License' in text:
        if 'Version 2.0' in text:
            return 'Apache-2.0'
        else:
            return 'Apache'
    if 'Mozilla Public License' in text:
        m = re.search(r'Mozilla Public License.*?Version\s+([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        if m:
            return 'MPL ' + m.group(1)
        else:
            return 'MPL'
    if re.search(r'GNU GENERAL PUBLIC LICENSE', text, re.IGNORECASE):
        # Look for first instance of Version after GPL, even if on next line
        m = re.search(r'Version\s+([\d\.]+)', text, re.IGNORECASE)
        if m:
            return 'GPL ' + m.group(1)
        else:
            return 'GPL'
    if 'BSD' in text:
        return 'BSD'
    return 'UNKNOWN'


def process_dependencies(go_mod_path):
    deps = parse_go_mod(go_mod_path)
    results = []

    for mod in deps:
        license_type = 'UNKNOWN'
        license_path = ''
        module_dir = get_module_dir(mod)
        if module_dir:
            license_file = find_license_file(module_dir)
            if license_file and os.path.isfile(license_file):
                try:
                    with open(license_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        license_type = guess_license(content)
                        license_path = license_file
                except Exception as e:
                    sys.stderr.write(f"Error reading license file for module {mod}: {e}\n")
        results.append((mod, license_type, license_path))
    return results


def output_csv(results, show_path=False):
    writer = csv.writer(sys.stdout)
    # Write header
    headers = ['Library', 'License']
    if show_path:
        headers.append('License File')
    writer.writerow(headers)
    
    for row in results:
        if show_path:
            writer.writerow(row)
        else:
            writer.writerow(row[:2])  # Only output library and license


def main():
    args = parse_args()
    
    # Assume go.mod is in the current directory
    go_mod_path = 'go.mod'
    if not os.path.isfile(go_mod_path):
        sys.stderr.write('go.mod not found in the current directory.\n')
        sys.exit(1)

    results = process_dependencies(go_mod_path)
    output_csv(results, show_path=args.show_path)


if __name__ == '__main__':
    main()
