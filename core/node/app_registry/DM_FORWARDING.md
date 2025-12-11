# DM Stream Forwarding Implementation Plan

## Overview

Enable the app registry service to forward messages from 1:1 DM streams (0x88) to bot participants, in addition to the existing channel stream forwarding.

## Current State

The app registry currently tracks:
- **Channel streams (0x20)**: Always tracked, messages forwarded to bot members
- **User inbox streams (0xa1)**: Tracked for registered bots only (for encryption key fulfillment)

DM streams (0x88) are explicitly filtered out in `TrackStream()`.

## Implementation

### 1. Update Stream Tracking Filter

**File**: `core/node/app_registry/sync/streams_tracker.go:88-109`

Add `STREAM_DM_CHANNEL_BIN` to the `TrackStream()` filter:

```go
func (tracker *AppRegistryStreamsTracker) TrackStream(ctx context.Context, streamId shared.StreamId, _ bool) bool {
    streamType := streamId.Type()

    // Track channel and DM streams
    if streamType == shared.STREAM_CHANNEL_BIN || streamType == shared.STREAM_DM_CHANNEL_BIN {
        return true
    }

    // Track user inbox streams for registered bots (for key fulfillment)
    if streamType != shared.STREAM_USER_INBOX_BIN {
        return false
    }
    // ... existing user inbox logic
}
```

### 2. Update Event Processing

**File**: `core/node/app_registry/sync/tracked_stream.go:67-131`

Update `onNewEvent()` to process DM streams. Since DM participants are stored in `snapshot.Members.Joined`, `GetChannelMembers()` works for both channels and DMs:

```go
func (b *AppRegistryTrackedStreamView) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
    streamId := view.StreamId()
    streamType := streamId.Type()

    if streamType == shared.STREAM_USER_INBOX_BIN {
        return b.processUserInboxMessage(ctx, event)
    }

    // GetChannelMembers() works for both channels and DMs
    // (DM participants are in snapshot.Members.Joined)
    members, err := view.GetChannelMembers()
    if err != nil {
        return err
    }

    // ... rest of existing logic unchanged
}
```

### 3. Update Cookie Persistence

**File**: `core/node/app_registry/sync/tracked_stream.go:176-209`

Update `shouldPersistCookie()` to include DM streams:

```go
func (b *AppRegistryTrackedStreamView) shouldPersistCookie(ctx context.Context, view *StreamView) bool {
    streamId := view.StreamId()
    streamType := streamId.Type()

    // Only persist cookies for channel/DM streams with bot members
    if streamType != shared.STREAM_CHANNEL_BIN && streamType != shared.STREAM_DM_CHANNEL_BIN {
        return false
    }

    members, err := view.GetChannelMembers()
    // ... rest unchanged
}
```

## Files to Modify

| File | Change |
|------|--------|
| `sync/streams_tracker.go:88-109` | Add `STREAM_DM_CHANNEL_BIN` to `TrackStream()` |
| `sync/tracked_stream.go:71-77` | Allow DM streams through (currently only user inbox has early return) |
| `sync/tracked_stream.go:176-182` | Add `STREAM_DM_CHANNEL_BIN` to cookie persistence check |

## Why GetChannelMembers() Works for DMs

DM participants are stored in `snapshot.Members.Joined` when the stream is created. `GetChannelMembers()` reads from this snapshot, so it returns the two DM participants correctly. No new method needed.

## Testing Considerations

1. Create a DM stream between a bot and a user
2. Send messages in the DM
3. Verify the bot receives forwarded messages via webhook
4. Test encryption key solicitation/fulfillment flow for DMs
5. Test cookie persistence for DM streams with bot participants

## Future Work

- Add GDM (0x77) support when needed (also uses `GetChannelMembers()`)
- Consider DM-specific forwarding settings if bots need different behavior
