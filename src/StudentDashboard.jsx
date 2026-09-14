import { useState } from 'react'

function StudentDashboard({
  profile,
  session,
  onLogout,
}) {
  const [activePage, setActivePage] = useState('home')

  const menuItems = [
    {
      id: 'home',
      label: 'Accueil',
      icon: '🏠',
    },
    {
      id: 'courses',
      label: 'Cours',
      icon: '📚',
    },
    {
      id: 'exercises',
      label: 'Exercices',
      icon: '✏️',
    },
    {
      id: 'assessments',
      label: 'Évaluations',
      icon: '📝',
    },
    {
      id: 'grades',
      label: 'Mes notes',
      icon: '📊',
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: '🕘',
    },
    {
      id: 'bulletins',
      label: 'Bulletins',
      icon: '📄',
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: '💬',
    },
    {
      id: 'school-card',
      label: 'Ma carte scolaire',
      icon: '🎫',
    },
  ]

  function renderPage() {
    switch (activePage) {
      case 'home':
        return <HomePage profile={profile} />

      case 'courses':
        return <CoursesPage />

      case 'exercises':
        return <ExercisesPage />

      case 'assessments':
        return <AssessmentsPage />

      case 'grades':
        return <GradesPage />

      case 'attendance':
        return <AttendancePage />

      case 'bulletins':
        return <BulletinsPage />

      case 'communication':
        return <CommunicationPage />

      case 'school-card':
        return (
          <SchoolCardPage
            profile={profile}
            session={session}
          />
        )

      default:
        return <HomePage profile={profile} />
    }
  }

  const currentItem =
    menuItems.find(
      (item) => item.id === activePage
    ) || menuItems[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        color: '#172033',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* =========================
          SIDEBAR
      ========================== */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '260px',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          padding: '20px 14px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 10px 24px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            EC
          </div>

          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '16px',
              }}
            >
              École Connectée
            </strong>

            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              Espace Élève
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav>
          {menuItems.map((item) => {
            const active =
              activePage === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setActivePage(item.id)
                }
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: active
                    ? '#eaf2ff'
                    : 'transparent',
                  color: active
                    ? '#2563eb'
                    : '#334155',
                  fontWeight: active
                    ? 700
                    : 500,
                  fontSize: '14px',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    textAlign: 'center',
                    fontSize: '18px',
                  }}
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Déconnexion */}
        <div
          style={{
            borderTop:
              '1px solid #e5e7eb',
            marginTop: '20px',
            paddingTop: '20px',
          }}
        >
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: '100%',
              border: '1px solid #fecaca',
              background: '#fff7f7',
              color: '#dc2626',
              borderRadius: '10px',
              padding: '11px 14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </aside>

      {/* =========================
          CONTENU PRINCIPAL
      ========================== */}
      <main
        style={{
          marginLeft: '260px',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <header
          style={{
            background: '#ffffff',
            borderBottom:
              '1px solid #e5e7eb',
            padding: '18px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                color: '#64748b',
                marginBottom: '4px',
              }}
            >
              Espace Élève
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '22px',
              }}
            >
              {currentItem.icon}{' '}
              {currentItem.label}
            </h1>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#eaf2ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              {getInitials(
                profile?.full_name
              )}
            </div>

            <div>
              <strong
                style={{
                  display: 'block',
                  fontSize: '14px',
                }}
              >
                {profile?.full_name ||
                  'Élève'}
              </strong>

              <span
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                Élève
              </span>
            </div>
          </div>
        </header>

        {/* Page */}
        <section
          style={{
            padding: '28px',
          }}
        >
          {renderPage()}
        </section>
      </main>
    </div>
  )
}

/* =====================================================
   ACCUEIL
===================================================== */

function HomePage({ profile }) {
  return (
    <div>
      <PageTitle
        title={`Bonjour ${
          profile?.full_name || 'Élève'
        } 👋`}
        description="Bienvenue dans ton espace scolaire."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          marginTop: '24px',
        }}
      >
        <DashboardCard
          icon="📚"
          title="Mes cours"
          text="Retrouve tes cours et documents scolaires."
        />

        <DashboardCard
          icon="✏️"
          title="Mes exercices"
          text="Consulte les exercices qui te sont proposés."
        />

        <DashboardCard
          icon="📊"
          title="Mes notes"
          text="Consulte tes résultats et tes moyennes."
        />

        <DashboardCard
          icon="🕘"
          title="Mes présences"
          text="Consulte ton historique de présence."
        />
      </div>

      <div
        style={{
          marginTop: '24px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3
          style={{
            marginTop: 0,
          }}
        >
          📌 Informations
        </h3>

        <p
          style={{
            color: '#64748b',
            marginBottom: 0,
          }}
        >
          Les différentes fonctionnalités de
          ton espace seront connectées
          progressivement aux données de ton
          établissement.
        </p>
      </div>
    </div>
  )
}

