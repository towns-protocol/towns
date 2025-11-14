package storage

import (
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

func (r *ReadStreamFromLastSnapshotResult) GoString() string {
	var sb strings.Builder
	r.ToStringBuilder(&sb)
	return sb.String()
}

func (r *ReadStreamFromLastSnapshotResult) ToStringBuilder(sb *strings.Builder) {
	sb.WriteString("ReadStreamFromLastSnapshotResult{\n")
	for i, mb := range r.Miniblocks {
		fmt.Fprintf(sb, "  %3d ", i)
		mb.ToStringBuilder(sb)
		if i == r.SnapshotMiniblockOffset {
			sb.WriteString(" <--- SNAPSHOT")
		}
		sb.WriteString("\n")
	}
	fmt.Fprintf(sb, "  SNAPSHOT_MB_NUM: %d\n", r.SnapshotMiniblockOffset)
	fmt.Fprintf(sb, "  MINIPOOL_LEN: %d\n", len(r.MinipoolEnvelopes))
	sb.WriteString("}")
}

func (mb *MiniblockDescriptor) GoString() string {
	var sb strings.Builder
	mb.ToStringBuilder(&sb)
	return sb.String()
}

func (mb *MiniblockDescriptor) ToStringBuilder(sb *strings.Builder) {
	fmt.Fprintf(sb, "MB{ NUM: %4d DATA_LEN: %d", mb.Number, len(mb.Data))
	if mb.Hash != (common.Hash{}) {
		fmt.Fprintf(sb, " %s", mb.Hash)
	}
	if mb.Snapshot != nil {
		fmt.Fprintf(sb, " SNAPSHOT_LEN: %d", len(mb.Snapshot))
	}
	sb.WriteString(" }")
}
