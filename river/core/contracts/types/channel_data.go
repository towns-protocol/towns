package types

import (
	"math/big"

	"github.com/river-build/river/core/node/shared"
)

type BaseChannel struct {
	Id       shared.StreamId
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}
