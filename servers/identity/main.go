package main

import (
	"context"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		return
	}

	w.Write([]byte("foo"))
}

// A very simple failure sample to test logging of internal server errors
func forcedError(w http.ResponseWriter, r *http.Request) {
	panic("forcedError")
}

// A very simple health check.
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// In the future we could report back on the status of our DB, or our cache
	// by performing a simple operation, and include them in the response.
	io.WriteString(w, `{"alive": true}`)
}

func main() {
	// load .env file
	err := godotenv.Load(".env")

	if err != nil {
		logrus.Fatalf("Error loading .env file")
	}

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	messages := make(chan string)

	r := mux.NewRouter()
	r.Use(LoggingMiddleware)
	r.HandleFunc("/", handler).Methods(http.MethodGet, http.MethodOptions)
	r.HandleFunc("/health", healthCheckHandler).Methods(http.MethodGet, http.MethodOptions)
	r.HandleFunc("/error", forcedError).Methods(http.MethodGet, http.MethodOptions)
	r.Use(mux.CORSMethodMiddleware(r))

	srv := &http.Server{
		Addr: os.Getenv("listenAddr"),
		// Good practice to set timeouts to avoid Slowloris attacks.
		WriteTimeout: time.Second * 15,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Second * 60,
		Handler:      r, // Pass our instance of gorilla/mux in.
	}

	go func() {
		sig := <-sigs
		logrus.Infoln("Signal received", sig)
		srv.Shutdown(context.TODO())
	}()

	// Run our server in a goroutine so that it doesn't block.
	go func() {
		if err := srv.ListenAndServeTLS(os.Getenv("certFile"), os.Getenv("keyFile")); err != nil {
			logrus.Println(err)
		}
		messages <- "shutdown"
	}()

	logrus.Infoln("Identity Server started")
	msg := <-messages
	logrus.Println(msg)
}
