import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Globe, Phone, Mail, MapPin, Search } from 'lucide-react'
import { useApi } from '../../lib/useApi'
import { PageHead, DataState } from '../../components/panel'
import Input from '../../components/ui/Input'
import '../../styles/user.css'

// Active insurers on the platform with their public contact details and the plans they underwrite.
export default function CustomerCompanies() {
  const { data, loading, error, reload } = useApi('/catalog/companies')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return data || []
    return (data || []).filter((c) =>
      [c.name, c.shortName, c.category, c.city, ...(c.plans || []).map((p) => p.name)]
        .filter(Boolean).some((v) => v.toLowerCase().includes(s)))
  }, [data, q])

  return (
    <div className="px-page">
      <PageHead
        title="Our insurers"
        sub="The insurance companies that underwrite policies issued through InsureX. Your policy document always names the insurer."
        actions={<Link to="/user/plans" className="btn btn-secondary">Explore plans</Link>}
      />
      <div className="cp-stack">
        {(data?.length || 0) > 3 && (
          <div style={{ maxWidth: 380 }}>
            <Input id="ins-search" aria-label="Search insurers" prefixIcon={Search} placeholder="Search by name, city or plan" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
        <DataState loading={loading} error={error} onRetry={reload} empty={list.length === 0}
          emptyText={q ? 'No insurers match your search.' : 'No insurers are listed right now.'}>
          <div className="px-grid cols-2">
            {list.map((c) => (
              <article key={c.id} className="panel cp-insurer" aria-labelledby={`ins-${c.id}`}>
                <div className="cp-insurer-head">
                  <span className="cp-insurer-mark" aria-hidden="true"><Building2 size={20} /></span>
                  <div style={{ minWidth: 0 }}>
                    <h3 id={`ins-${c.id}`}>{c.name}</h3>
                    <div className="cp-item-meta">
                      {c.category}{c.rating ? ` · Rating ${c.rating}` : ''}
                    </div>
                  </div>
                </div>
                {c.description && <p className="cp-insurer-desc">{c.description}</p>}

                <div>
                  <div className="cp-insurer-label">Plans currently underwritten</div>
                  {c.plans.length ? (
                    <div className="cp-chip-row">
                      {c.plans.map((p) => (
                        <Link key={p.id} to={`/user/apply/${p.id}`} className="cp-chip" title={`Apply for ${p.name}`}>{p.name}</Link>
                      ))}
                    </div>
                  ) : (
                    <p className="cp-item-meta" style={{ margin: 0 }}>No active policies issued through InsureX yet. See all plans on <Link to="/user/plans" className="panel-link">Explore plans</Link>.</p>
                  )}
                </div>

                <ul className="cp-insurer-contact">
                  {(c.city || c.state) && <li><MapPin size={14} aria-hidden="true" /> {[c.city, c.state].filter(Boolean).join(', ')}</li>}
                  {c.phone && <li><Phone size={14} aria-hidden="true" /> <a href={`tel:${c.phone}`}>{c.phone}</a></li>}
                  {c.email && <li><Mail size={14} aria-hidden="true" /> <a href={`mailto:${c.email}`}>{c.email}</a></li>}
                  {c.website && (
                    <li><Globe size={14} aria-hidden="true" /> <a href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer">{c.website.replace(/^https?:\/\//, '')}</a></li>
                  )}
                </ul>
              </article>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  )
}
