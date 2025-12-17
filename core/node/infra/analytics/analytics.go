package analytics

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/mixpanel/mixpanel-go"

	"github.com/towns-protocol/towns/core/node/logging"
)

const trackTimeout = 10 * time.Second

// Analytics provides an interface for tracking product analytics events.
// This abstraction allows for swapping implementations and simplifies testing.
type Analytics interface {
	// Track records an event with the given name and properties.
	// accountId identifies the user/entity (wallet address) associated with the event.
	// The call is non-blocking and errors are logged but not returned.
	Track(ctx context.Context, accountId common.Address, event string, properties map[string]any)
}

// New creates a new Analytics implementation.
// If token is empty, returns a no-op implementation.
func New(token string) Analytics {
	if token == "" {
		return &noopAnalytics{}
	}
	return &mixpanelAnalytics{
		client: mixpanel.NewApiClient(token),
	}
}

// mixpanelAnalytics implements Analytics using the Mixpanel SDK.
type mixpanelAnalytics struct {
	client *mixpanel.ApiClient
}

func (m *mixpanelAnalytics) Track(
	ctx context.Context,
	accountId common.Address,
	event string,
	properties map[string]any,
) {
	e := m.client.NewEvent(event, accountId.Hex(), properties)
	// Use context.WithoutCancel to decouple from parent context cancellation,
	// then add a timeout to prevent goroutine accumulation if Mixpanel is unreachable.
	trackCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), trackTimeout)
	go func() {
		defer cancel()
		if err := m.client.Track(trackCtx, []*mixpanel.Event{e}); err != nil {
			log := logging.FromCtx(trackCtx)
			log.Errorw("Failed to track analytics event", "event", event, "error", err)
		}
	}()
}

// noopAnalytics is a no-op implementation used when analytics is disabled.
type noopAnalytics struct{}

func (n *noopAnalytics) Track(ctx context.Context, accountId common.Address, event string, properties map[string]any) {
	// No-op
}
