import { describe, expect, it } from 'vitest'
import { createSeed } from './seed'
import { createDb, DbError } from './db'

/** Backend business rules the UI relies on (the server, not the UI, is the authority). */
describe('mock backend rules', () => {
  const fresh = () => createDb()
  const contactedLeadWithSuggestion = (db: ReturnType<typeof createDb>) => {
    const lead = createSeed().leads.find((l) => l.status === 'contacted' && db.suggestionsFor('lead', l.id).length)!
    return { lead, suggestion: db.suggestionsFor('lead', lead.id)[0]! }
  }

  it('seed data is deterministic', () => {
    expect(JSON.stringify(createSeed())).toBe(JSON.stringify(createSeed()))
  })

  it('rejects a disallowed status transition with 422 and field errors', () => {
    const db = fresh()
    const lead = db.listLeads({ page: 1, pageSize: 100, sort: 'createdAt', dir: 'desc', status: ['qualified'] }, 'en')
      .items[0]!
    const attempt = () => db.updateLeadStatus(lead.id, { status: 'new', version: lead.version }, 'u-rep')
    expect(attempt).toThrow(DbError)
    try {
      attempt()
    } catch (e) {
      expect((e as DbError).status).toBe(422)
      expect((e as DbError).fieldErrors?.status).toBeDefined()
    }
  })

  it('rejects a stale version with 409 (optimistic concurrency)', () => {
    const db = fresh()
    const { lead } = contactedLeadWithSuggestion(db)
    db.simulateExternalEdit('lead', lead.id)
    expect(() => db.updateLeadStatus(lead.id, { status: 'qualified', version: lead.version }, 'u-rep')).toThrow(
      expect.objectContaining({ status: 409 }),
    )
  })

  it('applying a suggestion consumes it and writes an audit entry naming the approver', () => {
    const db = fresh()
    const { lead, suggestion } = contactedLeadWithSuggestion(db)
    db.updateLeadStatus(lead.id, { status: 'qualified', version: lead.version, suggestionId: suggestion.id }, 'u-mgr')

    expect(db.suggestionsFor('lead', lead.id)).toHaveLength(0)
    expect(db.audit()[0]).toMatchObject({
      action: 'suggestion_applied',
      suggestionId: suggestion.id,
      actorId: 'u-mgr',
      targetId: lead.id,
    })
  })

  it('refuses a suggestion once the record changed after it was generated', () => {
    const db = fresh()
    const { lead, suggestion } = contactedLeadWithSuggestion(db)
    db.simulateExternalEdit('lead', lead.id)
    const current = db.getLead(lead.id)
    expect(() =>
      db.updateLeadStatus(
        lead.id,
        { status: 'qualified', version: current.version, suggestionId: suggestion.id },
        'u-rep',
      ),
    ).toThrow(expect.objectContaining({ status: 409 }))
    expect(current.status).toBe('contacted') // nothing applied
  })

  it('cites only supporting activities as evidence for lead suggestions', () => {
    const seed = createSeed()
    for (const s of seed.suggestions.filter((x) => x.targetType === 'lead')) {
      for (const e of s.evidence) {
        expect(e.excerpt.en).not.toMatch(/^No reply|^Competitor/)
      }
    }
  })
})
