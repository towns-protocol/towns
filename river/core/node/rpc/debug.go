package rpc

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/pprof"
	"runtime"
	runtimePProf "runtime/pprof"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/rpc/render"
	"github.com/river-build/river/core/node/scrub"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

type debugHandler struct {
	patterns []string
}

func (h *debugHandler) HandleFunc(mux httpMux, pattern string, handler func(http.ResponseWriter, *http.Request)) {
	h.patterns = append(h.patterns, pattern)
	mux.HandleFunc(pattern, handler)
}

func (h *debugHandler) Handle(mux httpMux, pattern string, handler http.Handler) {
	h.patterns = append(h.patterns, pattern)
	mux.Handle(pattern, handler)
}

func (h *debugHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx   = r.Context()
		reply = render.AvailableDebugHandlersData{
			Handlers: h.patterns,
		}
	)

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to read memory stats", "err", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type httpMux interface {
	HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request))
	Handle(pattern string, handler http.Handler)
}

func (s *Service) registerDebugHandlers(enableDebugEndpoints bool, cfg config.DebugEndpointsConfig) {
	mux := s.mux
	handler := debugHandler{}
	mux.HandleFunc("/debug", handler.ServeHTTP)
	handler.HandleFunc(mux, "/debug/multi", s.handleDebugMulti)
	handler.HandleFunc(mux, "/debug/multi/json", s.handleDebugMultiJson)
	handler.Handle(mux, "/debug/config", &onChainConfigHandler{onChainConfig: s.chainConfig})

	if cfg.EnableStorageEndpoint || enableDebugEndpoints {
		handler.HandleFunc(mux, "/debug/storage", s.handleDebugStorage)
	}

	if cfg.Cache || enableDebugEndpoints {
		handler.Handle(mux, "/debug/cache", &cacheHandler{cache: s.cache})
	}

	if cfg.Memory || enableDebugEndpoints {
		handler.HandleFunc(mux, "/debug/stats", StatsHandler)
	}

	if cfg.PProf || enableDebugEndpoints {
		handler.HandleFunc(mux, "/debug/pprof/", pprof.Index)
		mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	}

	if cfg.Stacks || enableDebugEndpoints {
		handler.Handle(mux, "/debug/stacks", &stacksHandler{maxSizeKb: cfg.StacksMaxSizeKb})
		handler.HandleFunc(mux, "/debug/stacks2", stacks2Handler)
	}

	if cfg.TxPool || enableDebugEndpoints {
		handler.Handle(mux, "/debug/txpool", &txpoolHandler{riverTxPool: s.riverChain.TxPool})
	}

	if cfg.Stream || enableDebugEndpoints {
		handler.Handle(mux, "/debug/stream/{streamIdStr}", &streamHandler{store: s.storage})
	}
	if s.mode == ServerModeArchive && (cfg.CorruptStreams || enableDebugEndpoints) {
		handler.Handle(mux, "/debug/corrupt_streams", &corruptStreamsHandler{service: s.Archiver})
	}
}

type corruptStreamsHandler struct {
	service scrub.CorruptStreamTrackingService
}

func (h *corruptStreamsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx   = r.Context()
		reply render.CorruptStreamData
	)

	corruptStreams := h.service.GetCorruptStreams(ctx)
	reply.Streams = make([]render.DebugCorruptStreamRecord, len(corruptStreams))
	for i, stream := range corruptStreams {
		addressStrings := make([]string, len(stream.Nodes))
		for i, node := range stream.Nodes {
			addressStrings[i] = node.String()
		}
		sort.Strings(addressStrings)
		reply.Streams[i] = render.DebugCorruptStreamRecord{
			StreamId:             stream.StreamId.String(),
			Nodes:                strings.Join(addressStrings, ","),
			MostRecentBlock:      stream.MostRecentBlock,
			MostRecentLocalBlock: stream.MostRecentLocalBlock,
			FirstCorruptBlock:    stream.FirstCorruptBlock,
			CorruptionReason:     stream.CorruptionReason,
		}
	}
	slices.SortFunc(
		reply.Streams,
		func(a, b render.DebugCorruptStreamRecord) int {
			// Sort first by nodes, then by stream id, lexicographically
			if a.Nodes == b.Nodes {
				if a.StreamId == b.StreamId {
					return 0
				}
				if a.StreamId < b.StreamId {
					return -1
				}
				return 1
			}
			if a.Nodes < b.Nodes {
				return -1
			}
			return 1
		},
	)

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render stack data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type stacksHandler struct {
	maxSizeKb int
}

