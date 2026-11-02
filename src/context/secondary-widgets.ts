import type { SpecCatalog } from '../catalogs/index.js'
import type { BloggerPostData } from './types.js'

export function buildPopularPostsData(
  posts: readonly BloggerPostData[],
  spec: SpecCatalog,
  locale = 'en',
  limit = 5,
): Record<string, any> {
  const selectedPosts = posts.slice(0, limit).map(p => ({
    ...p,
    postDisplay: {
      showSnippet: true,
      showTitle: true,
      showAuthor: true,
    },
  }))

  return {
    title: spec.getWidgetDefaultTitle('PopularPosts', locale),
    postDisplay: {
      showSnippet: true,
      showTitle: true,
      showAuthor: true,
    },
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
    contactFormNameMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormNameMsg', locale) || 'Name',
    contactFormEmailMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormEmailMsg', locale) || 'Email',
    contactFormMessageMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormMessageMsg', locale) || 'Message',
    contactFormSendMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormSendMsg', locale) || 'Send',
    contactFormMessageSendingMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormMessageSendingMsg', locale) || 'Sending...',
    contactFormMessageSentMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormMessageSentMsg', locale) || 'Your message has been sent.',
    contactFormMessageNotSentMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormMessageNotSentMsg', locale) || 'Could not send message. Please try again later.',
    contactFormEmptyMessageMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormEmptyMessageMsg', locale) || 'Message field cannot be empty.',
    contactFormInvalidEmailMsg: spec.getLocalizedMessage('widgets.ContactForm.contactFormInvalidEmailMsg', locale) || 'A valid email is required.',
  }
}

export function buildAttributionData(
  blogTitle: string,
  spec: SpecCatalog,
  locale = 'en',
): Record<string, any> {
  const currentYear = new Date().getFullYear()
  return {
    title: spec.getWidgetDefaultTitle('Attribution', locale),
    copyright: `Copyright ${currentYear} ${blogTitle}. Powered by Blogger.`,
    bloggerUrl: 'https://www.blogger.com',
    imageAuthor: '',
  }
}
