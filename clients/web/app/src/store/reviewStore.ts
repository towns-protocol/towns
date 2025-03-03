import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ReviewState = {
    dismissedReviews: Record<string, boolean>
    dismissReview: (townId: string) => void
    hasReviewBeenDismissed: (townId: string) => boolean
}

export const useReviewStore = create(
    persist<ReviewState>(
        (set, get) => ({
            dismissedReviews: {},
            dismissReview: (townId: string) => {
                set((state) => ({
                    ...state,
                    dismissedReviews: {
                        ...state.dismissedReviews,
                        [townId]: true,
                    },
                }))
            },
            hasReviewBeenDismissed: (townId: string) => {
                return get().dismissedReviews[townId] || false
            },
        }),
        {
            name: 'towns/review-states',
            partialize: (state) => state,
        },
    ),
)
