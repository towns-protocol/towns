package rpc

import (
	"casablanca/node/auth"
	. "casablanca/node/base"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	"casablanca/node/events"
	"casablanca/node/nodes"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/registries"
	"casablanca/node/storage"
	"html"
	"runtime"
	"strings"

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
	httptrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/net/http"
)

type Cleanup func(context.Context) error

// GenerateStackHTML generates an HTML table from runtime.Stack
func generateStackHTML() string {
	buf := make([]byte, 1024*1024)
	stackSize := runtime.Stack(buf, true)
	stacks := string(buf[:stackSize])

	// Escape HTML-specific characters for safety
	stacks = html.EscapeString(stacks)

	lines := strings.Split(stacks, "\n")
	var sb strings.Builder
	sb.WriteString("<table border='1'>")
	sb.WriteString("<tr><th>Goroutine</th><th>Stack</th></tr>")
	var goroutine, stack string
	for _, line := range lines {
		if strings.HasPrefix(line, "goroutine ") {
			if goroutine != "" {
				sb.WriteString(fmt.Sprintf("<tr><td>%s</td><td><pre>%s</pre></td></tr>", goroutine, stack))
			}
			goroutine = line
			stack = ""
		} else if strings.HasPrefix(line, "\t") || line == "" {
			stack += line + "\n"
		} else {
			stack += "\t" + line + "\n"
		}
	}
	if goroutine != "" {
		sb.WriteString(fmt.Sprintf("<tr><td>%s</td><td><pre>%s</pre></td></tr>", goroutine, stack))
	}
	sb.WriteString("</table>")
	return sb.String()
}

func loadNodeRegistry(ctx context.Context, nodeRegistryPath string, localNodeAddress string) (nodes.NodeRegistry, error) {
	log := dlog.CtxLog(ctx)

	if nodeRegistryPath == "" {
		log.Warn("No node registry path specified, running in single node configuration")
		return nodes.MakeSingleNodeRegistry(ctx, localNodeAddress), nil
	}

	log.Info("Loading node registry", "path", nodeRegistryPath)
	return nodes.LoadNodeRegistry(ctx, nodeRegistryPath, localNodeAddress)
}

func createStore(ctx context.Context, dbUrl string, storageType string, address string, instanceId string, exitSignal chan error) (storage.StreamStorage, Cleanup, error) {
	log := dlog.CtxLog(ctx)
	if storageType == "in-memory" {
		log.Warn("Using in-memory storage")
		return storage.NewMemStorage(), nil, nil
	} else {
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
		var cleaner = func(ctx context.Context) error {
			return store.CleanupStorage(ctx)
		}
		return store, cleaner, nil
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

	instanceId := GenShortNanoid()
	log = log.With(
		"nodeAddress", wallet.AddressStr,
		"port", cfg.Port,
		"instanceId", instanceId,
	)
	ctx = dlog.CtxWithLog(ctx, log)
	slog.SetDefault(log)

	exitSignal := make(chan error, 1)

	store, storageCleaner, err := createStore(ctx, cfg.DbUrl, cfg.StorageType, wallet.AddressStr, instanceId, exitSignal)
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

	notification := nodes.MakePushNotification(
		ctx,
		&cfg.PushNotification,
	)
	nodeRegistry, err := loadNodeRegistry(
		ctx,
		cfg.NodeRegistry,
		wallet.AddressStr,
	)
	if err != nil {
		return nil, 0, nil, err
	}
	cache := events.NewStreamCache(
		&events.StreamCacheParams{
			Storage:    store,
			Wallet:     wallet,
			DefaultCtx: ctx,
		},
	)
	syncHandler := NewSyncHandler(
		ctx,
		cfg.SyncVersion,
		wallet,
		cache,
		nodeRegistry,
	)

	streamRegistryContract, err := registries.NewStreamRegistryContract(ctx, &cfg.TopChain, wallet)

	if err != nil {
		log.Error("NewStreamRegistryContract", "error", err)
	}

	streamService := &Service{
		cache:          cache,
		townsContract:  townsContract,
		wallet:         wallet,
		exitSignal:     exitSignal,
		nodeRegistry:   nodeRegistry,
		streamRegistry: nodes.NewStreamRegistry(nodeRegistry, cfg.UseBlockChainStreamRegistry, streamRegistryContract),
		streamConfig:   cfg.Stream,
		notification:   notification,
		syncHandler:    syncHandler,
	}

	pattern, handler := protocolconnect.NewStreamServiceHandler(streamService)

	mux := httptrace.NewServeMux()
	log.Info("Registering handler", "pattern", pattern)
	mux.Handle(pattern, newHttpHandler(handler, log))

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

	mux.HandleFunc("/stacks", func(w http.ResponseWriter, r *http.Request) {
		// TODO: reply with graffiti from config and with node version
		log.Debug("Got request for /monitor", "request", *r)
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(generateStackHTML()))
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
		AllowedHeaders:   []string{"Origin", "X-Requested-With", "Accept", "Content-Type", "X-Grpc-Web", "X-User-Agent", "Connect-Protocol-Version", "x-river-request-id"},
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

		//if there is a cleaner, run it
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
