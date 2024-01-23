import { NON_PREFIXED_MATCHER, URL_MATCHER } from './AutoLinkMatcherPlugin'
describe('AutoLinkMatcherPlugin', () => {
    const links = [
        'www.test.com',
        'https://polygon.technology/developers',
        'https://subdomain.subdomain.test.com',
        "https://www.domain.com/file/apostrophe's-drafts",
        'test.com',
        'test.com?test=1',
        'test.shop/test',
        'test.technology/test?abc=123',
        'test-ok.technology/',
        'https://test.com',
        'http://test.com',
        'https://test.com/',
        'https://test.com/m-ore',
        'https://test.com/m-ore/123/234',
        'https://test.com/m-ore/123/234#test',
        'https://test.com/m-ore/a/b/c/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z',
        'https://test.com/m-ore/a/b/?c=d&e=f&g=h&i=j&k=l&m=n&o=p&q=r&s=t&u=v&w=x&y=z#tes[1-2]t',
    ]

    test.each(links)(`matching "%s" should resove to a link`, (link) => {
        expect(
            link.match(URL_MATCHER)?.[0] === link || link.match(NON_PREFIXED_MATCHER)?.[0] === link,
        ).toBeTruthy()
    })

    const nonLinks = [
        'www.test .com',
        'some links.come over here',
        'this linked.in my head',
        'test.techologyssssssss/link',
        'subdomain.test',
    ]

    test.each(nonLinks)(`matching "%s" should not resolve to a link`, (link) => {
        expect(link.match(URL_MATCHER) || link.match(NON_PREFIXED_MATCHER)).toBeFalsy()
    })
})