func (h *stacksHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stacksSize := h.maxSizeKb * 1024
	if stacksSize == 0 {
		stacksSize = 1024 * 1024
	}

	var (
		ctx          = r.Context()
		buf          = make([]byte, stacksSize)
		stackSize    = runtime.Stack(buf, true)
		traceScanner = bufio.NewScanner(bytes.NewReader((buf[:stackSize])))
		reply        render.GoRoutineData
	)

	traceScanner.Split(bufio.ScanLines)

	for traceScanner.Scan() {
		stack, err := readGoRoutineStackFrame(traceScanner)
		if err != nil {
			logging.FromCtx(ctx).Errorw("unable to read stack frame", "err", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		reply.Stacks = append(reply.Stacks, stack)
	}

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render stack data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type streamHandler struct {
	store storage.StreamStorage
}

func (s *streamHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx      = r.Context()
		reply    = render.StreamSummaryData{}
		err      error
		streamId shared.StreamId
		result   *storage.DebugReadStreamStatisticsResult
		log      = logging.FromCtx(ctx).With("func", "streamHandler.ServeHTTP")
	)

	streamIdStr := r.PathValue("streamIdStr")

	if streamId, err = shared.StreamIdFromString(streamIdStr); err != nil {
		log.Errorw(
			"unable to convert url value to streamId",
			"err",
			err,
			"streamIdString",
			streamIdStr)
		http.Error(w, fmt.Sprintf("Stream id is not parsable: `%v`", err), http.StatusInternalServerError)
		return
	}

	if result, err = s.store.DebugReadStreamStatistics(ctx, streamId); err != nil {
		if base.AsRiverError(err).Code == protocol.Err_NOT_FOUND {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintln(w, "404 - Stream does not exist")
			return

		} else {
			log.Errorw("unable to read stream statistics from db", "err", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		}
		return

	}
	reply.Result = *result
	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render transaction pool data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

func stacks2Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	p := runtimePProf.Lookup("goroutine")
	if p == nil {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintln(w, "Unknown profile")
		return
	}
	_ = p.WriteTo(w, 1)
}

type onChainConfigHandler struct {
	onChainConfig crypto.OnChainConfiguration
}

func (h *onChainConfigHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx   = r.Context()
		reply render.OnChainConfigData
		err   error
	)

	reply.CurrentBlockNumber = h.onChainConfig.ActiveBlock()
	settings := h.onChainConfig.All()
	bb, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to marshall on-chain-config data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	reply.Config = string(bb)

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render on-chain-config data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type txpoolHandler struct {
	riverTxPool crypto.TransactionPool
}

func (h *txpoolHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx   = r.Context()
		reply = render.TransactionPoolData{}
	)

	reply.River.ProcessedTransactions = h.riverTxPool.ProcessedTransactionsCount()
	reply.River.PendingTransactions = h.riverTxPool.PendingTransactionsCount()
	reply.River.ReplacementTransactionsCount = h.riverTxPool.ReplacementTransactionsCount()
	if reply.River.ReplacementTransactionsCount > 0 {
		reply.River.LastReplacementTransaction = time.Unix(h.riverTxPool.LastReplacementTransactionUnix(), 0).
			Format(time.RFC3339)
	}

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render transaction pool data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type cacheHandler struct {
	cache *StreamCache
}

func (h *cacheHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var (
		ctx         = r.Context()
		streams     = h.cache.GetLoadedViews(ctx)
		streamCount = len(streams)
		reply       = render.CacheData{
			ShowStreams: r.URL.Query().Get("streams") == "1",
		}
	)

	if streamCount > 10000 {
		streamCount = 10000
	}

	if reply.ShowStreams {
		reply.Streams = make([]*render.CacheDataStream, streamCount)
	}

	slices.SortFunc(streams, func(a, b *StreamView) int {
		return a.StreamId().Compare(*b.StreamId())
	})

	for i, view := range streams {
		stats := view.GetStats()

		reply.TotalEventsEver += int64(stats.TotalEventsEver)
		reply.MiniBlocksCount += stats.LastMiniblockNum - stats.FirstMiniblockNum + 1
		reply.EventsInMiniblocks += int64(stats.EventsInMiniblocks)
		reply.SnapshotsInMiniblocks += int64(stats.SnapshotsInMiniblocks)
		reply.EventsInMinipools += int64(stats.EventsInMinipool)

		if stats.FirstMiniblockNum != 0 {
			reply.TrimmedStreams += 1
		}

		if reply.ShowStreams && i < streamCount {
			reply.Streams[i] = &render.CacheDataStream{
				StreamID:              view.StreamId().String(),
				MiniBlocks:            stats.LastMiniblockNum - stats.FirstMiniblockNum + 1,
				FirstMiniblockNum:     stats.FirstMiniblockNum,
				LastMiniblockNum:      stats.LastMiniblockNum,
				EventsInMiniblocks:    int64(stats.EventsInMiniblocks),
				SnapshotsInMiniblocks: int64(stats.SnapshotsInMiniblocks),
				EventsInMinipool:      int64(stats.EventsInMinipool),
				TotalEventsEver:       int64(stats.TotalEventsEver),
			}
		}
	}

	output, err := render.Execute(&reply)
	if err != nil {
		logging.FromCtx(ctx).Errorw("unable to render cache data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

func readGoRoutineStackFrame(trace *bufio.Scanner) (*render.GoRoutineStack, error) {
	var (
		head = trace.Text()
		data render.GoRoutineStack
	)

	if !strings.HasPrefix(head, "goroutine ") {
		return nil, fmt.Errorf("expected goroutine header, got %q", head)
	}

	data.Description = head

	for trace.Scan() {
		line := trace.Text()
		if line == "" { // marks end of the frame
			return &data, nil
		}
		data.Lines = append(data.Lines, line)
	}
	return &data, nil
}
