package events

import (
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
	isRevoked := false
	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
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
