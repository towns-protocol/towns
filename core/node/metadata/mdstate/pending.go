package mdstate

import (
	"encoding/hex"
	"fmt"

	abci "github.com/cometbft/cometbft/abci/types"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// PendingBlockState holds all pending operations and state for a block being finalized.
type PendingBlockState struct {
	// Parsed state
	Height    int64
	BlockHash []byte
	Txs       []*MetadataTx

	// Prepared response state
	TxResults []*abci.ExecTxResult
	AppHash   []byte

	// Calculated state diff to be committed to the database
	CreatedStreams    map[StreamId]*CreateStreamTx
	UpdatedStreams    map[StreamId]*UpdateStreamNodesAndReplicationTx
	UpdatedMiniblocks map[StreamId]*MiniblockUpdate
}

func (p *PendingBlockState) SetSuccess(i int) {
	p.TxResults[i].Code = 0
}

func (p *PendingBlockState) SetTxError(i int, err error) {
	riverErr := AsRiverError(err)
	p.SetTxErrorCode(i, riverErr.Code)
}

func (p *PendingBlockState) SetTxErrorCode(i int, code Err) {
	p.TxResults[i].Code = uint32(code)
	p.TxResults[i].Log = code.String()
	p.TxResults[i].Codespace = "towns"
}

func (p *PendingBlockState) SetMbErrorEvent(txIndex int, mbIndex int, streamId StreamId, code Err, msg string) {
	event := &p.TxResults[txIndex].Events[mbIndex]
	event.Type = "mberr"
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "sid",
		Value: streamId.String(),
	})
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "code",
		Value: fmt.Sprintf("%d", code),
	})
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "name",
		Value: code.String(),
	})
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "msg",
		Value: msg,
	})
}

func (p *PendingBlockState) SetMbStatusEvent(
	txIndex int,
	mbIndex int,
	streamId StreamId,
	mbHeight int64,
	mbHash []byte,
	sealed bool,
) {
	event := &p.TxResults[txIndex].Events[mbIndex]
	event.Type = "mbok"
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "sid",
		Value: streamId.String(),
	})
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "n",
		Value: fmt.Sprintf("%d", mbHeight),
	})
	event.Attributes = append(event.Attributes, abci.EventAttribute{
		Key:   "h",
		Value: hex.EncodeToString(mbHash),
	})
	if sealed {
		event.Attributes = append(event.Attributes, abci.EventAttribute{
			Key:   "sealed",
			Value: "true",
		})
	}
}
