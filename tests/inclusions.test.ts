import { describe, expect, it } from 'vitest'
import { getInclusions, getSpecCatalog, SpecCatalog } from '../src/catalogs/index.js'
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
    expect(Object.keys(catalog.inclusions).length).toBeGreaterThanOrEqual(45)
  })

  it('exposes prehydrated inclusions from root exports', () => {
    expect(RootExports.inclusions).toEqual(getInclusions())
    expect(RootExports.getInclusions).toBe(RootExports.getInclusions)
    expect(RootExports.inclusions.inclusions['all-head-content']).toBeDefined()
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
})
