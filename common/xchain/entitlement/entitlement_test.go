package entitlement

import (
	"context"
	"testing"
	"time"

	p "common/xchain/entitlement/gen"

	"github.com/ethereum/go-ethereum/common"
)

var fastTrueCheck = p.Operation_CheckOperation{
	CheckOperation: &p.CheckOperation{
		CheckClause: &p.CheckOperation_IsEntitledOperation{
			IsEntitledOperation: &p.IsEntitledOperation{
				ChainId:         "true",
				ContractAddress: "0.1",
			},
		},
	},
}

var slowTrueCheck = p.Operation_CheckOperation{
	CheckOperation: &p.CheckOperation{
		CheckClause: &p.CheckOperation_IsEntitledOperation{
			IsEntitledOperation: &p.IsEntitledOperation{
				ChainId:         "true",
				ContractAddress: "1.0",
			},
		},
	},
}

var fastFalseCheck = p.Operation_CheckOperation{
	CheckOperation: &p.CheckOperation{
		CheckClause: &p.CheckOperation_IsEntitledOperation{
			IsEntitledOperation: &p.IsEntitledOperation{
				ChainId:         "false",
				ContractAddress: "0.1",
			},
		},
	},
}

var slowFalseCheck = p.Operation_CheckOperation{
	CheckOperation: &p.CheckOperation{
		CheckClause: &p.CheckOperation_IsEntitledOperation{
			IsEntitledOperation: &p.IsEntitledOperation{
				ChainId:         "false",
				ContractAddress: "1.0",
			},
		},
	},
}

func TestAndOperation(t *testing.T) {
	testCases := []struct {
		a            *p.Operation_CheckOperation
		b            *p.Operation_CheckOperation
		expected     bool
		expectedTime float32
	}{
		{&fastTrueCheck, &fastTrueCheck, true, 0.1},
		{&fastTrueCheck, &slowTrueCheck, true, 1.0},
		{&slowTrueCheck, &fastTrueCheck, true, 1.0},
		{&slowTrueCheck, &slowTrueCheck, true, 1.0},
		{&fastFalseCheck, &fastFalseCheck, false, 0.1},
		{&slowFalseCheck, &slowFalseCheck, false, 1.0},
		{&slowFalseCheck, &fastFalseCheck, false, 0.1},
		{&fastFalseCheck, &slowFalseCheck, false, 0.1},
		{&fastTrueCheck, &fastFalseCheck, false, 0.1},
		{&fastTrueCheck, &slowFalseCheck, false, 1.0},
		{&slowTrueCheck, &fastFalseCheck, false, 0.1},
		{&slowTrueCheck, &slowFalseCheck, false, 1.0},
	}

	for idx, tc := range testCases {
		tree := p.OperationTree{
			Operation: &p.Operation{
				OperationClause: &p.Operation_AndOperation{
					AndOperation: &p.AndOperation{
						LeftOperation: &p.Operation{
							OperationClause: tc.a,
						},
						RightOperation: &p.Operation{
							OperationClause: tc.b,
						},
					},
				},
			},
		}
		startTime := time.Now() // Get the current time

		callerAddress := common.Address{}

		result, error := evaluateOp(context.Background(), &tree, &callerAddress)
		elapsedTime := time.Since(startTime)
		if error != nil {
			t.Errorf("evaluateAndOperation(%v) = %v; want %v", idx, error, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateAndOperation(%v) = %v; want %v", idx, result, tc.expected)
		}
		if !areDurationsClose(elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)), 10*time.Millisecond) {
			t.Errorf("evaluateAndOperation(%v) took %v; want %v", idx, elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)))
		}

	}
}

func TestOrOperation(t *testing.T) {
	testCases := []struct {
		a            *p.Operation_CheckOperation
		b            *p.Operation_CheckOperation
		expected     bool
		expectedTime float32
	}{
		{&fastTrueCheck, &fastTrueCheck, true, 0.1},
		{&fastTrueCheck, &slowTrueCheck, true, 0.1},
		{&slowTrueCheck, &fastTrueCheck, true, 0.1},
		{&slowTrueCheck, &slowTrueCheck, true, 1.0},
		{&fastFalseCheck, &fastFalseCheck, false, 0.1},
		{&slowFalseCheck, &slowFalseCheck, false, 1.0},
		{&slowFalseCheck, &fastFalseCheck, false, 1.0},
		{&fastFalseCheck, &slowFalseCheck, false, 1.0},
		{&fastTrueCheck, &fastFalseCheck, true, 0.1},
		{&fastTrueCheck, &slowFalseCheck, true, 0.1},
		{&slowTrueCheck, &fastFalseCheck, true, 1.0},
		{&slowTrueCheck, &slowFalseCheck, true, 1.0},
	}

	for idx, tc := range testCases {
		tree := p.OperationTree{
			Operation: &p.Operation{
				OperationClause: &p.Operation_OrOperation{
					OrOperation: &p.OrOperation{
						LeftOperation: &p.Operation{
							OperationClause: tc.a,
						},
						RightOperation: &p.Operation{
							OperationClause: tc.b,
						},
					},
				},
			},
		}
		startTime := time.Now() // Get the current time

		callerAddress := common.Address{}

		result, error := evaluateOp(context.Background(), &tree, &callerAddress)
		elapsedTime := time.Since(startTime)
		if error != nil {
			t.Errorf("evaluateOrOperation(%v) = %v; want %v", idx, error, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateOrOperation(%v) = %v; want %v", idx, result, tc.expected)
		}
		if !areDurationsClose(elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)), 10*time.Millisecond) {
			t.Errorf("evaluateOrOperation(%v) took %v; want %v", idx, elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)))
		}

	}
}

func areDurationsClose(d1, d2, threshold time.Duration) bool {
	diff := d1 - d2
	if diff < 0 {
		diff = -diff
	}
	return diff <= threshold
}
func TestCheckOperation(t *testing.T) {
	testCases := []struct {
		a            *p.Operation_CheckOperation
		expected     bool
		expectedTime float32
	}{
		{&fastTrueCheck, true, 0.1},
		{&slowTrueCheck, true, 1.0},
		{&fastFalseCheck, false, 0.1},
		{&slowFalseCheck, false, 1.0},
	}

	for _, tc := range testCases {
		tree := p.OperationTree{
			Operation: &p.Operation{
				OperationClause: tc.a,
			},
		}

		startTime := time.Now() // Get the current time

		callerAddress := common.Address{}

		result, err := evaluateOp(context.Background(), &tree, &callerAddress)
		elapsedTime := time.Since(startTime)

		if err != nil {
			t.Errorf("evaluateCheckOperation error (%v) = %v; want %v", tc.a.CheckOperation, err, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.a.CheckOperation, result, tc.expected)
		}
		if !areDurationsClose(elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)), 10*time.Millisecond) {
			t.Errorf("evaluateCheckOperation(%v) took %v; want %v", fastFalseCheck.CheckOperation, elapsedTime, time.Duration(tc.expectedTime*float32(time.Second)))
		}

	}
}
