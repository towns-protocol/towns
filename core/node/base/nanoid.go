package base

import (
	gonanoid "github.com/matoous/go-nanoid"
)

func GenNanoid() string {
	return gonanoid.MustID(21)
}

func GenShortNanoid() string {
	return gonanoid.MustID(12)
}
