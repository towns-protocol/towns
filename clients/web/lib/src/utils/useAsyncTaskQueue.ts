import { useCallback, useEffect, useState } from 'react'

export function useAsyncTaskQueue<T extends () => Promise<void>>() {
    // keep processing and tasks in same state so they are always updated together
    const [taskQueue, setTaskQueue] = useState<{ processing: boolean; tasks: T[] }>({
        processing: false,
        tasks: [],
    })
    const enqueueTask = useCallback(
        (task: T) =>
            setTaskQueue((state) => ({
                processing: state.processing,
                tasks: [...state.tasks, task],
            })),
        [],
    )
    const clearQueue = useCallback(
        () =>
            setTaskQueue((state) => ({
                processing: state.processing,
                tasks: [],
            })),
        [],
    )

    useEffect(() => {
        if (taskQueue.processing || taskQueue.tasks.length === 0) {
            return
        }

        const _performTask = async () => {
            try {
                await task()
            } finally {
                setTaskQueue((state) => ({
                    processing: false,
                    tasks: state.tasks.slice(1),
                }))
            }
        }

        const task = taskQueue.tasks[0]
        setTaskQueue((state) => ({
            processing: true,
            tasks: state.tasks,
        }))

        // wrapping in setTimeout as extra precuation to avoid batched state updates with the above setTaskQueue
        setTimeout(() => {
            void _performTask()
        })
    }, [taskQueue])

    return {
        enqueueTask,
        clearQueue,
    }
}
