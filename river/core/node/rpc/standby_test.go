package rpc

import (
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/rpc/statusinfo"
)

func stanbyStartOpts() startOpts {
	return startOpts{
		configUpdater: func(config *config.Config) {
			config.StandByOnStart = true
			config.StandByPollPeriod = 20 * time.Millisecond
			config.ShutdownTimeout = 50 * time.Millisecond
			config.Database.StartupDelay = 100 * time.Millisecond
		},
	}
}

func getNodeStatus(httpClient *http.Client, url string) (*statusinfo.StatusResponse, error) {
	url = url + "/status"
	resp, err := httpClient.Get(url)
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

func requireStatus(t *testing.T, httpClient *http.Client, url string, expected string, instanceId string) {
	require.EventuallyWithT(
		t,
		func(t *assert.CollectT) {
			st, err := getNodeStatus(httpClient, url)
			if assert.NoError(t, err) {
				assert.Equal(t, expected, st.Status)
				if instanceId != "" {
					assert.Equal(t, instanceId, st.InstanceId)
				}
			}
		},
		20*time.Second,
		10*time.Millisecond,
	)
}

func TestStandbySingle(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require

	tester.initNodeRecords(0, 1, river.NodeStatus_Operational)
	tester.startNodes(0, 1, stanbyStartOpts())

	st, err := getNodeStatus(tester.httpClient(), tester.nodes[0].url)
	require.NoError(err)
	require.Equal("OK", st.Status)
}

type childListener struct {
	connChan chan net.Conn
	addr     net.Addr
	once     sync.Once
}

var _ net.Listener = &childListener{}

func (l *childListener) Accept() (net.Conn, error) {
	conn, ok := <-l.connChan
	if !ok {
		return nil, io.EOF
	}
	return conn, nil
}

func (l *childListener) Close() error {
	l.once.Do(func() {
		close(l.connChan)
	})
	return nil
}

func (l *childListener) Addr() net.Addr {
	return l.addr
}

type redirectorRunner struct {
	base   net.Listener
	target atomic.Pointer[childListener]
}

func (l *redirectorRunner) acceptLoop() {
	for {
		conn, err := l.base.Accept()
		if err != nil {
			return
		}
		target := l.target.Load()
		if target != nil {
			select {
			case target.connChan <- conn:
			default:
				conn.Close()
			}
		} else {
			conn.Close()
		}
	}
}

func TestStandbyEvictionByNlbSwitch(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require
	httpClient := tester.httpClient()

	redirector := &redirectorRunner{base: tester.nodes[0].listener}
	t.Cleanup(func() {
		redirector.base.Close()
	})
	url := tester.nodes[0].url
	tester.nodes[0].listener = nil
	go redirector.acceptLoop()

	firstListener := &childListener{
		connChan: make(chan net.Conn, 20),
		addr:     redirector.base.Addr(),
	}
	redirector.target.Store(firstListener)

	opts := stanbyStartOpts()
	opts.listeners = []net.Listener{firstListener}
	tester.initNodeRecords(0, 1, river.NodeStatus_Operational)
	require.NoError(tester.startSingle(0, opts))
	firstNode := tester.nodes[0]

	// Setup shutdown monitor
	exitStatus := make(chan error)
	go func() {
		firstExit := <-firstNode.service.ExitSignal()
		firstNode.service.Close()
		exitStatus <- firstExit
	}()

	// First node should be operational
	requireStatus(t, httpClient, url, "OK", firstNode.service.instanceId)

	// Start the second node with same address
	secondListener := &childListener{
		connChan: make(chan net.Conn, 20),
		addr:     redirector.base.Addr(),
	}
	secondNodeChan := make(chan *testNodeRecord, 1)
	go func() {
		opts = stanbyStartOpts()
		opts.listeners = []net.Listener{secondListener}
		require.NoError(tester.startSingle(0, opts))
		secondNodeChan <- tester.nodes[0]
	}()

	// Create second redirector to query second node's STANDBY status
	secondBase, secondUrl := makeTestListener(t)
	secondRedirector := &redirectorRunner{base: secondBase}
	t.Cleanup(func() {
		secondBase.Close()
	})
	secondRedirector.target.Store(secondListener)
	go secondRedirector.acceptLoop()

	// Second node should be in STANDBY
	requireStatus(t, httpClient, secondUrl, "STANDBY", "")

	// First node still should be operational
	requireStatus(t, httpClient, url, "OK", firstNode.service.instanceId)

	// Emulate NLB switch
	redirector.target.Store(secondListener)

	// Second node should complete startup and become operational
	secondNode := <-secondNodeChan
	requireStatus(t, httpClient, url, "OK", secondNode.service.instanceId)

	// First node should be evicted
	firstErr := <-exitStatus
	require.Error(firstErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(firstErr).Code)
}

func TestStandbyEvictionByUrlUpdate(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1})
	require := tester.require
	httpClient := tester.httpClient()
	firstListener := tester.nodes[0].listener
	firstAddr := firstListener.Addr().String()
	firstUrl := "https://" + firstAddr

	opts := stanbyStartOpts()
	opts.listeners = []net.Listener{firstListener}
	tester.initNodeRecords(0, 1, river.NodeStatus_Operational)
	tester.startNodes(0, 1, opts)

	first := tester.nodes[0].service

	// Setup shutdown monitor
	exitStatus := make(chan error)
	go func() {
		firstExit := <-first.ExitSignal()
		first.Close()
		exitStatus <- firstExit
	}()

	secondListener, secondUrl := makeTestListener(t)

	// Start the second node with same address
	opts.listeners = []net.Listener{secondListener}
	go func() {
		require.NoError(tester.startSingle(0, opts))
	}()

	// First node should be operational
	st1, err := getNodeStatus(httpClient, firstUrl)
	require.NoError(err)
	require.Equal("OK", st1.Status)

	requireStatus(t, httpClient, secondUrl, "STANDBY", "")

	// While in practice this is not how this should happen (NLB should be used),
	// standby mode should work even if URL is updated.
	require.NoError(tester.btc.UpdateNodeUrl(tester.ctx, 0, secondUrl))
	requireStatus(t, httpClient, secondUrl, "OK", "")

	st3, err := getNodeStatus(httpClient, secondUrl)
	require.NoError(err)
	require.Equal("OK", st3.Status)
	require.NotEqual(st1.InstanceId, st3.InstanceId)

	// First node should be evicted
	firstErr := <-exitStatus
	require.Error(firstErr)
	require.Equal(Err_RESOURCE_EXHAUSTED, AsRiverError(firstErr).Code)
}
