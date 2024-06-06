package entitlement

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"sync"

	er "github.com/river-build/river/core/xchain/contracts"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/dlog"
)

func (e *Evaluator) EvaluateRuleData(
	ctx context.Context,
	linkedWallets []common.Address,
	ruleData *er.IRuleData,
) (bool, error) {
	log := dlog.FromCtx(ctx)
	log.Info("Evaluating rule data", "ruleData", ruleData)
	opTree, err := getOperationTree(ctx, ruleData)
	if err != nil {
		return false, err
	}
	return e.evaluateOp(ctx, opTree, linkedWallets)
}

// OperationType Enum
type OperationType int

const (
	NONE OperationType = iota
	CHECK
	LOGICAL
)

// CheckOperationType Enum
type CheckOperationType int

const (
	CheckNONE CheckOperationType = iota
	MOCK                         // MOCK is a mock operation type for testing
	ERC20
	ERC721
	ERC1155
	ISENTITLED
)

func (t CheckOperationType) String() string {
	switch t {
	case CheckNONE:
		return "CheckNONE"
	case MOCK:
		return "MOCK"
	case ERC20:
		return "ERC20"
	case ERC721:
		return "ERC721"
	case ERC1155:
		return "ERC1155"
	case ISENTITLED:
		return "ISENTITLED"
	default:
		return "UNKNOWN"
	}
}

// LogicalOperationType Enum
type LogicalOperationType int

const (
	LogNONE LogicalOperationType = iota
	AND
	OR
)

type Operation interface {
	GetOpType() OperationType
}

type CheckOperation struct {
	Operation       // Embedding Operation interface
	OpType          OperationType
	CheckType       CheckOperationType
	ChainID         *big.Int
	ContractAddress common.Address
	Threshold       *big.Int
	ChannelId       [32]byte
	Permission      string
}

func (c *CheckOperation) GetOpType() OperationType {
	return c.OpType
}

type LogicalOperation interface {
	Operation // Embedding Operation interface
	GetLogicalType() LogicalOperationType
	GetLeftOperation() Operation
	GetRightOperation() Operation
	SetLeftOperation(Operation)
	SetRightOperation(Operation)
}

type OrOperation struct {
	LogicalOperation // Embedding LogicalOperation interface
	OpType           OperationType
	LogicalType      LogicalOperationType
	LeftOperation    Operation
	RightOperation   Operation
}

func (o *OrOperation) GetOpType() OperationType {
	return o.OpType
}

func (o *OrOperation) GetLogicalType() LogicalOperationType {
	return o.LogicalType
}

func (o *OrOperation) GetLeftOperation() Operation {
	return o.LeftOperation
}

func (o *OrOperation) GetRightOperation() Operation {
	return o.RightOperation
}

func (o *OrOperation) SetLeftOperation(left Operation) {
	o.LeftOperation = left
}

func (o *OrOperation) SetRightOperation(right Operation) {
	o.RightOperation = right
}

type AndOperation struct {
	LogicalOperation // Embedding LogicalOperation interface
	OpType           OperationType
	LogicalType      LogicalOperationType
	LeftOperation    Operation
	RightOperation   Operation
}

func (a *AndOperation) GetOpType() OperationType {
	return a.OpType
}

func (a *AndOperation) GetLogicalType() LogicalOperationType {
	return a.LogicalType
}

func (a *AndOperation) GetLeftOperation() Operation {
	return a.LeftOperation
}

func (a *AndOperation) GetRightOperation() Operation {
	return a.RightOperation
}

func (a *AndOperation) SetLeftOperation(left Operation) {
	a.LeftOperation = left
}

func (a *AndOperation) SetRightOperation(right Operation) {
	a.RightOperation = right
}

func getOperationTree(ctx context.Context,
	ruleData *er.IRuleData,
) (Operation, error) {
	log := dlog.FromCtx(ctx)
	decodedOperations := []Operation{}
	log.Debug("Decoding operations", "ruleData", ruleData)
	for _, operation := range ruleData.Operations {
		if OperationType(operation.OpType) == CHECK {
			checkOperation := ruleData.CheckOperations[operation.Index]
			decodedOperations = append(decodedOperations, &CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(checkOperation.OpType),
				ChainID:         checkOperation.ChainId,
				ContractAddress: checkOperation.ContractAddress,
				Threshold:       checkOperation.Threshold,
			})
		} else if OperationType(operation.OpType) == LOGICAL {
			logicalOperation := ruleData.LogicalOperations[operation.Index]
			if LogicalOperationType(logicalOperation.LogOpType) == AND {
				decodedOperations = append(decodedOperations, &AndOperation{
					OpType:         LOGICAL,
					LogicalType:    LogicalOperationType(logicalOperation.LogOpType),
					LeftOperation:  decodedOperations[logicalOperation.LeftOperationIndex],
					RightOperation: decodedOperations[logicalOperation.RightOperationIndex],
				})
			} else if LogicalOperationType(logicalOperation.LogOpType) == OR {
				decodedOperations = append(decodedOperations, &OrOperation{
					OpType:         LOGICAL,
					LogicalType:    LogicalOperationType(logicalOperation.LogOpType),
					LeftOperation:  decodedOperations[logicalOperation.LeftOperationIndex],
					RightOperation: decodedOperations[logicalOperation.RightOperationIndex],
				})
			} else {
				return nil, errors.New("Unknown logical operation type")
			}
		} else {
			return nil, errors.New("Unknown logical operation type")
		}
		log.Debug("Decoded operation", "operation", operation, "decodedOperations", decodedOperations)
	}

	var stack []Operation

	for _, op := range decodedOperations {
		if OperationType(op.GetOpType()) == LOGICAL {
			if len(stack) < 2 {
				return nil, errors.New("Invalid post-order array, not enough operands")
			}
			right := stack[len(stack)-1]
			left := stack[len(stack)-2]
			stack = stack[:len(stack)-2]

			if logicalOp, ok := op.(LogicalOperation); ok {
				logicalOp.SetLeftOperation(left)
				logicalOp.SetRightOperation(right)
				stack = append(stack, logicalOp)
			} else {
				return nil, errors.New("Unknown logical operation type")
			}
		} else if OperationType(op.GetOpType()) == CHECK {
			stack = append(stack, op)
		} else {
			return nil, errors.New("Unknown operation type")
		}
		log.Debug("decodedOperation", "op", op, "stack", stack)
	}

	if len(stack) != 1 {
		return nil, errors.New("Invalid post-order array")
	}

	return stack[0], nil
}

func (e *Evaluator) evaluateAndOperation(
	ctx context.Context,
	op *AndOperation,
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
	op *OrOperation,
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
	op Operation,
	linkedWallets []common.Address,
) (bool, error) {
	if op == nil {
		return false, fmt.Errorf("operation is nil")
	}

	switch op.GetOpType() {
	case CHECK:
		checkOp := (op).(*CheckOperation)
		return e.evaluateCheckOperation(ctx, checkOp, linkedWallets)
	case LOGICAL:
		logicalOp := (op).(LogicalOperation)

		switch logicalOp.GetLogicalType() {
		case AND:
			andOp := (op).(*AndOperation)
			return e.evaluateAndOperation(ctx, andOp, linkedWallets)
		case OR:
			orOp := (op).(*OrOperation)
			return e.evaluateOrOperation(ctx, orOp, linkedWallets)
		case LogNONE:
			fallthrough
		default:
			return false, fmt.Errorf("invalid LogicalOperation type")
		}
	case NONE:
		fallthrough
	default:
		return false, fmt.Errorf("invalid Operation type")
	}
}
