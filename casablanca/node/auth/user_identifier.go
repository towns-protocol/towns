package auth

import (
	"github.com/ethereum/go-ethereum/common"
)

type UserIdentifier struct {
	AccountAddress common.Address
}

func CreateUserIdentifier(userId string) UserIdentifier {

	return UserIdentifier{
		AccountAddress: common.HexToAddress(userId),
	}
}
