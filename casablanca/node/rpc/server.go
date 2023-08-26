package rpc

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"

	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func StartServer(ctx context.Context, cfg *config.Config, wallet *crypto.Wallet) (func(), int, error) {
	log := dlog.CtxLog(ctx)

	var chainConfig *config.ChainConfig
	if cfg.UseContract {
		chainConfig = &cfg.Chain
	}

	pattern, handler, err := MakeServiceHandler(context.Background(), log, cfg.DbUrl, cfg.StorageType, chainConfig, wallet, cfg.SkipDelegateCheck)
	if err != nil {
		return nil, 0, err
	}

	mux := http.NewServeMux()
	log.Info("Registering handler", "pattern", pattern)
	mux.Handle(pattern, handler)

	mux.HandleFunc("/info", func(w http.ResponseWriter, r *http.Request) {
		// TODO: reply with graffiti from config and with node version
		log.Debug("Got request for /info", "request", *r)
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("All good in the Towns land!\n"))
		if err != nil {
			log.Warn("Failed to write response", "error", err, "request", *r)
		}
	})

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	httpListener, err := net.Listen("tcp", address)
	if err != nil {
		log.Error("failed to listen", "error", err)
		return nil, 0, err
	}
	actualPort := httpListener.Addr().(*net.TCPAddr).Port

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
		log.Info("Server stopped", "reason", err)
	}()
	closer := func() {
		log.Info("closing server")
		err := srv.Shutdown(ctx)
		if err != nil {
			log.Error("failed to shutdown server", "error", err)
			panic(err)
		}
	}

	log.Info("Listening", "addr", address+pattern)
	log.Info("Using DB", "url", cfg.DbUrl)
	if cfg.UseContract {
		log.Info("Using chain", "id", cfg.Chain.ChainId)
	} else {
		log.Info("Running Without Entitlements")
	}
	log.Info("Available on port", "port", actualPort)
	return closer, actualPort, nil
}

func RunServer(ctx context.Context, config *config.Config) error {
	closer, _, error := StartServer(ctx, config, nil)
	if error != nil {
		return error
	}
	defer closer()

	exitSignal := make(chan os.Signal, 1)
	signal.Notify(exitSignal, syscall.SIGINT, syscall.SIGTERM)
	<-exitSignal

	return nil
}
