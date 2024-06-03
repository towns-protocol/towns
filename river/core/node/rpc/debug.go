package rpc

import (
	"bufio"
	"bytes"
	"fmt"
	"net/http"
	"net/http/pprof"
	"runtime"
	"slices"
	"strings"
	"time"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/rpc/render"
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
		dlog.FromCtx(ctx).Error("unable to read memory stats", "err", err)
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

func (s *Service) registerDebugHandlers(enableDebugEndpoints bool) {
	mux := s.mux
	handler := debugHandler{}
	mux.HandleFunc("/debug", handler.ServeHTTP)
	handler.HandleFunc(mux, "/debug/multi", s.handleDebugMulti)
	handler.HandleFunc(mux, "/debug/multi/json", s.handleDebugMultiJson)

	if enableDebugEndpoints {
		handler.Handle(mux, "/debug/cache", &cacheHandler{cache: s.cache})
		handler.Handle(mux, "/debug/txpool", &txpoolHandler{riverTxPool: s.riverChain.TxPool})
		handler.Handle(mux, "/debug/config", &onChainConfigHandler{onChainConfig: s.chainConfig})
		handler.HandleFunc(mux, "/debug/memory", MemoryHandler)
		handler.HandleFunc(mux, "/debug/pprof/", pprof.Index)
		mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
		handler.HandleFunc(mux, "/debug/stacks", HandleStacksHandler)
	}
}

func HandleStacksHandler(w http.ResponseWriter, r *http.Request) {
	var (
		ctx          = r.Context()
		buf          = make([]byte, 1024*1024)
		stackSize    = runtime.Stack(buf, true)
		traceScanner = bufio.NewScanner(bytes.NewReader((buf[:stackSize])))
		reply        render.GoRoutineData
	)

	traceScanner.Split(bufio.ScanLines)

	for traceScanner.Scan() {
		stack, err := readGoRoutineStackFrame(traceScanner)
		if err != nil {
			dlog.FromCtx(ctx).Error("unable to read stack frame", "err", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		reply.Stacks = append(reply.Stacks, stack)
	}

	output, err := render.Execute(&reply)
	if err != nil {
		dlog.FromCtx(ctx).Error("unable to render stack data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
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

	reply.Config, err = h.onChainConfig.All()
	if err != nil {
		dlog.FromCtx(ctx).Error("unable to obtain on-chain-config data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	output, err := render.Execute(&reply)
	if err != nil {
		dlog.FromCtx(ctx).Error("unable to render on-chain-config data", "err", err)
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
		dlog.FromCtx(ctx).Error("unable to render transaction pool data", "err", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(output.Bytes())
}

type cacheHandler struct {
	cache StreamCache
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

	slices.SortFunc(streams, func(a, b StreamView) int {
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
		dlog.FromCtx(ctx).Error("unable to render cache data", "err", err)
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
