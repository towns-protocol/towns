package auth

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/base"
	types "github.com/towns-protocol/towns/core/contracts/types"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/xchain/entitlement"

	"github.com/ethereum/go-ethereum/common"
	ethTypes "github.com/ethereum/go-ethereum/core/types"
)

type ChainAuth interface {
	/*
		IsEntitled algorithm
		====================
		1. If this check has been recently performed, return the cached result.
		2. Validate that the space or channel is enabled, depending on whether the request is for a space or channel.
		   This computation is cached and if a cached result is available, it is used.
		   If the space or channel is disabled, return false.
		3. All linked wallets for the principal are retrieved.
		4. All linked wallets are checked for space membership. If any are not a space member, the permission check fails.
		5. If the number of linked wallets exceeds the limit, the permission check fails.
		6A. For spaces, the space entitlements are retrieved and checked against all linked wallets.
			1. If the owner of the space is in the linked wallets, the permission check passes.
			2. If the space has a rule entitlement, the rule is evaluated against the linked wallets. If it passes,
			   the permission check passes.
			3. If the space has a user entitlement, all linked wallets are checked against the user entitlement. If any
			   linked wallets are in the user entitlement, the permission check passes.
			4. If none of the above checks pass, the permission check fails.
		6B. For channels, the space contract method `IsEntitledToChannel` is called for each linked wallet. If any of the
			linked wallets are entitled to the channel, the permission check passes. Otherwise, it fails.
	*/
	IsEntitled(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (IsEntitledResult, error)
	VerifyReceipt(ctx context.Context, cfg *config.Config, receipt *BlockchainTransactionReceipt) (bool, error)
}

type isEntitledResult struct {
	isAllowed bool
	reason    EntitlementResultReason
}

type IsEntitledResult interface {
	IsEntitled() bool
	Reason() EntitlementResultReason
}

func (r *isEntitledResult) IsEntitled() bool {
	if r == nil {
		return false
	}
	return r.isAllowed
}

func (r *isEntitledResult) Reason() EntitlementResultReason {
	if r == nil {
		return EntitlementResultReason_NONE
	}
	return r.reason
}

var everyone = common.HexToAddress("0x1") // This represents an Ethereum address of "0x1"

func NewChainAuthArgsForApp(userId common.Address, appContractAddress common.Address) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindIsApp,
		principal:  userId,
		appAddress: appContractAddress,
	}
}

func NewChainAuthArgsForIsNotApp(userId common.Address) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:      chainAuthKindIsNotApp,
		principal: userId,
	}
}

// NewChainAuthArgsForIsBotOwner creates chain auth args to check if the principal (userId)
// is the owner of the bot whose client address is botClientAddress.
func NewChainAuthArgsForIsBotOwner(userId common.Address, botClientAddress common.Address) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:             chainAuthKindIsBotOwner,
		principal:        userId,
		botClientAddress: botClientAddress,
	}
}

func NewChainAuthArgsForSpace(
	spaceId shared.StreamId,
	userId common.Address,
	permission Permission,
	appAddress common.Address,
) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindSpace,
		spaceId:    spaceId,
		principal:  userId,
		permission: permission,
		appAddress: appAddress,
	}
}

func NewChainAuthArgsForChannel(
	spaceId shared.StreamId,
	channelId shared.StreamId,
	userId common.Address,
	permission Permission,
	appAddress common.Address,
) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindChannel,
		spaceId:    spaceId,
		channelId:  channelId,
		principal:  userId,
		permission: permission,
		appAddress: appAddress,
	}
}

func NewChainAuthArgsForIsSpaceMember(
	spaceId shared.StreamId,
	userId common.Address,
	appAddress common.Address,
) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:       chainAuthKindIsSpaceMember,
		spaceId:    spaceId,
		principal:  userId,
		appAddress: appAddress,
	}
}

func NewChainAuthArgsForIsWalletLinked(
	userAddress common.Address,
	walletAddress common.Address,
) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:          chainAuthKindIsWalletLinked,
		principal:     userAddress,
		walletAddress: walletAddress,
	}
}

type chainAuthKind int

const (
	chainAuthKindSpace chainAuthKind = iota
	chainAuthKindChannel
	chainAuthKindSpaceEnabled
	chainAuthKindChannelEnabled
	chainAuthKindIsSpaceMember
	chainAuthKindIsWalletLinked
	chainAuthKindIsApp
	chainAuthKindIsNotApp
	chainAuthKindIsBotOwner
)

type ChainAuthArgs struct {
	kind       chainAuthKind
	spaceId    shared.StreamId
	channelId  shared.StreamId
	principal  common.Address
	permission Permission

	// appAddress, when specified, is the app contract address of the app whose client address
	// is the user id. For an IS_APP check, we check that the appAddress is correctly registered
	// with the registry. For all other checks with non-zero appAddress values, the appAddress is
	// inferred by the node based on snapshot inception values or membership states of various
	// local streams.
	appAddress common.Address

	linkedWallets string // a serialized list of linked wallets to comply with the cache key constraints
	walletAddress common.Address
	tokenIdsStr   string // a serialized list of token ids to comply with the cache key constraints

	// botClientAddress is the client address of a bot for IS_BOT_OWNER checks.
	// This is the address of the user stream that the bot owner is trying to write to.
	botClientAddress common.Address
}

func (args *ChainAuthArgs) Principal() common.Address {
	return args.principal
}

func (args *ChainAuthArgs) String() string {
	return fmt.Sprintf(
		"ChainAuthArgs{kind: %d, spaceId: %s, channelId: %s, principal: %s, permission: %s, linkedWallets: %s, walletAddress: %s, appAddress: %s, botClientAddress: %s}",
		args.kind,
		args.spaceId,
		args.channelId,
		args.principal.Hex(),
		args.permission,
		args.linkedWallets,
		args.walletAddress.Hex(),
		args.appAddress.Hex(),
		args.botClientAddress.Hex(),
	)
}

func (args *ChainAuthArgs) withLinkedWallets(linkedWallets []common.Address) *ChainAuthArgs {
	ret := *args
	var builder strings.Builder
	for i, addr := range linkedWallets {
		if i > 0 {
			builder.WriteString(",")
		}
		builder.WriteString(addr.Hex())
	}
	ret.linkedWallets = builder.String()
	return &ret
}

