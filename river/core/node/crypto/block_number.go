package crypto

import "math/big"

type BlockNumber uint64

func (bn BlockNumber) AsBigInt() *big.Int {
	return BigIntFromUint64(uint64(bn))
}

func (bn BlockNumber) AsUint64() uint64 {
	return uint64(bn)
}

func BlockNumberFromBigInt(v *big.Int) BlockNumber {
	if !v.IsUint64() {
		panic("block number is too large")
	}
	return BlockNumber(v.Uint64())
}

func BigIntFromUint64(v uint64) *big.Int {
	return new(big.Int).SetUint64(v)
}
