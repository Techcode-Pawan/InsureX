import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F8FC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* 404 visual */}
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -4,
            background: 'linear-gradient(135deg, #168BFF, #20B8FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 16,
          }}
          aria-hidden="true"
        >
          404
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#172033', margin: '0 0 12px' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 32px', lineHeight: 1.7 }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to the InsureX dashboard.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#168BFF',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background 0.18s',
            }}
          >
            <Home size={16} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'white',
              color: '#172033',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.18s',
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        {/* InsureX branding */}
        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.5 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #168BFF, #20B8FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 900 }}>IX</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>InsureX</span>
        </div>
      </div>
    </div>
  )
}
