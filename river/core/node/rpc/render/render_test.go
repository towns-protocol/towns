package render_test

import (
	"testing"

	"github.com/river-build/river/core/node/rpc/render"
	"github.com/river-build/river/core/node/rpc/statusinfo"
	"github.com/stretchr/testify/require"
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
	require.NoError(t, err)
}

func TestRenderDebugMulti(t *testing.T) {
	addr := "0x1234567890abcdef1234567890abcdef12345678"
	url := "http://localhost:1234"
	tt := "2024-04-30T19:08:26Z"
	dd := "10s"
	payload := render.DebugMultiData{
		Status: &statusinfo.RiverStatus{
			Nodes: []*statusinfo.NodeStatus{
				{
					Record: statusinfo.RegistryNodeInfo{
						Address:    addr,
						Url:        url,
						Operator:   addr,
						Status:     2,
						StatusText: "Operational",
					},
					Local: true,
					Http11: statusinfo.HttpResult{
						Success:    true,
						Status:     200,
						StatusText: "OK",
						Elapsed:    dd,
						Response: statusinfo.StatusResponse{
							Status:     "OK",
							InstanceId: addr,
							Address:    addr,
							Version:    "1.2.3",
							StartTime:  tt,
							Uptime:     dd,
							Graffiti:   "graffiti",
						},
					},
					Grpc: statusinfo.GrpcResult{
						Success:    true,
						StatusText: "OK",
						Elapsed:    dd,
						Version:    "1.2.3",
						StartTime:  tt,
						Uptime:     dd,
						Graffiti:   "graffiti",
					},
				},
			},
			QueryTime: tt,
			Elapsed:   dd,
		},
	}

	_, err := render.Execute(&payload)
	require.NoError(t, err)
}