func (args *ChainAuthArgs) appendTokenIds(tokenIds []*big.Int) *ChainAuthArgs {
	// serialize the token ids,
	builder := strings.Builder{}
	//  start with args.tokenIdsStr
	builder.WriteString(args.tokenIdsStr)
	for i, tokenId := range tokenIds {
		if i > 0 || len(args.tokenIdsStr) > 0 {
			builder.WriteString(",")
		}
		builder.WriteString(tokenId.String())
	}
	ret := *args
	ret.tokenIdsStr = builder.String()
	return &ret
}

func (args *ChainAuthArgs) tokenIds() ([]*big.Int, error) {
	// deserialize the token ids
	tokenIds := make([]*big.Int, 0)
	if len(args.tokenIdsStr) > 0 {
		for _, tokenIdStr := range strings.Split(args.tokenIdsStr, ",") {
			tokenId, ok := new(big.Int).SetString(tokenIdStr, 10)
			if !ok {
				return nil, RiverError(Err_INTERNAL, "Failed to parse token id").Func("tokenIds").
					Tag("tokenIdStr", tokenIdStr)
			}
			tokenIds = append(tokenIds, tokenId)
		}
	}
	return tokenIds, nil
}

func newArgsForEnabledSpace(spaceId shared.StreamId) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:    chainAuthKindSpaceEnabled,
		spaceId: spaceId,
	}
}

func newArgsForEnabledChannel(spaceId shared.StreamId, channelId shared.StreamId) *ChainAuthArgs {
	return &ChainAuthArgs{
		kind:      chainAuthKindChannelEnabled,
		spaceId:   spaceId,
		channelId: channelId,
	}
}

// Used as a cache key for linked wallets, which span multiple spaces and channels.
func newArgsForLinkedWallets(principal common.Address) *ChainAuthArgs {
	return &ChainAuthArgs{
		principal: principal,
	}
}

const (
	DEFAULT_REQUEST_TIMEOUT_MS = 10000
	DEFAULT_MAX_WALLETS        = 10
)

type chainAuth struct {
	blockchain              *crypto.Blockchain
	evaluator               *entitlement.Evaluator
	spaceContract           SpaceContract
	appRegistryContract     *AppRegistryContract
	walletLinkContract      *base.WalletLink
	linkedWalletsLimit      int
	contractCallsTimeoutMs  int
	entitlementCache        *entitlementCache
	membershipCache         *entitlementCache
	entitlementManagerCache *entitlementCache
	linkedWalletCache       *entitlementCache

	isEntitledToChannelCacheHit  prometheus.Counter
	isEntitledToChannelCacheMiss prometheus.Counter
	isEntitledToSpaceCacheHit    prometheus.Counter
	isEntitledToSpaceCacheMiss   prometheus.Counter
	isSpaceEnabledCacheHit       prometheus.Counter
	isSpaceEnabledCacheMiss      prometheus.Counter
	isChannelEnabledCacheHit     prometheus.Counter
	isChannelEnabledCacheMiss    prometheus.Counter
	entitlementCacheHit          prometheus.Counter
	entitlementCacheMiss         prometheus.Counter
	linkedWalletCacheHit         prometheus.Counter
	linkedWalletCacheMiss        prometheus.Counter
	linkedWalletCacheBust        prometheus.Counter
	membershipCacheHit           prometheus.Counter
	membershipCacheMiss          prometheus.Counter
}

var _ ChainAuth = (*chainAuth)(nil)

func NewChainAuth(
	ctx context.Context,
	blockchain *crypto.Blockchain,
	evaluator *entitlement.Evaluator,
	architectCfg *config.ContractConfig,
	appRegistryConfig *config.ContractConfig,
	linkedWalletsLimit int,
	contractCallsTimeoutMs int,
	metrics infra.MetricsFactory,
) (*chainAuth, error) {
	// instantiate contract facets from diamond configuration
	spaceContract, err := NewSpaceContractV3(ctx, architectCfg, blockchain.Config, blockchain.Client)
	if err != nil {
		return nil, err
	}

	walletLinkContract, err := base.NewWalletLink(architectCfg.Address, blockchain.Client)
	if err != nil {
		return nil, err
	}

	appRegistryContract, err := NewAppRegistryContract(ctx, appRegistryConfig, blockchain.Client)
	if err != nil {
		return nil, err
	}

	entitlementCache, err := newEntitlementCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	membershipCache, err := newEntitlementCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	// seperate cache for entitlement manager as the timeouts are shorter
	entitlementManagerCache, err := newEntitlementManagerCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	linkedWalletCache, err := newLinkedWalletCache(ctx, blockchain.Config)
	if err != nil {
		return nil, err
	}

	if linkedWalletsLimit <= 0 {
		linkedWalletsLimit = DEFAULT_MAX_WALLETS
	}
	if contractCallsTimeoutMs <= 0 {
		contractCallsTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
	}

	counter := metrics.NewCounterVecEx(
		"entitlement_cache", "Cache hits and misses for entitlement caches", "function", "result")

	return &chainAuth{
		blockchain:              blockchain,
		evaluator:               evaluator,
		spaceContract:           spaceContract,
		walletLinkContract:      walletLinkContract,
		appRegistryContract:     appRegistryContract,
		linkedWalletsLimit:      linkedWalletsLimit,
		contractCallsTimeoutMs:  contractCallsTimeoutMs,
		entitlementCache:        entitlementCache,
		membershipCache:         membershipCache,
		entitlementManagerCache: entitlementManagerCache,
		linkedWalletCache:       linkedWalletCache,

		isEntitledToChannelCacheHit:  counter.WithLabelValues("isEntitledToChannel", "hit"),
		isEntitledToChannelCacheMiss: counter.WithLabelValues("isEntitledToChannel", "miss"),
		isEntitledToSpaceCacheHit:    counter.WithLabelValues("isEntitledToSpace", "hit"),
		isEntitledToSpaceCacheMiss:   counter.WithLabelValues("isEntitledToSpace", "miss"),
		isSpaceEnabledCacheHit:       counter.WithLabelValues("isSpaceEnabled", "hit"),
		isSpaceEnabledCacheMiss:      counter.WithLabelValues("isSpaceEnabled", "miss"),
		isChannelEnabledCacheHit:     counter.WithLabelValues("isChannelEnabled", "hit"),
		isChannelEnabledCacheMiss:    counter.WithLabelValues("isChannelEnabled", "miss"),
		entitlementCacheHit:          counter.WithLabelValues("entitlement", "hit"),
		entitlementCacheMiss:         counter.WithLabelValues("entitlement", "miss"),
		linkedWalletCacheHit:         counter.WithLabelValues("linkedWallet", "hit"),
		linkedWalletCacheMiss:        counter.WithLabelValues("linkedWallet", "miss"),
		linkedWalletCacheBust:        counter.WithLabelValues("linkedWallet", "bust"),
		membershipCacheHit:           counter.WithLabelValues("membership", "hit"),
		membershipCacheMiss:          counter.WithLabelValues("membership", "miss"),
	}, nil
}

