package rpc

import (
	"net/http"
	"runtime"
	"time"

	psutilCpu "github.com/shirou/gopsutil/cpu"
	psutilMem "github.com/shirou/gopsutil/mem"

	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/rpc/render"
)

func StatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("gcnow") == "true" {
		runtime.GC()
	}

	var (
		ctx           = r.Context()
		numGoroutines = runtime.NumGoroutine()
		m             runtime.MemStats
	)

	runtime.ReadMemStats(&m)

	// Get memory stats
	v, _ := psutilMem.VirtualMemory()

	// Get CPU stats
	cpuPercentages, _ := psutilCpu.Percent(time.Second, false)

	reply := render.SystemStatsData{
		MemAlloc:        m.Alloc,
		TotalAlloc:      m.TotalAlloc,
		Sys:             m.Sys,
		NumLiveObjs:     m.Mallocs - m.Frees,
		NumGoroutines:   numGoroutines,
		TotalMemory:     v.Total,
		UsedMemory:      v.Used,
		AvailableMemory: v.Available,
		CpuUsagePercent: cpuPercentages[0],
	}

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