/* =====================================================
   COURS
===================================================== */

function CoursesPage() {
  return (
    <PagePlaceholder
      icon="📚"
      title="Cours"
      description="Tes cours, leçons, documents, vidéos et liens seront organisés ici par matière."
    />
  )
}

/* =====================================================
   EXERCICES
===================================================== */

function ExercisesPage() {
  return (
    <PagePlaceholder
      icon="✏️"
      title="Exercices"
      description="Les exercices proposés par tes professeurs seront disponibles ici."
    />
  )
}

/* =====================================================
   ÉVALUATIONS
===================================================== */

function AssessmentsPage() {
  return (
    <PagePlaceholder
      icon="📝"
      title="Évaluations"
      description="Tes interrogations, devoirs et évaluations seront regroupés ici."
    />
  )
}

/* =====================================================
   NOTES
===================================================== */

function GradesPage() {
  return (
    <PagePlaceholder
      icon="📊"
      title="Mes notes"
      description="Tes notes, moyennes et résultats seront affichés ici."
    />
  )
}

/* =====================================================
   PRÉSENCES
===================================================== */

function AttendancePage() {
  return (
    <PagePlaceholder
      icon="🕘"
      title="Présences"
      description="Ton historique de présences, absences et retards sera disponible ici."
    />
  )
}

/* =====================================================
   BULLETINS
===================================================== */

function BulletinsPage() {
  return (
    <PagePlaceholder
      icon="📄"
      title="Bulletins"
      description="Tes bulletins scolaires seront organisés ici par trimestre."
    />
  )
}

/* =====================================================
   COMMUNICATION
===================================================== */

function CommunicationPage() {
  return (
    <PagePlaceholder
      icon="💬"
      title="Communication"
      description="Cette section permettra de communiquer avec tes professeurs."
    />
  )
}

/* =====================================================
   CARTE SCOLAIRE
===================================================== */

function SchoolCardPage({
  profile,
  session,
}) {
  return (
    <div>
      <PageTitle
        title="🎫 Ma carte scolaire"
        description="Ta carte scolaire numérique sera disponible ici."
      />

      <div
        style={{
          maxWidth: '500px',
          marginTop: '24px',
          background:
            'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '24px',
          boxShadow:
            '0 12px 30px rgba(37, 99, 235, 0.20)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
          }}
        >
          <strong>
            ÉCOLE CONNECTÉE
          </strong>

          <span
            style={{
              fontSize: '24px',
            }}
          >
            🎓
          </span>
        </div>

        <div
          style={{
            marginTop: '30px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              opacity: 0.8,
            }}
          >
            ÉLÈVE
          </div>

          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              marginTop: '4px',
            }}
          >
            {profile?.full_name ||
              'Nom de l’élève'}
          </div>
        </div>

        <div
          style={{
            marginTop: '18px',
            fontSize: '13px',
            opacity: 0.9,
          }}
        >
          Identifiant :
          {' '}
          {profile?.username ||
            session?.user?.email ||
            '—'}
        </div>

        <div
          style={{
            marginTop: '24px',
            background: '#ffffff',
            color: '#172033',
            width: '90px',
            height: '90px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
          }}
        >
          QR
        </div>

        <p
          style={{
            marginBottom: 0,
            fontSize: '12px',
            opacity: 0.8,
          }}
        >
          Le QR code scolaire sera connecté
          au système de présence et
          d'entrée/sortie.
        </p>
      </div>
    </div>
  )
}

/* =====================================================
   COMPOSANTS VISUELS
===================================================== */

function PageTitle({
  title,
  description,
}) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: '26px',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          marginTop: '8px',
          marginBottom: 0,
          color: '#64748b',
        }}
      >
        {description}
      </p>
    </div>
  )
}

function PagePlaceholder({
  icon,
  title,
  description,
}) {
  return (
    <div>
      <PageTitle
        title={`${icon} ${title}`}
        description={description}
      />

      <div
        style={{
          marginTop: '24px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '12px',
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: '20px',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            maxWidth: '600px',
            margin:
              '10px auto 0',
            color: '#64748b',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

function DashboardCard({
  icon,
  title,
  text,
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '20px',
      }}
    >
      <div
        style={{
          fontSize: '30px',
          marginBottom: '12px',
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: '17px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: '#64748b',
          lineHeight: 1.5,
          marginBottom: 0,
        }}
      >
        {text}
      </p>
    </div>
  )
}

function getInitials(name) {
  if (!name) return 'E'

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase()
}

export default StudentDashboard
