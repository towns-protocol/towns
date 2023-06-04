package base

import (
	gonanoid "github.com/matoous/go-nanoid"
)

func GenNanoid() string {
	return gonanoid.MustID(21)
}
