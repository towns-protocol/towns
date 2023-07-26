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
				Content: &SpacePayload_Membership{},
			},
		},
	}).GetInceptionPayload())

	assert.Nil(t, (&StreamEvent{
		Payload: &StreamEvent_SpacePayload{
			SpacePayload: &SpacePayload{
				Content: &SpacePayload_Membership{
					Membership: &Membership{},
				},
			},
		},
	}).GetInceptionPayload())
}
