import { describe, expect, it } from 'vitest'
import {
  detectTemplateVersion,
  getLayoutVersions,
  getLayoutVersionsSpec,
} from '../src/helpers.js'
import * as RootExports from '../src/index.js'
import {
  detectTemplateVersion as directDetect,
  getLayoutVersionsSpec as directGetSpec,
} from '../src/version.js'

describe('template layout versions (v1, v2, v3) suite', () => {
  describe('canonical layout version specification', () => {
    it('provides layout versions metadata via helpers and root exports', () => {
      const spec = getLayoutVersionsSpec()
      expect(spec).toBeDefined()
      expect(spec?.supported_versions).toEqual([1, 2, 3])
      expect(spec?.default_version).toBe(3)
      expect(spec?.explicit_attributes).toContain('b:layoutsVersion')
      expect(spec?.explicit_attributes).toContain('b:version')

      expect(spec?.versions['1'].name).toContain('Layouts v1')
      expect(spec?.versions['2'].name).toContain('Layouts v2')
      expect(spec?.versions['3'].name).toContain('Layouts v3')

      // Cross-check SpecCatalog helper
      const catalogSpec = getLayoutVersions()
      expect(catalogSpec).toEqual(spec)

      // Direct module export
      expect(directGetSpec()).toEqual(spec)
    })
  })

  describe('explicit layout version detection', () => {
    it('detects b:layoutsVersion with single and double quotes', () => {
      const v3Double = '<html b:layoutsVersion="3"><head></head><body></body></html>'
      const res3 = detectTemplateVersion(v3Double)
      expect(res3.version).toBe(3)
      expect(res3.confidence).toBe('explicit')
      expect(res3.detectedFeatures).toContain('b:layoutsVersion="3"')

      const v2Single = `<html b:layoutsVersion='2'><head></head><body></body></html>`
      const res2 = detectTemplateVersion(v2Single)
      expect(res2.version).toBe(2)
      expect(res2.confidence).toBe('explicit')
      expect(res2.detectedFeatures).toContain(`b:layoutsVersion='2'`)

      const v1Single = `<html b:layoutsVersion='1'><head></head><body></body></html>`
      const res1 = detectTemplateVersion(v1Single)
      expect(res1.version).toBe(1)
      expect(res1.confidence).toBe('explicit')
      expect(res1.detectedFeatures).toContain(`b:layoutsVersion='1'`)
    })

    it('handles semver-like version values (e.g. 3.0.0, 2.0)', () => {
      const xmlSemver = '<html b:layoutsVersion="3.0.0"></html>'
      const res = detectTemplateVersion(xmlSemver)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('explicit')

      const xmlMinor = `<html b:version='2.0'></html>`
      const resMinor = detectTemplateVersion(xmlMinor)
      expect(resMinor.version).toBe(2)
      expect(resMinor.confidence).toBe('explicit')
    })

    it('detects legacy b:version attribute', () => {
      const xml = '<html b:version="2"></html>'
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(2)
      expect(res.confidence).toBe('explicit')
      expect(res.detectedFeatures).toContain('b:version="2"')
    })

    it('detects unprefixed layoutsVersion attribute', () => {
      const xml = '<html layoutsVersion="1"></html>'
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(1)
      expect(res.confidence).toBe('explicit')
      expect(res.detectedFeatures).toContain('layoutsVersion="1"')
    })
  })

  describe('prolog and comment resilience', () => {
    it('does not confuse <?xml version="1.0"?> with Layouts v1', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<html><head></head><body></body></html>'
      const res = detectTemplateVersion(xml)
      // Must not match XML version="1.0" as Layouts v1!
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.summary).toContain('Layouts v3')
    })

    it('ignores version declarations inside XML comments', () => {
      const xml = `
        <!-- <html b:layoutsVersion="1"> legacy template commented out -->
        <html b:layoutsVersion="3">
          <body></body>
        </html>
      `
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('explicit')
      expect(res.detectedFeatures).toContain('b:layoutsVersion="3"')
    })

    it('ignores structural markers inside XML comments', () => {
      const xml = `
        <html>
          <!-- <b:section growth="horizontal" id="old"/> -->
          <body></body>
        </html>
      `
      const res = detectTemplateVersion(xml)
      // Without the commented marker, should fallback to modern v3
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toHaveLength(0)
    })
  })

  describe('inferred layout version via structural markers', () => {
    it('infers Layouts v3 from <b:defaultmarkups>', () => {
      const xml = `
        <html>
          <b:defaultmarkups>
            <b:defaultmarkup type='Common'>
              <b:includable id='main'/>
            </b:defaultmarkup>
          </b:defaultmarkups>
        </html>
      `
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toContain('b:defaultmarkups')
    })

    it('infers Layouts v3 from <b:template-script> and <b:with>', () => {
      const xml = `
        <html>
          <head>
            <b:template-script async='true'/>
          </head>
          <body>
            <b:with value='data:blog.title' var='title'>
              <h1><data:title/></h1>
            </b:with>
          </body>
        </html>
      `
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toContain('b:template-script')
      expect(res.detectedFeatures).toContain('b:with')
    })

    it('infers Layouts v3 from semantic tag attribute on <b:section>', () => {
      const xml = '<b:section id="main" tag="main"/>'
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toContain('b:section tag=')
    })

    it('infers Layouts v1 from deprecated section constraints (growth, maxwidgets)', () => {
      const xml = '<b:section id="header" growth="horizontal" maxwidgets="3"/>'
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(1)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toContain('growth')
      expect(res.detectedFeatures).toContain('maxwidgets')
      expect(res.summary).toContain('legacy structural markers')
    })
  })

  describe('explicit precedence and fallback behavior', () => {
    it('preserves explicit version even when markers of other versions are present', () => {
      // Explicit v2 takes precedence even if someone added a section tag
      const xml = `
        <html b:layoutsVersion="2">
          <b:section id="main" tag="section"/>
        </html>
      `
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(2)
      expect(res.confidence).toBe('explicit')
      expect(res.detectedFeatures).toContain('b:layoutsVersion="2"')
      expect(res.detectedFeatures).toContain('b:section tag=')
    })

    it('defaults to Layouts v3 when no markers or declarations exist', () => {
      const xml = '<html><head></head><body><h1>Hello World</h1></body></html>'
      const res = detectTemplateVersion(xml)
      expect(res.version).toBe(3)
      expect(res.confidence).toBe('inferred')
      expect(res.detectedFeatures).toHaveLength(0)
      expect(res.summary).toBe('Default modern standard (Layouts v3)')
    })

    it('handles empty or non-string input safely without throwing', () => {
      expect(detectTemplateVersion('').version).toBe(3)
      expect(detectTemplateVersion(null as any).version).toBe(3)
      expect(detectTemplateVersion(undefined as any).version).toBe(3)
    })

    it('is exported identically from root index and direct version module', () => {
      const xml = '<html b:layoutsVersion="3"></html>'
      expect(RootExports.detectTemplateVersion(xml)).toEqual(directDetect(xml))
      expect(RootExports.getLayoutVersionsSpec()).toEqual(directGetSpec())
    })
  })
})
