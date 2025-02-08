package types

import (
	"math/big"

	"github.com/towns-protocol/towns/core/node/shared"
)

type BaseChannel struct {
	Id       shared.StreamId
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}