func (ca *chainAuth) VerifyReceipt(
	ctx context.Context,
	cfg *config.Config,
	userReceipt *BlockchainTransactionReceipt,
) (bool, error) {
	client, err := ca.evaluator.GetClient(userReceipt.GetChainId())
	if err != nil {
		return false, err
	}
	txHash := common.BytesToHash(userReceipt.GetTransactionHash())
	chainReceipt, err := client.TransactionReceipt(ctx, txHash)
	if err != nil {
		if errors.Is(err, ethereum.NotFound) {
			return false, RiverError(Err_PERMISSION_DENIED, "Transaction receipt not found", "txHash", txHash.Hex())
		}
		return false, AsRiverError(err, Err_DOWNSTREAM_NETWORK_ERROR)
	}

	// Check if the block number matches:
	if chainReceipt.BlockNumber.Uint64() != userReceipt.BlockNumber {
		return false, RiverError(Err_PERMISSION_DENIED, "Block number mismatch", "got",
			chainReceipt.BlockNumber.Uint64(), "user uploaded", userReceipt.BlockNumber)
	}

	// Check logs count and match the event log data
	if len(chainReceipt.Logs) != len(userReceipt.Logs) {
		return false, RiverError(Err_PERMISSION_DENIED, "Log count mismatch: chain:",
			len(chainReceipt.Logs), "uploaded:", len(userReceipt.Logs))
	}

	// For each log, check address, topics, data
	for i, chainLog := range chainReceipt.Logs {
		uploadedLog := userReceipt.Logs[i]
		if !bytes.Equal(chainLog.Address[:], uploadedLog.Address) {
			return false, RiverError(
				Err_PERMISSION_DENIED,
				"Log address mismatch:",
				i,
				"address:",
				chainLog.Address.Hex(),
				"uploaded:",
				uploadedLog.Address,
			)
		}

		if len(chainLog.Topics) != len(uploadedLog.Topics) {
			return false, RiverError(Err_PERMISSION_DENIED, "Log topics count mismatch", i)
		}

		for j, topic := range chainLog.Topics {
			if !bytes.Equal(topic[:], uploadedLog.Topics[j]) {
				return false, RiverError(Err_PERMISSION_DENIED, "Log topic mismatch",
					i, "topic index: ", j, "chain: ", topic.Hex(), "uploaded: ", uploadedLog.Topics[j])
			}
		}

		if !bytes.Equal(chainLog.Data, uploadedLog.Data) {
			return false, RiverError(Err_PERMISSION_DENIED, "Log data mismatch", i)
		}
	}

	// get the transaction
	tx, isPending, err := client.TransactionByHash(ctx, txHash)
	if err != nil {
		return false, err
	}
	if isPending {
		return false, RiverError(Err_PERMISSION_DENIED, "Transaction is pending", "txHash", txHash.Hex())
	}

	// check the to address
	if !bytes.Equal(tx.To()[:], userReceipt.GetTo()) {
		return false, RiverError(
			Err_PERMISSION_DENIED,
			"To address mismatch",
			"chain",
			tx.To().Hex(),
			"uploaded",
			userReceipt.To,
		)
	}

	// check the from addresses
	signer := ethTypes.LatestSignerForChainID(tx.ChainId())
	sender, err := signer.Sender(tx)
	if err != nil {
		return false, err
	}
	if !bytes.Equal(sender.Bytes(), userReceipt.GetFrom()) {
		return false, RiverError(
			Err_PERMISSION_DENIED,
			"From address mismatch",
			"chain",
			sender.Hex(),
			"uploaded",
			userReceipt.From,
		)
	}

	// If we reach here, the logs match exactly.

	// 3) Check the number of confirmations
	latestBlockNumber, err := ca.blockchain.Client.BlockNumber(ctx)
	if err != nil {
		return false, RiverError(Err_PERMISSION_DENIED, "Failed to get latest block number: %v", err)
	}

	confirmations := latestBlockNumber - chainReceipt.BlockNumber.Uint64()
	if confirmations < 1 {
		return false, RiverError(
			Err_PERMISSION_DENIED,
			"Transaction has 0 confirmations.",
			"latestBlockNumber",
			latestBlockNumber,
			"uploaded:",
			chainReceipt.BlockNumber.Uint64(),
		)
	}

	return true, nil
}

func (ca *chainAuth) IsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (IsEntitledResult, error) {
	// TODO: counter for cache hits here?
	result, _, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.checkEntitlement,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("IsEntitled")
	}

	return &isEntitledResult{
		isAllowed: result.IsAllowed(),
		reason:    result.Reason(),
	}, nil
}

func (ca *chainAuth) areLinkedWalletsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, EntitlementResultReason, error) {
	log := logging.FromCtx(ctx)
	if args.kind == chainAuthKindSpace {
		log.Debugw("areLinkedWalletsEntitled", "kind", "space", "args", args)
		return ca.isEntitledToSpace(ctx, cfg, args)
	} else if args.kind == chainAuthKindChannel {
		log.Debugw("areLinkedWalletsEntitled", "kind", "channel", "args", args)
		return ca.isEntitledToChannel(ctx, cfg, args)
	} else if args.kind == chainAuthKindIsSpaceMember {
		// App space memberships are handled earlier - we never get to this case if the user is an app.
		log.Debugw("areLinkedWalletsEntitled", "kind", "isSpaceMember", "args", args)
		return true, EntitlementResultReason_NONE, nil // is space member is checked by the calling code in checkEntitlement
	}
	return false, EntitlementResultReason_NONE, RiverError(
		Err_INTERNAL,
		"Unexpected chain auth kind",
	).Func("areLinkedWalletsEntitled").Tag("kind", args.kind)
}

