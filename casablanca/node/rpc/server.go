package rpc

import (
	"casablanca/node/auth"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/events"
	"casablanca/node/nodes"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"

	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/cors"
	"golang.org/x/exp/slog"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func loadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNode *nodes.LocalNode) (nodes.NodeRegistry, error) {
	log := dlog.CtxLog(ctx)

	if nodeRegistryPath == "" {
		log.Warn("No node registry path specified, running in single node configuration")
		return nodes.MakeSingleNodeRegistry(ctx, localNode), nil
	}

	log.Info("Loading node registry", "path", nodeRegistryPath)
	return nodes.LoadNodeRegistry(ctx, nodeRegistryPath, localNode)
}

func createStore(ctx context.Context, dbUrl string, storageType string, address string) (storage.StreamStorage, error) {
	log := dlog.CtxLog(ctx)
	if storageType == "in-memory" {
		log.Warn("Using in-memory storage")
		return storage.NewMemStorage(), nil
	} else {
		schema := storage.DbSchemaNameFromAddress(address)
		store, err := storage.NewPostgresEventStore(ctx, dbUrl, schema, false)
		if err != nil {
			return nil, err
		}

		streamsCount, err := store.GetStreamsNumber(ctx)
		if err != nil {
			return nil, err
		}

		log.Info("Created postgres event store", "schema", schema)
		log.Info("Current number of streams in the store", "totalStreamsCount", streamsCount)
		return store, nil
	}
}

func StartServer(ctx context.Context, cfg *config.Config, wallet *crypto.Wallet) (func(), int, chan error, error) {
	log := dlog.CtxLog(ctx)

	log.Info("Starting server", "config", cfg)

	if wallet == nil {
		var err error
		wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		if err != nil {
			return nil, 0, nil, err
		}
	}

	if cfg.LogInstance {
		log = log.With("instance", fmt.Sprintf("%s on %d", wallet.AddressStr, cfg.Port))
		slog.SetDefault(log)
		ctx = dlog.CtxWithLog(ctx, log)
	}

	store, err := createStore(ctx, cfg.DbUrl, cfg.StorageType, wallet.AddressStr)
	if err != nil {
		return nil, 0, nil, err
	}

	var townsContract auth.TownsContract
	if cfg.UseContract {
		log.Info("Using casablanca auth", "chain_config", cfg.Chain)
		townsContract, err = auth.NewTownsContract(&cfg.Chain)
		if err != nil {
			log.Error("failed to create auth", "error", err)
			return nil, 0, nil, err
		}
	} else {
		log.Warn("Using passthrough auth")
		townsContract = auth.NewTownsPassThrough()
	}

	var walletLinkContract auth.WalletLinkContract
	if cfg.UseContract {
		log.Info("Using wallet link contract on", "chain_config", cfg.TopChain)
		walletLinkContract, err = auth.NewTownsWalletLink(&cfg.TopChain, wallet)
		if err != nil {
			log.Error("failed to create wallet link contract", "error", err)
			return nil, 0, nil, err
		}
	} else {
		log.Warn("Using no-op wallet linking contract")
	}

	streamService := &Service{
		cache: events.NewStreamCache(
			&events.StreamCacheParams{
				Storage:    store,
				Wallet:     wallet,
				DefaultCtx: ctx,
			},
		),
		townsContract:      townsContract,
		walletLinkContract: walletLinkContract,
		wallet:             wallet,
		skipDelegateCheck:  cfg.SkipDelegateCheck,
		exitSignal:         make(chan error, 1),
	}

	streamService.nodeRegistry, err = loadNodeRegistry(
		ctx,
		cfg.NodeRegistry,
		&nodes.LocalNode{
			NodeAddress: wallet.AddressStr,
			Stub:        streamService,
			Syncer:      streamService,
		},
	)
	if err != nil {
		return nil, 0, nil, err
	}
	streamService.streamRegistry = nodes.NewStreamRegistry(streamService.nodeRegistry)

	forwarder := NewForwarder(streamService.nodeRegistry, streamService.streamRegistry)

	pattern, handler := protocolconnect.NewStreamServiceHandler(forwarder)

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
		return nil, 0, nil, err
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
	return closer, actualPort, streamService.exitSignal, nil
}

func RunServer(ctx context.Context, config *config.Config) error {
	log := dlog.CtxLog(ctx)

	closer, _, exitSignal, error := StartServer(ctx, config, nil)
	if error != nil {
		log.Error("Failed to start server", "error", error)
		return error
	}
	defer closer()

	osSignal := make(chan os.Signal, 1)
	signal.Notify(osSignal, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-osSignal
		log.Info("Got OS signal", "signal", sig.String())
		exitSignal <- nil
	}()

	return <-exitSignal
}
