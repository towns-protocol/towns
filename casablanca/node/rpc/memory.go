package rpc

import (
	"html/template"
	"net/http"
	"runtime"
)

// HTML template for displaying stats and triggering GC
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>Resource Usage</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { width: 80%; margin: 0 auto; }
        .stats { margin-top: 20px; }
        #loading { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Node Process Resource Usage</h1>
        <div class="stats">
            <strong>Memory Allocated:</strong> {{.MemAlloc}} bytes<br>
            <strong>Total Memory Allocated:</strong> {{.TotalAlloc}} bytes<br>
            <strong>Memory Sys:</strong> {{.Sys}} bytes<br>
            <strong>Number of Live Objects:</strong> {{.NumLiveObjs}}<br>
            <strong>Number of Goroutines:</strong> {{.NumGoroutines}}<br>
        </div>
        <form onsubmit="return triggerGC()">
            <button type="submit">Trigger GC</button>
        </form>
        <div id="loading">Performing garbage collection...</div>
    </div>
    <script>
        function triggerGC() {
            document.getElementById('loading').style.display = 'block';
            fetch('/memory?gcnow=true')
                .then(response => response.text())
                .then(html => {
                    document.open();
                    document.write(html);
                    document.close();
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('loading').style.display = 'none';
                });
            return false; // Prevent default form submission
        }
    </script>
</body>
</html>
`

// Struct for memory stats
type MemStats struct {
	MemAlloc      uint64
	TotalAlloc    uint64
	Sys           uint64
	NumLiveObjs   uint64
	NumGoroutines int
}

// Function to get memory stats
func getMemStats() MemStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	numGoroutines := runtime.NumGoroutine()

	return MemStats{
		MemAlloc:      m.Alloc,
		TotalAlloc:    m.TotalAlloc,
		Sys:           m.Sys,
		NumLiveObjs:   m.Mallocs - m.Frees,
		NumGoroutines: numGoroutines,
	}
}

// Initializes the template and returns a HTTP handler function
func MemoryHandler() http.HandlerFunc {
	tmpl, err := template.New("stats").Parse(htmlTemplate)
	if err != nil {
		// Return a simple handler that always responds with a 500 error
		return func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	} else {
		return func(w http.ResponseWriter, r *http.Request) {
			// Check if GC should be triggered
			if r.URL.Query().Get("gcnow") == "true" {
				runtime.GC()
			}

			stats := getMemStats()
			err := tmpl.Execute(w, stats) // Use the pre-parsed template
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}
	}
}
