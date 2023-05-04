package rpc

import (
	"casablanca/node/config"

	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/cors"
	log "github.com/sirupsen/logrus"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func StartServer(ctx context.Context, cfg *config.Config) (closer func(), actualPort int) {
	var chainConfig *config.ChainConfig
	if cfg.Authorization {
		chainConfig = &cfg.Chain
	}

	pattern, handler := MakeServiceHandler(context.Background(), cfg.DbUrl, chainConfig)
	mux := http.NewServeMux()
	log.Info("Registering handler for ", pattern)
	mux.Handle(pattern, handler)

	mux.HandleFunc("/info", func(w http.ResponseWriter, r *http.Request) {
		// TODO: reply with graffiti from config and with node version
		log.Tracef("Got request for /info %v", *r)
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("All good in the Towns land!\n"))
		if err != nil {
			log.Warnf("Failed to write response: %v\nfor request: %v", err, *r)
		}
	})

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	httpListener, err := net.Listen("tcp", address)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	actualPort = httpListener.Addr().(*net.TCPAddr).Port

	corsMiddleware := cors.New(cors.Options{
		AllowCredentials: false,
		Debug:            false,
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:   []string{"Origin", "X-Requested-With", "Accept", "Content-Type", "X-Grpc-Web", "X-User-Agent", "Connect-Protocol-Version"},
	})

	// For gRPC clients, it's convenient to support HTTP/2 without TLS. You can
	// avoid x/net/http2 by using http.ListenAndServeTLS.
	srv := &http.Server{Handler: h2c.NewHandler(corsMiddleware.Handler(mux), &http2.Server{})}
	go func() {
		err := srv.Serve(httpListener)
		log.Infof("Server stopped: %v", err)
	}()
	closer = func() {
		log.Info("closing server")
		err := srv.Shutdown(ctx)
		if err != nil {
			log.Fatalf("failed to shutdown server: %v", err)
		}
	}

	log.Printf("Listening on %s%s", address, pattern)
	log.Printf("Using DB at %s", cfg.DbUrl)
	return
}

func RunServer(config *config.Config) {
	closer, _ := StartServer(context.Background(), config)
	defer closer()

	exitSignal := make(chan os.Signal, 1)
	signal.Notify(exitSignal, syscall.SIGINT, syscall.SIGTERM)
	<-exitSignal
}
