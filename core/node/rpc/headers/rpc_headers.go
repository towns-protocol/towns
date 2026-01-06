package headers

const (
	RiverNoForwardHeader         = "X-River-No-Forward" // Must be set to "true" to disable forwarding
	RiverHeaderTrueValue         = "true"
	RiverFromNodeHeader          = "X-River-From-Node"
	RiverToNodeHeader            = "X-River-To-Node"
	RiverAllowNoQuorumHeader     = "X-River-Allow-No-Quorum" // Must be set to "true" to allow getting data if local node is not in quorum
	RiverUseSharedSyncHeaderName = "X-Use-Shared-Sync"
	RiverTestBypassHeaderName    = "X-River-Test-Bypass"
	RiverClientVersionHeader     = "X-River-Client-Version" // Client SDK version header
)
