package analytics

import (
	"context"

	"github.com/mixpanel/mixpanel-go"

	"github.com/towns-protocol/towns/core/node/logging"
)

// Analytics provides an interface for tracking product analytics events.
// This abstraction allows for swapping implementations and simplifies testing.
type Analytics interface {
	// Track records an event with the given name and properties.
	// distinctId identifies the user/entity associated with the event.
	// The call is non-blocking and errors are logged but not returned.
	Track(ctx context.Context, distinctId string, event string, properties map[string]any)
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

func (m *mixpanelAnalytics) Track(ctx context.Context, distinctId string, event string, properties map[string]any) {
	e := m.client.NewEvent(event, distinctId, properties)
	go func() {
		if err := m.client.Track(ctx, []*mixpanel.Event{e}); err != nil {
			log := logging.FromCtx(ctx)
			log.Errorw("Failed to track analytics event", "event", event, "error", err)
		}
	}()
}

// noopAnalytics is a no-op implementation used when analytics is disabled.
type noopAnalytics struct{}

func (n *noopAnalytics) Track(ctx context.Context, distinctId string, event string, properties map[string]any) {
	// No-op
}
