After updating `river_migrate_db.env` with correct parameters, migration tool can be run like this:

    # source DB still can be in use at this point
    go build -o river_migrate_db .
    ./river_migrate_db help
    ./river_migrate_db source test  # test source config
    ./river_migrate_db target test  # test target config
    ./river_migrate_db target create  # create target schema (i.e. db partition)
    ./river_migrate_db target init  # create targe tables
    ./river_migrate_db target partition  # create target partitions matching source

    # shutdown container that is connected to source db

    ./river_migrate_db target partition  # create missing target partitions matching source since last run
    ./river_migrate_db copy  # copy data from source to target

    # Inspect specific stream content
    ./river_migrate_db source inspect <streamId>
    ./river_migrate_db target inspect <streamId>

    # reconfigure container to use target db

To run a stream data migration simultaneously, run the migration tool like so:

    ./river_migrate_db target create # create target schema

    ./river_migrate_db target init # Run sql migrations on target to apply the current schema

    # No need to partition the target as the migrated schema consists of a fixed
    # set of pre-allocated tables created by `init`

    # Copy source data to target, copying stream data into the migrated schema on the target database
    ./river_migrate_db copy --migrate_stream_schema

    # Validate target data against source database, searching for target stream
    # data in migrated schema
    ./river_migrate_db validate -m

    # To validate with a binary comparison of stream contents:
    ./river_migrate_db validate -m -b

    #... with verbose log output:
    ./river_migrate_db validate -m -b -v

    # Inspect specific stream content
    ./river_migrate_db source inspect <streamId>
    ./river_migrate_db target inspect <streamId>

For command-line options use `help` command.

List of env vars or settings in `river_migrate_db.env`:

    RIVER_DB_SOURCE_URL
    RIVER_DB_TARGET_URL
    RIVER_DB_SOURCE_PASSWORD  # if unset here or in URL, read from .pgpass
    RIVER_DB_TARGET_PASSWORD  # if unset here or in URL, read from .pgpass
    RIVER_DB_SCHEMA
    RIVER_DB_SCHEMA_TARGET_OVERWRITE
    RIVER_DB_NUM_WORKERS
    RIVER_DB_TX_SIZE
    RIVER_DB_PROGRESS_REPORT_INTERVAL  # duration, i.e. `10s`
