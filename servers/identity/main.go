package main

import (
	"context"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"harmony/server/identity/generated"
	"io"
	"io/ioutil"
	"math/big"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

//go:generate ./generate.sh

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

func getNodeManager(client *ethclient.Client) (nodeManager *generated.NodeManager, err error) {

	// Get the contract address from hex string
	addr := common.HexToAddress(os.Getenv("NODE_MANAGER_ADDRESS"))
	// Bind to an already deployed contract
	nodeManager, err = generated.NewNodeManager(addr, client)
	if err != nil {
		logrus.Fatalf("Error calling contract: %v", err)
	}
	return
}

func toHexInt(n *big.Int) string {
	return fmt.Sprintf("%x", n) // or %x or upper case
}

func main() {
	// load .env file
	err := godotenv.Load(".env")
	if err != nil {
		logrus.Fatal("Error loading .env file %v", err)
	}

	rpcServer, err := ethclient.Dial(os.Getenv("JSON-RPC"))
	if err != nil {
		logrus.Fatalf("Error connecting to RPC server: %v", err)
	}
	defer rpcServer.Close()

	nodeManager, err := getNodeManager(rpcServer)
	if err != nil {
		logrus.Fatalf("Error connecting to NodeManager contract: %v", err)
	}

	// read file content
	pemContent, err := ioutil.ReadFile(os.Getenv("certFile"))
	if err != nil {
		logrus.Fatalf("Error reading certFile: %v", err)
	}

	block, _ := pem.Decode(pemContent)
	if block == nil {
		logrus.Fatalf("Error Decoding certFile")
	}
	// pass cert bytes
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		logrus.Fatalf("Error parsing certFile: %v", err)
	}

	nodeHashBytes := sha256.Sum256(cert.Raw)

	nodeHash := new(big.Int).SetBytes(nodeHashBytes[:])

	self, err := nodeManager.NodeHashToNode(nil, nodeHash)
	if err != nil {
		logrus.Fatalf("Error fetching self from NodeManager contract: %v", err)
	}
	if self.State == 0 {
		logrus.Warnln("nodeHash not found for this node", toHexInt(nodeHash), nodeHashBytes)
	}

	logrus.Info("Self:", nodeHashBytes, self)

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

	filterNewNode, err := nodeManager.FilterNewNode(&bind.FilterOpts{Start: 0, Context: context.TODO()})
	if err != nil {
		logrus.Warnln("FilterNewNode err", err)
	}
	if filterNewNode != nil {
		logrus.Infoln("FilterNewNode", filterNewNode)
		for {
			if filterNewNode.Next() {
				logrus.Infoln("FilterNewNode", filterNewNode.Event)
			} else {
				logrus.Warnln("filter error", filterNewNode.Error())
				break
			}
		}
	}

	watchNewNodeSink := make(chan *generated.NodeManagerNewNode)
	watchNewNodeSub, err := nodeManager.WatchNewNode(&bind.WatchOpts{Start: new(uint64), Context: context.TODO()}, watchNewNodeSink)
	if err != nil {
		logrus.Warnln("WatchNewNode err", err)
	}

	go func() {
		sig := <-sigs
		logrus.Infoln("Signal received", sig)
		if watchNewNodeSub != nil {
			watchNewNodeSub.Unsubscribe()
			logrus.Infoln("Shutdown WatchNewNode")
		}
		srv.Shutdown(context.TODO())
		logrus.Infoln("Shutdown srv")
	}()

	go func() {
		for {
			newNode := <-watchNewNodeSink
			logrus.Infoln("WatchNewNode", newNode)
		}
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