func (ca *chainAuth) isSpaceEnabledUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
	isDisabled, err := ca.spaceContract.IsSpaceDisabled(ctx, args.spaceId)
	if err != nil {
		return nil, err
	}
	return boolCacheResult{!isDisabled, EntitlementResultReason_SPACE_DISABLED}, nil
}

func (ca *chainAuth) checkSpaceEnabled(
	ctx context.Context,
	cfg *config.Config,
	spaceId shared.StreamId,
) (bool, EntitlementResultReason, error) {
	isEnabled, cacheHit, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		newArgsForEnabledSpace(spaceId),
		ca.isSpaceEnabledUncached,
	)
	if err != nil {
		return false, EntitlementResultReason_NONE, err
	}
	if cacheHit {
		ca.isSpaceEnabledCacheHit.Inc()
	} else {
		ca.isSpaceEnabledCacheMiss.Inc()
	}

	return isEnabled.IsAllowed(), isEnabled.Reason(), nil
}

func (ca *chainAuth) isChannelEnabledUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	// This is awkward as we want enabled to be cached for 15 minutes, but the API returns the inverse
	isDisabled, err := ca.spaceContract.IsChannelDisabled(ctx, args.spaceId, args.channelId)
	if err != nil {
		return nil, err
	}
	return boolCacheResult{!isDisabled, EntitlementResultReason_CHANNEL_DISABLED}, nil
}

func (ca *chainAuth) checkChannelEnabled(
	ctx context.Context,
	cfg *config.Config,
	spaceId shared.StreamId,
	channelId shared.StreamId,
) (bool, EntitlementResultReason, error) {
	isEnabled, cacheHit, err := ca.entitlementCache.executeUsingCache(
		ctx,
		cfg,
		newArgsForEnabledChannel(spaceId, channelId),
		ca.isChannelEnabledUncached,
	)
	if err != nil {
		return false, EntitlementResultReason_NONE, err
	}
	if cacheHit {
		ca.isChannelEnabledCacheHit.Inc()
	} else {
		ca.isChannelEnabledCacheMiss.Inc()
	}

	return isEnabled.IsAllowed(), isEnabled.Reason(), nil
}

// CacheResult is the result of a cache lookup.
// allowed means that this value should be cached
// not that the caller is allowed to access the permission
type entitlementCacheResult struct {
	allowed         bool
	entitlementData []types.Entitlement
	owner           common.Address
}

func (ecr *entitlementCacheResult) IsAllowed() bool {
	return ecr.allowed
}

func (ecr *entitlementCacheResult) Reason() EntitlementResultReason {
	return EntitlementResultReason_NONE // entitlement cache results are a second layer of caching, so we don't need to return a reason
}

// If entitlements are found for the permissions, they are returned and the allowed flag is set true so the results may
// be cached.
// If the call fails or the space is not found, the allowed flag is set to false so the negative caching time applies.
func (ca *chainAuth) getSpaceEntitlementsForPermissionUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)
	entitlementData, owner, err := ca.spaceContract.GetSpaceEntitlementsForPermission(
		ctx,
		args.spaceId,
		args.permission,
	)

	log.Debugw("getSpaceEntitlementsForPermissionUncached", "args", args, "entitlementData", entitlementData)
	if err != nil {
		return &entitlementCacheResult{
				allowed: false,
			}, AsRiverError(
				err,
			).Func("getSpaceEntitlementsForPermision").
				Message("Failed to get space entitlements")
	}
	return &entitlementCacheResult{allowed: true, entitlementData: entitlementData, owner: owner}, nil
}

// If entitlements are found for the permissions, they are returned and the allowed flag is set true so the results may
// be cached.
// If the call fails or the space is not found, the allowed flag is set to false so the negative caching time applies.
func (ca *chainAuth) getChannelEntitlementsForPermissionUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)
	entitlementData, owner, err := ca.spaceContract.GetChannelEntitlementsForPermission(
		ctx,
		args.spaceId,
		args.channelId,
		args.permission,
	)

	log.Debugw("getChannelEntitlementsForPermissionUncached", "args", args, "entitlementData", entitlementData)
	if err != nil {
		return &entitlementCacheResult{
				allowed: false,
			}, AsRiverError(
				err,
			).Func("getChannelEntitlementsForPermission").
				Message("Failed to get channel entitlements")
	}
	return &entitlementCacheResult{allowed: true, entitlementData: entitlementData, owner: owner}, nil
}

func (ca *chainAuth) isEntitledToChannelUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)
	log.Debugw("isEntitledToChannelUncached", "args", args)
	// Route apps to a separate entitlement evaluation path.
	zeroAddress := common.Address{}
	if args.appAddress != zeroAddress {
		return ca.isAppEntitled(ctx, args)
	}

	result, cacheHit, err := ca.entitlementManagerCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.getChannelEntitlementsForPermissionUncached,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("isEntitledToChannel").Message("Failed to get channel entitlements")
	}

	if cacheHit {
		ca.entitlementCacheHit.Inc()
	} else {
		ca.entitlementCacheMiss.Inc()
	}

	temp := (result.(*timestampedCacheValue).Result())
	entitlementData := temp.(*entitlementCacheResult) // Assuming result is of *entitlementCacheResult type

	allowed, err := ca.evaluateWithEntitlements(
		ctx,
		args,
		entitlementData.owner,
		entitlementData.entitlementData,
	)
	if err != nil {
		return nil, AsRiverError(err).
			Func("isEntitledToChannel").
			Message("Failed to evaluate entitlements").
			Tag("channelId", args.channelId)
	}
	return boolCacheResult{allowed, EntitlementResultReason_CHANNEL_ENTITLEMENTS}, nil
}

