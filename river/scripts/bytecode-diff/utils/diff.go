package utils

import (
	"github.com/ethereum/go-ethereum/common"
)

// FacetDiff represents the differences between origin and target facets
type FacetDiff struct {
	OriginContractName      string         `yaml:"originContractName"`
	TargetContractName      string         `yaml:"targetContractName,omitempty"`
	OriginContractAddress   common.Address `yaml:"originFacetAddress"`
	TargetContractAddresses []string       `yaml:"targetContractAddresses,omitempty"`
	SelectorsDiff           []string       `yaml:"selectorsDiff"`
	OriginBytecodeHash      string         `yaml:"originBytecodeHash,omitempty"`
	TargetBytecodeHashes    []string       `yaml:"targetBytecodeHashes,omitempty"`
	OriginVerified          bool           `yaml:"originVerified"`
	TargetVerified          bool           `yaml:"targetVerified"`
}

type MergedFacet struct {
	Facet
	BytecodeHashes    []string
	ContractAddresses []string
}

// CompareFacets compares origin and target Facet arrays and returns the differences
func CompareFacets(origin, target map[string][]Facet) map[string][]FacetDiff {
	differences := make(map[string][]FacetDiff)

	for diamondName, originFacets := range origin {
		targetFacets, exists := target[diamondName]
		if !exists {
			// If the diamond doesn't exist in target, add all origin facets
			differences[diamondName] = convertToFacetDiff(originFacets)
			continue
		}

		// Merge target facets with the same ContractName
		mergedTargetFacets := mergeFacets(targetFacets)

		var diamondDifferences []FacetDiff
		// compare each origin facet set for each diamond with target facets
		for _, o := range originFacets {
			// if origin facet is not verified, add it to differences
			if o.ContractName == "" {
				Log.Info().Msgf("Origin facet is not verified: %+v", o)
				diamondDifferences = append(diamondDifferences, FacetDiff{
					OriginContractAddress:   o.FacetAddress,
					SelectorsDiff:           o.SelectorsHex,
					OriginContractName:      o.ContractName,
					TargetContractName:      "",
					OriginBytecodeHash:      o.BytecodeHash,
					TargetBytecodeHashes:    []string{},
					TargetContractAddresses: []string{},
					OriginVerified:          false,
				})
				continue
			}
			found := false
			if t, exists := mergedTargetFacets[o.ContractName]; exists {
				// find match by facetName
				diffSelectors := getDifferentSelectors(o.SelectorsHex, t.SelectorsHex)
				bytecodeChanged := false
				for _, targetHash := range t.BytecodeHashes {
					if o.BytecodeHash != targetHash {
						bytecodeChanged = true
						break
					}
				}
				if len(diffSelectors) > 0 || bytecodeChanged {
					diamondDifferences = append(diamondDifferences, FacetDiff{
						OriginContractAddress:   o.FacetAddress,
						SelectorsDiff:           diffSelectors,
						OriginContractName:      o.ContractName,
						OriginBytecodeHash:      o.BytecodeHash,
						TargetBytecodeHashes:    t.BytecodeHashes,
						TargetContractAddresses: t.ContractAddresses,
						OriginVerified:          true,
						TargetVerified:          true,
					})
				}
				found = true
			}
			if !found {
				// Contract by name doesn't exist in target set, add all selectors
				diamondDifferences = append(diamondDifferences, FacetDiff{
					OriginContractAddress:   o.FacetAddress,
					SelectorsDiff:           o.SelectorsHex,
					OriginContractName:      o.ContractName,
					TargetContractName:      "",
					OriginBytecodeHash:      o.BytecodeHash,
					TargetBytecodeHashes:    []string{},
					TargetContractAddresses: []string{},
					OriginVerified:          true,
				})
			}
		}

		if len(diamondDifferences) > 0 {
			differences[diamondName] = diamondDifferences
		}
	}

	return differences
}

// convertToFacetDiff converts a slice of Facet to a slice of FacetDiff
func convertToFacetDiff(facets []Facet) []FacetDiff {
	diffs := make([]FacetDiff, len(facets))
	for i, f := range facets {
		diffs[i] = FacetDiff{
			OriginContractAddress:   f.FacetAddress,
			SelectorsDiff:           f.SelectorsHex,
			OriginContractName:      f.ContractName,
			OriginBytecodeHash:      f.BytecodeHash,
			TargetContractAddresses: []string{},
			TargetContractName:      "",
		}
	}
	return diffs
}

// getDifferentSelectors returns selectors from origin that are not in target
func getDifferentSelectors(origin, target []string) []string {
	targetSet := make(map[string]struct{})
	for _, t := range target {
		targetSet[t] = struct{}{}
	}

	var different []string
	for _, o := range origin {
		if _, exists := targetSet[o]; !exists {
			different = append(different, o)
		}
	}

	return different
}

// mergeFacets combines facets with the same ContractName
func mergeFacets(facets []Facet) map[string]MergedFacet {
	mergedFacets := make(map[string]MergedFacet)

	for _, facet := range facets {
		if existing, ok := mergedFacets[facet.ContractName]; ok {
			existing.SelectorsHex = append(existing.SelectorsHex, facet.SelectorsHex...)
			existing.BytecodeHashes = append(existing.BytecodeHashes, facet.BytecodeHash)
			existing.ContractAddresses = append(existing.ContractAddresses, facet.FacetAddress.Hex())
			mergedFacets[facet.ContractName] = existing
		} else {
			mergedFacets[facet.ContractName] = MergedFacet{
				Facet:             facet,
				BytecodeHashes:    []string{facet.BytecodeHash},
				ContractAddresses: []string{facet.FacetAddress.Hex()},
			}
		}
	}

	return mergedFacets
}
