package nodes

// import (
// 	. "github.com/river-build/river/core/node/base"
// 	. "github.com/river-build/river/core/node/protocol"
// )

// func TestNodeRegistryUpdates(t *testing.T) {
// 	require := require.New(t)

// 	ctx := test.NewTestContext()

// 	btc, err := crypto.NewBlockchainTestContext(ctx, 1)
// 	require.NoError(err)
// 	defer btc.Close()

// 	btc.Commit()

// 	bc := btc.GetBlockchain(ctx, 0, true)
// 	defer bc.Close()

// 	rr, err := registries.NewRiverRegistryContract(
// 		ctx, bc, &config.ContractConfig{Address: btc.RiverRegistryAddress})
// 	require.NoError(err)

// 	var (
// 		chainBlockNum        = btc.BlockNum(ctx)
// 		confirmedTransaction = new(sync.Map)

// 		registerRegistry = func(monitor crypto.ChainMonitorBuilder, r *nodeRegistryImpl) crypto.ChainMonitorBuilder {
// 			return monitor.OnContractEvent(rr.Address, func(ctx context.Context, event types.Log) {
// 				key := fmt.Sprintf("%p_%s", r, event.TxHash)
// 				confirmedTransaction.Store(key, struct{}{})
// 			})
// 		}
// 		waitForTx = func(r *nodeRegistryImpl, tx common.Hash) {
// 			for {
// 				<-time.After(10 * time.Millisecond)
// 				key := fmt.Sprintf("%p_%s", r, tx)
// 				if _, ok := confirmedTransaction.Load(key); ok {
// 					return
// 				}
// 			}
// 		}
// 	)

// 	chainMonitor := crypto.NewChainMonitorBuilder(chainBlockNum + 1)
// 	r, err := LoadNodeRegistry(ctx, rr, bc.Wallet.Address, chainBlockNum, chainMonitor)
// 	chainMonitor = registerRegistry(chainMonitor, r)

// 	require.Error(err)
// 	require.Nil(r)
// 	require.Equal(Err_UNKNOWN_NODE, AsRiverError(err).Code)
// 	go chainMonitor.Build(10*time.Millisecond).Run(ctx, bc.Client)

// 	owner := btc.DeployerBlockchain
// 	go owner.ChainMonitorBuilder.Build(10*time.Millisecond).Run(ctx, owner.Client)

// 	urls := []string{"https://river0.test", "https://river1.test", "https://river2.test"}
// 	addrs := []common.Address{btc.Wallets[0].Address, crypto.GetTestAddress(), crypto.GetTestAddress()}

// 	pendingTx, err := owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
// 	})
// 	require.NoError(err)
// 	btc.Commit()
// 	receipt := <-pendingTx.Wait()
// 	require.Equal(uint64(1), receipt.Status, "register node transaction failed")

// 	chainBlockNum = btc.BlockNum(ctx)

// 	r, err = LoadNodeRegistry(ctx, rr, bc.Wallet.Address, chainBlockNum, chainMonitor)
// 	chainMonitor = registerRegistry(chainMonitor, r)
// 	require.NoError(err)
// 	require.NotNil(r)
// 	nodes := r.GetAllNodes()
// 	require.Len(nodes, 1)
// 	go chainMonitor.Build(10*time.Millisecond).Run(ctx, bc.Client)

// 	record := nodes[0]
// 	require.NoError(err)
// 	require.Equal(btc.Wallets[0].Address, record.address)
// 	require.Equal(urls[0], record.url)
// 	require.True(record.local)
// 	require.Equal(contracts.NodeStatus_NotInitialized, record.status)

// 	pendingTx, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.RegisterNode(opts, addrs[1], urls[1], contracts.NodeStatus_Operational)
// 	})
// 	require.NoError(err)
// 	btc.Commit()
// 	receipt = <-pendingTx.Wait()
// 	require.Equal(uint64(1), receipt.Status, "register node transaction failed")
// 	waitForTx(r, receipt.TxHash)

// 	nodes = r.GetAllNodes()
// 	require.Len(nodes, 2)

// 	record, err = r.GetNode(addrs[1])
// 	require.NoError(err)
// 	require.Equal(addrs[1], record.address)
// 	require.Equal(urls[1], record.url)
// 	require.False(record.local)
// 	require.Equal(contracts.NodeStatus_Operational, record.status)

// 	const updatedUrl = "https://river1-updated.test"
// 	pendingTx, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.UpdateNodeUrl(opts, addrs[1], updatedUrl)
// 	})
// 	require.NoError(err)
// 	btc.Commit()
// 	receipt = <-pendingTx.Wait()
// 	require.Equal(uint64(1), receipt.Status, "update node transaction failed")
// 	waitForTx(r, receipt.TxHash)

// 	record, err = r.GetNode(addrs[1])
// 	require.NoError(err)
// 	require.Equal(addrs[1], record.address)
// 	require.Equal(updatedUrl, record.url)
// 	require.False(record.local)
// 	require.Equal(contracts.NodeStatus_Operational, record.status)

// 	pendingTx, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.UpdateNodeStatus(opts, addrs[1], contracts.NodeStatus_Departing)
// 	})
// 	require.NoError(err)
// 	btc.Commit()
// 	receipt = <-pendingTx.Wait()
// 	require.Equal(uint64(1), receipt.Status, "update node transaction failed")
// 	waitForTx(r, receipt.TxHash)

// 	record, err = r.GetNode(addrs[1])
// 	require.NoError(err)
// 	require.Equal(addrs[1], record.address)
// 	require.Equal(updatedUrl, record.url)
// 	require.False(record.local)
// 	require.Equal(contracts.NodeStatus_Departing, record.status)

// 	_, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		tx, err := btc.NodeRegistry.RemoveNode(opts, addrs[1])
// 		require.Error(err)
// 		require.Contains(err.Error(), "NODE_STATE_NOT_ALLOWED")
// 		return tx, err
// 	})
// 	require.Error(err)
// 	btc.Commit()

// 	_, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.UpdateNodeStatus(opts, addrs[1], contracts.NodeStatus_Deleted)
// 	})
// 	require.NoError(err)
// 	btc.Commit()

// 	pendingTx, err = owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
// 		return btc.NodeRegistry.RemoveNode(opts, addrs[1])
// 	})
// 	require.NoError(err)
// 	btc.Commit()
// 	receipt = <-pendingTx.Wait()
// 	require.Equal(uint64(1), receipt.Status, "remove node transaction failed")
// 	waitForTx(r, receipt.TxHash)

// 	nodes = r.GetAllNodes()
// 	require.Len(nodes, 1)
// 	record, err = r.GetNode(addrs[1])
// 	require.Error(err)
// 	require.Nil(record)
// }
