import type { SpecCatalog } from '../../../catalogs/index.js'
import type { BloggerDirectiveToken, BloggerStructureDiagnostic } from '../../../types.js'
import { pushDiagnostic } from '../helpers.js'

export function validateSectionId(
  token: BloggerDirectiveToken,
  globalSectionWidgetIds: Map<string, BloggerDirectiveToken>,
  catalog: SpecCatalog,
  diagnostics: BloggerStructureDiagnostic[],
): void {
  if (token.tagName !== 'b:section') {
    return
  }

  const idAttr = token.attributes.id
  if (idAttr) {
    const idVal = idAttr.value.trim()
    if (idVal) {
      if (globalSectionWidgetIds.has(idVal)) {
        const dupElemDiag = catalog.getStandardDiagnostic('duplicate_element_id')
        pushDiagnostic(diagnostics, catalog, dupElemDiag, token, {
          end: idAttr.end,
          message: `Duplicate element identifier '${idVal}' detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes.`,
          start: idAttr.start,
        })
      }
      else {
        globalSectionWidgetIds.set(idVal, token)
      }
    }
  }
}
