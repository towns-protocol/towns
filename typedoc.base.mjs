export default {
    includeVersion: true,
    plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter'],
    hideGenerator: true,
    readme: 'none',
    entryFileName: 'index',
    hideBreadcrumbs: true,
    hidePageHeader: true,
    useCodeBlocks: true,
    excludePrivate: true,
    validation: {
        invalidLink: false,
    },
}
