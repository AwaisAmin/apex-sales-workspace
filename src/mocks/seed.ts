import type {
  Activity,
  AiSuggestion,
  City,
  Industry,
  Lead,
  LeadSource,
  LeadStatus,
  LocalizedText,
  Opportunity,
  OpportunityStage,
  User,
} from '@/api/schemas'

/*
 * Synthetic data only — no real people or companies. A seeded PRNG makes the
 * dataset identical on every run, so screenshots, E2E tests and the live demo
 * all see the same records.
 */

/** mulberry32 — tiny deterministic PRNG. */
function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = ReturnType<typeof createRng>

const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T
}

/** Fixed "now" so relative dates in the dataset don't shift between runs. */
export const SEED_NOW = new Date('2026-10-28T09:00:00Z')
const DAY = 24 * 3600 * 1000
const daysAgo = (n: number) => new Date(SEED_NOW.getTime() - n * DAY).toISOString()
const daysAhead = (n: number) => new Date(SEED_NOW.getTime() + n * DAY).toISOString()

const FIRST_NAMES: LocalizedText[] = [
  { en: 'Abdullah', ar: 'عبدالله' },
  { en: 'Fahad', ar: 'فهد' },
  { en: 'Noura', ar: 'نورة' },
  { en: 'Sara', ar: 'سارة' },
  { en: 'Khalid', ar: 'خالد' },
  { en: 'Reem', ar: 'ريم' },
  { en: 'Turki', ar: 'تركي' },
  { en: 'Lama', ar: 'لمى' },
  { en: 'Majed', ar: 'ماجد' },
  { en: 'Hessa', ar: 'حصة' },
]
const LAST_NAMES: LocalizedText[] = [
  { en: 'Al-Harbi', ar: 'الحربي' },
  { en: 'Al-Qahtani', ar: 'القحطاني' },
  { en: 'Al-Otaibi', ar: 'العتيبي' },
  { en: 'Al-Ghamdi', ar: 'الغامدي' },
  { en: 'Al-Zahrani', ar: 'الزهراني' },
  { en: 'Al-Shehri', ar: 'الشهري' },
  { en: 'Al-Dosari', ar: 'الدوسري' },
  { en: 'Al-Mutairi', ar: 'المطيري' },
]
// Fictional company name parts — combined so no output matches a real business.
const COMPANY_PREFIX: LocalizedText[] = [
  { en: 'Najd', ar: 'نجد' },
  { en: 'Rawabi', ar: 'روابي' },
  { en: 'Sahel', ar: 'ساحل' },
  { en: 'Wahat', ar: 'واحات' },
  { en: 'Tuwaiq', ar: 'طويق' },
  { en: 'Areen', ar: 'عرين' },
  { en: 'Dana', ar: 'دانة' },
  { en: 'Masar', ar: 'مسار' },
]
const COMPANY_SUFFIX: Record<Industry, LocalizedText> = {
  retail: { en: 'Trading Co.', ar: 'للتجارة' },
  construction: { en: 'Contracting', ar: 'للمقاولات' },
  logistics: { en: 'Logistics', ar: 'للخدمات اللوجستية' },
  hospitality: { en: 'Hospitality', ar: 'للضيافة' },
  healthcare: { en: 'Medical Services', ar: 'للخدمات الطبية' },
  manufacturing: { en: 'Industries', ar: 'للصناعات' },
  technology: { en: 'Tech Solutions', ar: 'للحلول التقنية' },
}

const CITIES: City[] = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar']
const INDUSTRIES = Object.keys(COMPANY_SUFFIX) as Industry[]
const SOURCES: LeadSource[] = ['website', 'referral', 'event', 'linkedin', 'cold_call']
const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified']
const STAGES: OpportunityStage[] = ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  discovery: 0.2,
  proposal: 0.45,
  negotiation: 0.7,
  closed_won: 1,
  closed_lost: 0,
}

