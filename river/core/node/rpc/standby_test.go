package rpc_test

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"sync/atomic"
	"testing"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/rpc/statusinfo"

	. "github.com/river-build/river/core/node/protocol"
)

func stanbyStartOpts() startOpts {
	return startOpts{
		configUpdater: func(config *config.Config) {
			config.StandByOnStart = true
		},
	}
}

func getNodeStatus(url string) (*statusinfo.StatusResponse, error) {
	url = url + "/status"
	client := nodes.TestHttpClientMaker()
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, errors.New("status request failed")
	}
	var status statusinfo.StatusResponse
	err = json.NewDecoder(resp.Body).Decode(&status)
	if err != nil {
		return nil, err
	}
	return &status, nil
}

func pollStatus(url string, expected string) bool {
	start := time.Now()
	for {
		st, err := getNodeStatus(url)
		if err == nil && st.Status == expected {
			return true
		}
		if time.Since(start) > 5*time.Second {
			return false
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestStandbySingle(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	tester.initNodeRecords(0, 1, contracts.NodeStatus_Operational)
	tester.startNodes(0, 1, stanbyStartOpts())

	st, err := getNodeStatus(tester.nodes[0].url)
	require.NoError(err)
	require.Equal("OK", st.Status)
}

func TestStandbyEvictionByNlbSwitch(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	redirector := tester.nodes[0].listener
	tester.nodes[0].listener = nil
	var redirectAddr atomic.Pointer[string]

	firstListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)
	firstAddr := firstListener.Addr().String()
	firstUrl := "http://" + firstAddr
	redirectAddr.Store(&firstAddr)

	go redirect(redirector, &redirectAddr)

	opts := stanbyStartOpts()
	opts.listeners = []net.Listener{firstListener}
	tester.initNodeRecords(0, 1, contracts.NodeStatus_Operational)
	tester.startNodes(0, 1, opts)

	first := tester.nodes[0].service

	// Setup shutdown monitor
	exitStatus := make(chan error)
	go func() {
		firstExit := <-first.ExitSignal()
		first.Close()
		exitStatus <- firstExit
	}()

	secondListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)
	secondAddr := secondListener.Addr().String()
	secondUrl := "http://" + secondAddr

	// Start the second node with same address
	opts.listeners = []net.Listener{secondListener}
	go func() { require.NoError(tester.startSingle(0, opts)) }()

	// First node should be operational
	st1, err := getNodeStatus(firstUrl)
	require.NoError(err)
	require.Equal("OK", st1.Status)

	// Also check through redirector URL
	st2, err := getNodeStatus(tester.nodes[0].url)
	require.NoError(err)
	require.Equal("OK", st2.Status)
	require.Equal(st1.InstanceId, st2.InstanceId)

	require.True(pollStatus(secondUrl, "STANDBY"))

	// Emulate NLB switch
	time.Sleep(50 * time.Millisecond) // Give some time for second instance to poll
	redirectAddr.Store(&secondAddr)
	require.True(pollStatus(secondUrl, "OK"))

	// Get status again through redirector URL
	st3, err := getNodeStatus(tester.nodes[0].url)
	require.NoError(err)
	require.Equal("OK", st3.Status)
	require.NotEqual(st1.InstanceId, st3.InstanceId)

	// First node should be evicted
	firstErr := <-exitStatus
	require.Error(firstErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(firstErr).Code)
}

func TestStandbyEvictionByUrlUpdate(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	firstListener := tester.nodes[0].listener
	firstAddr := firstListener.Addr().String()
	firstUrl := "http://" + firstAddr

	opts := stanbyStartOpts()
	opts.listeners = []net.Listener{firstListener}
	tester.initNodeRecords(0, 1, contracts.NodeStatus_Operational)
	tester.startNodes(0, 1, opts)

	first := tester.nodes[0].service

	// Setup shutdown monitor
	exitStatus := make(chan error)
	go func() {
		firstExit := <-first.ExitSignal()
		first.Close()
		exitStatus <- firstExit
	}()

	secondListener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)
	secondAddr := secondListener.Addr().String()
	secondUrl := "http://" + secondAddr

	// Start the second node with same address
	opts.listeners = []net.Listener{secondListener}
	go func() { require.NoError(tester.startSingle(0, opts)) }()

	// First node should be operational
	st1, err := getNodeStatus(firstUrl)
	require.NoError(err)
	require.Equal("OK", st1.Status)

	require.True(pollStatus(secondUrl, "STANDBY"))

	time.Sleep(50 * time.Millisecond) // Give some time for second instance to poll

	// While in practice this is not how this should happen (NLB should be used),
	// standby mode should work even if URL is updated.
	require.NoError(tester.btc.UpdateNodeUrl(tester.ctx, 0, secondUrl))
	require.True(pollStatus(secondUrl, "OK"))

	st3, err := getNodeStatus(secondUrl)
	require.NoError(err)
	require.Equal("OK", st3.Status)
	require.NotEqual(st1.InstanceId, st3.InstanceId)

	// First node should be evicted
	firstErr := <-exitStatus
	require.Error(firstErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(firstErr).Code)
}

func redirect(listener net.Listener, redirectAddress *atomic.Pointer[string]) {
	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			panic(err)
		}

		addr := *redirectAddress.Load()
		go handleConnection(conn, addr)
	}
}

func handleConnection(sourceConn net.Conn, targetAddr string) {
	defer sourceConn.Close()

	targetConn, err := net.Dial("tcp", targetAddr)
	if err != nil {
		panic(err)
	}
	defer targetConn.Close()

	// Copy sourceConn's data to targetConn
	go func() { _, _ = io.Copy(targetConn, sourceConn) }()
	// Copy targetConn's data back to sourceConn
	_, _ = io.Copy(sourceConn, targetConn)
}
