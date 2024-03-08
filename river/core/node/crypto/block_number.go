package crypto

import "math/big"

type BlockNumber uint64

func (bn BlockNumber) AsBigInt() *big.Int {
	return new(big.Int).SetUint64(uint64(bn))
}
