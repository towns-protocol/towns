#!/usr/bin/env python3
import sys
import re
import subprocess
import concurrent.futures

def run_command(stream):
    command = f"./env/gamma/run.sh stream get {stream}"
    try:
        result = subprocess.run(
            ["bash", "-c", command],
            check=True,
            capture_output=True,
            text=True
        )
        return f"GetStream done for stream {stream}"
    except subprocess.CalledProcessError as err:
        return f"Error executing command for stream '{stream}': {err.stderr}"

def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <filename>")
        sys.exit(1)

    filename = sys.argv[1]
    streams = []

    try:
        with open(filename, 'r') as file:
            for line in file:
                # Trim whitespace and skip empty lines
                line = line.strip()
                if not line:
                    continue

                # Split line using one or more tabs as separator
                fields = re.split(r'\s+', line)
                if len(fields) < 1:
                    print(f"Skipping line (not enough tokens): {line}")
                    continue

                # Collect the second token (index 1)
                streams.append(fields[0])
    except FileNotFoundError:
        print(f"File not found: {filename}")
        sys.exit(1)

    # Execute commands concurrently for each token.
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Map tokens to futures.
        future_to_stream = {executor.submit(run_command, stream): stream for stream in streams}
        for future in concurrent.futures.as_completed(future_to_stream):
            stream = future_to_stream[future]
            try:
                result = future.result()
                print(result)
            except Exception as exc:
                print(f"Token {stream} generated an exception: {exc}")

if __name__ == '__main__':
    main()
