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
  { id: 'overview', label: 'Tableau de bord', icon: '⌂' },
  { id: 'schools', label: 'Écoles', icon: '▣' },
  { id: 'teachers', label: 'Enseignants', icon: '♙' },
  { id: 'students', label: 'Élèves', icon: '♧' },
  { id: 'parents', label: 'Parents', icon: '♡' },
  { id: 'admins', label: 'Administrateurs', icon: '◆' },
  { id: 'classes', label: 'Classes', icon: '▦' },
  { id: 'subjects', label: 'Matières', icon: '▤' },
  { id: 'documents', label: 'Documents', icon: '▱' },
]

const STAT_CONFIG = [
  {
    key: 'schools',
    label: 'Écoles',
    icon: '▣',
    color: 'blue',
    menu: 'schools',
  },
  {
    key: 'teachers',
    label: 'Enseignants',
    icon: '♙',
    color: 'violet',
    menu: 'teachers',
  },
  {
    key: 'students',
    label: 'Élèves',
    icon: '♧',
    color: 'green',
    menu: 'students',
  },
  {
    key: 'parents',
    label: 'Parents',
    icon: '♡',
    color: 'orange',
    menu: 'parents',
  },
  {
    key: 'admins',
    label: 'Administrateurs',
    icon: '◆',
    color: 'red',
    menu: 'admins',
  },
  {
    key: 'classes',
    label: 'Classes',
    icon: '▦',
    color: 'cyan',
    menu: 'classes',
  },
  {
    key: 'subjects',
    label: 'Matières',
    icon: '▤',
    color: 'pink',
    menu: 'subjects',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: '▱',
    color: 'yellow',
    menu: 'documents',
  },
]

function StatCard({ config, value, onClick }) {
  return (
    <button
      type="button"
      className={`premium-stat-card ${config.color}`}
      onClick={onClick}
    >
      <div className="stat-card-top">
        <div className="stat-icon">
          {config.icon}
        </div>

        <span className="stat-arrow">
          →
        </span>
      </div>

      <div className="stat-card-content">
        <span className="stat-label">
          {config.label}
        </span>

        <strong className="stat-value">
          {value}
        </strong>

        <span className="stat-description">
          {value === 1
            ? '1 élément enregistré'
            : `${value} éléments enregistrés`}
        </span>
      </div>
    </button>
  )
}