func deserializeWallets(serialized string) []common.Address {
	addressStrings := strings.Split(serialized, ",")
	linkedWallets := make([]common.Address, len(addressStrings))
	for i, addrStr := range addressStrings {
		linkedWallets[i] = common.HexToAddress(addrStr)
	}
	return linkedWallets
}

// evaluateEntitlementData evaluates a list of entitlements and returns true if any of them are true.
// The entitlements are evaluated across all linked wallets - if any of the wallets are entitled, the user is entitled.
// Rule entitlements are evaluated by a library shared with xchain and user entitlements are evaluated in the loop.
func (ca *chainAuth) evaluateEntitlementData(
	ctx context.Context,
	entitlements []types.Entitlement,
	args *ChainAuthArgs,
) (bool, error) {
	log := logging.FromCtx(ctx).With("function", "evaluateEntitlementData")
	log.Debugw("evaluateEntitlementData", "args", args)

	wallets := deserializeWallets(args.linkedWallets)
	for _, ent := range entitlements {
		switch ent.EntitlementType {
		case types.ModuleTypeRuleEntitlement:
			re := ent.RuleEntitlement
			log.Debugw(ent.EntitlementType, "re", re)

			// Convert the rule data to the latest version
			reV2, err := types.ConvertV1RuleDataToV2(ctx, re)
			if err != nil {
				return false, err
			}

			result, err := ca.evaluator.EvaluateRuleData(ctx, wallets, reV2)
			if err != nil {
				return false, err
			}
			if result {
				log.Debugw("rule entitlement is true", "spaceId", args.spaceId)
				return true, nil
			} else {
				log.Debugw("rule entitlement is false", "spaceId", args.spaceId)
			}
		case types.ModuleTypeRuleEntitlementV2:
			re := ent.RuleEntitlementV2
			log.Debugw(ent.EntitlementType, "re", re)
			result, err := ca.evaluator.EvaluateRuleData(ctx, wallets, re)
			if err != nil {
				return false, err
			}
			if result {
				log.Debugw("rule entitlement v2 is true", "spaceId", args.spaceId)
				return true, nil
			} else {
				log.Debugw("rule entitlement v2 is false", "spaceId", args.spaceId)
			}

		case types.ModuleTypeUserEntitlement:
			log.Debugw("UserEntitlement", "userEntitlement", ent.UserEntitlement)
			for _, user := range ent.UserEntitlement {
				if user == everyone {
					log.Debugw("user entitlement: everyone is entitled to space", "spaceId", args.spaceId)
					return true, nil
				} else {
					for _, wallet := range wallets {
						if wallet == user {
							log.Debugw("user entitlement: wallet is entitled to space", "spaceId", args.spaceId, "wallet", wallet)
							return true, nil
						}
					}
				}
			}
		default:
			log.Warnw("Invalid entitlement type", "entitlement", ent)
		}
	}
	return false, nil
}

// isAppEntitled evaluates space or channel permission entitlement for a user that has been determined
// to be an app.
func (ca *chainAuth) isAppEntitled(
	ctx context.Context,
	args *ChainAuthArgs,
) (CacheResult, error) {
	if args.kind == chainAuthKindIsSpaceMember {
		// membership has already been checked earlier in the IsEntitled logic.
		return &boolCacheResult{true, EntitlementResultReason_NONE}, nil
	}

	isEntitled, err := ca.spaceContract.IsAppEntitled(
		ctx,
		args.spaceId,
		args.principal,
		args.appAddress,
		args.permission,
	)
	if err != nil {
		return nil, AsRiverError(
			err,
		).Message("Error checking space contract for app entitlement").
			Tag("appAddress", args.appAddress).
			Tag("clientAddress", args.principal)
	}
	if !isEntitled {
		return boolCacheResult{false, EntitlementResultReason_APP_ENTITLEMENTS}, nil
	}

	return boolCacheResult{true, EntitlementResultReason_NONE}, nil
}

// evaluateWithEntitlements evaluates a user permission considering 3 factors:
// 1. Are they the space owner? The space owner has su over all space operations.
// 2. Are they banned from the space? If so, they are not entitled to anything.
// 3. Are they entitled to the space based on the entitlement data?
func (ca *chainAuth) evaluateWithEntitlements(
	ctx context.Context,
	args *ChainAuthArgs,
	owner common.Address,
	entitlements []types.Entitlement,
) (bool, error) {
	log := logging.FromCtx(ctx)

	// 1. Check if the user is the space owner
	// Space owner has su over all space operations.
	wallets := deserializeWallets(args.linkedWallets)
	for _, wallet := range wallets {
		if wallet == owner {
			log.Debugw(
				"owner is entitled to space",
				"spaceId",
				args.spaceId,
				"userId",
				wallet,
				"principal",
				args.principal,
			)
			return true, nil
		}
	}

	// Short-circuit the rest of the evaluation if the auth check was for ownership of a space or channel.
	if args.permission == PermissionOwnership {
		return false, nil
	}

	// 2. Check if the user has been banned
	tokenIds, err := args.tokenIds()
	if err != nil {
		return false, AsRiverError(err).Func("evaluateEntitlements").
			Tag("spaceId", args.spaceId).
			Tag("userId", args.principal).
			Tag("appAddress", args.appAddress)
	}
	banned, err := ca.spaceContract.IsBanned(ctx, args.spaceId, tokenIds)
	if err != nil {
		return false, AsRiverError(err).Func("evaluateEntitlements").
			Tag("spaceId", args.spaceId).
			Tag("userId", args.principal).
			Tag("appAddress", args.appAddress)
	}
	if banned {
		log.Warnw(
			"Evaluating entitlements for a user who is banned from the space",
			"userId",
			args.principal,
			"spaceId",
			args.spaceId,
			"linkedWallets",
			args.linkedWallets,
		)
		return false, nil
	}

	// 3. Evaluate entitlement data to check if the user is entitled to the space.
	allowed, err := ca.evaluateEntitlementData(ctx, entitlements, args)
	if err != nil {
		return false, AsRiverError(err).Func("evaluateEntitlements")
	} else {
		return allowed, nil
	}
}

