import { describe, expect, it } from 'vitest'
import {
  getAllWidgetDefaultInclusions,
  getInclusionMarkup,
  getInclusions,
  getSpecCatalog,
  getSuperDelegationRule,
  getWidgetDefaultInclusions,
  isPortableInclusion,
  isThemeBoundInclusion,
  isValidSuperInclusion,
  SpecCatalog,
} from '../src/catalogs/index.js'
import {
  expandServerInclusion,
  extractIncludableBody,
  getInclusionParameterContracts,
} from '../src/inclusion-expander.js'
import * as RootExports from '../src/index.js'

const spec = getSpecCatalog()
const isServerInclusion = (name: string) => spec.isServerInclusion(name)
const isUniversalInclusion = (name: string) => spec.isUniversalInclusion(name)
const getServerInclusion = (name: string) => spec.getInclusion(name)
const getAllServerInclusions = () => spec.getAllInclusions()

describe('system inclusions catalog suite', () => {
  it('loads inclusions catalog with valid super prefix rule', () => {
    const catalog = getInclusions()
    expect(catalog).toBeDefined()
    expect(catalog.domain_metadata?.super_prefix_rule).toBeDefined()
    expect(catalog.domain_metadata?.super_prefix_rule?.prefix).toBe('super.')
    expect(catalog.domain_metadata?.super_prefix_rule?.behavior).toBe('delegation')
    expect(Object.keys(catalog.inclusions).length).toBeGreaterThanOrEqual(140)
  })

  it('exposes prehydrated inclusions from root exports', () => {
    expect(RootExports.catalogs.inclusions).toEqual(getInclusions())
    expect(RootExports.getInclusions).toBe(RootExports.getInclusions)
    expect(RootExports.catalogs.inclusions.inclusions['all-head-content']).toBeDefined()
  })

  it('correctly validates server inclusions and super delegation prefix', () => {
    expect(isServerInclusion('all-head-content')).toBe(true)
    expect(isServerInclusion('google-analytics')).toBe(true)
    expect(isServerInclusion('widget-title')).toBe(true)
    expect(isServerInclusion('responsiveImage')).toBe(true)
    expect(isServerInclusion('backArrowIcon')).toBe(true)
    expect(isServerInclusion('postBody')).toBe(true)

    // Delegation to platform super.<id>
    expect(isServerInclusion('super.main')).toBe(true)
    expect(isServerInclusion('super.customSubroutine')).toBe(true)

    // Unknown or invalid
    expect(isServerInclusion('unknownCustomSubroutine')).toBe(false)
    expect(isServerInclusion('')).toBe(false)
  })

  it('identifies universal vs common/widget inclusions', () => {
    expect(isUniversalInclusion('all-head-content')).toBe(true)
    expect(isUniversalInclusion('google-analytics')).toBe(true)
    expect(isUniversalInclusion('quickedit')).toBe(true)

    expect(isUniversalInclusion('widget-title')).toBe(false)
    expect(isUniversalInclusion('postBody')).toBe(false)
    expect(isUniversalInclusion('nonExistent')).toBe(false)
  })

  it('retrieves detailed inclusion metadata', () => {
    const headContent = getServerInclusion('all-head-content')
    expect(headContent).toBeDefined()
    expect(headContent?.category).toBe('universal')
    expect(headContent?.layout_versions).toContain(3)

    const blogPost = getServerInclusion('postBody')
    expect(blogPost).toBeDefined()
    expect(blogPost?.category).toBe('theme')
    expect(blogPost?.target_widgets).toContain('Blog')

    const legacyIcon = getServerInclusion('googlePlusIcon')
    expect(legacyIcon?.deprecated?.status).toBe('obsolete')

    const all = getAllServerInclusions()
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(45)
    expect(all['widget-title']?.name).toBe('widget-title')
  })

  it('operates identically when queried directly through SpecCatalog instance', () => {
    const spec = new SpecCatalog()
    expect(spec.isServerInclusion('all-head-content')).toBe(true)
    expect(spec.isServerInclusion('super.header')).toBe(true)
    expect(spec.isUniversalInclusion('google-analytics')).toBe(true)
    expect(spec.getInclusion('widget-title')?.name).toBe('widget-title')
  })

  it('correctly classifies portable vs theme_bound inclusions and exposes server markup', () => {
    // Portable inclusions
    expect(isPortableInclusion('all-head-content')).toBe(true)
    expect(isPortableInclusion('openGraphMetaData')).toBe(true)
    expect(isPortableInclusion('responsiveImageStyle')).toBe(true)
    expect(isPortableInclusion('svgIcon')).toBe(true)
    expect(isThemeBoundInclusion('all-head-content')).toBe(false)

    // Theme-bound inclusions
    expect(isThemeBoundInclusion('heroPost')).toBe(true)
    expect(isThemeBoundInclusion('feedPostImage')).toBe(true)
    expect(isThemeBoundInclusion('standardPostImageStyle')).toBe(true)
    expect(isPortableInclusion('heroPost')).toBe(false)

    const heroDef = getServerInclusion('heroPost')
    expect(heroDef?.safety).toBe('theme_bound')
    expect(heroDef?.theme_dependency?.theme_name).toBe('Notable')

    const feedImgDef = getServerInclusion('feedPostImage')
    expect(feedImgDef?.safety).toBe('theme_bound')
    expect(feedImgDef?.theme_dependency?.theme_name).toBe('Emporio')

    // Server markup retrieval
    const headMarkup = getInclusionMarkup('all-head-content')
    expect(headMarkup).toBeDefined()
    expect(headMarkup).toContain('id=\'all-head-content\'')
    expect(headMarkup).toContain('openGraphMetaData')

    const svgIconMarkup = getInclusionMarkup('svgIcon')
    expect(svgIconMarkup).toBeDefined()
    expect(svgIconMarkup).toContain('sprite_v1_6.css.svg')

    // Super delegation rule
    const delegation = getSuperDelegationRule()
    expect(delegation).toBeDefined()
    expect(delegation?.supported_widgets).toContain('Blog')
    expect(delegation?.supported_widgets).toContain('Header')
    expect(delegation?.supported_subroutines).toContain('super.main')
    expect(delegation?.supported_subroutines).toContain('super.postShareButtons')
  })

  it('expands server inclusions and inlines subroutines locally', () => {
    // 1. Basic unwrapped expansion
    const svgRes = expandServerInclusion('svgIcon')
    expect(svgRes.isServerInclusion).toBe(true)
    expect(svgRes.isPortable).toBe(true)
    expect(svgRes.markup).toContain('<svg class=\'svg-icon-24\'>')
    expect(svgRes.markup).not.toContain('<b:includable')
    expect(svgRes.diagnostics).toHaveLength(0)

    // 2. Body extractor
    const rawIncludable = '<b:includable id=\'test\'><div>Inner Content</div></b:includable>'
    expect(extractIncludableBody(rawIncludable)).toBe('<div>Inner Content</div>')

    // 3. Recursive inlining of nested server inclusions (all-head-content includes openGraphMetaData)
    const headRes = expandServerInclusion('all-head-content', { recursive: true })
    expect(headRes.markup).toContain('og:url')
    expect(headRes.markup).toContain('resizeImage')

    // 4. Warning diagnostics on super inclusion expansion
    const superRes = expandServerInclusion('super.main')
    expect(superRes.diagnostics.some(d => d.code === 'BX1058')).toBe(true)

    // 5. Warning diagnostics on theme-bound inclusion expansion
    const heroRes = expandServerInclusion('heroPost')
    expect(heroRes.safety).toBe('theme_bound')
    expect(heroRes.diagnostics.some(d => d.code === 'BX1059')).toBe(true)

    // 6. Unresolved inclusion diagnostics
    const nonExistentRes = expandServerInclusion('nonExistentSubroutine')
    expect(nonExistentRes.isServerInclusion).toBe(false)
    expect(nonExistentRes.diagnostics.some(d => d.code === 'BX1037')).toBe(true)

    // 7. Formal parameter contracts
    const params = getInclusionParameterContracts('responsiveImageStyle')
    expect(params).toBeDefined()
    expect(params?.image?.required).toBe(true)
    expect(params?.selector?.required).toBe(true)
    expect(params?.imageSizes?.type).toBe('number[]')
  })

  it('exposes canonical default includables by widget type and validates super inclusions', () => {
    const allDefaults = getAllWidgetDefaultInclusions()
    expect(Object.keys(allDefaults)).toContain('Blog')
    expect(Object.keys(allDefaults)).toContain('Header')
    expect(Object.keys(allDefaults)).toContain('BlogArchive')
    expect(Object.keys(allDefaults)).toContain('Profile')
    expect(Object.keys(allDefaults)).toContain('Label')

    // Header default includables
    const headerDefaults = getWidgetDefaultInclusions('Header')
    expect(headerDefaults).toContain('main')
    expect(headerDefaults).toContain('title')
    expect(headerDefaults).toContain('description')
    expect(headerDefaults).toContain('image')
    expect(headerDefaults).toContain('behindImageStyle')

    // BlogArchive default includables
    const archiveDefaults = getWidgetDefaultInclusions('BlogArchive')
    expect(archiveDefaults).toContain('main')
    expect(archiveDefaults).toContain('flat')
    expect(archiveDefaults).toContain('hierarchy')

    // Blog default includables
    const blogDefaults = getWidgetDefaultInclusions('Blog')
    expect(blogDefaults).toContain('comments')
    expect(blogDefaults).toContain('threadedComments')
    expect(blogDefaults).toContain('postHeader')
    expect(blogDefaults).toContain('postFooter')

    // Validation of super delegators per widget context
    expect(isValidSuperInclusion('Header', 'title')).toBe(true)
    expect(isValidSuperInclusion('Header', 'main')).toBe(true)
    expect(isValidSuperInclusion('Header', 'comments')).toBe(false)

    expect(isValidSuperInclusion('BlogArchive', 'flat')).toBe(true)
    expect(isValidSuperInclusion('BlogArchive', 'hierarchy')).toBe(true)
    expect(isValidSuperInclusion('BlogArchive', 'title')).toBe(false)

    expect(isValidSuperInclusion('Blog', 'comments')).toBe(true)
    expect(isValidSuperInclusion('Blog', 'postShareButtons')).toBe(true)
    expect(isValidSuperInclusion('Blog', 'behindImageStyle')).toBe(false)

    // Inclusions target_widgets metadata
    const titleInc = getServerInclusion('title')
    expect(titleInc).toBeDefined()
    expect(titleInc?.target_widgets).toContain('Header')
    expect(titleInc?.category).toBe('widget')

    const commentsInc = getServerInclusion('comments')
    expect(commentsInc).toBeDefined()
    expect(commentsInc?.target_widgets).toContain('Blog')
    expect(commentsInc?.category).toBe('widget')
  })
})
