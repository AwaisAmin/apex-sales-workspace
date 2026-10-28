import type { Messages } from './en'

// Typed against `Messages`: a missing or extra key is a compile error, not a blank label at runtime.
export const ar: Messages = {
  app: {
    name: 'أبكس للمبيعات',
    tagline: 'مساحة عمل مبيعات مدعومة بالذكاء الاصطناعي',
    skipToContent: 'انتقل إلى المحتوى الرئيسي',
  },
  nav: {
    leads: 'العملاء المحتملون',
    opportunities: 'الفرص',
  },
  language: {
    label: 'اللغة',
    switchTo: 'English',
  },
  common: {
    loading: 'جارٍ التحميل…',
    retry: 'إعادة المحاولة',
    cancel: 'إلغاء',
    empty: 'لا توجد بيانات بعد.',
    error: 'حدث خطأ ما.',
  },
}
