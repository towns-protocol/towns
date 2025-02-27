#!/usr/bin/env python3

import sys
import re
import csv
import argparse
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional, List
import heapq
import signal
import errno
import os

# Prefixes to trim from function names
TRIM_PREFIXES = [
    'github.com/towns-protocol/towns/',
    'github.com/ethereum/',
    'google.golang.org/',
    'golang.org/',
    'github.com/jackc/'
]

# List of functions to filter out when filter_out is True
FILTER_LIST = {
    'core/node/rpc/sync/client.(*SyncerSet).Run',
    'core/node/rpc/sync/client.(*localSyncer).Run',
    'core/node/rpc/sync.(*handlerImpl).SyncStreams',
    'core/node/rpc/sync.(*StreamSyncOperation).Run',
    'x/net/http2.(*clientStream).writeRequest___x/net/http2.(*clientStream).doRequest',
    'sync.runtime_notifyListWait___core/node/rpc/sync/client.(*remoteSyncer).Run',
    'x/net/http2.(*serverConn).serve___net/http.(*conn).serve',
    'internal/poll.runtime_pollWait___x/net/http2.(*serverConn).readFrames',
    'internal/poll.runtime_pollWait___x/net/http2.(*ClientConn).readLoop',
    'internal/poll.runtime_pollWait___net/http.(*http2ClientConn).readLoop',
    'go-ethereum/core.(*txSenderCacher).cache___go-ethereum/core.(*txSenderCacher).cache',
    'core/node/rpc/sync/client.(*remoteSyncer).connectionAlive'
}

def parse_html_stacks(content: str) -> str:
    # Extract all table rows
    rows = re.findall(r'<tr>.*?</tr>', content, re.DOTALL)
    
    text_stacks = []
    for row in rows:
        # Extract cells from the row
        cells = re.findall(r'<td>(.*?)</td>', row, re.DOTALL)
        if len(cells) >= 3:  # Need at least 3 cells (id, header, stack)
            header = cells[1].strip()
            # Replace <br /> with newlines and convert HTML entities
            stack = cells[2].replace('<br />', '\n').replace('&#43;', '+').strip()
            text_stacks.append(f"{header}:\n{stack}")
    
    return '\n\n'.join(text_stacks)

@dataclass
class Goroutine:
    id: int
    state: str
    time_minutes: int
    top_function: str
    call_stack: List[str]  # Store full call stack
    created_by_function: Optional[str]
    created_by_goroutine: Optional[int]

def parse_time_to_minutes(time_str: Optional[str]) -> int:
    if not time_str:
        return 0
    
    parts = time_str.lower().split()
    if len(parts) != 2:
        return 0
    
    try:
        value = float(parts[0])
        unit = parts[1]
        
        if 'hour' in unit:
            return int(value * 60)
        elif 'minute' in unit:
            return int(value)
        elif 'second' in unit:
            return int(value / 60)
        return 0
    except ValueError:
        return 0

def parse_goroutine_header(line: str) -> tuple[int, str, Optional[str]]:
    # Match patterns like "goroutine 637 [IO wait, 5 minutes]:" or "goroutine 637 [IO wait]:"
    match = re.match(r'goroutine (\d+) \[(.*?)(?:, (.*?))?\]:', line)
    if not match:
        return None, None, None
    return int(match.group(1)), match.group(2), match.group(3)

def parse_function_name(line: str) -> str:
    # Extract function name by stripping everything after the last opening parenthesis
    line = line.strip()
    if '\t' in line:
        line = line.split('\t')[0]
    
    # Find last opening parenthesis and strip from there
    last_paren = line.rfind('(')
    if last_paren >= 0:
        line = line[:last_paren]
    
    # Trim known prefixes
    for prefix in TRIM_PREFIXES:
        if line.startswith(prefix):
            line = line[len(prefix):]
            break
    
    return line