export const USERS: User[] = [
  { id: 'u-rep', name: { en: 'Yousef Al-Amri', ar: 'يوسف العمري' }, role: 'rep' },
  { id: 'u-mgr', name: { en: 'Mona Al-Saud', ar: 'منى السعود' }, role: 'manager' },
  { id: 'u-view', name: { en: 'Read-only Auditor', ar: 'مدقق (قراءة فقط)' }, role: 'viewer' },
]

const ACTIVITY_TEMPLATES: { type: Activity['type']; summary: LocalizedText }[] = [
  {
    type: 'meeting',
    summary: {
      en: 'Demo held; decision-maker confirmed budget for Q1.',
      ar: 'تم تقديم العرض؛ أكد صاحب القرار توفر الميزانية للربع الأول.',
    },
  },
  {
    type: 'email',
    summary: {
      en: 'Requested a formal quotation with VAT breakdown.',
      ar: 'طلب عرض سعر رسمي مع تفصيل ضريبة القيمة المضافة.',
    },
  },
  {
    type: 'call',
    summary: {
      en: 'Asked about Arabic-language onboarding and ZATCA e-invoicing support.',
      ar: 'استفسر عن التدريب باللغة العربية ودعم الفوترة الإلكترونية من زاتكا.',
    },
  },
  {
    type: 'note',
    summary: {
      en: 'Competitor evaluation in progress; price is the main concern.',
      ar: 'يجري تقييم منافس؛ السعر هو الاهتمام الرئيسي.',
    },
  },
  {
    type: 'email',
    summary: {
      en: 'No reply to last two follow-ups.',
      ar: 'لا يوجد رد على آخر متابعتين.',
    },
  },
]

export interface Seed {
  users: User[]
  leads: Lead[]
  opportunities: Opportunity[]
  activities: Activity[]
  suggestions: AiSuggestion[]
}

