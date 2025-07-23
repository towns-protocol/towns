package subscription

// Stats holds the metrics for the subscription system.
type Stats struct {
	SyncingStreamsCount int
}

// GetStats returns the current statistics of the subscription manager.
func (m *Manager) GetStats() Stats {
	syncingStreamsCount, _ := m.registry.GetStats()
	return Stats{
		SyncingStreamsCount: syncingStreamsCount,
	}
}
