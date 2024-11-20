export const GridSidePanel = ({
    main,
    side,
}: {
    main?: React.ReactNode
    side?: React.ReactNode
}) => {
    return (
        <main className="grid flex-1 grid-cols-[1fr_3fr] bg-zinc-50 dark:bg-zinc-900">
            <aside className="flex max-h-[calc(100dvh-64px)] w-full flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                {side}
            </aside>
            <section className="flex max-h-[calc(100dvh-64px)] w-full flex-col gap-4 overflow-y-auto bg-zinc-50 px-4 py-2 dark:bg-zinc-900">
                {main}
            </section>
        </main>
    )
}
