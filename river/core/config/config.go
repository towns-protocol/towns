package config

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

func GetDefaultConfig() *Config {
	return &Config{
		Port: 443,
		Database: DatabaseConfig{
			StartupDelay:  2 * time.Second,
			NumPartitions: 256,
		},
		StorageType:  "postgres",
		DisableHttps: false,
		BaseChain: ChainConfig{
			// TODO: ChainId:
			BlockTimeMs: 2000,
		},
		RiverChain: ChainConfig{
			// TODO: ChainId:
			BlockTimeMs: 2000,
			TransactionPool: TransactionPoolConfig{
				TransactionTimeout:               6 * time.Second,
				GasFeeCap:                        1_000_000, // 0.001 Gwei
				MinerTipFeeReplacementPercentage: 10,
				GasFeeIncreasePercentage:         10,
			},
		},
		// TODO: ArchitectContract: ContractConfig{},
		// TODO: RegistryContract:  ContractConfig{},
		StreamReconciliation: StreamReconciliationConfig{
			InitialWorkerPoolSize: 4,
			OnlineWorkerPoolSize:  32,
			GetMiniblocksPageSize: 128,
		},
		Log: LogConfig{
			Level:   "info", // NOTE: this default is replaced by flag value
			Console: true,   // NOTE: this default is replaced by flag value
			File:    "",     // NOTE: this default is replaced by flag value
		},
		Metrics: MetricsConfig{
			Enabled: true,
		},
		// TODO: Network: NetworkConfig{},
		StandByOnStart:    true,
		StandByPollPeriod: 500 * time.Millisecond,
		ShutdownTimeout:   1 * time.Second,
		History:           30 * time.Second,
		DebugEndpoints: DebugEndpointsConfig{
			Cache:                 true,
			Memory:                true,
			PProf:                 false,
			Stacks:                true,
			StacksMaxSizeKb:       5 * 1024,
			Stream:                true,
			TxPool:                true,
			CorruptStreams:        true,
			EnableStorageEndpoint: true,
		},
		Scrubbing: ScrubbingConfig{
			ScrubEligibleDuration: 4 * time.Hour,
		},
		RiverRegistry: RiverRegistryConfig{
			PageSize:               5000,
			ParallelReaders:        8,
			MaxRetries:             100,
			MaxRetryElapsedTime:    5 * time.Minute,
			SingleCallTimeout:      30 * time.Second, // geth internal timeout is 30 seconds
			ProgressReportInterval: 10 * time.Second,
		},
		EnableMls: false,
	}
}

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	// Network
	// 0 can be used in tests to elect a free available port.
	Port int
	// DNS name of the node. Used to select interface to listen on. Can be empty.
	Address string

	DisableHttps bool // If FALSE TLSConfig must be set.
	TLSConfig    TLSConfig

	// Storage
	Database    DatabaseConfig
	StorageType string

	// Blockchain configuration
	BaseChain  ChainConfig
	RiverChain ChainConfig

	// Base chain contract configuration
	ArchitectContract ContractConfig

	// Contract configuration
	RegistryContract ContractConfig

	// Logging
	Log LogConfig

	// Metrics
	Metrics             MetricsConfig
	PerformanceTracking PerformanceTrackingConfig

	// Scrubbing
	Scrubbing ScrubbingConfig

	// Stream reconciliation
	StreamReconciliation StreamReconciliationConfig

	// Network configuration
	Network NetworkConfig

	// Go in stand-by mode on start checking if public address resolves to this node instance.
	// This allows to reduce downtime when new version of the node is deployed in the new container or VM.
	// Depending on the network routing configuration this approach may not work.
	StandByOnStart    bool
	StandByPollPeriod time.Duration

	// ShutdownTimeout is the time the node waits for the graceful shutdown of the server.
	// Then all active connections are closed and the node exits.
	// If StandByOnStart is true, it's recommended to set it to the half of DatabaseConfig.StartupDelay.
	// If set to 0, timeout is disabled and node will close all connections immediately.
	ShutdownTimeout time.Duration

	// Graffiti is returned in status and info requests.
	Graffiti string

	// Should be set if the node is running in archive mode.
	Archive ArchiveConfig

	// Notifications must be set when running in notification mode.
	Notifications NotificationsConfig

	// BotRegistry must be set when running in bot registry mode.
	BotRegistry BotRegistryConfig

	// Feature flags
	// Used to disable functionality for some testing setups.

	// Disable base chain contract usage.
	DisableBaseChain bool

	// Enable MemberPayload_Mls.
	EnableMls bool

	// Chains provides a map of chain IDs to their provider URLs as
	// a comma-serparated list of chainID:URL pairs.
	// It is parsed into ChainsString variable.
	Chains string `json:"-" yaml:"-"`

	// ChainsString is an another alias for Chains kept for backward compatibility.
	ChainsString string `json:"-" yaml:"-"`

	// This is comma-separated list chaidID:blockTimeDuration pairs.
	// GetDefaultBlockchainInfo() provides default values for known chains so there is no
	// need to set block time is it's in the GetDefaultBlockchainInfo().
	// I.e. 1:12s,84532:2s,6524490:2s
	ChainBlocktimes string

	ChainConfigs map[uint64]*ChainConfig `mapstructure:"-"` // This is a derived field from Chains.

	// EnableTestAPIs enables additional APIs used for testing.
	EnableTestAPIs bool

	// EnableDebugEndpoints is a legacy setting, enables all debug endpoints.
	// Per endpoint configuration is in DebugEndpoints.
	EnableDebugEndpoints bool

	DebugEndpoints DebugEndpointsConfig

	// RiverRegistry contains settings for calling registry contract on River chain.
	RiverRegistry RiverRegistryConfig

	// xChain configuration
	// ====================
	// EntitlementContract denotes the address of the contract that receives entitlement check
	// requests.
	EntitlementContract     ContractConfig `mapstructure:"entitlement_contract"`
	// History indicates how far back xchain must look for entitlement check requests after start
	History time.Duration
}

