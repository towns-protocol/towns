package types

import "math/big"

type BaseRole struct {
	Id           *big.Int
	Name         string
	Disabled     bool
	Permissions  []string
	Entitlements []Entitlement
}