func (ca *chainAuth) isEntitledToSpaceUncached(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)
	log.Debugw("isEntitledToSpaceUncached", "args", args)

	// Route apps to a separate entitlement evaluation path.
	zeroAddress := common.Address{}
	if args.appAddress != zeroAddress {
		return ca.isAppEntitled(ctx, args)
	}

	result, cacheHit, err := ca.entitlementManagerCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.getSpaceEntitlementsForPermissionUncached,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("isEntitledToSpace").
			Message("Failed to get space entitlements")
	}

	if cacheHit {
		ca.entitlementCacheHit.Inc()
	} else {
		ca.entitlementCacheMiss.Inc()
	}

	temp := (result.(*timestampedCacheValue).Result())
	entitlementData := temp.(*entitlementCacheResult) // Assuming result is of *entitlementCacheResult type

	allowed, err := ca.evaluateWithEntitlements(ctx, args, entitlementData.owner, entitlementData.entitlementData)
	if err != nil {
		return nil, AsRiverError(err).
			Func("isEntitledToSpace").
			Message("Failed to evaluate entitlements")
	}
	return boolCacheResult{allowed, EntitlementResultReason_SPACE_ENTITLEMENTS}, nil
}

func (ca *chainAuth) isEntitledToSpace(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, EntitlementResultReason, error) {
	if args.kind != chainAuthKindSpace {
		return false, EntitlementResultReason_NONE, RiverError(Err_INTERNAL, "Wrong chain auth kind")
	}

	isEntitled, cacheHit, err := ca.entitlementCache.executeUsingCache(ctx, cfg, args, ca.isEntitledToSpaceUncached)
	if err != nil {
		return false, EntitlementResultReason_NONE, err
	}
	if cacheHit {
		ca.isEntitledToSpaceCacheHit.Inc()
	} else {
		ca.isEntitledToSpaceCacheMiss.Inc()
	}

	return isEntitled.IsAllowed(), isEntitled.Reason(), nil
}

func (ca *chainAuth) isEntitledToChannel(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, EntitlementResultReason, error) {
	if args.kind != chainAuthKindChannel {
		return false, EntitlementResultReason_NONE, RiverError(Err_INTERNAL, "Wrong chain auth kind")
	}

	isEntitled, cacheHit, err := ca.entitlementCache.executeUsingCache(ctx, cfg, args, ca.isEntitledToChannelUncached)
	if err != nil {
		return false, EntitlementResultReason_NONE, err
	}
	if cacheHit {
		ca.isEntitledToChannelCacheHit.Inc()
	} else {
		ca.isEntitledToChannelCacheMiss.Inc()
	}

	return isEntitled.IsAllowed(), isEntitled.Reason(), nil
}

func (ca *chainAuth) getLinkedWalletsUncached(
	ctx context.Context,
	_ *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)

	wallets, err := ca.evaluator.GetLinkedWallets(ctx, args.principal, ca.walletLinkContract, nil, nil, nil)
	if err != nil {
		log.Errorw("Failed to get linked wallets", "error", err, "wallet", args.principal.Hex())
		return nil, err
	}

	return &linkedWalletCacheValue{
		wallets: wallets,
	}, nil
}

func (ca *chainAuth) getLinkedWallets(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) ([]common.Address, error) {
	log := logging.FromCtx(ctx)

	if ca.walletLinkContract == nil {
		log.Warnw("Wallet link contract is not setup properly, returning root key only")
		return []common.Address{args.principal}, nil
	}

	userCacheKey := newArgsForLinkedWallets(args.principal)
	// We want fresh linked wallets when evaluating space and channel joins, key solicitations,
	// user scrubs, and checking if a wallet is linked, all of which request the Read permission.
	// Note: space joins seem to request Read on the space, but they should probably actually
	// be sending chain auth args with kind set to chainAuthKindIsSpaceMember.
	if args.permission == PermissionRead || args.kind == chainAuthKindIsSpaceMember ||
		args.kind == chainAuthKindIsWalletLinked {
		ca.linkedWalletCache.bust(userCacheKey)
		ca.linkedWalletCacheBust.Inc()
	}

	result, cacheHit, err := ca.linkedWalletCache.executeUsingCache(
		ctx,
		cfg,
		userCacheKey,
		ca.getLinkedWalletsUncached,
	)
	if err != nil {
		log.Errorw("Failed to get linked wallets", "error", err, "wallet", args.principal.Hex())
		return nil, err
	}

	if cacheHit {
		ca.linkedWalletCacheHit.Inc()
	} else {
		ca.linkedWalletCacheMiss.Inc()
	}

	return result.(*timestampedCacheValue).result.(*linkedWalletCacheValue).wallets, nil
}

func (ca *chainAuth) checkWalletMembershipUncached(
	ctx context.Context,
	_ *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	membershipStatus, err := ca.spaceContract.GetMembershipStatus(ctx, args.spaceId, args.principal)
	if err != nil {
		return &membershipStatusCacheResult{status: nil}, err
	}
	return &membershipStatusCacheResult{status: membershipStatus}, nil
}

func (ca *chainAuth) checkWalletMembership(
	ctx context.Context,
	cfg *config.Config,
	address common.Address,
	spaceId shared.StreamId,
	results chan<- *membershipStatusCacheResult,
	errors chan<- error,
	wg *sync.WaitGroup,
) {
	log := logging.FromCtx(ctx)
	defer wg.Done()

	args := ChainAuthArgs{
		kind:      chainAuthKindIsSpaceMember,
		spaceId:   spaceId,
		principal: address,
	}
	result, cacheHit, err := ca.membershipCache.executeUsingCache(
		ctx,
		cfg,
		&args,
		ca.checkWalletMembershipUncached,
	)
	if err != nil {
		// Errors here could be due to context cancellation if another wallet evaluates as a member.
		// However, these can also be informative. Anything that is not a context cancellation is
		// an actual error. However, the entitlement check may still be successful if at least one
		// linked wallet resulted in a positive membership check.
		log.Infow(
			"Error checking membership (due to early termination?)",
			"error",
			err,
			"address",
			address.Hex(),
			"spaceId",
			spaceId,
		)
		errors <- err
		return
	}

	if cacheHit {
		ca.membershipCacheHit.Inc()
	} else {
		ca.membershipCacheMiss.Inc()
	}

	cachedResult := result.(*timestampedCacheValue).result.(*membershipStatusCacheResult)
	results <- cachedResult
}