def find_first_core_function(lines: List[str]) -> Optional[str]:
    last_func = None
    for line in lines:
        if line.strip().startswith('created by') or line.startswith('\t'):
            continue
        # Get raw function name first
        raw_func = line.strip()
        if '\t' in raw_func:
            raw_func = raw_func.split('\t')[0]
        last_paren = raw_func.rfind('(')
        if last_paren >= 0:
            raw_func = raw_func[:last_paren]
            
        # Then trim prefixes
        for prefix in TRIM_PREFIXES:
            if raw_func.startswith(prefix):
                raw_func = raw_func[len(prefix):]
                break
                
        if raw_func.startswith('core/'):
            return raw_func
        last_func = raw_func  # Keep track of the last function we've seen
    
    return last_func  # Return the last function if no core/ function was found

def parse_callstack(stack: str) -> Optional[Goroutine]:
    lines = stack.strip().split('\n')
    if not lines:
        return None

    # Parse header
    gid, state, time_str = parse_goroutine_header(lines[0])
    if gid is None:
        return None

    # Get all functions from the stack
    call_stack = []
    top_function = None
    for line in lines[1:]:
        if not line.strip().startswith('created by') and not line.startswith('\t'):
            func_name = parse_function_name(line)
            if top_function is None:
                top_function = func_name
            call_stack.append(func_name)

    if top_function is None:
        return None

    # If top function doesn't start with core/, find first core/ function and append
    if not top_function.startswith('core/'):
        if core_func := find_first_core_function(lines[1:]):
            top_function = f"{top_function}___{core_func}"

    # Get created by info
    created_by_function = None
    created_by_goroutine = None
    for line in lines:
        if line.strip().startswith('created by'):
            created_info = line.strip()
            # Extract function name between "created by " and " in goroutine"
            start_idx = created_info.find('created by ') + len('created by ')
            end_idx = created_info.find(' in goroutine')
            if end_idx > start_idx:
                created_by_function = created_info[start_idx:end_idx]
                # Extract goroutine ID
                goroutine_match = re.search(r'in goroutine (\d+)', created_info)
                if goroutine_match:
                    created_by_goroutine = int(goroutine_match.group(1))
            break

    return Goroutine(
        id=gid,
        state=state,
        time_minutes=parse_time_to_minutes(time_str),
        top_function=top_function,
        call_stack=call_stack,
        created_by_function=created_by_function,
        created_by_goroutine=created_by_goroutine
    )

def print_csv_output(goroutines: List[Goroutine]):
    writer = csv.writer(sys.stdout)
    # Write header
    writer.writerow(['goroutine_id', 'state', 'time_minutes', 'top_function', 'created_by_function', 'created_by_goroutine'])
    
    # Write data
    for g in goroutines:
        writer.writerow([
            g.id,
            g.state,
            g.time_minutes,
            g.top_function,
            g.created_by_function or '',
            g.created_by_goroutine or ''
        ])

def print_summary_output(grouped):
    print("\nTop goroutines by time for each function:")
    print("-" * 80)
    
    for func, group in grouped.items():
        if not group:
            continue
            
        # Sort by time
        top_5 = heapq.nlargest(5, group, key=lambda x: x.time_minutes)
        
        print(f"\nFunction: {func} (Total goroutines: {len(group)})")
        print("-" * 40)
        for g in top_5:
            time_str = f" ({g.time_minutes} minutes)" if g.time_minutes > 0 else ""
            created_by = f" created by {g.created_by_function}" if g.created_by_function else ""
            print(f"Goroutine {g.id} [{g.state}]{time_str}{created_by}")

