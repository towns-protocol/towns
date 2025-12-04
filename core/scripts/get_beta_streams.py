#!/usr/bin/env python3
import sys
import re
import subprocess
import concurrent.futures

def validate_stream_result(result, min_seq_num):
    """
    validate_stream_result confirms that the stream has advanced past the sequence number
    passed in above. The last line of the stream get result should contain summary information
    about the latest miniblock, and the second token in that line is the block number.
    """
    if result.returncode == 0:
        # Remove any trailing whitespace and split the output into lines.
        lines = result.stdout.strip().splitlines()
        
        if lines:
            # Get the last line of output.
            tokens = lines[-1].split()
            if len(tokens) >= 2:
                try:
                    # Convert the second token to an integer.
                    miniblock_num = int(tokens[1])
                    if miniblock_num >= min_seq_num:
                        return True
                    else:
                        print(f"Stream did not advance: latest block {miniblock_num}, min required: {min_seq_num}")
                except ValueError:
                    print("Error: miniblock num is not a valid integer.")
            else:
                print("Error: The last line does not contain at least two tokens. Expected the second token to be the most recent miniblock num")
        else:
            print("Error: No output received from the command.")
    
    return False


def get_stream_and_validate(stream_tuple):
    """
    get_stream_and_validate uses the 'stream get' command to provoke a GetStream
    rpc call for the stream. This call forces the stream cache to load the stream
    into memory and will often provoke the generation of miniblocks, causing the stream
    to advance within a few seconds of the call.

    this method validates that the highest block number returned by the node is
    greater than or equal to the minimum sequence number included as the 2nd element
    of the stream tuple. If the stream does not pass, it may be that the node was
    just starting or the stream was not in the cache and therefore was not producing
    miniblocks. In that case, wait a few seconds and run the script again.
    """

    stream_id, min_seq_num = stream_tuple
    command = f"./env/beta/run.sh stream get {stream_id}"
    try:
        result = subprocess.run(
            ["bash", "-c", command],
            check=True,
            capture_output=True,
            text=True
        )
        if validate_stream_result(result, min_seq_num):
            return f"GetStream done for stream {stream_tuple}"
        else:
            return f"Stream has not advanced: {stream_tuple}"
    except subprocess.CalledProcessError as err:
        return f"Error executing command for stream '{stream_tuple}': {err.stderr}"

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

                # Split line using one or more whitespace chars as a separator
                fields = re.split(r'\s+', line)
                if len(fields) < 2:
                    print(f"Skipping line (not enough tokens): {line}")
                    continue

                # Collect (stream_id, seq_num) pairs generated from the audit tool
                streams.append((fields[0], int(fields[1])))
    except FileNotFoundError:
        print(f"File not found: {filename}")
        sys.exit(1)

    # Execute commands concurrently for each stream.
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # Map streams to futures.
        future_to_stream = {executor.submit(get_stream_and_validate, stream): stream for stream in streams}
        for future in concurrent.futures.as_completed(future_to_stream):
            stream = future_to_stream[future]
            try:
                result = future.result()
                print(result)
            except Exception as exc:
                print(f"Stream {stream[0]} generated an exception: {exc}")

if __name__ == '__main__':
    main()
