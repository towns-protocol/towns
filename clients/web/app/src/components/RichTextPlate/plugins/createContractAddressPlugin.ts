import { createTSlatePlugin } from '@udecode/plate-common'
import { toPlatePlugin } from '@udecode/plate-common/react'

export const ELEMENT_CONTRACT_ADDRESS = 'contract_address'

const BaseContractAddressPlugin = createTSlatePlugin({
    key: ELEMENT_CONTRACT_ADDRESS,
    node: {
        isElement: true,
        isInline: true,
        isMarkableVoid: true,
        isVoid: true,
    },
})

export const ContractAddressPlugin = toPlatePlugin(BaseContractAddressPlugin)
