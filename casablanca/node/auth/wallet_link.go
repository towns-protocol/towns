package auth

import (
	"github.com/ethereum/go-ethereum/common"
)

type WalletLink interface {
	LinkWallet(rootKey common.Address) error
	GetLinkedWallets(rootKey common.Address) ([]common.Address, error)
}
