package events

import (
	"bytes"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// UserInboxStreamView provides methods for querying user inbox stream state.
type UserInboxStreamView interface {
	// GetGroupEncryptionSessions iterates over all blocks and returns a map of
	// deviceKey -> sessionId -> true, representing which session IDs have been
	// sent to which devices for the specified stream.
	GetGroupEncryptionSessions(streamId shared.StreamId) (map[string]map[string]bool, error)
}

var _ UserInboxStreamView = (*StreamView)(nil)

// GetGroupEncryptionSessions iterates over all blocks in the user inbox stream
// and returns a map of deviceKey to sessionId to bool, representing the coverage
// of session IDs over devices for the specified stream. This is useful for checking
// which devices have received which encryption sessions.
func (r *StreamView) GetGroupEncryptionSessions(streamId shared.StreamId) (map[string]map[string]bool, error) {
	// deviceKey -> sessionId -> true
	result := make(map[string]map[string]bool)

	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserInboxPayload:
			switch content := payload.UserInboxPayload.Content.(type) {
			case *UserInboxPayload_GroupEncryptionSessions_:
				sessions := content.GroupEncryptionSessions
				// Only include sessions for the specified stream
				if !bytes.Equal(sessions.GetStreamId(), streamId[:]) {
					return true, nil
				}
				sessionIds := sessions.GetSessionIds()
				ciphertexts := sessions.GetCiphertexts()

				// For each device that received ciphertexts, record all session IDs
				for deviceKey := range ciphertexts {
					if result[deviceKey] == nil {
						result[deviceKey] = make(map[string]bool)
					}
					for _, sessionId := range sessionIds {
						result[deviceKey][sessionId] = true
					}
				}
			}
		}
		return true, nil
	}

	// Iterate over all events from the beginning
	err := r.forEachEvent(0, updateFn)
	if err != nil {
		return nil, err
	}

	return result, nil
}
