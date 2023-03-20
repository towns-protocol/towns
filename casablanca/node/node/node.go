package main

import (
	"casablanca/node/rpc"
	"context"
	"flag"
	"fmt"
	"io"
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
	Port    int    `yaml:"port" default:"5157"`
	Address string `yaml:"address" default:""`
	DbUrl   string `yaml:"db_url" default:"postgres://postgres:postgres@localhost:5433/casablanca?sslmode=disable&pool_max_conns=3"`
	Debug   bool   `yaml:"debug" default:"false"`
	LogFile string `yaml:"log_file" default:""`
}

func main() {
	flag.Parse()
	//logflag.Parse()
	log.StandardLogger().SetNoLock()
	log.StandardLogger().SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
	})

	// read config file name from args
	// if no args, use default config file name
	var configFileName string
	if len(os.Args) > 1 {
		configFileName = os.Args[1]
	} else {
		configFileName = "dev.yaml"
	}

	config, err := readConfig(configFileName)
	if err != nil {
		log.Fatalf("failed to read config: %v", err)
	}
	if config.Debug {
		log.SetLevel(log.DebugLevel)
	}
	if config.LogFile != "" {
		f, err := os.OpenFile(config.LogFile, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
		if err != nil {
			log.Fatalf("failed to open log file: %v", err)
		}
		defer f.Close()
		wrt := io.MultiWriter(os.Stdout, f)
		log.SetOutput(wrt)
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
	log.Infof("reading config from %s", cfg)
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
