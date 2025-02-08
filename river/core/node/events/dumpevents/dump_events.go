package dumpevents

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type DumpOpts struct {
	Prefix             string
	EventPrevMiniblock bool
	EventContent       bool
	TestMessages       bool
}

func GetPayloadName(p IsStreamEvent_Payload) string {
	return strings.TrimPrefix(fmt.Sprintf("%T", p), "*protocol.StreamEvent_")
}

func GetContentName(p IsStreamEvent_Payload) string {
	var c any
	switch pp := p.(type) {
	case *StreamEvent_MiniblockHeader:
		return ""
	case *StreamEvent_MemberPayload:
		c = pp.MemberPayload.GetContent()
	case *StreamEvent_SpacePayload:
		c = pp.SpacePayload.GetContent()
	case *StreamEvent_ChannelPayload:
		c = pp.ChannelPayload.GetContent()
	case *StreamEvent_UserPayload:
		c = pp.UserPayload.GetContent()
	case *StreamEvent_UserSettingsPayload:
		c = pp.UserSettingsPayload.GetContent()
	case *StreamEvent_UserMetadataPayload:
		c = pp.UserMetadataPayload.GetContent()
	case *StreamEvent_UserInboxPayload:
		c = pp.UserInboxPayload.GetContent()
	case *StreamEvent_MediaPayload:
		c = pp.MediaPayload.GetContent()
	case *StreamEvent_DmChannelPayload:
		c = pp.DmChannelPayload.GetContent()
	case *StreamEvent_GdmChannelPayload:
		c = pp.GdmChannelPayload.GetContent()
	default:
		return fmt.Sprintf("UNKNOWN_PAYLOAD_TYPE %T", pp)
	}
	if c == nil {
		return "NIL_CONTENT"
	}
	n := fmt.Sprintf("%T", c)
	if u := strings.Index(n, "_"); u >= 0 {
		n = n[u+1:]
	}
	return n
}

func DumpMessageW(w io.Writer, m *EncryptedData, opts DumpOpts) {
	if m == nil {
		fmt.Fprintf(w, "NIL_MESSAGE")
		return
	}
	if opts.TestMessages {
		fmt.Fprintf(w, "\"%s\"", m.Ciphertext)
	} else {
		fmt.Fprintf(w, "ALG: %s", m.Algorithm)
	}
}

func DumpContentW(w io.Writer, p IsStreamEvent_Payload, opts DumpOpts) {
	switch pp := p.(type) {
	case *StreamEvent_MiniblockHeader:
		return
	case *StreamEvent_MemberPayload:
		return
	case *StreamEvent_SpacePayload:
		return
	case *StreamEvent_ChannelPayload:
		switch c := pp.ChannelPayload.GetContent().(type) {
		case *ChannelPayload_Message:
			DumpMessageW(w, c.Message, opts)
		default:
			return
		}
		return
	case *StreamEvent_UserPayload:
		return
	case *StreamEvent_UserSettingsPayload:
		return
	case *StreamEvent_UserMetadataPayload:
		return
	case *StreamEvent_UserInboxPayload:
		return
	case *StreamEvent_MediaPayload:
		return
	case *StreamEvent_DmChannelPayload:
		return
	case *StreamEvent_GdmChannelPayload:
		return
	default:
		fmt.Fprintf(w, "UNKNOWN_PAYLOAD_TYPE %T\n", pp)
		return
	}
}

func DumpPayloadW(w io.Writer, p IsStreamEvent_Payload, opts DumpOpts) {
	fmt.Fprint(w, GetPayloadName(p), " ", GetContentName(p), " ")
	if !opts.EventContent {
		return
	}
	DumpContentW(w, p, opts)
}

func DumpEventW(w io.Writer, e *ParsedEvent, opts DumpOpts) {
	fmt.Fprintf(w, "%s", opts.Prefix)
	DumpPayloadW(w, e.Event.Payload, opts)
	if opts.EventPrevMiniblock {
		fmt.Fprintf(w, "PREV_MB: %v", e.MiniblockRef)
	}
	fmt.Fprintln(w)
}

func DumpMiniblockW(w io.Writer, mb *MiniblockInfo, opts DumpOpts) {
	fmt.Fprintf(w, "%s%v events: %d\n", opts.Prefix, mb.Ref, len(mb.Events()))
	o := opts
	o.Prefix = fmt.Sprintf("%s   HDR: ", opts.Prefix)
	DumpEventW(w, mb.HeaderEvent(), o)
	for i, e := range mb.Events() {
		o.Prefix = fmt.Sprintf("%s%6d: ", opts.Prefix, i)
		DumpEventW(w, e, o)
	}
}

func DumpStreamViewW(w io.Writer, view *StreamView, opts DumpOpts) {
	fmt.Fprintf(w, "%sSTREAM %v miniblocks: %d\n", opts.Prefix, view.StreamId(), len(view.Miniblocks()))

	o := opts
	for i, mb := range view.Miniblocks() {
		o.Prefix = fmt.Sprintf("%s%6d: ", opts.Prefix, i)
		DumpMiniblockW(w, mb, o)
	}

	fmt.Fprintf(w, "MINIPOOL: events: %d\n", len(view.MinipoolEvents()))
	for i, e := range view.MinipoolEvents() {
		o.Prefix = fmt.Sprintf("%s%6d: ", opts.Prefix, i)
		DumpEventW(w, e, o)
	}
}

func DumpStreamView(view *StreamView, opts DumpOpts) string {
	var buf bytes.Buffer
	DumpStreamViewW(&buf, view, opts)
	return buf.String()
}

func DumpStreamW(ctx context.Context, w io.Writer, stream *StreamAndCookie, opts DumpOpts) {
	view, err := MakeRemoteStreamView(ctx, stream)
	if err != nil {
		fmt.Fprintf(w, "error: %v\n", err)
		return
	}
	DumpStreamViewW(w, view, opts)
}

func DumpStream(ctx context.Context, stream *StreamAndCookie, opts DumpOpts) string {
	var buf bytes.Buffer
	DumpStreamW(ctx, &buf, stream, opts)
	return buf.String()
}
