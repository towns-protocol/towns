package rpc

import (
	"net/http"
	"runtime"

	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/rpc/render"
)

func MemoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("gcnow") == "true" {
		runtime.GC()
	}

	var (
		ctx           = r.Context()
		numGoroutines = runtime.NumGoroutine()
		m             runtime.MemStats
	)

	runtime.ReadMemStats(&m)

	reply := render.MemStatsData{
		MemAlloc:      m.Alloc,
		TotalAlloc:    m.TotalAlloc,
		Sys:           m.Sys,
		NumLiveObjs:   m.Mallocs - m.Frees,
		NumGoroutines: numGoroutines,
	}

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