def print_top_functions(goroutines: List[Goroutine], show_examples: bool, min_count: int = 10, sort_by_time: bool = False, call_depth: int = 0):
    # Count occurrences of each function and group goroutines
    func_counts = defaultdict(int)
    func_groups = defaultdict(list)
    func_max_time = defaultdict(lambda: (0, ""))  # (time, state)
    for g in goroutines:
        func_counts[g.top_function] += 1
        func_groups[g.top_function].append(g)
        # Update state if this is first goroutine or if it has longer wait time
        curr_time, curr_state = func_max_time[g.top_function]
        if curr_time < g.time_minutes or (curr_time == 0 and curr_state == ""):
            func_max_time[g.top_function] = (g.time_minutes, g.state)
    
    # Sort by time then count, or just by count
    if sort_by_time:
        funcs_with_time = [(f, c, func_max_time[f][0]) for f, c in func_counts.items() if c >= min_count]
        sorted_funcs = [(f, c) for f, c, _ in sorted(funcs_with_time, key=lambda x: (-x[2], -x[1]))]
    else:
        sorted_funcs = [(f, c) for f, c in sorted(func_counts.items(), key=lambda x: x[1], reverse=True) if c >= min_count]
    
    # Print results
    for func, count in sorted_funcs:
        max_time, max_state = func_max_time[func]
        time_str = f"   [{max_state} {max_time} min]" if max_time > 0 else f"   [{max_state}]"
        print(f"{func}\t\t{count}{time_str}")
        
        # Print additional call stack functions if requested
        if call_depth > 0:
            # Get the first goroutine's call stack as representative
            if g := next(iter(func_groups[func]), None):
                for i, call_func in enumerate(g.call_stack[1:call_depth+1], 1):
                    print(f"\t{call_func}")
        
        if show_examples:
            # Get top 5 by wait time
            examples = sorted(func_groups[func], key=lambda x: x.time_minutes, reverse=True)[:5]
            for g in examples:
                time_str = f", {g.time_minutes} min" if g.time_minutes > 0 else ""
                print(f"          {g.state}{time_str}")
            print()  # Empty line between functions

def process_file(filename: str, args, content: Optional[str] = None) -> None:
    # Read input from file or use provided content
    if content is None:
        with open(filename, 'r') as f:
            content = f.read()
    
    # Convert HTML to text format if needed
    if args.old:
        content = parse_html_stacks(content)
        
    # Split into individual stacks
    stacks = content.split('\n\n')
    
    # Parse all stacks
    goroutines = []
    for stack in stacks:
        if g := parse_callstack(stack):
            # Apply filtering if enabled
            if args.filter and g.top_function in FILTER_LIST:
                continue
            goroutines.append(g)
    
    if args.csv:
        print_csv_output(goroutines)
        return
        
    if args.top:
        print_top_functions(goroutines, args.example, args.min, args.longest, args.calls)
        return

    # Group by top function
    grouped = defaultdict(list)
    for g in goroutines:
        grouped[g.top_function].append(g)
    
    print_summary_output(grouped)

def main():
    # Handle broken pipe errors gracefully
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)

    parser = argparse.ArgumentParser(description='Parse and analyze Go callstacks')
    parser.add_argument('path', nargs='?', default='.', help='File or directory containing Go callstacks (reads from stdin if not provided)')
    parser.add_argument('--dir', action='store_true', help='Process all files in directory')
    parser.add_argument('--csv', action='store_true', help='Output in CSV format')
    parser.add_argument('--top', action='store_true', help='Print functions sorted by number of occurrences')
    parser.add_argument('--longest', action='store_true', help='Sort by longest wait time first, then by count (only with --top)')
    parser.add_argument('--example', action='store_true', help='Show examples for each function group')
    parser.add_argument('--min', type=int, default=10, help='Minimum count to show in top output (default: 10)')
    parser.add_argument('--filter', action='store_true', help='Filter out common sync/http2 goroutines')
    parser.add_argument('--old', action='store_true', help='Parse old HTML format instead of text format')
    parser.add_argument('--calls', type=int, default=0, help='Number of additional call stack functions to show (default: 0)')
    args = parser.parse_args()

    try:
        if args.dir:
            # Process all files in directory
            for filename in sorted(os.listdir(args.path)):
                filepath = os.path.join(args.path, filename)
                if os.path.isfile(filepath):
                    print(f"\n=== {filepath} ===")
                    try:
                        process_file(filepath, args)
                    except Exception as e:
                        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        else:
            # Process single file or stdin
            if args.path == '.':
                content = sys.stdin.read()
                process_file('<stdin>', args, content)
            else:
                process_file(args.path, args)

    except BrokenPipeError:
        # Python flushes standard streams on exit; redirect remaining output
        # to devnull to avoid another BrokenPipeError at shutdown
        devnull = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull, sys.stdout.fileno())
        sys.exit(0)

if __name__ == '__main__':
    main()


