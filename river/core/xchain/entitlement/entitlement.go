package entitlement

import (
	"context"
	"fmt"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/types"
	"github.com/river-build/river/core/node/dlog"
)

func (e *Evaluator) EvaluateRuleData(
	ctx context.Context,
	linkedWallets []common.Address,
	ruleData *base.IRuleEntitlementBaseRuleDataV2,
) (bool, error) {
	log := dlog.FromCtx(ctx)
	log.Info("Evaluating rule data", "ruleData", ruleData)
	opTree, err := types.GetOperationTree(ctx, ruleData)
	if err != nil {
		return false, err
	}
	return e.evaluateOp(ctx, opTree, linkedWallets)
}

func (e *Evaluator) evaluateAndOperation(
	ctx context.Context,
	op *types.AndOperation,
	linkedWallets []common.Address,
) (bool, error) {
	if op.LeftOperation == nil || op.RightOperation == nil {
		return false, fmt.Errorf("operation is nil")
	}
	leftCtx, leftCancel := context.WithCancel(ctx)
	rightCtx, rightCancel := context.WithCancel(ctx)
	leftResult := false
	leftErr := error(nil)
	rightResult := false
	rightErr := error(nil)
	wg := sync.WaitGroup{}
	wg.Add(2)
	defer leftCancel()
	defer rightCancel()
	go func() {
		leftResult, leftErr = e.evaluateOp(leftCtx, op.LeftOperation, linkedWallets)
		if !leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is false or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = e.evaluateOp(rightCtx, op.RightOperation, linkedWallets)
		if !rightResult || rightErr != nil {
			// cancel the other goroutine
			// if the right result is false or there is an error
			leftCancel()
		}
		wg.Done()
	}()

	wg.Wait()
	return leftResult && rightResult, nil
}

func (e *Evaluator) evaluateOrOperation(
	ctx context.Context,
	op *types.OrOperation,
	linkedWallets []common.Address,
) (bool, error) {
	if op.LeftOperation == nil || op.RightOperation == nil {
		return false, fmt.Errorf("operation is nil")
	}
	leftCtx, leftCancel := context.WithCancel(ctx)
	rightCtx, rightCancel := context.WithCancel(ctx)
	leftResult := false
	leftErr := error(nil)
	rightResult := false
	rightErr := error(nil)
	wg := sync.WaitGroup{}
	wg.Add(2)
	defer leftCancel()
	defer rightCancel()
	go func() {
		leftResult, leftErr = e.evaluateOp(leftCtx, op.LeftOperation, linkedWallets)
		if leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is true or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = e.evaluateOp(rightCtx, op.RightOperation, linkedWallets)
		if rightResult || rightErr != nil {
			// cancel the other goroutine
			// if the right result is true or there is an error
			leftCancel()
		}
		wg.Done()
	}()

	wg.Wait()
	return leftResult || rightResult, nil
}

func awaitTimeout(ctx context.Context, f func() error) error {
	doneCh := make(chan error, 1)

	go func() {
		doneCh <- f()
	}()

	select {
	case <-ctx.Done():
		// If the context was cancelled or expired, return an error
		return fmt.Errorf("operation cancelled: %w", ctx.Err())
	case err := <-doneCh:
		// If the function finished executing, return its result
		return err
	}
}

func (e *Evaluator) evaluateOp(
	ctx context.Context,
	op types.Operation,
	linkedWallets []common.Address,
) (bool, error) {
	if op == nil {
		return false, fmt.Errorf("operation is nil")
	}

	switch op.GetOpType() {
	case types.CHECK:
		checkOp := (op).(*types.CheckOperation)
		return e.evaluateCheckOperation(ctx, checkOp, linkedWallets)
	case types.LOGICAL:
		logicalOp := (op).(types.LogicalOperation)

		switch logicalOp.GetLogicalType() {
		case types.AND:
			andOp := (op).(*types.AndOperation)
			return e.evaluateAndOperation(ctx, andOp, linkedWallets)
		case types.OR:
			orOp := (op).(*types.OrOperation)
			return e.evaluateOrOperation(ctx, orOp, linkedWallets)
		case types.LogNONE:
			fallthrough
		default:
			return false, fmt.Errorf("invalid LogicalOperation type")
		}
	case types.NONE:
		fallthrough
	default:
		return false, fmt.Errorf("invalid Operation type")
	}
}
