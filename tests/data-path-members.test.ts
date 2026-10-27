import { describe, expect, it } from 'vitest'
import { getRuntimeEvaluationStates, getViewMatrixEntry, getViewsMatrix } from '../src/catalogs/index.js'
import { getDataPathMembers, getTypeMembers, resolveDataPath } from '../src/data-path.js'
import { ScopeEnvironment } from '../src/scope.js'

describe('dataPath Members & Type Members Navigation', () => {
  it('returns canonical properties and modifiers for scalar types', () => {
    const stringMembers = getTypeMembers('string')
    const names = stringMembers.map(m => m.name)

    expect(names).toContain('length')
    expect(names).toContain('escaped')
    expect(names).toContain('jsonEscaped')
    expect(stringMembers.every(m => m.sourceCatalog === 'types')).toBe(true)
  })

  it('returns collection modifiers for array type', () => {
    const arrayMembers = getTypeMembers('array')
    const names = arrayMembers.map(m => m.name)

    expect(names).toContain('size')
    expect(names).toContain('length')
    expect(names).toContain('first')
    expect(names).toContain('last')
    expect(names).toContain('empty')
    expect(names).toContain('notEmpty')
    expect(names).toContain('any')

    const sizeMod = arrayMembers.find(m => m.name === 'size')
    expect(sizeMod?.type).toBe('number')
    expect(sizeMod?.isModifier).toBe(true)
  })

  it('returns root globals, active widget canonical properties and messages on empty path', () => {
    const scope = new ScopeEnvironment()
    scope.pushScope('widget', { widgetType: 'Blog' })

    const rootMembers = getDataPathMembers('', { scope, widgetType: 'Blog' })
    const names = rootMembers.map(m => m.name)

    // Globals
    expect(names).toContain('blog')
    expect(names).toContain('view')
    expect(names).toContain('messages')

    // Widget Blog properties
    expect(names).toContain('posts')
    expect(names).toContain('title')
  })

  it('returns universal localized message keys when accessing messages', () => {
    const msgMembers = getDataPathMembers('messages')
    expect(msgMembers.length).toBeGreaterThan(10)
    expect(msgMembers.every(m => m.sourceCatalog === 'messages')).toBe(true)
  })

  it('returns skin variables normalized with underscore', () => {
    const skinMembers = getDataPathMembers('data:skin.vars', {
      skinVariables: {
        'admin.name': { type: 'string', name: 'admin.name' },
        'primary_color': { type: 'color', name: 'primary_color' },
      },
    })

    const names = skinMembers.map(m => m.name)
    expect(names).toContain('admin_name')
    expect(names).toContain('primary_color')
  })

  it('returns members and modifiers for collection paths', () => {
    const postMembers = getDataPathMembers('data:posts', { widgetType: 'Blog' })
    const names = postMembers.map(m => m.name)

    expect(names).toContain('size')
    expect(names).toContain('length')
    expect(names).toContain('first')
    expect(names).toContain('last')
  })

  it('returns deprecated properties with reasons and replacements', () => {
    const blogMembers = getDataPathMembers('data:blog')
    const isMobileMember = blogMembers.find(m => m.name === 'isMobile')

    expect(isMobileMember).toBeDefined()
    expect(isMobileMember?.isDeprecated).toBe(true)
    expect(isMobileMember?.replacement).toBe('data:blog.isMobileRequest')
    expect(isMobileMember?.runtimeState).toBe('active')
  })

  it('exposes view availability, unconfiguredState, condition, runtimeState, and sourceConstraint across resolveDataPath and members', () => {
    const postIdProp = resolveDataPath('data:view.postId')
    expect(postIdProp?.availableInViews).toEqual(['post'])

    const archiveDayProp = resolveDataPath('data:view.archive.day')
    expect(archiveDayProp?.unconfiguredState).toBe('missing')

    const archiveMonthProp = resolveDataPath('data:view.archive.month')
    expect(archiveMonthProp?.availableInViews).toEqual(['archive_monthly', 'archive_weekly_daily'])

    const analyticsProp = resolveDataPath('data:blog.analyticsAccountNumber')
    expect(analyticsProp?.unconfiguredState).toBe('empty')

    const analytics4Prop = resolveDataPath('data:blog.analytics4')
    expect(analytics4Prop?.unconfiguredState).toBe('missing')
    expect(analytics4Prop?.condition).toBe('analytics4_configured')

    const profileTeamAuthorProp = resolveDataPath('data:authors.first.userUrl', { widgetType: 'Profile' })
    expect(profileTeamAuthorProp?.condition).toBe('team == true')
    expect(profileTeamAuthorProp?.unconfiguredState).toBe('missing')

    const featuredImageOrigWidth = resolveDataPath('data:posts.first.featuredImage.originalWidth', { widgetType: 'Blog' })
    expect(featuredImageOrigWidth?.sourceConstraint).toBe('Blog.posts.featuredImage')

    const imageMembers = getTypeMembers('image')
    const widthMod = imageMembers.find(m => m.name === 'width')
    const origWidthMod = imageMembers.find(m => m.name === 'originalWidth')
    expect(widthMod?.sourceConstraint).toBe('resizeImage')
    expect(origWidthMod?.sourceConstraint).toBe('Blog.posts.featuredImage')

    const viewsMatrix = getViewsMatrix()
    expect(Object.keys(viewsMatrix)).toHaveLength(12)
    expect(getViewMatrixEntry('homepage')?.flags.isSearch).toBe('missing')
    expect(getViewMatrixEntry('post')?.flags.isSingleItem).toBe('true')

    const evalStates = getRuntimeEvaluationStates()
    expect(evalStates.MISSING?.html_output_template).toBe('<!--Can\'t find substitution for tag [{tag}]-->')
    expect(evalStates.NOT_SINGLETON?.html_output_template).toBe('<!--Substitution is not a singleton for tag [{tag}]-->')
  })
})
