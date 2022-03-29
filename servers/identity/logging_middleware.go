package main

import (
	"net/http"
	"runtime/debug"
	"time"

	"github.com/sirupsen/logrus"
)

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		defer func() {
			if err := recover(); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				logrus.WithFields(logrus.Fields{
					"status":   http.StatusInternalServerError,
					"method":   r.Method,
					"proto":    r.Proto,
					"path":     r.URL.EscapedPath(),
					"duration": time.Since(start),
					"trace":    debug.Stack(),
				}).Error(err)
			}
		}()

		wrapped := NewResponseWriter(w)
		next.ServeHTTP(wrapped, r)
		logrus.WithFields(logrus.Fields{
			"status":   wrapped.Status(),
			"size":     wrapped.Size(),
			"method":   r.Method,
			"proto":    r.Proto,
			"path":     r.URL.EscapedPath(),
			"duration": time.Since(start),
		}).Println()
	})
}
