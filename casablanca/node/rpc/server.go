package rpc

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"connectrpc.com/connect"
	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/events"
	"github.com/river-build/river/nodes"
	"github.com/river-build/river/protocol/protocolconnect"
	"github.com/river-build/river/registries"
	"github.com/river-build/river/storage"

	"github.com/rs/cors"
	"golang.org/x/exp/slog"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	httptrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/net/http"
)

type Cleanup func(context.Context) error

func loadNodeRegistry(
	ctx context.Context,
	nodeRegistryPath string,
	nodeRegistryCsv string,
	localNodeAddress string,
) (nodes.NodeRegistry, error) {
	log := dlog.FromCtx(ctx)

	if nodeRegistryCsv != "" {
		log.Info("Node registry constructed from CSV", "csb", nodeRegistryCsv)
		return nodes.NewNodeRegistryFromString(ctx, nodeRegistryCsv, localNodeAddress)
	} else if nodeRegistryPath != "" {
		log.Info("Loading node registry", "path", nodeRegistryPath)
		return nodes.LoadNodeRegistry(ctx, nodeRegistryPath, localNodeAddress)
	} else {
		log.Warn("No node registry path specified, running in single node configuration")
		return nodes.MakeSingleNodeRegistry(ctx, localNodeAddress), nil
	}
}

func getDbURL(dbConfig config.DatabaseConfig) string {
	if dbConfig.Password != "" {
		return fmt.Sprintf(
			"postgresql://%s:%s@%s:%d/%s%s",
			dbConfig.User,
			dbConfig.Password,
			dbConfig.Host,
			dbConfig.Port,
			dbConfig.Database,
			dbConfig.Extra,
		)
	}

	return dbConfig.Url
}

func createStore(
	ctx context.Context,
	dbConfig config.DatabaseConfig,
	storageType string,
	address string,
	instanceId string,
	exitSignal chan error,
) (storage.StreamStorage, Cleanup, error) {
	log := dlog.FromCtx(ctx)
	if storageType == "in-memory" {
		log.Warn("Using in-memory storage")
		return storage.NewMemStorage(), nil, nil
	} else {
		dbUrl := getDbURL(dbConfig)
		schema := storage.DbSchemaNameFromAddress(address)
		store, err := storage.NewPostgresEventStore(ctx, dbUrl, schema, instanceId, false, exitSignal)
		if err != nil {
			return nil, nil, err
		}

		streamsCount, err := store.GetStreamsNumber(ctx)
		if err != nil {
			return nil, nil, err
		}

		log.Info("Created postgres event store", "schema", schema)
		log.Info("Current number of streams in the store", "totalStreamsCount", streamsCount)
		cleaner := func(ctx context.Context) error {
			return store.CleanupStorage(ctx)
		}
		return store, cleaner, nil
	}
}

