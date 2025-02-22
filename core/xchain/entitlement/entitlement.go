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

// isEntitlementEvaluationError returns true iff the error is the result of a failure when evaluating
// an entitlement. It ignores context cancellations, which can occur when a operation evaluation
// short-circuits because the other child returned a definitive answer.
func isEntitlementEvaluationError(err error) bool {
	return err != nil && !errors.Is(err, context.Canceled)
}

// logIfEntitlementError conditionally logs an error if it was not a context cancellation.
func logIfEntitlementError(ctx context.Context, err error) {
	if isEntitlementEvaluationError(err) {
		logging.FromCtx(ctx).Warnw("Entitlement evaluation succeeded, but encountered error", "error", err)
	}
}

// composeEntitlementEvaluationError returns a composed error type that incorporates the error of
// either child as long as that error is not a context cancellation, which we ignore because we
// introduce it ourselves.
func composeEntitlementEvaluationError(leftErr error, rightErr error) error {
	if isEntitlementEvaluationError(leftErr) && isEntitlementEvaluationError(rightErr) {
		return fmt.Errorf("%w; %w", leftErr, rightErr)
	}
	if isEntitlementEvaluationError(leftErr) {
		return leftErr
	}
	if isEntitlementEvaluationError(rightErr) {
		return rightErr
	}
	return nil
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
	// 2. If either check is false, was not cancelled, and did not fail - return false, as the user is not entitled.
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
