# Media Stream External Miniblock Storage

## Overview

Media streams can now move their miniblock payloads out of Postgres and into object
storage once the stream is normalized. This keeps the database lean while letting
nodes scale to very large media uploads without sacrificing read fidelity. The node
selects an external backend (AWS S3 or Google Cloud Storage), uploads the stream’s
miniblocks as a single object, and stores per-miniblock offsets so reads remain
transparent to clients.

## Supported Backends

Operators configure external storage through dedicated blocks on the node config,
choosing either an S3 bucket backed by static credentials or a GCS bucket with JSON
service credentials. Only one backend should be active in production; tests can
wire both for coverage. Configuration is wired through the RPC service so every
Postgres stream store instance is created with the selected external storage hook.

## Migration Flow

Ephemeral media streams are written to Postgres first. When a stream is sealed and
normalized, the ephemeral monitor records the stream for migration and retries the
transfer up to five times if it hits downstream errors. The monitor runs a dedicated
goroutine whenever external storage is configured, pulling queued stream IDs and
invoking `MigrateMiniblocksToExternalStorage`. During migration the store streams
each miniblock out of Postgres, uploads the data, persists the part metadata, and
finally nulls the local `blockdata` column while flagging the external location in
`es.blockdata_ext`.

## Upload Pipeline

Uploads use a streaming writer abstraction that keeps memory usage bounded:

- S3 writers buffer miniblocks until they reach the 5 MiB multipart threshold, then
  either issue `PutObject` for small streams or run multipart uploads, completing or
  aborting the session as needed.
- GCS writers flush 5 MiB sub-objects and, when required, compose them into the final
  object while ensuring temporary objects are cleaned up.

`StartUploadSession` returns the right writer for the configured backend, and every
session guarantees cleanup via `Abort` if migration fails mid-flight.

## Read Path

`ReadMiniblocks` and `ReadMiniblocksByStream` remain the public APIs. They detect the
external storage flag, fetch miniblock descriptors from the new
`miniblocks_ext_storage_*` tables, and hydrate payloads by reading the stored object
ranges from S3 or GCS. Callers continue to receive fully populated miniblock
descriptors without knowing whether the data came from Postgres or an external
bucket.

## Failure Handling

Retries are handled at multiple layers: the monitor requeues failed migrations,
upload sessions can abort multipart uploads, and the store validates bucket details
before reading. If a stream stays ephemeral (e.g. because the client never finished
uploading), the migrator skips it entirely and leaves the data in Postgres.

## Testing and Tooling

Integration tests cover S3 and GCS flows using custom clients that disable
connection reuse to satisfy goleak. Each scenario creates random chunk payloads,
waits for the migrator to finish, and verifies that reading from the store yields
the original miniblocks. Very large-chunk variants exist but are skipped in CI
because they run too slowly; they remain available for targeted local runs.
`TestDeleteExternalObject` is exposed for tests to clean up bucket objects once
assertions finish.

## Implementation References

- Configuration structs and helpers for S3/GCS enablement: `core/config/config.go:88`
- RPC store wiring that passes the external storage config into the Postgres store:
  `core/node/rpc/server.go:628`
- Upload session factory and streaming writers for both backends:
  `core/node/storage/pg_external_storage.go:124`,
  `core/node/storage/pg_external_storage.go:304`,
  `core/node/storage/pg_external_storage.go:445`
- Migration entry-point and metadata persistence:
  `core/node/storage/pg_external_storage.go:528`,
  `core/node/storage/pg_external_storage.go:566`
- Ephemeral monitor queueing, retry loop, and migration trigger:
  `core/node/storage/pg_ephemeral_store_monitor.go:19`,
  `core/node/storage/pg_ephemeral_store_monitor.go:71`,
  `core/node/storage/pg_ephemeral_store_monitor.go:91`
- External read path that rehydrates miniblocks on demand:
  `core/node/storage/pg_stream_store.go:1360`,
  `core/node/storage/pg_stream_store.go:1416`
- S3/GCS integration tests exercising the migration flow:
  `core/node/storage/pg_stream_store_external_storage_test.go:29`