func (ca *chainAuth) checkStreamIsEnabled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (bool, EntitlementResultReason, error) {
	if args.kind == chainAuthKindSpace || args.kind == chainAuthKindIsSpaceMember {
		isEnabled, reason, err := ca.checkSpaceEnabled(ctx, cfg, args.spaceId)
		if err != nil {
			return false, reason, err
		}
		return isEnabled, reason, nil
	} else if args.kind == chainAuthKindChannel {
		isEnabled, reason, err := ca.checkChannelEnabled(ctx, cfg, args.spaceId, args.channelId)
		if err != nil {
			return false, reason, err
		}
		return isEnabled, reason, nil
	} else if args.kind == chainAuthKindIsWalletLinked || args.kind == chainAuthKindIsApp || args.kind == chainAuthKindIsNotApp || args.kind == chainAuthKindIsBotOwner {
		return true, EntitlementResultReason_NONE, nil
	} else {
		return false, EntitlementResultReason_NONE, RiverError(Err_INTERNAL, "Unknown chain auth kind").Func("checkStreamIsEnabled")
	}
}

// checkIsApp checks to see if the user is an app and returns a cache result if the auth check was related
// to whether or not a user is an app. Otherwise it will return a valid boolean, and the contract address of
// the app if it is registered, or an error if the method encounters one.
// TODO: it may be valuable to cache this in the future.
func (ca *chainAuth) checkIsApp(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	if args.kind == chainAuthKindIsApp || args.kind == chainAuthKindIsNotApp {
		isApp, appAddress, err := ca.appRegistryContract.UserIsRegisteredAsApp(ctx, args.principal)
		if err != nil {
			return nil, err
		}

		logging.FromCtx(ctx).
			Debugw(
				"checkIsApp",
				"kind", args.kind,
				"args.spaceId", args.spaceId,
				"args.channelId", args.channelId,
				"args.appAddress", args.appAddress,
				"principal", args.principal,
				"foundAppAddress", appAddress,
				"isApp", isApp,
			)

		if args.kind == chainAuthKindIsApp {
			if isApp {
				if appAddress == args.appAddress {
					return boolCacheResult{true, EntitlementResultReason_NONE}, nil
				} else {
					return boolCacheResult{false, EntitlementResultReason_MISMATCHED_APP_ADDRESS}, nil
				}
			} else {
				return boolCacheResult{false, EntitlementResultReason_IS_NOT_APP}, nil
			}
		} else {
			if isApp {
				return boolCacheResult{false, EntitlementResultReason_IS_APP}, nil
			} else {
				return boolCacheResult{true, EntitlementResultReason_NONE}, nil
			}
		}
	}

	if args.kind == chainAuthKindIsBotOwner {
		log := logging.FromCtx(ctx)

		appOwner, err := ca.appRegistryContract.GetAppOwnerByClient(ctx, args.botClientAddress)
		if err != nil {
			return nil, err
		}

		zeroAddress := common.Address{}
		if appOwner == zeroAddress {
			return boolCacheResult{false, EntitlementResultReason_IS_NOT_BOT_OWNER}, nil
		}

		wallets, err := ca.getLinkedWallets(ctx, cfg, args)
		if err != nil {
			return nil, err
		}

		log.Debugw(
			"checkIsBotOwner",
			"principal", args.principal,
			"botClientAddress", args.botClientAddress,
			"appOwner", appOwner,
			"wallets", wallets,
		)

		for _, wallet := range wallets {
			if wallet == appOwner {
				return boolCacheResult{true, EntitlementResultReason_NONE}, nil
			}
		}

		return boolCacheResult{false, EntitlementResultReason_IS_NOT_BOT_OWNER}, nil
	}

	return nil, nil
}

// checkAppMembership validates that the app is a member of the space. If the app
// is not installed on the space, it will return a false entitlement result that
// can be propogated back up the call stack.
func (ca *chainAuth) checkAppMembership(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	result, cacheHit, err := ca.membershipCache.executeUsingCache(
		ctx,
		cfg,
		args,
		ca.checkAppMembershipUncached,
	)

	if cacheHit {
		ca.membershipCacheHit.Inc()
	} else {
		ca.membershipCacheMiss.Inc()
	}

	return result, err
}

func (ca *chainAuth) checkAppMembershipUncached(
	ctx context.Context,
	_ *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	isInstalled, err := ca.spaceContract.IsAppInstalled(ctx, args.spaceId, args.appAddress)
	if err != nil {
		return nil, err
	}

	if !isInstalled {
		return boolCacheResult{false, EntitlementResultReason_MEMBERSHIP}, nil
	}
	return boolCacheResult{true, EntitlementResultReason_NONE}, nil
}

// linkWallets fetches linked wallets for the user and returns a cache result if the authorization kind
// was related to linked wallets. The way the caller should process the results is, if the cache result
// is defined, then return it as the entitlement result. Otherwise, use the updated args which will
// have linked wallets attached.
func (ca *chainAuth) linkWallets(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, *ChainAuthArgs, error) {
	log := logging.FromCtx(ctx)

	// Get all linked wallets.
	wallets, err := ca.getLinkedWallets(ctx, cfg, args)
	if err != nil {
		return nil, nil, err
	}

	// Handle checking if the user is linked to a specific wallet
	if args.kind == chainAuthKindIsWalletLinked {
		for _, wallet := range wallets {
			if wallet == args.walletAddress {
				return boolCacheResult{true, EntitlementResultReason_NONE}, nil, nil
			}
		}
		// If the user is an app, their app address is considered linked to them.
		isApp, appAddress, err := ca.appRegistryContract.UserIsRegisteredAsApp(ctx, args.principal)
		if err != nil {
			return nil, nil, err
		}
		if isApp && appAddress == args.walletAddress {
			return boolCacheResult{true, EntitlementResultReason_NONE}, nil, nil
		}
		return boolCacheResult{false, EntitlementResultReason_WALLET_NOT_LINKED}, nil, nil
	}

	// If the user has more linked wallets than we can evaluate, go ahead and short-circuit the evaluation.
	if len(wallets) > ca.linkedWalletsLimit {
		return nil, nil, RiverError(Err_RESOURCE_EXHAUSTED,
			"too many wallets linked to the root key",
			"rootKey", args.principal, "wallets", len(wallets)).LogError(log)
	}

	args = args.withLinkedWallets(wallets)
	return nil, args, nil
}

