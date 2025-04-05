package storage

import "github.com/jackc/pgx/v5/pgconn"

// isPgError checks if an error of any of it's unwrap tree corresponds to a pg error
// that matches the type specified by pgerrcode.
func isPgError(err error, pgerrcode string) bool {
	if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode {
		return true
	}

	switch x := err.(type) {
	case interface{ Unwrap() error }:
		if err = x.Unwrap(); err != nil {
			return isPgError(err, pgerrcode)
		}
	case interface{ Unwrap() []error }:
		for _, err := range x.Unwrap() {
			if isPgError(err, pgerrcode) {
				return true
			}
		}
	}
	return false
}