type TLSConfig struct {
	Cert   string // Path to certificate file or BASE64 encoded certificate
	Key    string `json:"-" yaml:"-"` // Path to key file or BASE64 encoded key. Sensitive data, omit when possible.
	TestCA string // Path to CA certificate file or BASE64 encoded CA certificate
}

type NetworkConfig struct {
	NumRetries int
	// RequestTimeout only applies to unary requests.
	RequestTimeout time.Duration

	// If unset or <= 0, 5 seconds is used.
	HttpRequestTimeout time.Duration
}

func (nc *NetworkConfig) GetHttpRequestTimeout() time.Duration {
	if nc.HttpRequestTimeout <= 0 {
		return 5 * time.Second
	}
	return nc.HttpRequestTimeout
}

type DatabaseConfig struct {
	Url      string `json:"-" yaml:"-"` // Sensitive data, omit when possible
	Host     string
	Port     int
	User     string
	Password string `json:"-" yaml:"-"` // Sensitive data, omit when possible
	Database string
	Extra    string

	// StartupDelay is the time the node waits between taking control of the database and starting the server
	// if other nodes' records are found in the database.
	// If StandByOnStart is true, it's recommended to set it to the double of Config.ShutdownTimeout.
	// If set to 0, then default value is used. To disable the delay set to 1ms or less.
	StartupDelay time.Duration

	// IsolationLevel is the transaction isolation level to use for the database operations.
	// Allowed values: "serializable", "repeatable read", "read committed".
	// If not set or value can't be parsed, defaults to "serializable".
	// Intention is to migrate to "read committed" for performance reasons after testing is complete.
	IsolationLevel string

	// NumPartitions specifies the number of partitions to use when creating the schema for stream
	// data storage. If <= 0, a default value of 256 will be used. No more than 256 partitions is
	// supported at this time.
	NumPartitions int

	// DebugTransactions enables tracking of few last transactions in the database.
	DebugTransactions bool
}