func StartServer(ctx context.Context, cfg *config.Config, wallet *crypto.Wallet) (func(), int, chan error, error) {
	log := dlog.FromCtx(ctx)

	privKey := cfg.WalletPrivateKey
	cfg.WalletPrivateKey = ""

	log.Info("Starting server", "config", cfg)

	var err error
	if wallet == nil {
		if privKey != "" {
			wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
		} else {
			wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		}
		if err != nil {
			return nil, 0, nil, err
		}
	}

	instanceId := GenShortNanoid()
	log = log.With(
		"nodeAddress", wallet.AddressStr,
		"port", cfg.Port,
		"instanceId", instanceId,
	)
	ctx = dlog.CtxWithLog(ctx, log)
	slog.SetDefault(log)

	ctx = config.CtxWithConfig(ctx, cfg)

	exitSignal := make(chan error, 1)

	store, storageCleaner, err := createStore(ctx, cfg.Database, cfg.StorageType, wallet.AddressStr, instanceId, exitSignal)
	if err != nil {
		return nil, 0, nil, err
	}

	var authChecker auth.AuthChecker
	if cfg.UseContract {
		baseChain, err := crypto.NewReadOnlyBlockchain(ctx, &cfg.BaseChain)
		if err != nil {
			log.Error("Failed to initialize blockchain for base", "error", err, "chain_config", cfg.BaseChain)
			return nil, 0, nil, err
		}

		log.Info("Using River Auth", "chain_config", cfg.BaseChain)
		authChecker, err = auth.NewChainAuth(
			ctx,
			baseChain,
			&cfg.TownsArchitectContract,
			&cfg.WalletLinkContract,
			cfg.BaseChain.LinkedWalletsLimit,
			cfg.BaseChain.ContractCallsTimeoutMs,
		)
		if err != nil {
			log.Error("failed to create auth", "error", err)
			return nil, 0, nil, err
		}
	} else {
		log.Warn("Using fake auth for testing")
		authChecker = auth.NewFakeAuthChecker()
	}

	notification := nodes.MakePushNotification(
		ctx,
		&cfg.PushNotification,
	)
	nodeRegistry, err := loadNodeRegistry(
		ctx,
		cfg.NodeRegistry,
		cfg.NodeRegistryCsv,
		wallet.AddressStr,
	)
	if err != nil {
		return nil, 0, nil, err
	}

	var streamRegistry nodes.StreamRegistry
	var riverChainBlockMonitor crypto.BlockMonitor
	if cfg.UseBlockChainStreamRegistry {
		riverChain, err := crypto.NewReadWriteBlockchain(ctx, &cfg.RiverChain, wallet)
		if err != nil {
			log.Error("Failed to initialize blockchain for river", "error", err, "chain_config", cfg.RiverChain)
			return nil, 0, nil, err
		}
		riverChainBlockMonitor = riverChain.BlockMonitor

		streamRegistryContract, err := registries.NewStreamRegistryContract(ctx, riverChain, &cfg.RegistryContract)
		if err != nil {
			log.Error("NewStreamRegistryContract", "error", err)
			return nil, 0, nil, err
		}
		streamRegistry = nodes.NewStreamRegistry(nodeRegistry, streamRegistryContract, cfg.Stream.ReplicationFactor)

		log.Info("Using blockchain stream registry")
	} else {
		streamRegistry = nodes.NewFakeStreamRegistry(nodeRegistry, cfg.Stream.ReplicationFactor)
		log.Warn("Using fake stream registry")
		riverChainBlockMonitor = crypto.NewFakeBlockMonitor(ctx, cfg.RiverChain.FakeBlockTimeMs)
	}

	cache := events.NewStreamCache(
		&events.StreamCacheParams{
			Storage:                store,
			Wallet:                 wallet,
			RiverChainBlockMonitor: riverChainBlockMonitor,
		},
		&cfg.Stream,
	)

	syncHandler := NewSyncHandler(
		wallet,
		cache,
		nodeRegistry,
		streamRegistry,
	)

	streamService := &Service{
		cache:          cache,
		authChecker:    authChecker,
		wallet:         wallet,
		exitSignal:     exitSignal,
		nodeRegistry:   nodeRegistry,
		streamRegistry: streamRegistry,
		streamConfig:   cfg.Stream,
		notification:   notification,
		syncHandler:    syncHandler,
		serverCtx:      ctx,
	}

	mux := httptrace.NewServeMux(
		httptrace.WithResourceNamer(
			func(r *http.Request) string {
				return r.Method + " " + r.URL.Path
			},
		),
	)

	interceptors := connect.WithInterceptors(NewMetricsInterceptor())
	streamServicePattern, streamServiceHandler := protocolconnect.NewStreamServiceHandler(streamService, interceptors)
	log.Info("Registering StreamServiceHandler", "pattern", streamServicePattern)
	mux.Handle(streamServicePattern, newHttpHandler(streamServiceHandler, log))

	nodeServicePattern, nodeServiceHandler := protocolconnect.NewNodeToNodeHandler(streamService, interceptors)
	log.Info("Registering NodeToNodeHandler", "pattern", nodeServicePattern)
	mux.Handle(nodeServicePattern, nodeServiceHandler)

	mux.HandleFunc("/info", func(w http.ResponseWriter, r *http.Request) {
		// TODO: reply with graffiti from config and with node version
		log.Debug("Got request for /info", "URL", *r.URL)
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte("All good in the Towns land!\n"))
		if err != nil {
			log.Warn("Failed to write response", "error", err, "request", *r)
		}
	})

	registerDebugHandlers(ctx, mux, cache, streamService)

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	httpListener, err := net.Listen("tcp", address)
	if err != nil {
		log.Error("failed to listen", "error", err)
		return nil, 0, nil, err
	}
	actualPort := httpListener.Addr().(*net.TCPAddr).Port

	corsMiddleware := cors.New(cors.Options{
		AllowCredentials: false,
		Debug:            cfg.Log.Level == "debug",
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		// AllowedHeaders: []string{"*"} also works for CORS issues w/ OPTIONS requests
		AllowedHeaders: []string{
			"Origin",
			"X-Requested-With",
			"Accept",
			"Content-Type",
			"X-Grpc-Web",
			"X-User-Agent",
			"User-Agent",
			"Connect-Protocol-Version",
			"x-river-request-id",
		},
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

		// if there is a cleaner, run it
		if storageCleaner != nil {
			err := storageCleaner(ctx)
			if err != nil {
				log.Error("failed to cleanup storage", "error", err)
			}
		}

		if err != nil {
			log.Error("failed to cleanup storage", "error", err)
		}

		err = srv.Shutdown(ctx)
		if err != nil {
			log.Error("failed to shutdown server", "error", err)
			panic(err)
		}
	}

	log.Info("Listening", "addr", address+streamServicePattern)
	log.Info("Using DB", "url", getDbURL(cfg.Database))
	if cfg.UseContract {
		log.Info("Using chain", "id", cfg.BaseChain.ChainId)
	} else {
		log.Info("Running Without Entitlements")
	}
	log.Info("Available on port", "port", actualPort)
	return closer, actualPort, streamService.exitSignal, nil
}

func RunServer(ctx context.Context, config *config.Config) error {
	log := dlog.FromCtx(ctx)

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
