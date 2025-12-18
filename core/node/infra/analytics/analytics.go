package analytics

import (
	"context"
	"time"

	"github.com/ethereum/go-ethereum/common"
	rudderstack "github.com/rudderlabs/analytics-go/v4"

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

// rudderstackAnalytics implements Analytics using the RudderStack SDK.
type rudderstackAnalytics struct {
	client rudderstack.Client
}

func (r *rudderstackAnalytics) Track(
	ctx context.Context,
	accountId common.Address,
	event string,
	properties map[string]any,
) {
	// Copy properties synchronously to avoid race conditions if caller reuses the map
	props := rudderstack.NewProperties()
	for k, v := range properties {
		props.Set(k, v)
	}

	trackCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), trackTimeout)
	go func() {
		defer cancel()
		if err := r.client.Enqueue(rudderstack.Track{
			UserId:     accountId.Hex(),
			Event:      event,
			Properties: props,
		}); err != nil {
			log := logging.FromCtx(trackCtx)
			log.Errorw("Failed to track analytics event", "event", event, "error", err)
		}
	}()
}

// NewRudderstack creates a new Analytics implementation using RudderStack.
// If writeKey or dataPlaneURL is empty, or if client creation fails, returns a no-op implementation.
// The client will be automatically closed when the context is cancelled.
func NewRudderstack(ctx context.Context, writeKey, dataPlaneURL string) Analytics {
	log := logging.FromCtx(ctx)

	if writeKey == "" || dataPlaneURL == "" {
		return &noopAnalytics{}
	}
	client, err := rudderstack.NewWithConfig(writeKey, rudderstack.Config{
		DataPlaneUrl: dataPlaneURL,
	})
	if err != nil {
		log.Errorw("Failed to create RudderStack client", "error", err)
		return &noopAnalytics{}
	}

	// Close the client when the context is cancelled to flush pending events
	go func() {
		<-ctx.Done()
		if err := client.Close(); err != nil {
			log.Errorw("Failed to close RudderStack client", "error", err)
		}
	}()

	return &rudderstackAnalytics{client: client}
}

// noopAnalytics is a no-op implementation used when analytics is disabled.
type noopAnalytics struct{}

func (n *noopAnalytics) Track(ctx context.Context, accountId common.Address, event string, properties map[string]any) {
	// No-op
}
