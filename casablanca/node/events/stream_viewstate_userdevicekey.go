package events

import (
	. "casablanca/node/base"
	. "casablanca/node/crypto"
	. "casablanca/node/protocol"
	"encoding/hex"
)

type UserDeviceStreamView interface {
	StreamView
	// the set of river device key ids that are revoked
	// river device id is a 256 bit keccak hash of the RDK's public key
	IsDeviceIdRevoked(rdkId RdkId) (bool, error)
}

func (r *streamViewImpl) IsDeviceIdRevoked(rdkId RdkId) (bool, error) {

	// snapshot
	snapshotContent, ok := r.snapshot.Content.(*Snapshot_UserDeviceKeyContent)
	if !ok {
		return false, RiverErrorf(Err_INVALID_ARGUMENT, "IsDeviceIdRevoked: stream type mismatch streamId: %s, expected: UserDevicekeyContent, got:%T", r.streamId, r.snapshot.Content)
	}
	// loop over device keys in UserDeviceKeyContent:
	// if we find a revoked device key, return true
	userDeviceKeys := snapshotContent.UserDeviceKeyContent.GetUserDeviceKeys()
	// question - is there an inverse RdkIdFromSlice that will let me use RdkId as a map key?
	for _, deviceKey := range userDeviceKeys {
		if deviceKey.GetRiverKeyOp() == RiverKeyOp_RDKO_KEY_REVOKE {
			deviceId, err := hex.DecodeString(deviceKey.GetDeviceKeys().DeviceId)
			if err == nil {
				eventRdkId, err := RdkIdFromSlice(deviceId)
				if err == nil {
					if eventRdkId == rdkId {
						return true, nil
					}
				}
			}
		}
	}

	// look in events after snapshot
	isRevoked := false
	_ = r.forEachEvent(r.snapshotIndex+1, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserDeviceKeyPayload:
			switch devicePayload := payload.UserDeviceKeyPayload.Content.(type) {
			case *UserDeviceKeyPayload_UserDeviceKey_:
				deviceKeys := devicePayload.UserDeviceKey.GetDeviceKeys()
				deviceId, err := hex.DecodeString(deviceKeys.DeviceId)
				if err != nil {
					return false, err
				}
				eventRdkId, err := RdkIdFromSlice(deviceId)
				if err != nil {
					return false, err
				}
				switch devicePayload.UserDeviceKey.GetRiverKeyOp() {
				case RiverKeyOp_RDKO_KEY_REVOKE:
					if eventRdkId == rdkId {
						isRevoked = true
						return false, nil
					}
				default:
					break
				}
			}
		default:
			break
		}
		return true, nil
	})

	return isRevoked, nil
}
