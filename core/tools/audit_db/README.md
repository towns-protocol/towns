# DB Audit tool

This tool was built to run checks against the contents of stream storage databases in order to affect repairs on network data.

## Build audit tool

Update `river_audit_db.env` with correct parameters.

The DB can be live while the tool is running.

go build -o river_audit_db .

./river_audit_db help
./river_audit_db test -- test db connection

### Help

For command-line options use `help` command.

### Configuration

List of env vars or settings in `river_audit_db.env`:

    RIVER_DB_URL
    RIVER_DB_PASSWORD  # if unset here or in URL, read from .pgpass
    RIVER_DB_SCHEMA

## Run audit tool to check for and repair streams with >> miniblock candidates

To find streams that have at least one candidate in storage, run

./river_audit_db check candidates > streams_with_candidates.txt

To repair these streams: from the `core` directory, run

`./scripts/get_gamma_streams.py tools/audit_db/streams_with_candidates.txt`

in order to call the GetStream rpc on each stream with a candidate. This tool will print out which streams have successfully advanced, and which have failed to advance. Call the script at least twice in order to provoke the node to make new miniblocks for all streams with high candidate count, and then again to confirm that all streams are advancing.

Note: the node must be running and available while the `get_gamma_streams.py` script is executing, as it will call the GetStream rpc on the node in order to repair the stream.
