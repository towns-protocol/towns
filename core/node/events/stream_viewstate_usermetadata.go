package events

import (
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type UserMetadataStreamView interface {
	GetUserMetadataInception() (*UserMetadataPayload_Inception, error)
	GetEncryptionDevices() ([]*UserMetadataPayload_EncryptionDevice, error)
	GetUserMetadataSnapshotContent() (*UserMetadataPayload_Snapshot, error)
}

var _ UserMetadataStreamView = (*StreamView)(nil)

func (r *StreamView) GetUserMetadataInception() (*UserMetadataPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*UserMetadataPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user metadata stream", "streamId", r.streamId)
	}
}

func (r *StreamView) GetEncryptionDevices() (
	[]*UserMetadataPayload_EncryptionDevice,
	error,
) {
	snapshot, err := r.GetUserMetadataSnapshotContent()
	if err != nil {
		return nil, err
	}

	devices := snapshot.GetEncryptionDevices()
	if err = r.ForEachEvent(r.snapshotIndex+1, func(e *ParsedEvent, _ int64, _ int64) (bool, error) {
		payload := e.Event.GetUserMetadataPayload()
		if payload != nil {
			device := payload.GetEncryptionDevice()
			if device != nil {
				devices = append(devices, device)
			}
		}
		return true, nil
	}); err != nil {
		return nil, AsRiverError(
			err,
			Err_INTERNAL,
		).Message("Could not iterate through user metadata stream events").
			Tag("streamId", r.streamId)
	}
	return devices, nil
}

func (r *StreamView) GetUserMetadataSnapshotContent() (*UserMetadataPayload_Snapshot, error) {
	s := r.snapshot.Content
	c, ok := s.(*Snapshot_UserMetadataContent)
	if ok {
		return c.UserMetadataContent, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user metadata stream", "streamId", r.streamId)
	}
}
