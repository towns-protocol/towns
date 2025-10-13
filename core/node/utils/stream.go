package utils

// DetermineStreamSnapshotsToNullify returns the seq_nums whose snapshot field should be set to NULL.
// It scans snapshotSeqs (ascending), groups by bucket = seq_num/retentionInterval,
// keeps the very first seq in each bucket, and nullifies the rest—except anything
// newer than rangeEndInclusive-minKeep, which stays protected.
//
//	rangeStartInclusive: inclusive start of the miniblock range being processed
//	rangeEndInclusive:   inclusive end of the miniblock range being processed
//	snapshotSeqs:        sorted ascending slice of seq_nums within the range where snapshot != NULL
//	retentionInterval:   onchain setting, e.g. 1000 miniblocks
//	minKeep:             number of most recent miniblocks to protect
func DetermineStreamSnapshotsToNullify(
	rangeStartInclusive int64,
	rangeEndInclusive int64,
	snapshotSeqs []int64,
	retentionInterval int64,
	minKeep int64,
) []int64 {
	if retentionInterval <= 0 {
		return nil
	}

	// If the range is empty or has a single snapshot, nothing to nullify.
	n := len(snapshotSeqs)
	if n <= 1 {
		return nil
	}

	if rangeStartInclusive > rangeEndInclusive {
		return nil
	}

	cutoff := rangeEndInclusive - minKeep

	var toNullify []int64
	var lastBucket int64 = -1

	for _, seq := range snapshotSeqs {
		if seq < rangeStartInclusive {
			continue
		}
		// skip anything in the protected tail
		if seq > cutoff {
			break
		}
		bucket := seq / retentionInterval
		if bucket != lastBucket {
			// first snapshot in this bucket → keep it, advance bucket marker
			lastBucket = bucket
		} else {
			// subsequent snapshot in same bucket → nullify
			toNullify = append(toNullify, seq)
		}
	}
	return toNullify
}
