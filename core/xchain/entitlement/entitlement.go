package entitlement

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/types"
	"github.com/towns-protocol/towns/core/node/logging"
)

func (e *Evaluator) EvaluateRuleData(
	ctx context.Context,
	linkedWallets []common.Address,
	ruleData *base.IRuleEntitlementBaseRuleDataV2,
) (bool, error) {
	log := logging.FromCtx(ctx)
	log.Infow("Evaluating rule data", "ruleData", ruleData)
	opTree, err := types.GetOperationTree(ctx, ruleData)
	if err != nil {
		return false, err
	}
	return e.evaluateOp(ctx, opTree, linkedWallets)
}

// isNoncancelationError returns true iff the error is non-nil and is also not due to a
// context cancelation or timeout.
func isNoncancelationError(err error) bool {
	return err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded)
}

// logIfEntitlementError conditionally logs an error if it was not a context cancellation.
func logIfEntitlementError(ctx context.Context, err error) {
	if isNoncancelationError(err) {
		logging.FromCtx(ctx).Warnw("Entitlement evaluation succeeded, but encountered error", "error", err)
	}
}

// composeEntitlementEvaluationError returns a composed error type that prioritizes errors resulting
// from invalid entitlement evaluations as opposed to errors derived from context cancellation or
// deadline exceeded. The reason for this is we short-circuit the evaluation of nested entitlements
// by cancelling the context, and we want to avoid surfacing any errors that we actually created ourselves
// as part of a performance optimization.
// How errors are evaluated:
//  1. If both are noncancellation errors, then both errors arose when we attempted to evaluate an entitlement.
//     Compose them and return.
//  2. If only one error is a non-cancellation error, it arose during entitlement evaluation, and the second
//     error was caused by our short-circuiting logic. Return the entitlement evaluation error.
//  3. If neither of the above conditions are true, then either one or both of the errors is non-nil and were
//     caused by a cancellation or deadline exceeded.
//     A. If only one error is non-nil, return it.
//     B. If both errors are cancellation errors, then compose them.
//
// Note that if both errors are nil, the final result will also be nil.
func composeEntitlementEvaluationError(leftErr error, rightErr error) error {
	if isNoncancelationError(leftErr) && isNoncancelationError(rightErr) {
		return fmt.Errorf("%w; %w", leftErr, rightErr)
	}
	if isNoncancelationError(leftErr) {
		return leftErr
	}
	if isNoncancelationError(rightErr) {
		return rightErr
	}

	// If either error is nil, allow the other error to dictate the response
	if leftErr == nil {
		return rightErr
	}

	if rightErr == nil {
		return leftErr
	}

	// If both errors are due to some type of cancellation, compose them.
	return fmt.Errorf("%w; %w", leftErr, rightErr)
}

// evaluateAndOperation evaluates the results of it's two child operations, ANDs them, and
// returns the final response. As soon as any one child operation evaluates as unentitled,
// the method will short-circuit evaluation of the other child and return a false response.
//
// In the case where one child operation results in an error:
//   - If the other child evaluates as unentitled, return the false result, because the user
//     is definitely not entitled.
//   - If the other child evaluates to true, return the error because we do not know
//     if the user was truly entitled.
//
// If both child calls result in an error, the method will return a wrapped error.
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
		if !leftResult && leftErr == nil {
			// cancel the other goroutine if the left result is false, since we know
			// the user is unentitled
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = e.evaluateOp(rightCtx, op.RightOperation, linkedWallets)
		if !rightResult && rightErr == nil {
			// cancel the other goroutine if the right result is false, since we know
			// the user is unentitled
			leftCancel()
		}
		wg.Done()
	}()

	wg.Wait()

	// Evaluate definitive results and return them without error, logging if an evaluation error occurred.
	// 1. Both checks are true - return true
	// 2. If either check is false and produced no error - return false, as the user is not entitled.
	// 3. If one of the errors was non-nil and not a cancellation or timeout, return it as the true cause of the
	//    entitlement evaluation failure.
	// 4. If both checks were cancelations/timeouts, consider this a true timeout, as the context cancellation cause
	//    must have propogated from the parent.
	if leftResult && rightResult {
		return true, nil
	}

	if !leftResult && leftErr == nil {
		logIfEntitlementError(ctx, rightErr)
		return false, nil
	}

	if !rightResult && rightErr == nil {
		logIfEntitlementError(ctx, leftErr)
		return false, nil
	}

	return false, composeEntitlementEvaluationError(leftErr, rightErr)
}

// evaluateOrOperation evaluates the results of it's two child operations, ORs them, and
// returns the final response. As soon as any one child operation evaluates as entitled,
// the method will short-circuit evaluation of the other child and return a true response.
//
// In the case where one child operation results in an error:
//   - If the other child evaluates as entitled, return the true result, because the user
//     is definitely entitled.
//   - If the other child evaluates to false, return the error because we do not know
//     if the user was truly unentitled.
//
// If both child calls result in an error, the method will return a wrapped error.
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
		if leftResult {
			// cancel the other goroutine if the left result is true, since we know
			// the user is unentitled
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = e.evaluateOp(rightCtx, op.RightOperation, linkedWallets)
		if rightResult {
			// cancel the other goroutine if the right result is true, since we know
			// the user is entitled
			leftCancel()
		}
		wg.Done()
	}()

	wg.Wait()

	// If at least one child evaluates as entitled, log any errors and return a true result.
	if leftResult || rightResult {
		logIfEntitlementError(ctx, leftErr)
		logIfEntitlementError(ctx, rightErr)
		return true, nil
	}

	// Return a false result and handle error values to prioritize error types that come
	// from entitlement evaluations.
	return false, composeEntitlementEvaluationError(leftErr, rightErr)
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