// checkMembership checks for space membership, considering all of a user's linked wallets.
func (ca *chainAuth) checkMembership(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	log := logging.FromCtx(ctx)
	wallets := deserializeWallets(args.linkedWallets)

	isMemberCtx, isMemberCancel := context.WithCancel(ctx)
	defer isMemberCancel()

	isMemberResults := make(chan *membershipStatusCacheResult, len(wallets))
	isMemberError := make(chan error, len(wallets))

	var isMemberWg sync.WaitGroup

	for _, address := range wallets {
		isMemberWg.Add(1)
		go ca.checkWalletMembership(
			isMemberCtx,
			cfg,
			address,
			args.spaceId,
			isMemberResults,
			isMemberError,
			&isMemberWg,
		)
	}

	// Wait for at least one true result or all to complete
	go func() {
		isMemberWg.Wait()
		close(isMemberResults)
		close(isMemberError)
	}()

	isMember := false
	isExpired := true
	var membershipError error = nil

	// This loop will wait on at least one true result, and will exit if the channel is closed,
	// meaning all checks have terminated, or if at least one check was positive.
	for result := range isMemberResults {
		if result.status.IsMember {
			args = args.appendTokenIds(result.status.TokenIds)
			isMember = true
			// if not expired, cancel other checks, otherwise continue
			if !result.status.IsExpired {
				isExpired = false
				isMemberCancel()
				break
			}
		}
	}

	// Look for any returned errors. If at least one check was positive, then we ignore any subsequent
	// errors. Otherwise we will report an error result since we could not conclusively determine that
	// the user was not a space member.
	if !isMember {
		for err := range isMemberError {
			// Once we encounter a positive entitlement result, we cancel all other request, which should result
			// in context cancellation errors being returned for those checks, even though the check itself was
			// not faulty. However, a context cancellation error can also occur if a server request times out, so
			// not all cancellations can be ignored.
			// Here, we collect all errors and report them, assuming that when the isMember result is false,
			// no contexts were cancelled by us and therefore any errors that occur at all are informative.
			if err != nil {
				if membershipError != nil {
					membershipError = fmt.Errorf("%w; %w", membershipError, err)
				} else {
					membershipError = err
				}
			}
		}
		if membershipError != nil {
			membershipError = AsRiverError(membershipError, Err_CANNOT_CHECK_ENTITLEMENTS).
				Message("Error(s) evaluating user space membership").
				Func("checkEntitlement").
				Tag("principal", args.principal).
				Tag("permission", args.permission).
				Tag("wallets", args.linkedWallets).
				Tag("spaceId", args.spaceId)
			log.Errorw(
				"User membership could not be evaluated",
				"userId",
				args.principal,
				"spaceId",
				args.spaceId,
				"wallets",
				wallets,
				"aggregateError",
				membershipError,
			)
			return nil, membershipError
		} else {
			// It is expected that some membership checks will fail when the user is legitimately
			// not entitled, so this log statement is for debugging only.
			log.Debugw(
				"User is not a member of the space",
				"userId",
				args.principal,
				"spaceId",
				args.spaceId,
				"wallets",
				wallets,
			)
			return boolCacheResult{false, EntitlementResultReason_MEMBERSHIP}, nil
		}
	}

	if isExpired {
		log.Debugw("Membership expired", "principal", args.principal, "spaceId", args.spaceId)
		return boolCacheResult{false, EntitlementResultReason_MEMBERSHIP_EXPIRED}, nil
	}

	return nil, nil
}

/** checkEntitlement checks if the user is entitled to the space / channel.
 * It checks the entitlements for the root key and all the wallets linked to it in parallel.
 * If any of the wallets is entitled, the user is entitled and all inflight requests are cancelled.
 * If any of the operations fail before getting positive result, the whole operation fails.
 * A prerequisite for this function is that one of the linked wallets is a member of the space.
 *
 * In the case of app users specifically, we do not support wallet linking at this time.
 * App membership and entitlements are also evaluated via separate interfaces on the space contract.
 */
func (ca *chainAuth) checkEntitlement(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (CacheResult, error) {
	// Test-only bypass: if interceptor marked this context and config enabled it, allow immediately.
	if cfg != nil && cfg.TestEntitlementsBypassSecret != "" && IsTestEntitlementBypassEnabled(ctx) {
		return boolCacheResult{true, EntitlementResultReason_NONE}, nil
	}
	ctx, cancel := context.WithTimeout(ctx, time.Millisecond*time.Duration(ca.contractCallsTimeoutMs))
	defer cancel()

	isEnabled, reason, err := ca.checkStreamIsEnabled(ctx, cfg, args)
	if err != nil {
		return nil, err
	} else if !isEnabled {
		return boolCacheResult{false, reason}, nil
	}

	isAppResult, err := ca.checkIsApp(ctx, cfg, args)
	if err != nil {
		return nil, err
	} else if isAppResult != nil {
		return isAppResult, nil
	}

	// If the user is an app, we route membership checks via a separate path on the space
	// contract. If the user is a normal user, we check membership the normal way and run
	// the check for each linked wallet. At this time, we do not support wallet linking
	// for apps.
	zeroAddress := common.Address{}
	if args.appAddress != zeroAddress {
		result, err := ca.checkAppMembership(ctx, cfg, args)
		if err != nil {
			return nil, err
		}
		if !result.IsAllowed() {
			return result, nil
		}
	} else {
		var result CacheResult
		result, args, err = ca.linkWallets(ctx, cfg, args)
		if err != nil {
			return boolCacheResult{}, err
		} else if result != nil {
			return result, nil
		}
		result, err = ca.checkMembership(ctx, cfg, args)
		if err != nil {
			return boolCacheResult{}, err
		} else if result != nil {
			return result, nil
		}
	}

	result, reason, err := ca.areLinkedWalletsEntitled(ctx, cfg, args)
	if err != nil {
		return nil, err
	}

	return boolCacheResult{result, reason}, nil
}
