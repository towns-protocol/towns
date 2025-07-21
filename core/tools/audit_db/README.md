# DB Audit tool

This tool was built to run checks against the contents of stream storage databases in order to affect repairs on network data.

## Build audit tool

Update `river_audit_db.env` with correct parameters.

The DB can be live while the tool is running.

    # Build tool
    go build -o river_audit_db .

    # See help message
    ./river_audit_db help

### Help

For command-line options use `help` command.

### Configuration

List of env vars or settings in `river_audit_db.env`:

    RIVER_DB_URL
    RIVER_DB_PASSWORD  # if unset here or in URL, read from .pgpass
    RIVER_DB_SCHEMA

## Tool setup

To test environment settings, run

    ./river_audit_db test

To list schemas, run

    ./river_audit_db list

## Run audit tool to examine stream disk usage

To find the total size in bytes of stream data stored for each stream, run:

    ./river_audit_db usage

Be sure to have your schema specified in the environment.

## List all streams in a schema

    ./river_audit_db list streams

## Manually inspect streams

Concerning streams can be further examined with

    ./river_audit_db inspect stream <stream-id>

## Run audit tool to check for and repair streams with >> miniblock candidates

To find streams that have at least one candidate in storage, run

    ./river_audit_db check candidates > streams_with_candidates.txt

To repair these streams: from the `core` directory, run

    ./scripts/get_gamma_streams.py tools/audit_db/streams_with_candidates.txt

in order to call the GetStream rpc on each stream with a candidate. This tool will print out which streams have successfully advanced, and which have failed to advance. Call the script at least twice in order to provoke the node to make new miniblocks for all streams with high candidate count, and then again to confirm that all streams are advancing.

Note: the node must be running and available while the `get_gamma_streams.py` script is executing, as it will call the GetStream rpc on the node in order to repair the stream.