func (c DatabaseConfig) GetUrl() string {
	if c.Host != "" {
		return fmt.Sprintf(
			"postgresql://%s:%s@%s:%d/%s%s",
			c.User,
			c.Password,
			c.Host,
			c.Port,
			c.Database,
			c.Extra,
		)
	}

	return c.Url
}

// TransactionPoolConfig specifies when it is time for a replacement transaction and its gas fee costs.
type TransactionPoolConfig struct {
	// TransactionTimeout is the duration in which a transaction must be included in the chain before it is marked
	// eligible for replacement. It is advisable to set the timeout as a multiple of the block period. If not set it
	// estimates the chains block period and sets Timeout to 3x block period.
	TransactionTimeout time.Duration `json:",omitempty"`

	// GasFeeCap determines for EIP-1559 transaction the maximum amount fee per gas the node operator is willing to
	// pay. If set to 0 the node will use 2 * chain.BaseFee by default. The base fee + miner tip must be below this
	// cap, if not the transaction could not be made.
	GasFeeCap int `json:",omitempty"`

	// MinerTipFeeReplacementPercentage is the percentage the miner tip for EIP-1559 transactions is incremented when
	// replaced. Nodes accept replacements only when the miner tip is at least 10% higher than the original transaction.
	// The node will add 1 Wei to the miner tip and therefore 10% is the least recommended value. Default is 10.
	MinerTipFeeReplacementPercentage int `json:",omitempty"`

	// GasFeeIncreasePercentage is the percentage by which the gas fee for legacy transaction is incremented when it is
	// replaced. Recommended is >= 10% since nodes typically only accept replacements transactions with at least 10%
	// higher gas price. The node will add 1 Wei, therefore 10% will also work. Default is 10.
	GasFeeIncreasePercentage int `json:",omitempty"`
}

type ChainConfig struct {
	NetworkUrl  string `json:"-" yaml:"-"` // Sensitive data, omitted from logging.
	ChainId     uint64
	BlockTimeMs uint64

	TransactionPool TransactionPoolConfig `json:",omitempty"`

	// DisableReplacePendingTransactionOnBoot will not try to replace transaction that are pending after start.
	DisableReplacePendingTransactionOnBoot bool `json:",omitempty"`

	// TODO: these need to be removed from here
	LinkedWalletsLimit                        int `json:",omitempty"`
	ContractCallsTimeoutMs                    int `json:",omitempty"`
	PositiveEntitlementCacheSize              int `json:",omitempty"`
	PositiveEntitlementCacheTTLSeconds        int `json:",omitempty"`
	NegativeEntitlementCacheSize              int `json:",omitempty"`
	NegativeEntitlementCacheTTLSeconds        int `json:",omitempty"`
	PositiveEntitlementManagerCacheSize       int `json:",omitempty"`
	PositiveEntitlementManagerCacheTTLSeconds int `json:",omitempty"`
	NegativeEntitlementManagerCacheSize       int `json:",omitempty"`
	NegativeEntitlementManagerCacheTTLSeconds int `json:",omitempty"`
	LinkedWalletCacheSize                     int `json:",omitempty"`
	LinkedWalletCacheTTLSeconds               int `json:",omitempty"`
}

func (c ChainConfig) BlockTime() time.Duration {
	return time.Duration(c.BlockTimeMs) * time.Millisecond
}

type PerformanceTrackingConfig struct {
	ProfilingEnabled bool

	// If true, write trace data to one of the exporters configured below
	TracingEnabled bool
	// If set, write trace data to this jsonl file
	OtlpFile string `json:",omitempty"`
	// If set, send trace data to using OTLP HTTP
	// Exporter is configured with OTLP env variables as described here:
	// go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
	OtlpEnableHttp bool `json:",omitempty"`
	// If set, send trace data to using OTLP gRRC
	// Exporter is configured with OTLP env variables as described here:
	// go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
	OtlpEnableGrpc bool `json:",omitempty"`
	// If set, connet to OTLP endpoint using http instead of https
	// Also can be configured by env var from the links above
	OtlpInsecure bool `json:",omitempty"`

	// If set, send trace spans to this Zipkin endpoint
	ZipkinUrl string `json:",omitempty"`
}

