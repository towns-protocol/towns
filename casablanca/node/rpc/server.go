package rpc

import (
	"context"
	"crypto/tls"
	"encoding/base64"
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
	. "github.com/river-build/river/protocol"
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
		store, err := storage.NewPostgresEventStore(ctx, dbUrl, schema, instanceId, exitSignal)
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

func StartServer(
	ctx context.Context,
	cfg *config.Config,
	riverchain *crypto.Blockchain,
	listener net.Listener,
) (func(), int, chan error, error) {
	log := dlog.FromCtx(ctx)

	// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
	privKey := os.Getenv("WALLETPRIVATEKEY")
	if privKey == "" {
		privKey = os.Getenv("PRIVATE_KEY")
	}

	log.Info("Starting server", "config", cfg)

	var err error
	var wallet *crypto.Wallet
	if riverchain == nil {
		if privKey != "" {
			wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
		} else {
			wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		}
		if err != nil {
			return nil, 0, nil, err
		}
	} else {
		wallet = riverchain.Wallet
	}

	instanceId := GenShortNanoid()
	log = log.With(
		"nodeAddress", wallet.AddressStr,
		"port", cfg.Port,
		"instanceId", instanceId,
	)
	ctx = dlog.CtxWithLog(ctx, log)
	slog.SetDefault(log)

	exitSignal := make(chan error, 1)

	store, storageCleaner, err := createStore(ctx, cfg.Database, cfg.StorageType, wallet.AddressStr, instanceId, exitSignal)
	if err != nil {
		return nil, 0, nil, err
	}

	var chainAuth auth.ChainAuth
	if !cfg.DisableBaseChain {
		baseChain, err := crypto.NewReadOnlyBlockchain(ctx, &cfg.BaseChain)
		if err != nil {
			log.Error("Failed to initialize blockchain for base", "error", err, "chain_config", cfg.BaseChain)
			return nil, 0, nil, err
		}

		log.Info("Using River Auth", "chain_config", cfg.BaseChain)
		chainAuth, err = auth.NewChainAuth(
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
		chainAuth = auth.NewFakeChainAuth()
	}

	notification := MakePushNotification(
		ctx,
		&cfg.PushNotification,
	)

	var nodeRegistry nodes.NodeRegistry
	var streamRegistry nodes.StreamRegistry
	var registryContract *registries.RiverRegistryContract
	if !cfg.DisableRiverChain {
		if riverchain == nil {
			riverchain, err = crypto.NewReadWriteBlockchain(ctx, &cfg.RiverChain, wallet)
			if err != nil {
				log.Error("Failed to initialize blockchain for river", "error", err, "chain_config", cfg.RiverChain)
				return nil, 0, nil, err
			}
		}

		registryContract, err = registries.NewRiverRegistryContract(ctx, riverchain, &cfg.RegistryContract)
		if err != nil {
			log.Error("NewRiverRegistryContract", "error", err)
			return nil, 0, nil, err
		}

		nodeRegistry, err = nodes.LoadNodeRegistry(ctx, registryContract, wallet.AddressStr)
		if err != nil {
			log.Error("Failed to load node registry", "error", err)
			return nil, 0, nil, err
		}

		streamRegistry = nodes.NewStreamRegistry(wallet.AddressStr, nodeRegistry, registryContract, cfg.Stream.ReplicationFactor)

		log.Info("Using blockchain river registry")
	} else {
		nodeRegistry = nodes.MakeSingleNodeRegistry(ctx, wallet.AddressStr)
		streamRegistry = nodes.NewFakeStreamRegistry(wallet.AddressStr, nodeRegistry, cfg.Stream.ReplicationFactor)
		riverchain = &crypto.Blockchain{
			Wallet:       wallet,
			BlockMonitor: crypto.NewFakeBlockMonitor(ctx, cfg.RiverChain.FakeBlockTimeMs),
		}
		log.Warn("Using fake river registry")
	}

	cache, err := events.NewStreamCache(
		ctx,
		&events.StreamCacheParams{
			Storage:      store,
			Wallet:       wallet,
			Riverchain:   riverchain,
			Registry:     registryContract,
			StreamConfig: &cfg.Stream,
		},
	)
	if err != nil {
		log.Error("Failed to create stream cache", "error", err)
		return nil, 0, nil, err
	}

	syncHandler := NewSyncHandler(
		wallet,
		cache,
		nodeRegistry,
		streamRegistry,
	)

	streamService := &Service{
		cache:          cache,
		chainAuth:      chainAuth,
		wallet:         wallet,
		exitSignal:     exitSignal,
		nodeRegistry:   nodeRegistry,
		streamRegistry: streamRegistry,
		streamConfig:   &cfg.Stream,
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

	registerDebugHandlers(ctx, cfg, mux, cache, streamService)

	if listener == nil {
		if cfg.Port == 0 {
			log.Error("Port is not set")
			return nil, 0, nil, RiverError(Err_BAD_CONFIG, "Port is not set")
		}
		address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
		listener, err = net.Listen("tcp", address)
		if err != nil {
			log.Error("failed to listen", "error", err)
			return nil, 0, nil, err
		}
		log.Info("Listening", "addr", address+streamServicePattern)
	} else {
		if cfg.Port != 0 {
			log.Warn("Port is ignored when listener is provided")
		}
	}

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

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	var srv *http.Server
	var https bool

	if cfg.UsesHTTPS() {
		if (cfg.TLSConfig.Cert != "") && (cfg.TLSConfig.Key != "") {
			fileExists := func(filename string) bool {
				_, err := os.Stat(filename)
				return err == nil
			}

			isBase64 := func(s string) bool {
				_, err := base64.StdEncoding.DecodeString(s)
				return err == nil
			}

			decodeBase64 := func(s string) string {
				decoded, err := base64.StdEncoding.DecodeString(s)
				if err != nil {
					return ""
				}
				return string(decoded)
			}
			if fileExists(cfg.TLSConfig.Cert) && fileExists(cfg.TLSConfig.Key) {
				srv, err = createServerFromFile(ctx, address, corsMiddleware.Handler(mux), cfg.TLSConfig.Cert, cfg.TLSConfig.Key)
				https = true
			} else if isBase64(cfg.TLSConfig.Cert) && isBase64(cfg.TLSConfig.Key) {
				srv, err = createServerFromStrings(ctx, address, corsMiddleware.Handler(mux), decodeBase64(cfg.TLSConfig.Cert), decodeBase64(cfg.TLSConfig.Key))
				https = true
			} else {
				log.Warn("TLSConfig.Cert and TLSConfig.Key must be valid file paths or base64 encoded strings, Using H2C server instead of HTTPS")
				srv, err = createH2CServer(ctx, address, corsMiddleware.Handler(mux))
				https = false
			}
		} else {
			log.Error("TLSConfig.Cert and TLSConfig.Key must be set")
			return nil, 0, nil, err
		}
	} else {
		log.Info("Using H2C server")
		srv, err = createH2CServer(ctx, address, corsMiddleware.Handler(mux))
		https = false
	}

	if err != nil {
		log.Error("failed to create server", "err", err)
		return nil, 0, nil, err
	}

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

	// Run the server with graceful shutdown
	go func() {
		defer listener.Close()

		if https {
			// Since we are using a custom TLS config, we pass empty strings for the cert and key files
			if err := srv.ServeTLS(listener, "", ""); err != nil && err != http.ErrServerClosed {
				log.Error("ServeTLS failed", "err", err)
			}
		} else {
			if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
				log.Error("Serve failed", "err", err)
			}
		}
	}()

	// Retrieve the TCP address of the listener
	tcpAddr := listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port
	log.Info("Server started", "port", port, "https", https)

	log.Info("Using DB", "url", cfg.Database)
	if !cfg.DisableBaseChain {
		log.Info("Using chain", "id", cfg.BaseChain.ChainId)
	} else {
		log.Info("Running Without Entitlements")
	}
	log.Info("Available on port", "port", port)
	return closer, port, streamService.exitSignal, nil
}

func createServerFromStrings(ctx context.Context, address string, handler http.Handler, certString, keyString string) (*http.Server, error) {
	log := dlog.FromCtx(ctx)
	// Load the certificate and key from strings
	cert, err := tls.X509KeyPair([]byte(certString), []byte(keyString))
	if err != nil {
		log.Error("Failed to create X509KeyPair from strings", "error", err)
		return nil, err
	}
	log.Info("Loaded certificate and key from strings")

	return &http.Server{
		Addr:    address,
		Handler: handler,
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{cert},
		},
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
	}, nil
}

func createServerFromFile(ctx context.Context, address string, handler http.Handler, certFile, keyFile string) (*http.Server, error) {
	log := dlog.FromCtx(ctx)
	// Read certificate and key from files
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		log.Error("Failed to LoadX509KeyPair from files", "error", err)
		return nil, err
	} else {
		log.Info("Loaded certificate and key from files", "certFile", certFile, "keyFile", keyFile)
	}

	return &http.Server{
		Addr:    address,
		Handler: handler,
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{cert},
		},
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
	}, nil
}

func createH2CServer(ctx context.Context, address string, handler http.Handler) (*http.Server, error) {
	// Create an HTTP/2 server without TLS
	h2s := &http2.Server{}
	return &http.Server{
		Addr:    address,
		Handler: h2c.NewHandler(handler, h2s),
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
	}, nil
}

// Struct to match the JSON structure.
type CertKey struct {
	Cert string `json:"cert"`
	Key  string `json:"key"`
}

func RunServer(ctx context.Context, cfg *config.Config) error {
	log := dlog.FromCtx(ctx)

	closer, _, exitSignal, error := StartServer(ctx, cfg, nil, nil)
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
