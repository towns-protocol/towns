import { ToneName } from 'ui/styles/themes'

export type FieldTone =
    | typeof ToneName.Positive
    | typeof ToneName.Negative
    | typeof ToneName.Neutral
    | typeof ToneName.Accent
