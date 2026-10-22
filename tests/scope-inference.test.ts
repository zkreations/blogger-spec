import { describe, expect, it } from 'vitest'
import { scanDirectiveTokens } from '../src/parser/directive-scanner.js'
import { ScopeEnvironment } from '../src/scope.js'

describe('scopeEnvironment Automatic Directive Inferencia', () => {
  it('infers numeric loop range 1 to 10 and index variable', () => {
    const scope = new ScopeEnvironment()
    const xml = '<b:loop values=\'1 to 10\' var=\'num\' index=\'i\'/>'
    const tokens = scanDirectiveTokens(xml)
    const loopToken = tokens[0]!

    const frame = scope.pushDirectiveScope(loopToken)
    expect(frame).toBeDefined()
    expect(scope.resolveIdentifier('num')?.type).toBe('number')
    expect(scope.resolveIdentifier('i')?.type).toBe('number')
  })

  it('infers widget Blog canonical collection data:posts item properties', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const xml = '<b:loop values=\'data:posts\' var=\'post\' index=\'i\'/>'
    const tokens = scanDirectiveTokens(xml)
    const loopToken = tokens[0]!

    scope.pushDirectiveScope(loopToken)
    const postSym = scope.resolveIdentifier('post')

    expect(postSym).toBeDefined()
    expect(postSym?.type).toBe('object')
    expect(postSym?.metadata?.item_properties).toBeDefined()
    expect((postSym?.metadata?.item_properties as any).title).toBeDefined()
  })

  it('infers collection for other widgets such as LinkList', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'LinkList' })

    const xml = '<b:loop values=\'data:links\' var=\'link\'/>'
    const tokens = scanDirectiveTokens(xml)
    const loopToken = tokens[0]!

    scope.pushDirectiveScope(loopToken)
    const linkSym = scope.resolveIdentifier('link')

    expect(linkSym).toBeDefined()
    expect(linkSym?.type).toBe('object')
  })

  it('infers array of objects literals [{ name: "Daniel", age: 20 }]', () => {
    const scope = new ScopeEnvironment()
    const xml = '<b:loop values=\'[{ name: "Daniel", age: 20 }]\' var=\'person\'/>'
    const tokens = scanDirectiveTokens(xml)
    const loopToken = tokens[0]!

    scope.pushDirectiveScope(loopToken)
    const personSym = scope.resolveIdentifier('person')

    expect(personSym).toBeDefined()
    expect(personSym?.type).toBe('object')
    expect(personSym?.metadata?.item_properties).toBeDefined()
    const props = personSym?.metadata?.item_properties as any
    expect(props.name.type).toBe('string')
    expect(props.age.type).toBe('number')
  })

  it('infers array of scalars [1, 2, 3]', () => {
    const scope = new ScopeEnvironment()
    const xml = '<b:loop values=\'[1, 2, 3]\' var=\'n\'/>'
    const tokens = scanDirectiveTokens(xml)
    const loopToken = tokens[0]!

    scope.pushDirectiveScope(loopToken)
    const nSym = scope.resolveIdentifier('n')

    expect(nSym?.type).toBe('number')
  })

  it('infers object literals in <b:with>', () => {
    const scope = new ScopeEnvironment()
    const xml = '<b:with value=\'{ maxItems: 10, label: "Destacados" }\' var=\'cfg\'/>'
    const tokens = scanDirectiveTokens(xml)
    const withToken = tokens[0]!

    scope.pushDirectiveScope(withToken)
    const cfgSym = scope.resolveIdentifier('cfg')

    expect(cfgSym?.type).toBe('object')
    const props = (cfgSym?.metadata as any)?.properties
    expect(props.maxItems.type).toBe('number')
    expect(props.label.type).toBe('string')
  })

  it('infers aggregate count (...) as number in <b:with>', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const xml = '<b:with value=\'data:posts count (p => p.allowComments)\' var=\'commentCount\'/>'
    const tokens = scanDirectiveTokens(xml)
    const withToken = tokens[0]!

    scope.pushDirectiveScope(withToken)
    const countSym = scope.resolveIdentifier('commentCount')

    expect(countSym?.type).toBe('number')
  })

  it('infers predicate any (...) as boolean in <b:with>', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const xml = '<b:with value=\'data:posts any (p => p.allowComments)\' var=\'hasComments\'/>'
    const tokens = scanDirectiveTokens(xml)
    const withToken = tokens[0]!

    scope.pushDirectiveScope(withToken)
    const anySym = scope.resolveIdentifier('hasComments')

    expect(anySym?.type).toBe('boolean')
  })

  it('preserves element members with data:posts.first in <b:with>', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const xml = '<b:with value=\'data:posts.first\' var=\'firstPost\'/>'
    const tokens = scanDirectiveTokens(xml)
    const withToken = tokens[0]!

    scope.pushDirectiveScope(withToken)
    const firstPostSym = scope.resolveIdentifier('firstPost')

    expect(firstPostSym?.type).toBe('object')
  })

  it('infers ternary expressions in <b:with>', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const xml = '<b:with value=\'data:post.hasOlderPage ? "Yes" : "No"\' var=\'hasOlder\'/>'
    const tokens = scanDirectiveTokens(xml)
    const withToken = tokens[0]!

    scope.pushDirectiveScope(withToken)
    const hasOlderSym = scope.resolveIdentifier('hasOlder')

    expect(hasOlderSym?.type).toBe('string')
  })
})
