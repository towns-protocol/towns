package storage

import (
	"fmt"
	"strings"
)

func (r DebugReadStreamDataResult) String() string {
	var sb strings.Builder

	evLen := 0
	auxEvLen := 0
	for _, e := range r.Events {
		if e.Slot != -1 {
			evLen++
		} else {
			auxEvLen++
		}
	}

	fmt.Fprintf(
		&sb,
		"STREAM: %s lastSnap=%d mbs=%d events=%d+%d mbCands=%d\n",
		r.StreamId,
		r.LatestSnapshotMiniblockNum,
		len(r.Miniblocks),
		evLen,
		auxEvLen,
		len(r.MbCandidates),
	)

	sb.WriteString("MB: ")
	for _, mb := range r.Miniblocks {
		fmt.Fprintf(&sb, " %d", mb.MiniblockNumber)
	}
	sb.WriteString("\n")

	sb.WriteString("EVENTS: ")
	gen := int64(-1)
	for _, e := range r.Events {
		if e.Generation != gen {
			gen = e.Generation
			fmt.Fprintf(&sb, "GEN=%d", gen)
		}
		fmt.Fprintf(&sb, " %d", e.Slot)
	}
	sb.WriteString("\n")

	if len(r.MbCandidates) > 0 {
		sb.WriteString("CANDIDATES: ")
		for _, c := range r.MbCandidates {
			fmt.Fprintf(&sb, " %d", c.MiniblockNumber)
		}
		sb.WriteString("\n")
	}
	sb.WriteString("<<<<<<\n")

	return sb.String()
}