export function createSeed(seed = 20261029, leadCount = 120): Seed {
  const rng = createRng(seed)
  const leads: Lead[] = []
  const opportunities: Opportunity[] = []
  const activities: Activity[] = []
  const suggestions: AiSuggestion[] = []

  for (let i = 1; i <= leadCount; i++) {
    const id = `lead-${String(i).padStart(3, '0')}`
    const first = pick(rng, FIRST_NAMES)
    const last = pick(rng, LAST_NAMES)
    const industry = pick(rng, INDUSTRIES)
    const prefix = pick(rng, COMPANY_PREFIX)
    const suffix = COMPANY_SUFFIX[industry]
    const status = pick(rng, STATUSES)
    const createdDaysAgo = int(rng, 1, 180)
    const contacted = status !== 'new'

    leads.push({
      id,
      contactName: { en: `${first.en} ${last.en}`, ar: `${first.ar} ${last.ar}` },
      company: { en: `${prefix.en} ${suffix.en}`, ar: `${prefix.ar} ${suffix.ar}` },
      // example.com is reserved for documentation (RFC 2606) — never a real inbox.
      email: `${first.en.toLowerCase()}.${i}@example.com`,
      phone: `+966 5${int(rng, 0, 9)} ${int(rng, 100, 999)} ${int(rng, 1000, 9999)}`,
      city: pick(rng, CITIES),
      industry,
      source: pick(rng, SOURCES),
      status,
      score: status === 'unqualified' ? int(rng, 5, 40) : int(rng, 30, 98),
      estimatedValue: int(rng, 2, 120) * 5000,
      ownerId: rng() < 0.7 ? 'u-rep' : 'u-mgr',
      createdAt: daysAgo(createdDaysAgo),
      lastContactedAt: contacted ? daysAgo(int(rng, 0, Math.min(createdDaysAgo, 45))) : null,
      version: 1,
    })

    // Activities: the grounding material for AI suggestions.
    const leadActivities: Activity[] = []
    if (contacted) {
      const n = int(rng, 1, 3)
      for (let a = 0; a < n; a++) {
        const tpl = pick(rng, ACTIVITY_TEMPLATES)
        leadActivities.push({
          id: `act-${id}-${a + 1}`,
          leadId: id,
          type: tpl.type,
          summary: tpl.summary,
          occurredAt: daysAgo(int(rng, 0, 30)),
        })
      }
      activities.push(...leadActivities)
    }

    // Qualified leads become opportunities.
    if (status === 'qualified') {
      const stage = pick(rng, STAGES)
      const oppId = `opp-${String(i).padStart(3, '0')}`
      const asksForQuote = leadActivities.filter((a) => a.summary.en.includes('quotation'))
      if ((stage === 'discovery' || stage === 'proposal') && asksForQuote.length > 0) {
        suggestions.push({
          id: `sug-${oppId}`,
          targetType: 'opportunity',
          targetId: oppId,
          targetVersion: 1,
          rationale: {
            en: 'The customer asked for a formal quotation; sending it is the logical next step.',
            ar: 'طلب العميل عرض سعر رسمي؛ إرساله هو الخطوة التالية المنطقية.',
          },
          confidence: 0.74,
          limitations: [
            {
              en: 'Pricing and discount approval are outside the assistant’s knowledge.',
              ar: 'التسعير واعتماد الخصومات خارج نطاق معرفة المساعد.',
            },
          ],
          evidence: asksForQuote.map((a) => ({ activityId: a.id, excerpt: a.summary })),
          change: {
            field: 'nextStep',
            from: null,
            to: {
              en: 'Send formal quotation with 15% VAT breakdown',
              ar: 'إرسال عرض سعر رسمي مع تفصيل ضريبة القيمة المضافة ١٥٪',
            },
          },
          model: 'apex-sales-assist-mock-v1',
          generatedAt: daysAgo(0),
        })
      }
      opportunities.push({
        id: oppId,
        leadId: id,
        title: {
          en: `${prefix.en} — ${pick(rng, ['Annual licence', 'Pilot rollout', 'Branch expansion'])}`,
          ar: `${prefix.ar} — ${pick(rng, ['ترخيص سنوي', 'تجربة أولية', 'توسعة الفروع'])}`,
        },
        stage,
        amount: int(rng, 4, 200) * 5000,
        probability: STAGE_PROBABILITY[stage],
        expectedCloseDate: stage.startsWith('closed') ? daysAgo(int(rng, 1, 60)) : daysAhead(int(rng, 7, 120)),
        nextStep: null,
        ownerId: rng() < 0.7 ? 'u-rep' : 'u-mgr',
        updatedAt: daysAgo(int(rng, 0, 20)),
        version: 1,
      })
    }

    // Suggestion: "contacted" lead with strong buying signals → propose qualifying it.
    const buyingSignal = leadActivities.find((a) => a.type === 'meeting' || a.summary.en.includes('quotation'))
    if (status === 'contacted' && buyingSignal) {
      const noReply = leadActivities.some((a) => a.summary.en.startsWith('No reply'))
      suggestions.push({
        id: `sug-${id}`,
        targetType: 'lead',
        targetId: id,
        targetVersion: 1,
        rationale: {
          en: 'Recent activity shows budget confirmation or a quotation request, which matches the qualification criteria.',
          ar: 'يُظهر النشاط الأخير تأكيد الميزانية أو طلب عرض سعر، وهو ما يطابق معايير التأهيل.',
        },
        // Conflicting signals lower confidence instead of being hidden.
        confidence: noReply ? 0.48 : 0.82,
        limitations: [
          {
            en: 'Based only on logged activities; offline conversations are not visible to the assistant.',
            ar: 'مبني فقط على الأنشطة المسجلة؛ المحادثات غير المسجلة غير مرئية للمساعد.',
          },
          ...(noReply
            ? [
                {
                  en: 'Conflicting signal: recent follow-ups received no reply.',
                  ar: 'إشارة متعارضة: لم يتم الرد على المتابعات الأخيرة.',
                },
              ]
            : []),
        ],
        evidence: leadActivities.map((a) => ({ activityId: a.id, excerpt: a.summary })),
        change: { field: 'leadStatus', from: 'contacted', to: 'qualified' },
        model: 'apex-sales-assist-mock-v1',
        generatedAt: daysAgo(0),
      })
    }
  }

  return { users: USERS, leads, opportunities, activities, suggestions }
}
