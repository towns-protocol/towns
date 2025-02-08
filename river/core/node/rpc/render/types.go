package render

import (
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/rpc/statusinfo"
	"github.com/towns-protocol/towns/core/node/storage"
)

// RenderableData is the interface for all data that can be rendered
type RenderableData interface {
	*AvailableDebugHandlersData |
		*CacheData |
		*TransactionPoolData |
		*OnChainConfigData |
		*GoRoutineData |
		*SystemStatsData |
		*InfoIndexData |
		*DebugMultiData |
		*StorageData |
		*StreamSummaryData |
		*CorruptStreamData

	// TemplateName returns the name of the template to be used for rendering
	TemplateName() string
}

// DebugCorruptStreamRecord represents all the same information as scrub.CorruptStreamRecord,
// but here all non-trivial types have been converted to strings for ease of html template
// rendering.
type DebugCorruptStreamRecord struct {
	StreamId             string
	Nodes                string
	MostRecentBlock      int64
	MostRecentLocalBlock int64
	FirstCorruptBlock    int64
	CorruptionReason     string
}

type CorruptStreamData struct {
	Streams []DebugCorruptStreamRecord
}

func (d CorruptStreamData) TemplateName() string {
	return "templates/debug/corruptStreams.template.html"
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

type StreamSummaryData struct {
	Result storage.DebugReadStreamStatisticsResult
}

func (d StreamSummaryData) TemplateName() string {
	return "templates/debug/stream.template.html"
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
type SystemStatsData struct {
	// Stats specific to this process
	MemAlloc      uint64
	TotalAlloc    uint64
	Sys           uint64
	NumLiveObjs   uint64
	NumGoroutines int

	// System-wide
	TotalMemory     uint64
	UsedMemory      uint64
	AvailableMemory uint64
	CpuUsagePercent float64
}

func (d SystemStatsData) TemplateName() string {
	return "templates/debug/stats.template.html"
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

type StorageData struct {
	Status *storage.PostgresStatusResult
}

func (s StorageData) TemplateName() string {
	return "templates/debug/storage.template.html"
}

type OnChainConfigData struct {
	CurrentBlockNumber crypto.BlockNumber
	Config             string
}

func (d OnChainConfigData) TemplateName() string {
	return "templates/debug/on-chain-config.template.html"
}