type ContractConfig struct {
	// Address of the contract
	Address common.Address
}

type ArchiveConfig struct {
	// ArchiveId is the unique identifier of the archive node. Must be set for nodes in archive mode.
	ArchiveId string

	Filter FilterConfig `json:",omitempty"`

	// Number of miniblocks to read at once from the remote node.
	ReadMiniblocksSize uint64 `json:",omitempty"`

	TaskQueueSize int `json:",omitempty"` // If 0, default to 100000.

	WorkerPoolSize int `json:",omitempty"` // If 0, default to 20.

	MiniblockScrubQueueSize int `json:",omitempty"` // If 0, default to 10.

	MiniblockScrubWorkerPoolSize int `json:",omitempty"` // If 0, default to 20

	StreamsContractCallPageSize int64 `json:",omitempty"` // If 0, default to 5000.

	// MaxFailedConsecutiveUpdates is the number of failures to advance the block count
	// of a stream with available blocks (according to the contract) that the archiver will
	// allow before considering a stream corrupt.
	// Please access with GetMaxFailedConsecutiveUpdates
	MaxFailedConsecutiveUpdates uint32 `json:",omitempty"` // If 0, default to 50.
}

type APNPushNotificationsConfig struct {
	// IosAppBundleID is used as the topic ID for notifications.
	AppBundleID string
	// Expiration holds the duration in which the notification must be delivered. After that
	// the server might drop the notification. If set to 0 a default of 12 hours is used.
	Expiration time.Duration
	// KeyID from developer account (Certificates, Identifiers & Profiles -> Keys)
	KeyID string
	// TeamID from developer account (View Account -> Membership)
	TeamID string
	// AuthKey contains the private key to authenticate the notification service with the APN service
	AuthKey string `json:"-" yaml:"-"` // Omit sensitive field from logging
}

type WebPushVapidNotificationConfig struct {
	// PrivateKey is the private key of the public key that is shared with the client
	// and used to sign push notifications that allows the client to verify the incoming
	// notification for origin and validity.
	PrivateKey string `json:"-" yaml:"-"` // Omit sensitive field from logging
	// PublicKey as shared with the client that is used for subscribing and verifying
	// the incoming push notification.
	PublicKey string
	// Subject must either be a URL or a 'mailto:' address.
	Subject string
}

type WebPushNotificationConfig struct {
	Vapid WebPushVapidNotificationConfig
}

type SessionKeyConfig struct {
	// Algorithm indicates how the session token is signed (only HS256 is supported)
	Algorithm string
	// Key holds the hex encoded key
	Key string
}

type SessionTokenConfig struct {
	// Lifetime indicates how long a session token is valid (default=30m).
	Lifetime time.Duration
	// Key holds the secret key that is used to sign the session token.
	Key SessionKeyConfig `json:"-" yaml:"-"` // Omit sensitive field from logging
}

type AuthenticationConfig struct {
	// ChallengeTimeout is the lifetime an authentication challenge is valid (default=30s).
	ChallengeTimeout time.Duration
	// SessionTokenKey contains the configuration for the JWT session token.
	SessionToken SessionTokenConfig
}

type NotificationsConfig struct {
	// SubscriptionExpirationDuration if the client isn't seen within this duration stop sending
	// notifications to it. Defaults to 90 days.
	SubscriptionExpirationDuration time.Duration
	// Simulate if set to true uses the simulator notification backend that doesn't
	// send notifications to the client but only logs them.
	// This is intended for development purposes. Defaults to false.
	Simulate bool
	// APN holds the Apple Push Notification settings
	APN APNPushNotificationsConfig
	// Web holds the Web Push notification settings
	Web WebPushNotificationConfig `mapstructure:"webpush"`

	// Authentication holds configuration for the Client API authentication service.
	Authentication AuthenticationConfig
}

type BotRegistryConfig struct {
	// BotRegistryId is the unique identifier of the bot registry service node. It must be set for
	// nodes running in bot registry mode.
	BotRegistryId string
}

