package mdstate

import (
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func ValidateMetadataTx(tx *MetadataTx) error {
	if tx == nil || tx.Op == nil {
		return RiverError(Err_INVALID_ARGUMENT, "missing op")
	}
	switch op := tx.Op.(type) {
	case *MetadataTx_CreateStream:
		return ValidateCreateStreamTx(op.CreateStream)
	case *MetadataTx_SetStreamLastMiniblockBatch:
		return ValidateSetStreamLastMiniblockBatchTx(op.SetStreamLastMiniblockBatch)
	case *MetadataTx_UpdateStreamNodesAndReplication:
		return ValidateUpdateStreamNodesAndReplicationTx(op.UpdateStreamNodesAndReplication)
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown op")
	}
}

func ValidateCreateStreamTx(cs *CreateStreamTx) error {
	if cs == nil {
		return RiverError(Err_INVALID_ARGUMENT, "create payload missing")
	}
	if len(cs.StreamId) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	if len(cs.GenesisMiniblockHash) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock_hash must be 32 bytes")
	}
	if len(cs.Nodes) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "nodes required")
	}
	for _, n := range cs.Nodes {
		if len(n) != 20 {
			return RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
		}
	}
	if cs.ReplicationFactor == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "replication_factor must be > 0")
	}
	if int(cs.ReplicationFactor) > len(cs.Nodes) {
		return RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
	}
	if cs.LastMiniblockNum == 0 {
		if len(cs.GenesisMiniblock) == 0 {
			return RiverError(Err_INVALID_ARGUMENT, "genesis_miniblock required when last_miniblock_num is 0")
		}
	} else {
		if len(cs.LastMiniblockHash) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_hash must be 32 bytes when last_miniblock_num is set")
		}
	}
	return nil
}

func ValidateSetStreamLastMiniblockBatchTx(batch *SetStreamLastMiniblockBatchTx) error {
	if batch == nil {
		return RiverError(Err_INVALID_ARGUMENT, "batch missing")
	}
	if len(batch.Miniblocks) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "miniblocks missing")
	}
	for _, mb := range batch.Miniblocks {
		if len(mb.StreamId) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
		}
		if len(mb.PrevMiniblockHash) != 32 || len(mb.LastMiniblockHash) != 32 {
			return RiverError(Err_INVALID_ARGUMENT, "hashes must be 32 bytes")
		}
		if mb.LastMiniblockNum == 0 {
			return RiverError(Err_INVALID_ARGUMENT, "last_miniblock_num must be > 0")
		}
	}
	return nil
}

func ValidateUpdateStreamNodesAndReplicationTx(update *UpdateStreamNodesAndReplicationTx) error {
	if update == nil {
		return RiverError(Err_INVALID_ARGUMENT, "update missing")
	}
	if len(update.StreamId) != 32 {
		return RiverError(Err_INVALID_ARGUMENT, "stream_id must be 32 bytes")
	}
	if len(update.Nodes) == 0 && update.ReplicationFactor == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "nothing to update")
	}
	if len(update.Nodes) > 0 {
		for _, n := range update.Nodes {
			if len(n) != 20 {
				return RiverError(Err_INVALID_ARGUMENT, "node address must be 20 bytes")
			}
		}
		if update.ReplicationFactor > 0 && int(update.ReplicationFactor) > len(update.Nodes) {
			return RiverError(Err_INVALID_ARGUMENT, "replication_factor cannot exceed number of nodes")
		}
	}
	return nil
}
