import { useState } from 'react'

const MENU = [
  { id: 'overview', label: 'Tableau de bord', icon: '📊' },
  { id: 'teachers', label: 'Enseignants', icon: '👨‍🏫' },
  { id: 'students', label: 'Élèves', icon: '👨‍🎓' },
  { id: 'parents', label: 'Parents', icon: '👪' },
  { id: 'classes', label: 'Classes', icon: '🏫' },
  { id: 'subjects', label: 'Matières', icon: '📚' },
  { id: 'assignments', label: 'Affectations', icon: '🔗' },
  { id: 'attendance', label: 'Présences', icon: '📋' },
  { id: 'grades', label: 'Notes & évaluations', icon: '📝' },
  { id: 'pedagogy', label: 'Pédagogie', icon: '📖' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'communication', label: 'Communication', icon: '📢' },
  { id: 'calendar', label: 'Calendrier', icon: '📅' },
  { id: 'payments', label: 'Scolarité', icon: '💰' },
  { id: 'settings', label: 'Paramètres', icon: '⚙️' },
]

const STATS = [
  { label: 'Enseignants', value: '0', icon: '👨‍🏫' },
  { label: 'Élèves', value: '0', icon: '👨‍🎓' },
  { label: 'Parents', value: '0', icon: '👪' },
  { label: 'Classes', value: '0', icon: '🏫' },
]

function AdminEcoleDashboard({ profile, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const schoolName =
    profile?.school_name ||
    'Mon établissement'

  const currentPage =
    MENU.find((item) => item.id === activeMenu)

  function handleMenuClick(id) {
    setActiveMenu(id)
    setMobileMenuOpen(false)
  }

  function handleLogout() {
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <div className="school-admin-layout">

      {/* OVERLAY MOBILE */}
      {mobileMenuOpen && (
        <div
          className="school-admin-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`school-admin-sidebar ${
          mobileMenuOpen ? 'open' : ''
        }`}
      >
        <div className="school-admin-brand">
          <div className="school-admin-logo">
            EC
          </div>

          <div>
            <strong>École Connectée</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="school-admin-school">
          <span>ÉTABLISSEMENT</span>
          <strong>{schoolName}</strong>
        </div>

        <nav className="school-admin-nav">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`school-admin-nav-item ${
                activeMenu === item.id ? 'active' : ''
              }`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="school-admin-nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="school-admin-sidebar-bottom">
          <button
            type="button"
            className="school-admin-logout"
            onClick={handleLogout}
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="school-admin-main">

        {/* TOPBAR */}
        <header className="school-admin-topbar">

          <button
            type="button"
            className="school-admin-mobile-button"
            onClick={() =>
              setMobileMenuOpen(true)
            }
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>

          <div className="school-admin-page-title">
            <span>Administration scolaire</span>
            <h1>
              {currentPage?.label || 'Tableau de bord'}
            </h1>
          </div>

          <div className="school-admin-user">
            <div className="school-admin-avatar">
              {(
                profile?.full_name ||
                'Admin'
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="school-admin-user-info">
              <strong>
                {profile?.full_name ||
                  'Administrateur'}
              </strong>
              <span>Admin École</span>
            </div>
          </div>
        </header>

        {/* PAGE */}
        <section className="school-admin-content">

          {activeMenu === 'overview' && (
            <>
              <div className="school-admin-welcome">
                <div>
                  <span>Bienvenue 👋</span>

                  <h2>
                    Bonjour{' '}
                    {profile?.full_name ||
                      'Administrateur'}
                  </h2>

                  <p>
                    Gérez votre établissement
                    depuis votre espace
                    d'administration.
                  </p>
                </div>

                <div className="school-admin-welcome-icon">
                  🏫
                </div>
              </div>

              {/* STATISTIQUES */}
              <div className="school-admin-stats">
                {STATS.map((stat) => (
                  <div
                    className="school-admin-stat-card"
                    key={stat.label}
                  >
                    <div className="school-admin-stat-icon">
                      {stat.icon}
                    </div>

                    <div>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTIONS RAPIDES */}
              <div className="school-admin-section-header">
                <div>
                  <span>GESTION</span>
                  <h2>Accès rapides</h2>
                </div>
              </div>

              <div className="school-admin-quick-grid">

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('teachers')
                  }
                >
                  <span>👨‍🏫</span>
                  <strong>Enseignants</strong>
                  <small>
                    Gérer les enseignants
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('students')
                  }
                >
                  <span>👨‍🎓</span>
                  <strong>Élèves</strong>
                  <small>
                    Gérer les élèves
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('classes')
                  }
                >
                  <span>🏫</span>
                  <strong>Classes</strong>
                  <small>
                    Organiser les classes
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('parents')
                  }
                >
                  <span>👪</span>
                  <strong>Parents</strong>
                  <small>
                    Gérer les parents
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('documents')
                  }
                >
                  <span>📄</span>
                  <strong>Documents</strong>
                  <small>
                    Documents scolaires
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMenuClick('attendance')
                  }
                >
                  <span>📋</span>
                  <strong>Présences</strong>
                  <small>
                    Suivre les absences
                  </small>
                </button>

              </div>

              {/* INFORMATIONS */}
              <div className="school-admin-bottom-grid">

                <div className="school-admin-panel">
                  <div className="school-admin-panel-header">
                    <div>
                      <span>ACTIVITÉ</span>
                      <h2>Activité récente</h2>
                    </div>

                    <span className="school-admin-status">
                      En attente
                    </span>
                  </div>

                  <div className="school-admin-empty">
                    <div>📭</div>
                    <h3>
                      Aucune activité
                    </h3>
                    <p>
                      Les activités de votre
                      établissement apparaîtront ici.
                    </p>
                  </div>
                </div>

                <div className="school-admin-panel">
                  <div className="school-admin-panel-header">
                    <div>
                      <span>ÉTABLISSEMENT</span>
                      <h2>Informations</h2>
                    </div>
                  </div>

                  <div className="school-admin-info-list">

                    <div>
                      <span>École</span>
                      <strong>
                        {schoolName}
                      </strong>
                    </div>

                    <div>
                      <span>Administrateur</span>
                      <strong>
                        {profile?.full_name ||
                          'Non renseigné'}
                      </strong>
                    </div>

                    <div>
                      <span>Rôle</span>
                      <strong>
                        Admin École
                      </strong>
                    </div>

                  </div>
                </div>

              </div>
            </>
          )}

          {activeMenu !== 'overview' && (
            <div className="school-admin-placeholder">
              <div>
                {
                  currentPage?.icon ||
                  '📌'
                }
              </div>

              <h2>
                {currentPage?.label}
              </h2>

              <p>
                Cette rubrique sera développée
                progressivement.
              </p>

              <button
                type="button"
                onClick={() =>
                  handleMenuClick('overview')
                }
              >
                ← Retour au tableau de bord
              </button>
            </div>
          )}

        </section>
      </main>
    </div>
  )
}

export default AdminEcoleDashboard