type LogConfig struct {
	Level        string // Used for both file and console if their levels not set explicitly
	File         string // Path to log file
	FileLevel    string // If not set, use Level
	Console      bool   // Log to console if true
	ConsoleLevel string // If not set, use Level

	// Intended for dev use with text logs, do not output instance attributes with each log entry,
	// drop some large messages.
	Simplify bool
}

type MetricsConfig struct {
	// Enable metrics collection, publish on /metrics endpoint on public port unless DisablePublic is set.
	Enabled bool

	// If set, do not publish /metrics on public port.
	DisablePublic bool

	// If not 0, also publish /metrics on this port.
	Port int

	// Interface to use with the port above. Usually left empty to bind to all interfaces.
	Interface string
}

type DebugEndpointsConfig struct {
	Cache           bool
	Memory          bool
	PProf           bool
	Stacks          bool
	StacksMaxSizeKb int
	Stream          bool
	TxPool          bool
	CorruptStreams  bool

	// Make storage statistics available via debug endpoints. This may involve running queries
	// on the underlying database.
	EnableStorageEndpoint bool
}

type RiverRegistryConfig struct {
	// PageSize is the number of streams to read from the contract at once using GetPaginatedStreams.
	PageSize int

	// Number of parallel readers to use when reading streams from the contract.
	ParallelReaders int

	// If not 0, stop retrying failed GetPaginatedStreams calls after this number of retries.
	MaxRetries int

	// Stop retrying failed GetPaginatedStreams calls after this duration.
	MaxRetryElapsedTime time.Duration

	// Timeout for a singe call to GetPaginatedStreams.
	SingleCallTimeout time.Duration

	// ProgressReportInterval is the interval at which to report progress of the GetPaginatedStreams calls.
	ProgressReportInterval time.Duration
}

func (ac *ArchiveConfig) GetReadMiniblocksSize() uint64 {
	if ac.ReadMiniblocksSize <= 0 {
		return 100
	}
	return ac.ReadMiniblocksSize
}

func (ac *ArchiveConfig) GetTaskQueueSize() int {
	if ac.TaskQueueSize <= 0 {
		return 100000
	}
	return ac.TaskQueueSize
}

func (ac *ArchiveConfig) GetWorkerPoolSize() int {
	if ac.WorkerPoolSize <= 0 {
		return 20
	}
	return ac.WorkerPoolSize
}

func (ac *ArchiveConfig) GetStreamsContractCallPageSize() int64 {
	if ac.StreamsContractCallPageSize <= 0 {
		return 1000
	}
	return ac.StreamsContractCallPageSize
}

func (ac *ArchiveConfig) GetMiniblockScrubQueueSize() int {
	if ac.MiniblockScrubQueueSize <= 0 {
		return 10
	}
	return ac.MiniblockScrubQueueSize
}

func (ac *ArchiveConfig) GetMiniblockScrubWorkerPoolSize() int {
	if ac.MiniblockScrubWorkerPoolSize <= 0 {
		return 20
	}
	return ac.MiniblockScrubWorkerPoolSize
}

func (ac *ArchiveConfig) GetMaxConsecutiveFailedUpdates() uint32 {
	if ac.MaxFailedConsecutiveUpdates == 0 {
		return 50
	}
	return ac.MaxFailedConsecutiveUpdates
}

type ScrubbingConfig struct {
	// ScrubEligibleDuration is the minimum length of time that must pass before a stream is eligible
	// to be re-scrubbed.
	// If 0, scrubbing is disabled.
	ScrubEligibleDuration time.Duration
}

type StreamReconciliationConfig struct {
	// InitialWorkerPoolSize is the size of the worker pool for initial background stream reconciliation tasks on node start.
	InitialWorkerPoolSize int

	// OnlineWorkerPoolSize is the size of the worker pool for ongoing stream reconciliation tasks.
	OnlineWorkerPoolSize int

	// GetMiniblocksPageSize is the number of miniblocks to read at once from the remote node.
	GetMiniblocksPageSize int64
}

