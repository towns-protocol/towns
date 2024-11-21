import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { createTownFormSchema } from './createTown.schema'

export type CreateTownFormReturn = UseFormReturn<CreateTownFormSchema>

export type CreateTownFormSchema = z.infer<typeof createTownFormSchema>
