package types

import (
	"context"
	"errors"
	"math/big"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/logging"
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
	ETH_BALANCE
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
	case ETH_BALANCE:
		return "ETH_BALANCE"
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
	Params          []byte
	// Threshold       *big.Int
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

func GetOperationTree(
	ctx context.Context,
	ruleData *base.IRuleEntitlementBaseRuleDataV2,
) (Operation, error) {
	log := logging.FromCtx(ctx)
	decodedOperations := []Operation{}
	log.Debugw("Decoding operations", "ruleData", ruleData)
	for _, operation := range ruleData.Operations {
		if OperationType(operation.OpType) == CHECK {
			checkOperation := ruleData.CheckOperations[operation.Index]
			decodedOperations = append(decodedOperations, &CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(checkOperation.OpType),
				ChainID:         checkOperation.ChainId,
				ContractAddress: checkOperation.ContractAddress,
				Params:          checkOperation.Params,
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
				return nil, errors.New("unknown logical operation type")
			}
		} else {
			return nil, errors.New("unknown logical operation type")
		}
		log.Debugw("Decoded operation", "operation", operation, "decodedOperations", decodedOperations)
	}

	var stack []Operation

	for _, op := range decodedOperations {
		if OperationType(op.GetOpType()) == LOGICAL {
			if len(stack) < 2 {
				return nil, errors.New("invalid post-order array, not enough operands")
			}
			right := stack[len(stack)-1]
			left := stack[len(stack)-2]
			stack = stack[:len(stack)-2]

			if logicalOp, ok := op.(LogicalOperation); ok {
				logicalOp.SetLeftOperation(left)
				logicalOp.SetRightOperation(right)
				stack = append(stack, logicalOp)
			} else {
				return nil, errors.New("unknown logical operation type")
			}
		} else if OperationType(op.GetOpType()) == CHECK {
			stack = append(stack, op)
		} else {
			return nil, errors.New("unknown operation type")
		}
		log.Debugw("decodedOperation", "op", op, "stack", stack)
	}

	if len(stack) != 1 {
		return nil, errors.New("invalid post-order array")
	}

	return stack[0], nil
}
