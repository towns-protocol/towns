package rpc

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"

	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/cors"
	"golang.org/x/net/http2"
)

func StartServer(ctx context.Context, cfg *config.Config, wallet *crypto.Wallet) (func(), int, error) {
	log := dlog.CtxLog(ctx)

	var chainConfig *config.ChainConfig
	var topChainConfig *config.ChainConfig
	if cfg.UseContract {
		chainConfig = &cfg.Chain
		topChainConfig = &cfg.TopChain
	}

	pattern, handler, err := MakeServiceHandler(context.Background(), log, cfg.DbUrl, cfg.StorageType, chainConfig, topChainConfig, wallet, cfg.SkipDelegateCheck)
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

	corsMiddleware := cors.New(cors.Options{
		AllowCredentials: false,
		Debug:            false,
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:   []string{"Origin", "X-Requested-With", "Accept", "Content-Type", "X-Grpc-Web", "X-User-Agent", "Connect-Protocol-Version"},
	})

	srv := &http.Server{
		Addr:    address,
		Handler: corsMiddleware.Handler(mux),
	}

	// Configure for HTTP/2
	err = http2.ConfigureServer(srv, nil)
	if err != nil {
		log.Error("Failed to configure HTTP/2", "error", err)
		return nil, 0, err
	}

	// Closure to shutdown the server gracefully
	closer := func() {
		log.Info("closing server")
		err := srv.Shutdown(ctx)
		if err != nil {
			log.Error("failed to shutdown server", "error", err)
			panic(err)
		}
	}

	// Run the server with TLS
	go func() {
		err := srv.ListenAndServeTLS("../cert.pem", "../key.pem")
		if err != nil && err != http.ErrServerClosed {
			log.Error("Server failed", "error", err)
			os.Exit(1)
		}
		log.Info("Server stopped", "reason", err)
	}()

	log.Info("Listening", "addr", address)
	log.Info("Using DB", "url", cfg.DbUrl)
	if cfg.UseContract {
		log.Info("Using chain", "id", cfg.Chain.ChainId)
	} else {
		log.Info("Running Without Entitlements")
	}

	return closer, cfg.Port, nil
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
