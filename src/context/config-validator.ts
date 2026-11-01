import type { SpecCatalog } from '../catalogs/spec-catalog.js'
import type {
  BloggerBlogConfiguration,
  BloggerEntryConfiguration,
  ConfigValidationError,
  ConfigValidationResult,
} from './config-types.js'
import { getSpecCatalog } from '../catalogs/spec-catalog.js'

const VALID_COMMENT_MODES = new Set(['ALLOWED', 'RESTRICTED', 'DISABLED'])
const VALID_COMMENT_LOCATIONS = new Set(['EMBEDDED', 'FULL_PAGE', 'POPUP', 'HIDDEN'])

export function createDefaultBlogConfig(): BloggerBlogConfiguration {
  return {
    blog: {
      locale: 'en',
      adultContent: false,
      isPrivate: false,
      postsPerPage: 7,
      commentLocation: 'EMBEDDED',
      titleAndEnclosureLinks: true,
    },
    entries: {},
    widgets: {},
  }
}

export function validateBlogConfig(
  config: unknown,
  catalog: SpecCatalog = getSpecCatalog(),
): ConfigValidationResult {
  const errors: ConfigValidationError[] = []

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {
      valid: false,
      errors: [
        {
          path: '/',
          message: 'Configuration must be a non-null object.',
          code: 'INVALID_ROOT_OBJECT',
        },
      ],
    }
  }

  const root = config as Record<string, any>

  if (root.blog !== undefined) {
    if (!root.blog || typeof root.blog !== 'object' || Array.isArray(root.blog)) {
      errors.push({
        path: '/blog',
        message: '\'blog\' property must be an object.',
        code: 'INVALID_BLOG_OBJECT',
      })
    }
    else {
      const blog = root.blog as Record<string, any>

      if (blog.locale !== undefined) {
        if (typeof blog.locale !== 'string') {
          errors.push({
            path: '/blog/locale',
            message: '\'locale\' must be a string.',
            code: 'INVALID_LOCALE_TYPE',
          })
        }
        else if (!catalog.getLocale(blog.locale)) {
          errors.push({
            path: '/blog/locale',
            message: `Unsupported locale '${blog.locale}'. Must match one of the 61 canonical Blogger locales in catalogs/locales.json.`,
            code: 'UNKNOWN_LOCALE',
          })
        }
      }

      if (blog.adultContent !== undefined && typeof blog.adultContent !== 'boolean') {
        errors.push({
          path: '/blog/adultContent',
          message: '\'adultContent\' must be a boolean.',
          code: 'INVALID_ADULT_CONTENT_TYPE',
        })
      }

      if (blog.analyticsMeasurementId !== undefined && typeof blog.analyticsMeasurementId !== 'string') {
        errors.push({
          path: '/blog/analyticsMeasurementId',
          message: '\'analyticsMeasurementId\' must be a string.',
          code: 'INVALID_ANALYTICS_ID_TYPE',
        })
      }

      if (blog.isPrivate !== undefined && typeof blog.isPrivate !== 'boolean') {
        errors.push({
          path: '/blog/isPrivate',
          message: '\'isPrivate\' must be a boolean.',
          code: 'INVALID_IS_PRIVATE_TYPE',
        })
      }

      if (blog.postsPerPage !== undefined) {
        if (typeof blog.postsPerPage !== 'number' || !Number.isInteger(blog.postsPerPage) || blog.postsPerPage < 1) {
          errors.push({
            path: '/blog/postsPerPage',
            message: '\'postsPerPage\' must be an integer greater than or equal to 1.',
            code: 'INVALID_POSTS_PER_PAGE',
          })
        }
      }

      if (blog.commentLocation !== undefined) {
        if (typeof blog.commentLocation !== 'string' || !VALID_COMMENT_LOCATIONS.has(blog.commentLocation)) {
          errors.push({
            path: '/blog/commentLocation',
            message: `'commentLocation' must be one of: 'EMBEDDED', 'FULL_PAGE', 'POPUP', 'HIDDEN'.`,
            code: 'INVALID_COMMENT_LOCATION',
          })
        }
      }

      if (blog.commentFormMessage !== undefined) {
        if (typeof blog.commentFormMessage !== 'string') {
          errors.push({
            path: '/blog/commentFormMessage',
            message: '\'commentFormMessage\' must be a string.',
            code: 'INVALID_COMMENT_FORM_MESSAGE_TYPE',
          })
        }
        else if (blog.commentFormMessage.length > 4096) {
          errors.push({
            path: '/blog/commentFormMessage',
            message: `Comment form message exceeds maximum length of 4096 characters (received ${blog.commentFormMessage.length}).`,
            code: 'COMMENT_FORM_MESSAGE_TOO_LONG',
          })
        }
      }

      if (blog.postDateFormat !== undefined && typeof blog.postDateFormat !== 'string') {
        errors.push({
          path: '/blog/postDateFormat',
          message: '\'postDateFormat\' must be a string.',
          code: 'INVALID_POST_DATE_FORMAT_TYPE',
        })
      }

      if (blog.commentDateFormat !== undefined && typeof blog.commentDateFormat !== 'string') {
        errors.push({
          path: '/blog/commentDateFormat',
          message: '\'commentDateFormat\' must be a string.',
          code: 'INVALID_COMMENT_DATE_FORMAT_TYPE',
        })
      }

      if (blog.titleAndEnclosureLinks !== undefined && typeof blog.titleAndEnclosureLinks !== 'boolean') {
        errors.push({
          path: '/blog/titleAndEnclosureLinks',
          message: '\'titleAndEnclosureLinks\' must be a boolean.',
          code: 'INVALID_TITLE_ENCLOSURE_LINKS_TYPE',
        })
      }
    }
  }

  if (root.entries !== undefined) {
    if (!root.entries || typeof root.entries !== 'object' || Array.isArray(root.entries)) {
      errors.push({
        path: '/entries',
        message: '\'entries\' property must be an object indexed by entry ID.',
        code: 'INVALID_ENTRIES_OBJECT',
      })
    }
    else {
      for (const [entryId, entryValue] of Object.entries(root.entries)) {
        const entryPath = `/entries/${entryId}`
        if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) {
          errors.push({
            path: entryPath,
            message: `Entry configuration for ID '${entryId}' must be an object.`,
            code: 'INVALID_ENTRY_OBJECT',
          })
          continue
        }

        const entry = entryValue as BloggerEntryConfiguration
        if (entry.searchDescription !== undefined) {
          if (typeof entry.searchDescription !== 'string') {
            errors.push({
              path: `${entryPath}/searchDescription`,
              message: '\'searchDescription\' must be a string.',
              code: 'INVALID_SEARCH_DESCRIPTION_TYPE',
            })
          }
          else if (entry.searchDescription.length > 150) {
            errors.push({
              path: `${entryPath}/searchDescription`,
              message: `Search description exceeds maximum length of 150 characters (received ${entry.searchDescription.length}).`,
              code: 'SEARCH_DESCRIPTION_TOO_LONG',
            })
          }
        }

        if (entry.commentMode !== undefined) {
          if (typeof entry.commentMode !== 'string' || !VALID_COMMENT_MODES.has(entry.commentMode)) {
            errors.push({
              path: `${entryPath}/commentMode`,
              message: `'commentMode' must be one of: 'ALLOWED', 'RESTRICTED', 'DISABLED'.`,
              code: 'INVALID_COMMENT_MODE',
            })
          }
        }
      }
    }
  }

  if (root.widgets !== undefined) {
    if (!root.widgets || typeof root.widgets !== 'object' || Array.isArray(root.widgets)) {
      errors.push({
        path: '/widgets',
        message: '\'widgets\' property must be an object.',
        code: 'INVALID_WIDGETS_OBJECT',
      })
    }
    else {
      for (const [widgetKey, widgetSettings] of Object.entries(root.widgets)) {
        const widgetPath = `/widgets/${widgetKey}`
        if (!widgetSettings || typeof widgetSettings !== 'object' || Array.isArray(widgetSettings)) {
          errors.push({
            path: widgetPath,
            message: `Widget settings for '${widgetKey}' must be an object.`,
            code: 'INVALID_WIDGET_SETTINGS_OBJECT',
          })
          continue
        }

        const widgetType = widgetKey.replace(/\d+$/, '')
        const widgetDef = catalog.getWidgetSettings(widgetType)
        if (!widgetDef) {
          errors.push({
            path: widgetPath,
            message: `Unknown widget type '${widgetType}' for widget key '${widgetKey}'.`,
            code: 'UNKNOWN_WIDGET_TYPE',
          })
          continue
        }

        const canonical = widgetDef.canonical || {}
        const deprecated = widgetDef.deprecated || {}

        for (const [settingName, settingValue] of Object.entries(widgetSettings as Record<string, any>)) {
          const settingPath = `${widgetPath}/${settingName}`
          const canonicalSetting = canonical[settingName]
          const deprecatedSetting = deprecated[settingName]

          if (!canonicalSetting && !deprecatedSetting) {
            errors.push({
              path: settingPath,
              message: `Setting '${settingName}' is not recognized for widget type '${widgetType}'.`,
              code: 'UNKNOWN_WIDGET_SETTING',
            })
            continue
          }

          if (canonicalSetting) {
            const expectedType = canonicalSetting.type
            const actualType = typeof settingValue

            if (expectedType === 'boolean' && actualType !== 'boolean') {
              errors.push({
                path: settingPath,
                message: `Setting '${settingName}' must be a boolean (received ${actualType}).`,
                code: 'INVALID_SETTING_TYPE',
              })
            }
            else if (expectedType === 'number' && actualType !== 'number') {
              errors.push({
                path: settingPath,
                message: `Setting '${settingName}' must be a number (received ${actualType}).`,
                code: 'INVALID_SETTING_TYPE',
              })
            }
            else if (expectedType === 'string' && actualType !== 'string') {
              errors.push({
                path: settingPath,
                message: `Setting '${settingName}' must be a string (received ${actualType}).`,
                code: 'INVALID_SETTING_TYPE',
              })
            }

            if (canonicalSetting.allowed_values && actualType === 'string') {
              if (!canonicalSetting.allowed_values.includes(settingValue as string)) {
                errors.push({
                  path: settingPath,
                  message: `Value '${settingValue}' is not allowed for '${settingName}'. Allowed: ${canonicalSetting.allowed_values.join(', ')}.`,
                  code: 'SETTING_VALUE_NOT_ALLOWED',
                })
              }
            }

            if (canonicalSetting.minimum !== undefined && actualType === 'number') {
              if ((settingValue as number) < canonicalSetting.minimum) {
                errors.push({
                  path: settingPath,
                  message: `Setting '${settingName}' must be greater than or equal to ${canonicalSetting.minimum}.`,
                  code: 'SETTING_MINIMUM_VIOLATION',
                })
              }
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
