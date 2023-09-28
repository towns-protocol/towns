package entitlement

import (
	"context"
	"fmt"
	"sync"

	p "common/xchain/entitlement/gen"

	"github.com/ethereum/go-ethereum/common"
)

func evaluateAndOperation(
	ctx context.Context,
	op *p.AndOperation,
	callerAddress *common.Address,
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
		leftResult, leftErr = evaluateOp(leftCtx, &p.OperationTree{Operation: op.LeftOperation}, callerAddress)
		if !leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is false or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = evaluateOp(rightCtx, &p.OperationTree{Operation: op.RightOperation}, callerAddress)
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

func evaluateOrOperation(
	ctx context.Context,
	op *p.OrOperation,
	callerAddress *common.Address,
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
		leftResult, leftErr = evaluateOp(leftCtx, &p.OperationTree{Operation: op.LeftOperation}, callerAddress)
		if leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is true or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = evaluateOp(rightCtx, &p.OperationTree{Operation: op.RightOperation}, callerAddress)
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

func evaluateOp(
	ctx context.Context,
	op *p.OperationTree,
	callerAddres *common.Address,
) (bool, error) {

	if op.Operation.GetOrOperation() != nil {
		return evaluateOrOperation(ctx, op.Operation.GetOrOperation(), callerAddres)
	} else if op.Operation.GetAndOperation() != nil {
		return evaluateAndOperation(ctx, op.Operation.GetAndOperation(), callerAddres)
	} else if (op.Operation.GetCheckOperation()) != nil {
		return evaluateCheckOperation(ctx, op.Operation.GetCheckOperation(), callerAddres)
	} else {
		return false, fmt.Errorf("invalid Operation type")
	}
}
