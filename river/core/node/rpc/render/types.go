package render

import (
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/rpc/statusinfo"
)

// RenderableData is the interface for all data that can be rendered
type RenderableData interface {
	*AvailableDebugHandlersData | *CacheData | *TransactionPoolData | *OnChainConfigData |
		*GoRoutineData | *MemStatsData | *InfoIndexData | *DebugMultiData

	// TemplateName returns the name of the template to be used for rendering
	TemplateName() string
}

type CacheData struct {
	MiniBlocksCount       int64
	TotalEventsCount      int64
	EventsInMiniblocks    int64
	SnapshotsInMiniblocks int64
	EventsInMinipools     int64
	TrimmedStreams        int64
	TotalEventsEver       int64
	ShowStreams           bool
	Streams               []*CacheDataStream
}

func (d CacheData) TemplateName() string {
	return "templates/debug/cache.template.html"
}

type CacheDataStream struct {
	StreamID              string
	FirstMiniblockNum     int64
	LastMiniblockNum      int64
	MiniBlocks            int64
	EventsInMiniblocks    int64
	SnapshotsInMiniblocks int64
	EventsInMinipool      int64
	TotalEventsEver       int64
}

type GoRoutineData struct {
	Stacks []*GoRoutineStack
}

type TransactionPoolData struct {
	River struct {
		ProcessedTransactions        int64
		PendingTransactions          int64
		ReplacementTransactionsCount int64
		LastReplacementTransaction   string
	}
}

func (d TransactionPoolData) TemplateName() string {
	return "templates/debug/txpool.template.html"
}

func (d GoRoutineData) TemplateName() string {
	return "templates/debug/stacks.template.html"
}

type GoRoutineStack struct {
	Description string
	Lines       []string
}

// Struct for memory stats
type MemStatsData struct {
	MemAlloc      uint64
	TotalAlloc    uint64
	Sys           uint64
	NumLiveObjs   uint64
	NumGoroutines int
}

func (d MemStatsData) TemplateName() string {
	return "templates/debug/memory.template.html"
}

type AvailableDebugHandlersData struct {
	Handlers []string
}

func (d AvailableDebugHandlersData) TemplateName() string {
	return "templates/debug/available.template.html"
}

type InfoIndexData struct {
	Status     int
	StatusJson string
}

func (d InfoIndexData) TemplateName() string {
	return "templates/info/index.template.html"
}

type DebugMultiData struct {
	Status *statusinfo.RiverStatus
}

func (d DebugMultiData) TemplateName() string {
	return "templates/debug/multi.template.html"
}

type OnChainConfigData struct {
	Config *crypto.AllSettings
}

func (d OnChainConfigData) TemplateName() string {
	return "templates/debug/on-chain-config.template.html"
}
