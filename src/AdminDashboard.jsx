import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const EMPTY_STATS = {
  schools: 0,
  teachers: 0,
  students: 0,
  parents: 0,
  admins: 0,
  classes: 0,
  subjects: 0,
  documents: 0,
}

const MENU = [
  { id: 'overview', label: 'Tableau de bord', icon: '📊' },
  { id: 'schools', label: 'Écoles', icon: '🏫' },
  { id: 'teachers', label: 'Enseignants', icon: '👨‍🏫' },
  { id: 'students', label: 'Élèves', icon: '👨‍🎓' },
  { id: 'parents', label: 'Parents', icon: '👪' },
  { id: 'admins', label: 'Administrateurs', icon: '🛡️' },
  { id: 'classes', label: 'Classes', icon: '📚' },
  { id: 'subjects', label: 'Matières', icon: '📖' },
  { id: 'documents', label: 'Documents', icon: '📄' },
]

function StatCard({ icon, label, value, onClick }) {
  return (
    <button className="admin-stat-card" onClick={onClick} type="button">
      <div className="admin-stat-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </button>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="admin-empty">
      <div>📭</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function AdminDashboard({ profile, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [schools, setSchools] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [admins, setAdmins] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  const isSuperAdmin = profile?.role === 'super_admin'

  async function countTable(table) {
    const { count, error } = await supabase
      .from(table)
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (error) {
      throw error
    }

    return count || 0
  }

  async function loadStats() {
    const [
      schoolsCount,
      teachersCount,
      studentsCount,
      parentsCount,
      classesCount,
      subjectsCount,
    ] = await Promise.all([
      countTable('schools'),
      countTable('teachers'),
      countTable('students'),
      countTable('parents'),
      countTable('classes'),
      countTable('subjects'),
    ])

    const { count: adminsCount, error: adminsError } = await supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .in('role', [
        'admin',
        'school_admin',
        'super_admin',
      ])

    if (adminsError) {
      throw adminsError
    }

    setStats({
      schools: schoolsCount,
      teachers: teachersCount,
      students: studentsCount,
      parents: parentsCount,
      admins: adminsCount || 0,
      classes: classesCount,
      subjects: subjectsCount,
      documents: 0,
    })
  }

  async function loadLists() {
    const results = await Promise.allSettled([
      supabase
        .from('schools')
        .select(
          'id, name, address, city, phone, email, created_at'
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('teachers')
        .select('id, school_id, active')
        .order('id')
        .limit(100),

      supabase
        .from('students')
        .select(
          'id, school_id, class_id, first_name, last_name, student_code, active, created_at'
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('parents')
        .select(
          'id, school_id, profile_id, active'
        )
        .order('id')
        .limit(100),

      supabase
        .from('profiles')
        .select(
          'id, full_name, phone, role, school_id, active'
        )
        .in('role', [
          'admin',
          'school_admin',
          'super_admin',
        ])
        .order('full_name')
        .limit(100),

      supabase
        .from('classes')
        .select(
          'id, school_id, name, level, created_at'
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('subjects')
        .select('id, name')
        .order('name')
        .limit(100),
    ])

    const values = results.map((result) => {
      if (
        result.status === 'fulfilled' &&
        !result.value.error
      ) {
        return result.value.data || []
      }

      return []
    })

    setSchools(values[0])
    setTeachers(values[1])
    setStudents(values[2])
    setParents(values[3])
    setAdmins(values[4])
    setClasses(values[5])
    setSubjects(values[6])
  }

  async function loadDashboard(showRefresh = false) {
    setError('')

    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      await Promise.all([
        loadStats(),
        loadLists(),
      ])
    } catch (err) {
      console.error(
        'Erreur tableau de bord administrateur :',
        err
      )

      setError(
        err?.message ||
          'Impossible de charger les données administrateur.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const schoolNameById = useMemo(() => {
    return Object.fromEntries(
      schools.map((school) => [
        school.id,
        school.name,
      ])
    )
  }, [schools])

  const classNameById = useMemo(() => {
    return Object.fromEntries(
      classes.map((item) => [
        item.id,
        item.name,
      ])
    )
  }, [classes])

  function renderOverview() {
    return (
      <>
        <div className="admin-stats-grid">
          <StatCard
            icon="🏫"
            label="Écoles"
            value={stats.schools}
            onClick={() =>
              setActiveMenu('schools')
            }
          />

          <StatCard
            icon="👨‍🏫"
            label="Enseignants"
            value={stats.teachers}
            onClick={() =>
              setActiveMenu('teachers')
            }
          />

          <StatCard
            icon="👨‍🎓"
            label="Élèves"
            value={stats.students}
            onClick={() =>
              setActiveMenu('students')
            }
          />

          <StatCard
            icon="👪"
            label="Parents"
            value={stats.parents}
            onClick={() =>
              setActiveMenu('parents')
            }
          />

          <StatCard
            icon="🛡️"
            label="Administrateurs"
            value={stats.admins}
            onClick={() =>
              setActiveMenu('admins')
            }
          />

          <StatCard
            icon="📚"
            label="Classes"
            value={stats.classes}
            onClick={() =>
              setActiveMenu('classes')
            }
          />

          <StatCard
            icon="📖"
            label="Matières"
            value={stats.subjects}
            onClick={() =>
              setActiveMenu('subjects')
            }
          />

          <StatCard
            icon="📄"
            label="Documents"
            value={stats.documents}
            onClick={() =>
              setActiveMenu('documents')
            }
          />
        </div>

        <div className="admin-panel-grid">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>
                  Résumé de la plateforme
                </h3>

                <p>
                  Vue générale des données actuellement
                  disponibles.
                </p>
              </div>
            </div>

            <div className="admin-summary-list">
              <div>
                <span>
                  Écoles enregistrées
                </span>

                <strong>
                  {stats.schools}
                </strong>
              </div>

              <div>
                <span>
                  Personnel enseignant
                </span>

                <strong>
                  {stats.teachers}
                </strong>
              </div>

              <div>
                <span>
                  Élèves enregistrés
                </span>

                <strong>
                  {stats.students}
                </strong>
              </div>

              <div>
                <span>Parents</span>

                <strong>
                  {stats.parents}
                </strong>
              </div>

              <div>
                <span>Documents</span>

                <strong>
                  {stats.documents}
                </strong>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Accès rapides</h3>

                <p>
                  Ouvrir directement une section.
                </p>
              </div>
            </div>

            <div className="admin-quick-grid">
              <button
                type="button"
                onClick={() =>
                  setActiveMenu('schools')
                }
              >
                🏫 Gérer les écoles
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu('teachers')
                }
              >
                👨‍🏫 Gérer les enseignants
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu('students')
                }
              >
                👨‍🎓 Gérer les élèves
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu('admins')
                }
              >
                🛡️ Gérer les administrateurs
              </button>
            </div>
          </section>
        </div>
      </>
    )
  }

  function renderSchools() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>🏫 Écoles</h3>

            <p>
              {schools.length} école(s) affichée(s).
            </p>
          </div>
        </div>

        {schools.length === 0 ? (
          <EmptyState
            title="Aucune école"
            text="Aucune école n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>École</th>
                  <th>Ville</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                </tr>
              </thead>

              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td>
                      <strong>
                        {school.name ||
                          'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      {school.city || '—'}
                    </td>

                    <td>
                      {school.phone || '—'}
                    </td>

                    <td>
                      {school.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderTeachers() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>👨‍🏫 Enseignants</h3>

            <p>
              {teachers.length} enseignant(s)
              affiché(s).
            </p>
          </div>
        </div>

        {teachers.length === 0 ? (
          <EmptyState
            title="Aucun enseignant"
            text="Aucun enseignant n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <code>
                        {teacher.id}
                      </code>
                    </td>

                    <td>
                      {schoolNameById[
                        teacher.school_id
                      ] || '—'}
                    </td>

                    <td>
                      <span
                        className={
                          teacher.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {teacher.active
                          ? 'Actif'
                          : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderStudents() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>👨‍🎓 Élèves</h3>

            <p>
              {students.length} élève(s)
              affiché(s).
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <EmptyState
            title="Aucun élève"
            text="Aucun élève n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Code</th>
                  <th>Classe</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>
                        {`${student.first_name || ''} ${
                          student.last_name || ''
                        }`.trim() ||
                          'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      {student.student_code ||
                        '—'}
                    </td>

                    <td>
                      {classNameById[
                        student.class_id
                      ] || '—'}
                    </td>

                    <td>
                      {schoolNameById[
                        student.school_id
                      ] || '—'}
                    </td>

                    <td>
                      <span
                        className={
                          student.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {student.active
                          ? 'Actif'
                          : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderParents() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>👪 Parents</h3>

            <p>
              {parents.length} parent(s)
              affiché(s).
            </p>
          </div>
        </div>

        {parents.length === 0 ? (
          <EmptyState
            title="Aucun parent"
            text="Aucun parent n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>École</th>
                  <th>Profil</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {parents.map((parent) => (
                  <tr key={parent.id}>
                    <td>
                      <code>
                        {parent.id}
                      </code>
                    </td>

                    <td>
                      {schoolNameById[
                        parent.school_id
                      ] || '—'}
                    </td>

                    <td>
                      <code>
                        {parent.profile_id ||
                          '—'}
                      </code>
                    </td>

                    <td>
                      <span
                        className={
                          parent.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {parent.active
                          ? 'Actif'
                          : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderAdmins() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>🛡️ Administrateurs</h3>

            <p>
              {admins.length} compte(s)
              administrateur(s) affiché(s).
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <EmptyState
            title="Aucun administrateur"
            text="Aucun compte administrateur n'est disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <strong>
                        {admin.full_name ||
                          'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      <span className="role-badge">
                        {admin.role ===
                        'super_admin'
                          ? 'Super administrateur'
                          : 'Administrateur'}
                      </span>
                    </td>

                    <td>
                      {admin.school_id
                        ? schoolNameById[
                            admin.school_id
                          ] ||
                          admin.school_id
                        : 'Toutes les écoles'}
                    </td>

                    <td>
                      <span
                        className={
                          admin.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {admin.active
                          ? 'Actif'
                          : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderClasses() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>📚 Classes</h3>

            <p>
              {classes.length} classe(s)
              affichée(s).
            </p>
          </div>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            title="Aucune classe"
            text="Aucune classe n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Niveau</th>
                  <th>École</th>
                </tr>
              </thead>

              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.name ||
                          'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      {item.level || '—'}
                    </td>

                    <td>
                      {schoolNameById[
                        item.school_id
                      ] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  function renderSubjects() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>📖 Matières</h3>

            <p>
              {subjects.length} matière(s)
              affichée(s).
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            title="Aucune matière"
            text="Aucune matière n'est encore disponible."
          />
        ) : (
          <div className="admin-subject-grid">
            {subjects.map((subject) => (
              <div
                className="admin-subject-card"
                key={subject.id}
              >
                <span>📖</span>
                <strong>
                  {subject.name}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderDocuments() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>📄 Documents</h3>

            <p>
              Fonctionnalité en préparation.
            </p>
          </div>
        </div>

        <EmptyState
          title="Documents pédagogiques"
          text="La fonctionnalité Documents sera intégrée prochainement."
        />
      </section>
    )
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="admin-loading">
          <div className="admin-spinner" />

          <p>
            Chargement du tableau de bord...
          </p>
        </div>
      )
    }

    switch (activeMenu) {
      case 'schools':
        return renderSchools()

      case 'teachers':
        return renderTeachers()

      case 'students':
        return renderStudents()

      case 'parents':
        return renderParents()

      case 'admins':
        return renderAdmins()

      case 'classes':
        return renderClasses()

      case 'subjects':
        return renderSubjects()

      case 'documents':
        return renderDocuments()

      default:
        return renderOverview()
    }
  }

  const pageTitle =
    MENU.find(
      (item) => item.id === activeMenu
    )?.label ||
    'Tableau de bord'

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">
            EC
          </div>

          <div>
            <strong>
              École Connectée
            </strong>

            <span>
              Administration
            </span>
          </div>
        </div>

        <nav className="admin-nav">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activeMenu === item.id
                  ? 'admin-nav-item active'
                  : 'admin-nav-item'
              }
              onClick={() =>
                setActiveMenu(item.id)
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <div className="admin-avatar">
              {(profile?.full_name ||
                'A')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {profile?.full_name ||
                  'Administrateur'}
              </strong>

              <span>
                {isSuperAdmin
                  ? 'Super administrateur'
                  : 'Administrateur'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={onLogout}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">
              École Connectée / Administration
            </span>

            <h1>{pageTitle}</h1>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-refresh"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
            >
              {refreshing
                ? 'Actualisation...'
                : '↻ Actualiser'}
            </button>
          </div>
        </header>

        {error && (
          <div className="admin-alert">
            <strong>
              ⚠️ Erreur de chargement
            </strong>

            <span>{error}</span>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  )
}

export default AdminDashboard