type FilterConfig struct {
	// If set, only archive streams hosted on the nodes with the specified addresses.
	Nodes []string

	// If set, only archive stream if Nodes list contains first hosting node for the stream.
	// This may be used to archive only once copy of replicated stream
	// if multiple archival nodes are used in conjunction.
	FirstOnly bool

	// If set, partition all stream names using hash into specified number of shards and
	// archive only listed shards.
	NumShards uint64
	Shards    []uint64
}

func (c *Config) GetGraffiti() string {
	if c.Graffiti == "" {
		return "River Node welcomes you!"
	}
	return c.Graffiti
}

// Get the address of the contract that receives entitlement check requests.
func (c *Config) GetEntitlementContractAddress() common.Address {
	return c.EntitlementContract.Address
}

func (c *Config) GetWalletLinkContractAddress() common.Address {
	return c.ArchitectContract.Address
}

func (c *Config) Init() error {
	return c.parseChains()
}

// Return the schema to use for accessing the node.
func (c *Config) UrlSchema() string {
	s := "https"
	if c != nil && c.DisableHttps {
		s = "http"
	}
	return s
}

func parseBlockchainDurations(str string, result map[uint64]BlockchainInfo) error {
	pairs := strings.Split(str, ",")
	for _, pair := range pairs {
		if pair == "" {
			continue
		}
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			chainID, err := strconv.ParseUint(strings.TrimSpace(parts[0]), 10, 64)
			if err != nil {
				return WrapRiverError(Err_BAD_CONFIG, err).Message("Failed to parse chain Id").Tag("value", str)
			}
			duration, err := time.ParseDuration(strings.TrimSpace(parts[1]))
			if err != nil {
				return WrapRiverError(Err_BAD_CONFIG, err).Message("Failed to parse block time").Tag("value", str)
			}
			result[chainID] = BlockchainInfo{
				ChainId:   chainID,
				Blocktime: duration,
				Name:      parts[0],
			}
		} else {
			return RiverError(Err_BAD_CONFIG, "Failed to parse chain blocktimes").Tag("value", str)
		}
	}
	return nil
}

func (c *Config) parseChains() error {
	defaultChainInfo := GetDefaultBlockchainInfo()
	err := parseBlockchainDurations(c.ChainBlocktimes, defaultChainInfo)
	if err != nil {
		return err
	}

	// If Chains is empty, fallback to ChainsString.
	if c.Chains == "" {
		c.Chains = strings.TrimSpace(c.ChainsString)
	}
	chains := strings.TrimSpace(c.Chains)

	chainConfigs := make(map[uint64]*ChainConfig)
	chainPairs := strings.Split(chains, ",")
	for _, pair := range chainPairs {
		if pair == "" {
			continue
		}
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			chainID, err := strconv.ParseUint(strings.TrimSpace(parts[0]), 10, 64)
			if err != nil {
				return WrapRiverError(Err_BAD_CONFIG, err).Message("Failed to pase chain Id").Tag("chainId", parts[0])
			}

			info, ok := defaultChainInfo[chainID]
			if !ok {
				return RiverError(Err_BAD_CONFIG, "Chain blocktime not set").Tag("chainId", chainID)
			}

			chainConfigs[chainID] = &ChainConfig{
				NetworkUrl:  strings.TrimSpace(parts[1]),
				ChainId:     chainID,
				BlockTimeMs: uint64(info.Blocktime / time.Millisecond),
			}
		} else {
			return RiverError(Err_BAD_CONFIG, "Failed to parse chain config").Tag("value", pair)
		}
	}
	c.ChainConfigs = chainConfigs

	return nil
}

type confifCtxKeyType struct{}

var configCtxKey = confifCtxKeyType{}

func CtxWithConfig(ctx context.Context, c *Config) context.Context {
	return context.WithValue(ctx, configCtxKey, c)
}

func FromCtx(ctx context.Context) *Config {
	if c, ok := ctx.Value(configCtxKey).(*Config); ok {
		return c
	}
	return nil
}

func UseDetailedLog(ctx context.Context) bool {
	c := FromCtx(ctx)
	if c != nil {
		return !c.Log.Simplify
	} else {
		return true
	}
}
