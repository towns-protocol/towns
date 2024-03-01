package render_test

import (
	"testing"

	"github.com/river-build/river/core/node/rpc/render"
)

// implicitly calls render.init that loads and parses all templates
// ensuring they are syntactically correct
func TestRenderDebugCacheTemp(t *testing.T) {
	payload := render.CacheData{
		MiniBlocksCount:       1234,
		TotalEventsCount:      5678,
		EventsInMiniblocks:    383,
		SnapshotsInMiniblocks: 10,
		TrimmedStreams:        3,
		TotalEventsEver:       838382,
		ShowStreams:           true,
		Streams: []*render.CacheDataStream{
			{
				StreamID:              "stream1",
				FirstMiniblockNum:     1,
				LastMiniblockNum:      2,
				MiniBlocks:            3,
				EventsInMiniblocks:    4,
				SnapshotsInMiniblocks: 5,
				EventsInMinipool:      6,
				TotalEventsEver:       7,
			},
		},
	}

	_, err := render.Execute(&payload)
	if err != nil {
		t.Fatal(err)
	}
}
