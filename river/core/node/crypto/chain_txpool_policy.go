package crypto

import (
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
)

type (
	// TransactionPoolReplacePolicy determines when a pending transaction is eligible to be resubmitted.
	TransactionPoolReplacePolicy interface {
		// Eligible returns an indication if it is time to replace the given pendingTx.
		Eligible(chainHead *types.Header, lastSubmitted time.Time, pendingTx *types.Transaction) bool
	}

	// TransactionPricePolicy calculates gas prices for transactions.
	TransactionPricePolicy interface {
		// GasFeeCap for EIP1559 transactions as specified by the user
		GasFeeCap() *big.Int
		// Price a transaction
		Price(tx *types.Transaction) (gasPrice *big.Int, gasBaseFee *big.Int, gasMinerTip *big.Int)
		// Fees returns the new gas price, base fee and tip for the given "stuck" transaction based on the header and
		// the given tx. These new gas prices can be used in the replacement transaction.
		Reprice(
			head *types.Header,
			tx *types.Transaction,
		) (gasPrice *big.Int, gasBaseFee *big.Int, gasMinerTip *big.Int)
	}
)

// NewTransactionPoolDeadlinePolicy returns a replacement policy that makes any transactions that have not been
// processed within the given timeout eligible for replacement.
func NewTransactionPoolDeadlinePolicy(timeout time.Duration) TransactionPoolReplacePolicy {
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	return &transactionPoolDeadlinePolicy{
		timeout: timeout,
	}
}

type transactionPoolDeadlinePolicy struct {
	timeout time.Duration
}

func (pol *transactionPoolDeadlinePolicy) Eligible(
	chainHead *types.Header,
	lastSubmitted time.Time,
	pendingTx *types.Transaction,
) bool {
	return time.Since(lastSubmitted) >= pol.timeout
}

type defaultTransactionPricingPolicy struct {
	gasPricePercentage *big.Int
	gasFeeCap          *big.Int
	minerTipPercentage *big.Int
}

func NewDefaultTransactionPricePolicy(
	gasPricePercentage int,
	gasFeeCap int,
	minerTipReplacementPercentage int,
) TransactionPricePolicy {
	var (
		gasPriceP    = big.NewInt(int64(gasPricePercentage))
		gasFeeCapAbs *big.Int
		minerTipP    = big.NewInt(int64(minerTipReplacementPercentage))
	)
	if gasPricePercentage == 0 {
		gasPriceP = big.NewInt(10)
	}
	if gasFeeCap != 0 {
		gasFeeCapAbs = big.NewInt(int64(gasFeeCap))
	}
	if minerTipReplacementPercentage == 0 {
		minerTipP = big.NewInt(10)
	}

	return &defaultTransactionPricingPolicy{gasPriceP, gasFeeCapAbs, minerTipP}
}

func (pol *defaultTransactionPricingPolicy) GasFeeCap() *big.Int {
	return pol.gasFeeCap
}

func (pol *defaultTransactionPricingPolicy) Price(
	tx *types.Transaction,
) (gasPrice *big.Int, gasFeeCap *big.Int, gasMinerTip *big.Int) {
	// let the abigen bindings generate the first tx minter tip.
	return nil, pol.gasFeeCap, nil
}

func (pol *defaultTransactionPricingPolicy) Reprice(
	head *types.Header,
	tx *types.Transaction,
) (gasPrice *big.Int, gasFeeCap *big.Int, gasMinerTip *big.Int) {
	var (
		val100 = big.NewInt(100)
		one    = big.NewInt(1)
		inc    = func(val *big.Int, percentage *big.Int) *big.Int {
			if val == nil {
				return nil
			}

			newVal := new(big.Int).Div(new(big.Int).Mul(val, new(big.Int).Add(val100, percentage)), val100)
			// add one to make 10% increment accepted, nodes accept replacements that have a > 10% gas price/miner tip
			if percentage.Uint64() == 10 {
				newVal = new(big.Int).Add(newVal, one)
			}

			return newVal
		}
	)

	if tx.GasFeeCap() != nil { // EIP1559 tx
		newGasFeeCap := new(big.Int).Add(inc(tx.GasFeeCap(), big.NewInt(10)), one)
		if pol.gasFeeCap == nil {
			return nil, nil, inc(tx.GasTipCap(), pol.minerTipPercentage)
		}
		if newGasFeeCap.Cmp(pol.gasFeeCap) > 0 {
			newGasFeeCap = pol.gasFeeCap
		}
		return nil, newGasFeeCap, inc(tx.GasTipCap(), pol.minerTipPercentage)
	}

	return inc(tx.GasPrice(), pol.gasPricePercentage), nil, nil // legacy tx
}
