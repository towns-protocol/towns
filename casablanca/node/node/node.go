package main

import (
	"casablanca/node/rpc"
	"context"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"gopkg.in/yaml.v3"

	log "github.com/sirupsen/logrus"
	//"github.com/reenjii/logflag"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type Config struct {
	Port    int    `yaml:"PORT" default:"5157"`
	Address string `yaml:"ADDRESS" default:""`
	DbUrl   string `yaml:"DB_URL" default:"postgres://postgres:postgres@localhost:5433/casablanca?sslmode=disable&pool_max_conns=3"`
}

func main() {
	flag.Parse()
	//logflag.Parse()
	log.StandardLogger().SetNoLock()

	config, err := readConfig("config.yaml")
	if err != nil {
		log.Fatalf("failed to read config: %v", err)
	}

	dbUrl := config.DbUrl
	pattern, handler := rpc.MakeServiceHandler(context.Background(), dbUrl)
	mux := http.NewServeMux()
	mux.Handle(pattern, handler)

	address := fmt.Sprintf("%s:%d", config.Address, config.Port)
	httpListener, err := net.Listen("tcp", address)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	go func() {
		err := http.Serve(
			httpListener,
			// For gRPC clients, it's convenient to support HTTP/2 without TLS. You can
			// avoid x/net/http2 by using http.ListenAndServeTLS.
			h2c.NewHandler(mux, &http2.Server{}),
		)
		log.Fatalf("listen failed: %v", err)
	}()

	log.Printf("Listening on %s%s", address, pattern)
	log.Printf("Using DB at %s", dbUrl)

	exitSignal := make(chan os.Signal)
	signal.Notify(exitSignal, syscall.SIGINT, syscall.SIGTERM)
	<-exitSignal
	fmt.Println()
	log.Print("Goodbye")
}

func readConfig(cfg string) (*Config, error) {
	f, err := os.Open(cfg)
	if err != nil {
		log.Warn(err)
		return &Config{
			Port:    5157,
			Address: "",
			DbUrl:   "postgres://postgres:postgres@localhost:5433/casablanca?sslmode=disable&pool_max_conns=3",
		}, nil
	}
	defer f.Close()

	var config Config
	decoder := yaml.NewDecoder(f)
	err = decoder.Decode(&config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}
