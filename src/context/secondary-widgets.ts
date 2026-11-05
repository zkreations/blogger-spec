import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerPostData } from './types.js'

export function buildPopularPostsData(
  posts: readonly BloggerPostData[],
  spec: SpecCatalog,
  locale = 'en',
  limit?: number,
  postDisplayOverrides?: Record<string, boolean>,
): Record<string, any> {
  const canonicalLimit = (spec.getWidgetSettings('PopularPosts')?.canonical?.numItemsToShow?.default as number) ?? 10
  const effectiveLimit = limit ?? canonicalLimit
  const effectivePostDisplay = {
    showSnippet: true,
    showTitle: true,
    showAuthor: true,
    showFeaturedImage: true,
    ...postDisplayOverrides,
  }
  const selectedPosts = posts.slice(0, effectiveLimit).map(p => ({
    ...p,
    postDisplay: { ...effectivePostDisplay },
  }))

  return {
    title: spec.getWidgetDefaultTitle('PopularPosts', locale),
    postDisplay: effectivePostDisplay,
    posts: selectedPosts,
  }
}

export function buildContactFormData(
  spec: SpecCatalog,
  locale = 'en',
  submitUrl = 'https://www.blogger.com/contact-form.do',
): Record<string, any> {
  return {
    title: spec.getWidgetDefaultTitle('ContactForm', locale),
    submitUrl,
    contactFormNameMsg: spec.getTranslation('widgets.ContactForm.contactFormNameMsg', locale) ?? 'Name',
    contactFormEmailMsg: spec.getTranslation('widgets.ContactForm.contactFormEmailMsg', locale) ?? 'Email',
    contactFormMessageMsg: spec.getTranslation('widgets.ContactForm.contactFormMessageMsg', locale) ?? 'Message',
    contactFormSendMsg: spec.getTranslation('widgets.ContactForm.contactFormSendMsg', locale) ?? 'Send',
    contactFormMessageSendingMsg: spec.getTranslation('widgets.ContactForm.contactFormMessageSendingMsg', locale) ?? 'Sending...',
    contactFormMessageSentMsg: spec.getTranslation('widgets.ContactForm.contactFormMessageSentMsg', locale) ?? 'Your message has been sent.',
    contactFormMessageNotSentMsg: spec.getTranslation('widgets.ContactForm.contactFormMessageNotSentMsg', locale) ?? 'Could not send message. Please try again later.',
    contactFormEmptyMessageMsg: spec.getTranslation('widgets.ContactForm.contactFormEmptyMessageMsg', locale) ?? 'Message field cannot be empty.',
    contactFormInvalidEmailMsg: spec.getTranslation('widgets.ContactForm.contactFormInvalidEmailMsg', locale) ?? 'A valid email is required.',
  }
}

export function buildAttributionData(
  blogTitle: string,
  spec: SpecCatalog,
  locale = 'en',
  options?: { readonly year?: number, readonly posts?: readonly BloggerPostData[] },
): Record<string, any> {
  let resolvedYear = options?.year
  if (resolvedYear === undefined && options?.posts && options.posts.length > 0) {
    for (const post of options.posts) {
      const isoMatch = post.publishedIso?.match(/^(\d{4})/)
      if (isoMatch) {
        const y = Number.parseInt(isoMatch[1]!, 10)
        if (!resolvedYear || y > resolvedYear) {
          resolvedYear = y
        }
      }
      else if (post.timestamp) {
        const y = new Date(post.timestamp).getUTCFullYear()
        if (!Number.isNaN(y) && (!resolvedYear || y > resolvedYear)) {
          resolvedYear = y
        }
      }
    }
  }
  const copyrightYear = resolvedYear ?? new Date().getFullYear()
  const poweredBy = spec.getLocalizedMessage('poweredByBlogger', locale) ?? 'Powered by Blogger'
  return {
    title: spec.getWidgetDefaultTitle('Attribution', locale),
    copyright: `Copyright ${copyrightYear} ${blogTitle}. ${poweredBy}.`,
    bloggerUrl: 'https://www.blogger.com',
    imageAuthor: '',
  }
}