function EmptyState({ title, text, icon = '○' }) {
  return (
    <div className="premium-empty">
      <div className="empty-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  )
}

function StatusBadge({ active }) {
  return (
    <span
      className={
        active
          ? 'status-badge active'
          : 'status-badge inactive'
      }
    >
      <span className="status-dot" />
      {active ? 'Actif' : 'Inactif'}
    </span>
  )
}

function AdminDashboard({ profile, onLogout }) {
  const [activeMenu, setActiveMenu] =
    useState('overview')

  const [stats, setStats] =
    useState(EMPTY_STATS)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const [schools, setSchools] =
    useState([])

  const [teachers, setTeachers] =
    useState([])

  const [students, setStudents] =
    useState([])

  const [parents, setParents] =
    useState([])

  const [admins, setAdmins] =
    useState([])

  const [classes, setClasses] =
    useState([])

  const [subjects, setSubjects] =
    useState([])

  const [documents, setDocuments] =
    useState([])

  const isSuperAdmin =
    profile?.role === 'super_admin'

  async function countTable(table) {
    const { count, error } =
      await supabase
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
      documentsCount,
    ] = await Promise.all([
      countTable('schools'),
      countTable('teachers'),
      countTable('students'),
      countTable('parents'),
      countTable('classes'),
      countTable('subjects'),
      countTable('documents'),
    ])

    const {
      count: adminsCount,
      error: adminsError,
    } = await supabase
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
      documents: documentsCount,
    })
  }

  async function loadLists() {
    const results =
      await Promise.allSettled([
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
          .select(
            'id, school_id, active'
          )
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
          .select(
            'id, name'
          )
          .order('name')
          .limit(100),

        supabase
          .from('documents')
          .select(
            'id, teacher_id, class_id, subject_id, title, description, document_type, file_url, created_at'
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(100),
      ])

    const values = results.map(
      (result) => {
        if (
          result.status ===
            'fulfilled' &&
          !result.value.error
        ) {
          return (
            result.value.data || []
          )
        }

        return []
      }
    )

    setSchools(values[0])
    setTeachers(values[1])
    setStudents(values[2])
    setParents(values[3])
    setAdmins(values[4])
    setClasses(values[5])
    setSubjects(values[6])
    setDocuments(values[7])
  }

  async function loadDashboard(
    showRefresh = false
  ) {
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

  const schoolNameById =
    useMemo(() => {
      return Object.fromEntries(
        schools.map((school) => [
          school.id,
          school.name,
        ])
      )
    }, [schools])

  const classNameById =
    useMemo(() => {
      return Object.fromEntries(
        classes.map((item) => [
          item.id,
          item.name,
        ])
      )
    }, [classes])

  const filteredSchools =
    useMemo(() => {
      const value =
        search.toLowerCase().trim()

      if (!value) {
        return schools
      }

      return schools.filter(
        (school) =>
          school.name
            ?.toLowerCase()
            .includes(value) ||
          school.city
            ?.toLowerCase()
            .includes(value) ||
          school.email
            ?.toLowerCase()
            .includes(value)
      )
    }, [schools, search])

  const filteredStudents =
    useMemo(() => {
      const value =
        search.toLowerCase().trim()

      if (!value) {
        return students
      }

      return students.filter(
        (student) =>
          `${student.first_name || ''} ${
            student.last_name || ''
          }`
            .toLowerCase()
            .includes(value) ||
          student.student_code
            ?.toLowerCase()
            .includes(value)
      )
    }, [students, search])

  const filteredSubjects =
    useMemo(() => {
      const value =
        search.toLowerCase().trim()

      if (!value) {
        return subjects
      }

      return subjects.filter(
        (subject) =>
          subject.name
            ?.toLowerCase()
            .includes(value)
      )
    }, [subjects, search])

  function navigate(menu) {
    setActiveMenu(menu)
    setMobileMenuOpen(false)
    setSearch('')
  }

  function renderOverview() {
    return (
      <div className="dashboard-content">
        <section className="welcome-banner">
          <div className="welcome-text">
            <span className="eyebrow">
              ESPACE ADMINISTRATEUR
            </span>

            <h2>
              Bonjour,{' '}
              {profile?.full_name ||
                'Administrateur'}{' '}
              👋
            </h2>

            <p>
              Voici un aperçu de
              l'activité de votre
              plateforme École Connectée.
            </p>
          </div>

          <div className="welcome-decoration">
            <div className="welcome-circle circle-one" />
            <div className="welcome-circle circle-two" />
            <div className="welcome-grid" />
          </div>
        </section>

        <div className="section-heading">
          <div>
            <span className="section-eyebrow">
              VUE GÉNÉRALE
            </span>

            <h2>
              Statistiques de la plateforme
            </h2>
          </div>

          <span className="live-indicator">
            <span />
            Données en direct
          </span>
        </div>

        <div className="premium-stats-grid">
          {STAT_CONFIG.map((config) => (
            <StatCard
              key={config.key}
              config={config}
              value={stats[config.key]}
              onClick={() =>
                navigate(config.menu)
              }
            />
          ))}
        </div>

        <div className="overview-grid">
          <section className="premium-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  SYNTHÈSE
                </span>

                <h3>
                  État de la plateforme
                </h3>
              </div>

              <div className="panel-icon">
                ✓
              </div>
            </div>

            <div className="platform-summary">
              <div className="summary-row">
                <div className="summary-label">
                  <span className="summary-symbol blue">
                    ▣
                  </span>

                  <span>
                    Écoles enregistrées
                  </span>
                </div>

                <strong>
                  {stats.schools}
                </strong>
              </div>

              <div className="summary-row">
                <div className="summary-label">
                  <span className="summary-symbol violet">
                    ♙
                  </span>

                  <span>
                    Enseignants
                  </span>
                </div>

                <strong>
                  {stats.teachers}
                </strong>
              </div>

              <div className="summary-row">
                <div className="summary-label">
                  <span className="summary-symbol green">
                    ♧
                  </span>

                  <span>
                    Élèves
                  </span>
                </div>

                <strong>
                  {stats.students}
                </strong>
              </div>

              <div className="summary-row">
                <div className="summary-label">
                  <span className="summary-symbol orange">
                    ♡
                  </span>

                  <span>
                    Parents
                  </span>
                </div>

                <strong>
                  {stats.parents}
                </strong>
              </div>

              <div className="summary-row">
                <div className="summary-label">
                  <span className="summary-symbol yellow">
                    ▱
                  </span>

                  <span>
                    Documents pédagogiques
                  </span>
                </div>

                <strong>
                  {stats.documents}
                </strong>
              </div>
            </div>
          </section>

          <section className="premium-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  NAVIGATION
                </span>

                <h3>
                  Accès rapides
                </h3>
              </div>

              <div className="panel-icon">
                →
              </div>
            </div>

            <div className="quick-actions">
              <button
                type="button"
                onClick={() =>
                  navigate('schools')
                }
              >
                <span className="quick-icon blue">
                  ▣
                </span>

                <span>
                  <strong>
                    Gérer les écoles
                  </strong>

                  <small>
                    Voir les établissements
                  </small>
                </span>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('teachers')
                }
              >
                <span className="quick-icon violet">
                  ♙
                </span>

                <span>
                  <strong>
                    Enseignants
                  </strong>

                  <small>
                    Personnel enseignant
                  </small>
                </span>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('students')
                }
              >
                <span className="quick-icon green">
                  ♧
                </span>

                <span>
                  <strong>
                    Élèves
                  </strong>

                  <small>
                    Gestion des élèves
                  </small>
                </span>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('documents')
                }
              >
                <span className="quick-icon yellow">
                  ▱
                </span>

                <span>
                  <strong>
                    Documents
                  </strong>

                  <small>
                    Ressources pédagogiques
                  </small>
                </span>

                <b>→</b>
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderSchools() {
    return (
      <DataPage
        kicker="ÉTABLISSEMENTS"
        title="Écoles"
        description="Gérez les établissements enregistrés sur la plateforme."
        count={filteredSchools.length}
        search={search}
        setSearch={setSearch}
        icon="▣"
      >
        {filteredSchools.length === 0 ? (
          <EmptyState
            title="Aucune école trouvée"
            text="Aucune école ne correspond à votre recherche."
            icon="▣"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Localisation</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                </tr>
              </thead>

              <tbody>
                {filteredSchools.map(
                  (school) => (
                    <tr key={school.id}>
                      <td>
                        <div className="person-cell">
                          <div className="table-avatar blue">
                            {(
                              school.name ||
                              'E'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {school.name ||
                                'Sans nom'}
                            </strong>

                            <small>
                              Établissement scolaire
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {school.city ||
                          school.address ||
                          '—'}
                      </td>

                      <td>
                        {school.phone ||
                          '—'}
                      </td>

                      <td>
                        {school.email ||
                          '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderTeachers() {
    return (
      <DataPage
        kicker="PERSONNEL"
        title="Enseignants"
        description="Suivez les enseignants présents sur la plateforme."
        count={teachers.length}
        search={search}
        setSearch={setSearch}
        icon="♙"
      >
        {teachers.length === 0 ? (
          <EmptyState
            title="Aucun enseignant"
            text="Aucun enseignant n'est encore disponible."
            icon="♙"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {teachers.map(
                  (teacher) => (
                    <tr key={teacher.id}>
                      <td>
                        <div className="id-cell">
                          <span className="id-avatar violet">
                            ♙
                          </span>

                          <code>
                            {teacher.id}
                          </code>
                        </div>
                      </td>

                      <td>
                        {schoolNameById[
                          teacher.school_id
                        ] || '—'}
                      </td>

                      <td>
                        <StatusBadge
                          active={
                            teacher.active
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderStudents() {
    return (
      <DataPage
        kicker="SCOLARITÉ"
        title="Élèves"
        description="Consultez les élèves enregistrés et leur classe."
        count={filteredStudents.length}
        search={search}
        setSearch={setSearch}
        icon="♧"
      >
        {filteredStudents.length === 0 ? (
          <EmptyState
            title="Aucun élève trouvé"
            text="Aucun élève ne correspond à votre recherche."
            icon="♧"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Code</th>
                  <th>Classe</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(
                  (student) => {
                    const fullName =
                      `${student.first_name || ''} ${
                        student.last_name || ''
                      }`.trim() ||
                      'Sans nom'

                    return (
                      <tr
                        key={
                          student.id
                        }
                      >
                        <td>
                          <div className="person-cell">
                            <div className="table-avatar green">
                              {fullName
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {fullName}
                              </strong>

                              <small>
                                Élève
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="code-badge">
                            {student.student_code ||
                              '—'}
                          </span>
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
                          <StatusBadge
                            active={
                              student.active
                            }
                          />
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderParents() {
    return (
      <DataPage
        kicker="COMMUNAUTÉ"
        title="Parents"
        description="Consultez les comptes parents associés aux établissements."
        count={parents.length}
        search={search}
        setSearch={setSearch}
        icon="♡"
      >
        {parents.length === 0 ? (
          <EmptyState
            title="Aucun parent"
            text="Aucun parent n'est encore disponible."
            icon="♡"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>École</th>
                  <th>Profil</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {parents.map(
                  (parent) => (
                    <tr key={parent.id}>
                      <td>
                        <div className="id-cell">
                          <span className="id-avatar orange">
                            ♡
                          </span>

                          <code>
                            {parent.id}
                          </code>
                        </div>
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
                        <StatusBadge
                          active={
                            parent.active
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderAdmins() {
    return (
      <DataPage
        kicker="SÉCURITÉ"
        title="Administrateurs"
        description="Gérez les comptes ayant accès à l'administration."
        count={admins.length}
        search={search}
        setSearch={setSearch}
        icon="◆"
      >
        {admins.length === 0 ? (
          <EmptyState
            title="Aucun administrateur"
            text="Aucun compte administrateur n'est disponible."
            icon="◆"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Administrateur</th>
                  <th>Rôle</th>
                  <th>École</th>
                  <th>Statut</th>
                </tr>
              </thead>

              <tbody>
                {admins.map(
                  (admin) => (
                    <tr key={admin.id}>
                      <td>
                        <div className="person-cell">
                          <div className="table-avatar red">
                            {(
                              admin.full_name ||
                              'A'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {admin.full_name ||
                                'Sans nom'}
                            </strong>

                            <small>
                              Compte administrateur
                            </small>
                          </div>
                        </div>
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
                        <StatusBadge
                          active={
                            admin.active
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderClasses() {
    return (
      <DataPage
        kicker="SCOLARITÉ"
        title="Classes"
        description="Visualisez les classes disponibles dans les établissements."
        count={classes.length}
        search={search}
        setSearch={setSearch}
        icon="▦"
      >
        {classes.length === 0 ? (
          <EmptyState
            title="Aucune classe"
            text="Aucune classe n'est encore disponible."
            icon="▦"
          />
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Niveau</th>
                  <th>École</th>
                </tr>
              </thead>

              <tbody>
                {classes.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="person-cell">
                          <div className="table-avatar cyan">
                            ▦
                          </div>

                          <div>
                            <strong>
                              {item.name ||
                                'Sans nom'}
                            </strong>

                            <small>
                              Classe scolaire
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="level-badge">
                          {item.level ||
                            '—'}
                        </span>
                      </td>

                      <td>
                        {schoolNameById[
                          item.school_id
                        ] || '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderSubjects() {
    return (
      <DataPage
        kicker="ENSEIGNEMENT"
        title="Matières"
        description="Les matières disponibles pour les activités pédagogiques."
        count={filteredSubjects.length}
        search={search}
        setSearch={setSearch}
        icon="▤"
      >
        {filteredSubjects.length === 0 ? (
          <EmptyState
            title="Aucune matière"
            text="Aucune matière ne correspond à votre recherche."
            icon="▤"
          />
        ) : (
          <div className="subject-grid">
            {filteredSubjects.map(
              (subject, index) => (
                <div
                  className="subject-card"
                  key={subject.id}
                >
                  <div className="subject-number">
                    {String(
                      index + 1
                    ).padStart(2, '0')}
                  </div>

                  <div className="subject-icon">
                    ▤
                  </div>

                  <div>
                    <strong>
                      {subject.name}
                    </strong>

                    <span>
                      Matière pédagogique
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </DataPage>
    )
  }

  function renderDocuments() {
    return (
      <DataPage
        kicker="RESSOURCES"
        title="Documents pédagogiques"
        description="Centralisez les ressources utilisées par les enseignants."
        count={documents.length}
        search={search}
        setSearch={setSearch}
        icon="▱"
      >
        {documents.length === 0 ? (
          <div className="documents-empty">
            <div className="document-large-icon">
              ▱
            </div>

            <span className="panel-kicker">
              ESPACE DOCUMENTAIRE
            </span>

            <h3>
              Votre bibliothèque pédagogique
            </h3>

            <p>
              Aucun document n'a encore
              été publié. Les leçons,
              exercices, devoirs et
              autres ressources
              apparaîtront ici.
            </p>

            <div className="document-types">
              <span>Leçons</span>
              <span>Exercices</span>
              <span>Devoirs</span>
              <span>Interrogations</span>
              <span>Cours</span>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Classe</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {documents.map(
                  (document) => (
                    <tr
                      key={
                        document.id
                      }
                    >
                      <td>
                        <div className="person-cell">
                          <div className="table-avatar yellow">
                            ▱
                          </div>

                          <div>
                            <strong>
                              {document.title ||
                                'Document'}
                            </strong>

                            <small>
                              Ressource pédagogique
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="role-badge">
                          {
                            document.document_type
                          }
                        </span>
                      </td>

                      <td>
                        {classNameById[
                          document.class_id
                        ] || '—'}
                      </td>

                      <td>
                        {document.created_at
                          ? new Date(
                              document.created_at
                            ).toLocaleDateString(
                              'fr-FR'
                            )
                          : '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </DataPage>
    )
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="premium-loading">
          <div className="loading-spinner" />

          <h3>
            Chargement de votre espace
          </h3>

          <p>
            Récupération des données...
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
      (item) =>
        item.id === activeMenu
    )?.label ||
    'Tableau de bord'

  return (
    <div className="premium-admin">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .premium-admin {
          --primary: #2563eb;
          --primary-dark: #1d4ed8;
          --text: #172033;
          --muted: #718096;
          --border: #e7ebf2;
          --surface: #ffffff;
          --background: #f5f7fb;
          --sidebar: #101828;
          min-height: 100vh;
          background: var(--background);
          color: var(--text);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .premium-admin button {
          font-family: inherit;
        }

        .admin-shell {
          display: flex;
          min-height: 100vh;
        }

        .premium-sidebar {
          width: 270px;
          min-width: 270px;
          background:
            linear-gradient(
              180deg,
              #101828 0%,
              #0b1220 100%
            );
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 100;
          border-right: 1px solid rgba(255,255,255,.06);
        }

        .brand {
          height: 88px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #3b82f6,
              #6366f1
            );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -1px;
          box-shadow:
            0 8px 24px rgba(37,99,235,.3);
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .brand-copy strong {
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
        }

        .brand-copy span {
          color: #8d99ab;
          font-size: 11px;
          margin-top: 3px;
        }

        .nav-title {
          padding: 27px 22px 10px;
          color: #69758a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .premium-nav {
          padding: 0 12px;
          overflow-y: auto;
        }

        .premium-nav button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #aeb8c8;
          height: 46px;
          border-radius: 11px;
          margin-bottom: 4px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 13px;
          cursor: pointer;
          text-align: left;
          transition:
            background .2s ease,
            color .2s ease,
            transform .2s ease;
        }

        .premium-nav button:hover {
          background: rgba(255,255,255,.06);
          color: white;
          transform: translateX(2px);
        }

        .premium-nav button.active {
          background:
            linear-gradient(
              90deg,
              rgba(59,130,246,.20),
              rgba(99,102,241,.12)
            );
          color: white;
          box-shadow:
            inset 3px 0 0 #3b82f6;
        }

        .nav-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.05);
          font-size: 14px;
          flex-shrink: 0;
        }

        .premium-nav button.active .nav-icon {
          background: rgba(59,130,246,.2);
          color: #60a5fa;
        }

        .nav-label {
          font-size: 13px;
          font-weight: 600;
          flex: 1;
        }

        .nav-chevron {
          color: #586579;
          font-size: 14px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 14px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .admin-mini {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .admin-avatar {
          width: 39px;
          height: 39px;
          border-radius: 11px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          flex-shrink: 0;
        }

        .admin-mini-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .admin-mini-info strong {
          color: white;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-mini-info span {
          color: #78869a;
          font-size: 10px;
          margin-top: 3px;
        }

        .logout-button {
          width: 100%;
          height: 42px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
          color: #aeb8c8;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: .2s ease;
        }

        .logout-button:hover {
          background: rgba(239,68,68,.12);
          color: #fca5a5;
          border-color: rgba(239,68,68,.2);
        }

        .premium-main {
          margin-left: 270px;
          width: calc(100% - 270px);
          min-width: 0;
        }

        .premium-topbar {
          height: 88px;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 38px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-left {
          min-width: 0;
        }

        .breadcrumb {
          color: #98a2b3;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .topbar-left h1 {
          margin: 0;
          font-size: 22px;
          letter-spacing: -.5px;
          font-weight: 800;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-box {
          height: 42px;
          width: 235px;
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: 11px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }

        .search-box span {
          color: #98a2b3;
          font-size: 15px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 12px;
        }

        .search-box input::placeholder {
          color: #a5adba;
        }

        .refresh-button {
          height: 42px;
          padding: 0 14px;
          border: 1px solid var(--border);
          background: white;
          color: #475467;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
        }

        .refresh-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .refresh-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .mobile-menu-button {
          display: none;
          width: 42px;
          height: 42px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 10px;
          cursor: pointer;
          font-size: 18px;
        }

        .dashboard-content {
          padding: 34px 38px 50px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .welcome-banner {
          min-height: 190px;
          border-radius: 20px;
          background:
            linear-gradient(
              110deg,
              #1d4ed8 0%,
              #2563eb 45%,
              #4f46e5 100%
            );
          position: relative;
          overflow: hidden;
          padding: 34px 38px;
          display: flex;
          align-items: center;
          margin-bottom: 34px;
          box-shadow:
            0 18px 45px rgba(37,99,235,.14);
        }

        .welcome-text {
          position: relative;
          z-index: 2;
          max-width: 650px;
        }

        .eyebrow,
        .section-eyebrow,
        .panel-kicker {
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
        }

        .welcome-text .eyebrow {
          color: rgba(255,255,255,.65);
        }

        .welcome-text h2 {
          margin: 8px 0 8px;
          color: white;
          font-size: 29px;
          letter-spacing: -.8px;
        }

        .welcome-text p {
          margin: 0;
          color: rgba(255,255,255,.75);
          font-size: 13px;
          line-height: 1.6;
        }

        .welcome-decoration {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 45%;
        }

        .welcome-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.12);
        }

        .circle-one {
          width: 330px;
          height: 330px;
          right: -110px;
          top: -75px;
        }

        .circle-two {
          width: 230px;
          height: 230px;
          right: 80px;
          top: -25px;
          background: rgba(255,255,255,.025);
        }

        .welcome-grid {
          position: absolute;
          right: 45px;
          bottom: 28px;
          width: 130px;
          height: 80px;
          opacity: .12;
          background-image:
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px);
          background-size: 16px 16px;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 17px;
        }

        .section-eyebrow,
        .panel-kicker {
          color: #98a2b3;
        }

        .section-heading h2 {
          margin: 5px 0 0;
          font-size: 19px;
          letter-spacing: -.4px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #667085;
          font-size: 11px;
          font-weight: 600;
        }

        .live-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34,197,94,.1);
        }

        .premium-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 15px;
          margin-bottom: 26px;
        }

        .premium-stat-card {
          border: 1px solid var(--border);
          background: white;
          border-radius: 16px;
          padding: 19px;
          text-align: left;
          cursor: pointer;
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            border-color .2s ease;
          min-width: 0;
        }

        .premium-stat-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 14px 35px rgba(16,24,40,.08);
          border-color: #d8dee8;
        }

        .stat-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 16px;
        }

        .premium-stat-card.blue .stat-icon,
        .quick-icon.blue,
        .summary-symbol.blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .premium-stat-card.violet .stat-icon,
        .quick-icon.violet,
        .summary-symbol.violet {
          background: #f5f3ff;
          color: #7c3aed;
        }

        .premium-stat-card.green .stat-icon,
        .quick-icon.green,
        .summary-symbol.green {
          background: #ecfdf3;
          color: #16a34a;
        }

        .premium-stat-card.orange .stat-icon,
        .quick-icon.orange,
        .summary-symbol.orange {
          background: #fff7ed;
          color: #ea580c;
        }

        .premium-stat-card.red .stat-icon,
        .quick-icon.red,
        .summary-symbol.red {
          background: #fef2f2;
          color: #dc2626;
        }

        .premium-stat-card.cyan .stat-icon,
        .quick-icon.cyan,
        .summary-symbol.cyan {
          background: #ecfeff;
          color: #0891b2;
        }

        .premium-stat-card.pink .stat-icon,
        .quick-icon.pink,
        .summary-symbol.pink {
          background: #fdf2f8;
          color: #db2777;
        }

        .premium-stat-card.yellow .stat-icon,
        .quick-icon.yellow,
        .summary-symbol.yellow {
          background: #fefce8;
          color: #ca8a04;
        }

        .stat-arrow {
          color: #c0c7d1;
          font-size: 16px;
          transition: .2s ease;
        }

        .premium-stat-card:hover .stat-arrow {
          color: #667085;
          transform: translateX(3px);
        }

        .stat-card-content {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          color: #667085;
          font-size: 12px;
          font-weight: 600;
        }

        .stat-value {
          font-size: 28px;
          line-height: 1;
          margin-top: 7px;
          letter-spacing: -.8px;
        }

        .stat-description {
          color: #98a2b3;
          font-size: 10px;
          margin-top: 8px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 18px;
        }

        .premium-panel {
          background: white;
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 23px;
          min-width: 0;
        }

        .panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid #f0f2f5;
        }

        .panel-heading h3 {
          margin: 5px 0 0;
          font-size: 16px;
          letter-spacing: -.2px;
        }

        .panel-icon {
          width: 33px;
          height: 33px;
          border-radius: 9px;
          background: #f8fafc;
          color: #667085;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .platform-summary {
          padding-top: 4px;
        }

        .summary-row {
          min-height: 51px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f3f4f6;
        }

        .summary-row:last-child {
          border-bottom: 0;
        }

        .summary-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #475467;
          font-size: 12px;
          font-weight: 600;
        }

        .summary-label strong {
          color: var(--text);
        }

        .summary-symbol,
        .quick-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          flex-shrink: 0;
        }

        .summary-row > strong {
          font-size: 14px;
        }

        .quick-actions {
          padding-top: 6px;
        }

        .quick-actions button {
          width: 100%;
          border: 0;
          background: transparent;
          min-height: 60px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          cursor: pointer;
          padding: 8px 2px;
        }

        .quick-actions button:last-child {
          border-bottom: 0;
        }

        .quick-actions button > span:nth-child(2) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .quick-actions strong {
          color: #344054;
          font-size: 12px;
        }

        .quick-actions small {
          color: #98a2b3;
          font-size: 10px;
          margin-top: 3px;
        }

        .quick-actions b {
          color: #98a2b3;
          font-size: 14px;
          transition: .2s ease;
        }

        .quick-actions button:hover b {
          color: #2563eb;
          transform: translateX(3px);
        }

        .data-page {
          padding: 34px 38px 50px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .data-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 22px;
        }

        .data-page-header h2 {
          margin: 5px 0 5px;
          font-size: 25px;
          letter-spacing: -.6px;
        }

        .data-page-header p {
          color: #7b8494;
          font-size: 12px;
          margin: 0;
        }

        .page-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          background: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .page-count {
          color: #667085;
          background: white;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .data-panel {
          background: white;
          border: 1px solid var(--border);
          border-radius: 17px;
          overflow: hidden;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
        }

        .premium-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        .premium-table th {
          background: #f8fafc;
          color: #7b8494;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .7px;
          font-weight: 800;
          text-align: left;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .premium-table td {
          padding: 15px 18px;
          border-bottom: 1px solid #f0f2f5;
          color: #475467;
          font-size: 12px;
          vertical-align: middle;
        }

        .premium-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .premium-table tbody tr:hover {
          background: #fafbfc;
        }

        .person-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 190px;
        }

        .person-cell > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .person-cell strong {
          color: #344054;
          font-size: 12px;
        }

        .person-cell small {
          color: #98a2b3;
          font-size: 10px;
          margin-top: 3px;
        }

        .table-avatar,
        .id-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          flex-shrink: 0;
        }

        .table-avatar.blue,
        .id-avatar.blue {
          color: #2563eb;
          background: #eff6ff;
        }

        .table-avatar.violet,
        .id-avatar.violet {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .table-avatar.green,
        .id-avatar.green {
          color: #16a34a;
          background: #ecfdf3;
        }

        .table-avatar.orange,
        .id-avatar.orange {
          color: #ea580c;
          background: #fff7ed;
        }

        .table-avatar.red,
        .id-avatar.red {
          color: #dc2626;
          background: #fef2f2;
        }

        .table-avatar.cyan,
        .id-avatar.cyan {
          color: #0891b2;
          background: #ecfeff;
        }

        .table-avatar.yellow,
        .id-avatar.yellow {
          color: #ca8a04;
          background: #fefce8;
        }

        .id-cell {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .id-cell code,
        .premium-table code {
          color: #667085;
          font-size: 10px;
          max-width: 270px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 800;
        }

        .status-badge.active {
          color: #15803d;
          background: #f0fdf4;
        }

        .status-badge.inactive {
          color: #b91c1c;
          background: #fef2f2;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .role-badge,
        .level-badge,
        .code-badge {
          display: inline-flex;
          border-radius: 7px;
          padding: 5px 8px;
          background: #f5f7fa;
          color: #667085;
          font-size: 10px;
          font-weight: 700;
        }

        .subject-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 13px;
        }

        .subject-card {
          min-height: 105px;
          border: 1px solid var(--border);
          border-radius: 13px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 13px;
          position: relative;
          overflow: hidden;
          transition: .2s ease;
        }

        .subject-card:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 10px 25px rgba(16,24,40,.05);
        }

        .subject-number {
          position: absolute;
          right: 11px;
          top: 9px;
          color: #e4e7ec;
          font-size: 18px;
          font-weight: 900;
        }

        .subject-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: #fdf2f8;
          color: #db2777;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .subject-card > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .subject-card strong {
          color: #344054;
          font-size: 12px;
        }

        .subject-card span {
          color: #98a2b3;
          font-size: 10px;
          margin-top: 4px;
        }

        .documents-empty {
          padding: 55px 25px;
          text-align: center;
        }

        .document-large-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto 18px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fefce8;
          color: #ca8a04;
          font-size: 28px;
          font-weight: 900;
        }

        .documents-empty h3 {
          margin: 7px 0 8px;
          font-size: 18px;
        }

        .documents-empty p {
          max-width: 530px;
          margin: 0 auto;
          color: #7b8494;
          font-size: 12px;
          line-height: 1.7;
        }

        .document-types {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 20px;
        }

        .document-types span {
          padding: 7px 10px;
          border-radius: 8px;
          background: #f8fafc;
          color: #667085;
          font-size: 10px;
          font-weight: 700;
        }

        .premium-empty {
          padding: 70px 25px;
          text-align: center;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 15px;
          border-radius: 16px;
          background: #f8fafc;
          color: #98a2b3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
        }

        .premium-empty h3 {
          margin: 0 0 7px;
          font-size: 16px;
        }

        .premium-empty p {
          margin: 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .premium-loading {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 40px;
        }

        .loading-spinner {
          width: 35px;
          height: 35px;
          border: 3px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .premium-loading h3 {
          margin: 17px 0 5px;
          font-size: 15px;
        }

        .premium-loading p {
          margin: 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .premium-alert {
          margin: 20px 38px 0;
          padding: 13px 15px;
          border-radius: 11px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 11px;
        }

        .premium-alert strong {
          font-weight: 800;
        }

        @media (max-width: 1150px) {
          .premium-stats-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .subject-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .search-box {
            width: 190px;
          }
        }

        @media (max-width: 800px) {
          .premium-sidebar {
            transform: translateX(-100%);
            transition: transform .25s ease;
          }

          .premium-sidebar.mobile-open {
            transform: translateX(0);
          }

          .premium-main {
            margin-left: 0;
            width: 100%;
          }

          .premium-topbar {
            padding: 0 18px;
          }

          .mobile-menu-button {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .topbar-left {
            display: none;
          }

          .topbar-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .search-box {
            flex: 1;
            width: auto;
          }

          .dashboard-content,
          .data-page {
            padding: 22px 16px 35px;
          }

          .welcome-banner {
            padding: 25px;
            min-height: 185px;
          }

          .welcome-text h2 {
            font-size: 23px;
          }

          .welcome-decoration {
            opacity: .6;
            width: 60%;
          }

          .section-heading {
            align-items: flex-start;
            gap: 10px;
          }

          .premium-stats-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .data-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .subject-grid {
            grid-template-columns: 1fr;
          }

          .premium-alert {
            margin: 15px 16px 0;
          }
        }

        @media (max-width: 480px) {
          .premium-topbar {
            height: 72px;
          }

          .topbar-actions {
            gap: 6px;
          }

          .refresh-button {
            padding: 0 10px;
            font-size: 11px;
          }

          .premium-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .premium-stat-card {
            padding: 14px;
          }

          .stat-icon {
            width: 34px;
            height: 34px;
          }

          .stat-value {
            font-size: 23px;
          }

          .stat-description {
            display: none;
          }

          .premium-panel {
            padding: 17px;
          }

          .welcome-banner {
            border-radius: 15px;
          }

          .welcome-text h2 {
            font-size: 20px;
          }

          .live-indicator {
            display: none;
          }
        }
      `}</style>

      <div className="admin-shell">
        <aside
          className={`premium-sidebar ${
            mobileMenuOpen
              ? 'mobile-open'
              : ''
          }`}
        >
          <div className="brand">
            <div className="brand-logo">
              EC
            </div>

            <div className="brand-copy">
              <strong>
                École Connectée
              </strong>

              <span>
                Plateforme éducative
              </span>
            </div>
          </div>

          <div className="nav-title">
            NAVIGATION PRINCIPALE
          </div>

          <nav className="premium-nav">
            {MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  activeMenu === item.id
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  navigate(item.id)
                }
              >
                <span className="nav-icon">
                  {item.icon}
                </span>

                <span className="nav-label">
                  {item.label}
                </span>

                {activeMenu ===
                  item.id && (
                  <span className="nav-chevron">
                    ›
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="admin-mini">
              <div className="admin-avatar">
                {(
                  profile?.full_name ||
                  'A'
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="admin-mini-info">
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
              className="logout-button"
              onClick={onLogout}
            >
              Se déconnecter
            </button>
          </div>
        </aside>

        <main className="premium-main">
          <header className="premium-topbar">
            <div className="topbar-left">
              <div className="breadcrumb">
                École Connectée&nbsp; / &nbsp;Administration
              </div>

              <h1>{pageTitle}</h1>
            </div>

            <div className="topbar-actions">
              <button
                type="button"
                className="mobile-menu-button"
                onClick={() =>
                  setMobileMenuOpen(
                    !mobileMenuOpen
                  )
                }
              >
                ☰
              </button>

              {activeMenu !==
                'overview' && (
                <div className="search-box">
                  <span>⌕</span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Rechercher..."
                  />
                </div>
              )}

              <button
                type="button"
                className="refresh-button"
                onClick={() =>
                  loadDashboard(true)
                }
                disabled={refreshing}
              >
                {refreshing
                  ? 'Chargement...'
                  : '↻ Actualiser'}
              </button>
            </div>
          </header>

          {error && (
            <div className="premium-alert">
              <strong>
                ⚠️ Erreur
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

          {renderContent()}
        </main>
      </div>
    </div>
  )
}

function DataPage({
  kicker,
  title,
  description,
  count,
  search,
  setSearch,
  icon,
  children,
}) {
  return (
    <div className="data-page">
      <div className="data-page-header">
        <div>
          <div className="page-icon">
            {icon}
          </div>

          <span className="section-eyebrow">
            {kicker}
          </span>

          <h2>{title}</h2>

          <p>{description}</p>
        </div>

        <div className="page-count">
          {count}{' '}
          {count > 1
            ? 'éléments'
            : 'élément'}
        </div>
      </div>

      <section className="data-panel">
        {children}
      </section>
    </div>
  )
}

export default AdminDashboard