package entitlement

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"sync"

	er "servers/xchain/contracts"

	"github.com/ethereum/go-ethereum/common"
)

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
}

func (c CheckOperation) GetOpType() OperationType {
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

func (o OrOperation) GetOpType() OperationType {
	return o.OpType
}

func (o OrOperation) GetLogicalType() LogicalOperationType {
	return o.LogicalType
}

func (o OrOperation) GetLeftOperation() Operation {
	return o.LeftOperation
}

func (o OrOperation) GetRightOperation() Operation {
	return o.RightOperation
}

func (o OrOperation) SetLeftOperation(left Operation) {
	o.LeftOperation = left
}

func (o OrOperation) SetRightOperation(right Operation) {
	o.RightOperation = right
}

type AndOperation struct {
	LogicalOperation // Embedding LogicalOperation interface
	OpType           OperationType
	LogicalType      LogicalOperationType
	LeftOperation    Operation
	RightOperation   Operation
}

func (a AndOperation) GetOpType() OperationType {
	return a.OpType
}

func (a AndOperation) GetLogicalType() LogicalOperationType {
	return a.LogicalType
}

func (a AndOperation) GetLeftOperation() Operation {
	return a.LeftOperation
}

func (a AndOperation) GetRightOperation() Operation {
	return a.RightOperation
}

func (a AndOperation) SetLeftOperation(left Operation) {
	a.LeftOperation = left
}

func (a AndOperation) SetRightOperation(right Operation) {
	a.RightOperation = right
}

func getOperationTree(address string) (Operation, error) {
	var wg sync.WaitGroup
	wg.Add(3)

	var operations []er.IRuleEntitlementOperation
	var logicalOperations []er.IRuleEntitlementLogicalOperation
	var checkOperations []er.IRuleEntitlementCheckOperation

	go func() {
		// Simulate publicClient.readContract for 'getOperations'
		// Fill operations
		wg.Done()
	}()

	go func() {
		// Simulate publicClient.readContract for 'getLogicalOperations'
		// Fill logicalOperations
		wg.Done()
	}()

	go func() {
		// Simulate publicClient.readContract for 'getCheckOperations'
		// Fill checkOperations
		wg.Done()
	}()

	wg.Wait()

	decodedOperations := []Operation{}

	for _, operation := range operations {
		if OperationType(operation.OpType) == CHECK {
			checkOperation := checkOperations[operation.Index]
			decodedOperations = append(decodedOperations, CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(checkOperation.OpType),
				ChainID:         checkOperation.ChainId,
				ContractAddress: checkOperation.ContractAddress,
				Threshold:       checkOperation.Threshold,
			})
		} else if OperationType(operation.OpType) == LOGICAL {
			logicalOperation := logicalOperations[operation.Index]
			if LogicalOperationType(logicalOperation.LogOpType) == AND {
				decodedOperations = append(decodedOperations, AndOperation{
					OpType:         LOGICAL,
					LogicalType:    LogicalOperationType(logicalOperation.LogOpType),
					LeftOperation:  decodedOperations[logicalOperation.LeftOperationIndex],
					RightOperation: decodedOperations[logicalOperation.RightOperationIndex],
				})
			} else if LogicalOperationType(logicalOperation.LogOpType) == OR {
				decodedOperations = append(decodedOperations, OrOperation{
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
	}

	var stack []Operation

	for _, op := range decodedOperations {
		if OperationType(op.GetOpType()) == LOGICAL {
			if len(stack) < 2 {
				return nil, errors.New("Invalid post-order array")
			}
			right := stack[len(stack)-1]
			left := stack[len(stack)-2]
			stack = stack[:len(stack)-2]

			if logicalOp, ok := op.(LogicalOperation); ok {
				logicalOp.SetLeftOperation(left)
				logicalOp.SetRightOperation(right)
			} else {
				return nil, errors.New("Unknown logical operation type")
			}

		} else if OperationType(op.GetOpType()) == CHECK {

			stack = append(stack, op)
		} else {
			return nil, errors.New("Unknown operation type")
		}
	}

	if len(stack) != 1 {
		return nil, errors.New("Invalid post-order array")
	}

	return stack[0], nil
}
func evaluateAndOperation(
	ctx context.Context,
	op AndOperation,
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
		leftResult, leftErr = evaluateOp(leftCtx, op.LeftOperation, callerAddress)
		if !leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is false or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = evaluateOp(rightCtx, op.RightOperation, callerAddress)
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
	op OrOperation,
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
		leftResult, leftErr = evaluateOp(leftCtx, op.LeftOperation, callerAddress)
		if leftResult || leftErr != nil {
			// cancel the other goroutine
			// if the left result is true or there is an error
			rightCancel()
		}
		wg.Done()
	}()

	go func() {
		rightResult, rightErr = evaluateOp(rightCtx, op.RightOperation, callerAddress)
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
	op Operation,
	callerAddres *common.Address,
) (bool, error) {

	if op == nil {
		return false, fmt.Errorf("operation is nil")
	}

	switch op.GetOpType() {
	case CHECK:
		checkOp := (op).(*CheckOperation)
		return evaluateCheckOperation(ctx, checkOp, callerAddres)
	case LOGICAL:
		logicalOp := (op).(LogicalOperation)

		switch logicalOp.GetLogicalType() {
		case AND:
			andOp := (op).(AndOperation)
			return evaluateAndOperation(ctx, andOp, callerAddres)
		case OR:
			orOp := (op).(OrOperation)
			return evaluateOrOperation(ctx, orOp, callerAddres)
		default:
			return false, fmt.Errorf("invalid LogicalOperation type")
		}
	default:
		return false, fmt.Errorf("invalid Operation type")
	}
}
