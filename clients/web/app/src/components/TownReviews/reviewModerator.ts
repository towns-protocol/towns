import { moderateReview } from '../../api/ai'

interface ValidationResult {
    valid: boolean
    reason?: string
}

interface TownContext {
    name: string
    description?: string
}

const MAX_REPEATED_RATIO = 0.5
const MAX_CONSECUTIVE_REPEATED = 4

const basicValidation = (text: string): ValidationResult => {
    // Check for repeated characters frequency
    const charCounts = new Map<string, number>()
    for (const char of text.toLowerCase()) {
        charCounts.set(char, (charCounts.get(char) || 0) + 1)
    }

    // Check for excessive character repetition
    for (const [, count] of charCounts.entries()) {
        if (count / text.length > MAX_REPEATED_RATIO) {
            return {
                valid: false,
                reason: 'Review contains too many repeated characters',
            }
        }
    }

    // Check for consecutive repeated characters using regex
    // Matches when a character appears more than MAX_CONSECUTIVE_REPEATED times
    const consecutiveMatches = text.match(new RegExp(`(.)\\1{${MAX_CONSECUTIVE_REPEATED},}`, 'i'))
    if (consecutiveMatches) {
        return {
            valid: false,
            reason: 'Review contains too many consecutive repeated characters',
        }
    }

    return { valid: true }
}

export const validateReview = async (
    text: string,
    townContext: TownContext,
): Promise<ValidationResult> => {
    // First perform basic validation
    const basicResult = basicValidation(text)
    if (!basicResult.valid) {
        return basicResult
    }

    try {
        // If basic validation passes, perform AI validation
        return await moderateReview(text, townContext)
    } catch (error) {
        // If AI moderation fails, allow the review to proceed
        console.error('AI moderation failed:', error)
        return { valid: true }
    }
}
