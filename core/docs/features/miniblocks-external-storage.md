# Miniblocks External Storage

## Overview

- Media streams can push their miniblock payloads out of Postgres into a single immutable object per stream that lives in Google Cloud Storage (GCS) or Amazon S3 (`core/node/storage/external/storage.go`). The database keeps only lightweight descriptors that record byte offsets inside that object (`core/node/storage/migrations/000009_media_miniblock_ext_storage_tables.up.sql`).
- External storage is configured with `ExternalMediaStreamStorageConfig`, which selects one backend (`Gcs` or `AwsS3`) and optionally enables background migration for already-normalized media streams (`core/config/config.go`).
- Each object key is derived from the schema lock id and the stream id, so migrations remain idempotent and namespace collisions are avoided even when multiple schema versions run side-by-side.

## Upload & Migration Flow

1. **Eligibility** – `PostgresStreamStore.MigrateMiniblocksToExternalStorage` only runs for sealed media streams; it verifies that the stream is no longer ephemeral, discovers the total payload size, and pages miniblocks out of the DB in deterministic order (`core/node/storage/pg_stream_store_external.go`).
2. **Streaming upload** – The store opens an `UploadSession` from the configured backend. Each miniblock is streamed directly into the remote object while its descriptor (number, start byte, length) is recorded locally; writes are batched in-memory but flushed to the cloud immediately.
3. **Finalize** – `Finish` closes the HTTP PUT, validates the 2xx response, and returns both the descriptor list and the backend location tag (GCS or S3). Upload duration metrics are captured around this step (`core/node/storage/pg_stream_store.go`).
4. **DB switch-over** – `WriteExternalStorageObjectPartsAndPurgeMiniblockData` runs in a transaction: descriptors are inserted into `miniblocks_ext`, the stream row is marked as externally stored, and the raw miniblocks are deleted from `miniblocks`. If any of these steps fail the migration will retry and overwrite the remote object on the next attempt.
5. **Scheduling** – The ephemeral stream monitor enqueues freshly-sealed media streams for migration and can optionally sweep existing streams in batches of 2,500, retrying failures up to five times with backoff (`core/node/storage/pg_ephemeral_store_monitor.go`).

## Backend-Specific Behavior

### Google Cloud Storage

- Credentials come from a service-account JSON blob; `NewStorage` parses it with `google.CredentialsFromJSON` and refreshes OAuth tokens proactively so long-lived uploads do not stall (`core/node/storage/external/storage.go`).
- `gcsUploadSession` uses a streaming HTTP `PUT` with an `io.Pipe`, so miniblocks are forwarded to GCS as they are read from Postgres, avoiding large buffers (`core/node/storage/external/gcs.go`).
- Downloads use OAuth bearer tokens and can fetch multiple byte ranges concurrently; the worker pool caps concurrency at three per download to avoid API throttling while still serving discontiguous reads efficiently (`downloadMiniblockDataFromGCSConcurrent`).

### Amazon S3

- Static credentials (access key + secret) are required; `NewStorage` builds a SigV4 signer that is reused for both uploads and downloads.
- `s3UploadSession` mirrors the GCS flow but signs the streaming `PUT` request and marks the payload as `UNSIGNED-PAYLOAD` so that the stream does not need to be buffered for hashing beforehand (`core/node/storage/external/s3.go`).
- Reads issue HTTP GET requests against the bucket endpoint with a composed `Range` header. Responses may be multipart, but `extractMiniblocks` re-slices the combined payload by absolute offsets, so callers always receive a miniblock map keyed by miniblock number.

## Read Path & Resiliency

- The stream store decodes external miniblocks by calling `Storage.DownloadMiniblockData`, which converts logical miniblock ranges into HTTP byte ranges using the descriptors stored in Postgres (`core/node/storage/external/storage.go`).
- Both backends share retry logic with exponential backoff that treats 429/5xx codes and transient network failures as retryable. Upload and download histograms allow dashboards to surface slow cloud interactions.
- When a stream is locked to external storage, subsequent reads that request ranges outside the retained cache surface the `MiniblockDataStorageLocation` so the RPC layer can download and serve the blob seamlessly (`core/node/storage/pg_stream_store.go`).

## Implementation References

- `core/node/storage/external/storage.go` – Backend factory, shared upload/download interface, HTTP range translation, retry logic, and concurrency limits.
- `core/node/storage/external/gcs.go` / `core/node/storage/external/s3.go` – Backend-specific upload session implementations and streaming PUT semantics.
- `core/node/storage/pg_stream_store_external.go` – Migration pipeline that copies miniblocks out of Postgres, finalizes uploads, and swaps metadata.
- `core/node/storage/pg_ephemeral_store_monitor.go` – Background worker that normalizes streams, queues migrations, and retries failures.
- `core/node/storage/migrations/000009_media_miniblock_ext_storage_tables.up.sql` – Schema for storing external object descriptors and location flags.

# External Miniblock Storage Operations

Node operators must provision object storage for media miniblocks before booting a River node. Miniblocks are hot data: they are written during stream normalization and fetched during backfills and client reads, so the bucket must deliver low-latency, high-throughput access. Only Google Cloud Storage **Standard** or Amazon S3 **Standard** buckets are supported; colder storage classes (Nearline, Glacier, etc.) are too slow and do not meet durability/SLA expectations.

## Bucket Requirements

- Dedicated bucket per environment (dev/stage/prod) to simplify lifecycle and quota management.
- Storage class: *Standard* (GCS Standard or AWS S3 Standard) to guarantee millisecond access to newly written objects.
- Regional placement close to the node deployment to minimize egress latency and cost.
- Uniform read/write permissions scoped to the node service account or IAM user that the process uses; no public ACLs.

## Configuration Overview

The node reads `ExternalMediaStreamStorageConfig` on boot (`core/config/config.go:459`). Exactly one backend must be enabled; providing both backends or neither is treated as misconfiguration. The selected block also controls whether existing sealed media streams should be migrated as soon as the node comes up via `enable_migration_existing_streams`.

### Google Cloud Storage

1. Create a Standard bucket (regional) and grant a service account `storage.objects.{create,delete,get}` plus `storage.buckets.get`.
2. Download the service account JSON credentials; keep them encrypted at rest.
3. Populate the config block:

```yaml
external_media_stream_storage:
  gcs_storage:
    bucket: your-hot-data-bucket
    json_credentials: |
      {
        "type": "service_account",
        "...": "..."
      }
  enable_migration_existing_streams: true
```

You may also set the equivalent environment variables:
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_GCS_STORAGE_JSON_CREDENTIALS
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_GCS_STORAGE_BUCKET

And optionally enable migration of existing streams to external storage (recommended):
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_ENABLE_MIGRATION_EXISTING_STREAMS (bool: true or false)

### Amazon S3

1. Create an S3 Standard bucket in the same region as the node deployment.
2. Generate an IAM user or role with `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for that bucket.
3. Provide static credentials in the config:

```yaml
external_media_stream_storage:
  aws_s3:
    region: us-east-1
    bucket: your-hot-data-bucket
    access_key_id: AKIA...
    secret_access_key: "...redacted..."
  enable_migration_existing_streams: true
```

You may also set the equivalent environment variables:
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_AWS_S3_ACCESS_KEY_ID
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_AWS_S3_SECRET_ACCESS_KEY
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_AWS_S3_REGION
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_AWS_S3_BUCKET

And optionally enable migration of existing streams to external storage (recommended):
- RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_ENABLE_MIGRATION_EXISTING_STREAMS (bool: true or false)
