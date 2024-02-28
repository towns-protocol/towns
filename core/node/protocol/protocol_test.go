package protocol

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInceptionPayload(t *testing.T) {
	assert.Nil(t, (&StreamEvent{}).GetInceptionPayload())

	assert.Nil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{},
	}).GetInceptionPayload())

	assert.Nil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{},
		},
	}).GetInceptionPayload())

	assert.Nil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Inception_{},
			},
		},
	}).GetInceptionPayload())

	assert.NotNil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Inception_{
					Inception: &SpacePayload_Inception{},
				},
			},
		},
	}).GetInceptionPayload())

	assert.Nil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Channel_{},
			},
		},
	}).GetInceptionPayload())

	spaceMembership := StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Channel_{
					Channel: &SpacePayload_Channel{},
				},
			},
		},
	}
	// pro tip, if you cast nil to an interface type, it's still nil
	assert.Nil(t, spaceMembership.GetInceptionPayload())
	// but it's not equal to nil! this is a test to make sure we don't regress see: https://github.com/HereNotThere/harmony/pull/2808
	assert.True(t, spaceMembership.GetInceptionPayload() == nil)
}
