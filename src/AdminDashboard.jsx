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

const EMPTY_SCHOOL_FORM = {
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  admin_full_name: '',
  admin_username: '',
  admin_email: '',
  admin_phone: '',
  admin_password: '',
  admin_password_confirmation: '',
}

function StatCard({ icon, label, value, onClick }) {
  return (
    <button
      className="admin-stat-card"
      onClick={onClick}
      type="button"
    >
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

function FormField({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="admin-form-field">
      <span>
        {label} {required && <b>*</b>}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  )
}

function AdminDashboard({ profile, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')

  const [stats, setStats] = useState(EMPTY_STATS)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [schools, setSchools] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [admins, setAdmins] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [documents, setDocuments] = useState([])

  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [schoolSaving, setSchoolSaving] = useState(false)

  const [schoolForm, setSchoolForm] = useState(
    EMPTY_SCHOOL_FORM
  )

  const isSuperAdmin =
    profile?.role === 'super_admin'

  // =========================================================
  // OUTILS
  // =========================================================

  function showError(title, err) {
    console.error(title, err)

    setError(
      `${title} : ${
        err?.message ||
        'Une erreur inattendue est survenue.'
      }`
    )
  }

  function resetSchoolForm() {
    setSchoolForm(EMPTY_SCHOOL_FORM)
    setShowSchoolForm(false)
  }

  function updateSchoolField(field, value) {
    setSchoolForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // =========================================================
  // STATISTIQUES
  // =========================================================

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

  // =========================================================
  // LISTES
  // =========================================================

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
        .select('id, name')
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
    setDocuments(values[7])
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
      showError(
        'Erreur du tableau de bord administrateur',
        err
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // =========================================================
  // CRÉATION ÉCOLE + ADMIN
  // =========================================================

  async function saveSchool(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    const schoolName =
      schoolForm.name.trim()

    const adminFullName =
      schoolForm.admin_full_name.trim()

    const adminUsername =
      schoolForm.admin_username.trim()

    const adminEmail =
      schoolForm.admin_email
        .trim()
        .toLowerCase()

    const adminPassword =
      schoolForm.admin_password

    const confirmation =
      schoolForm.admin_password_confirmation

    if (!schoolName) {
      setError(
        "Le nom de l'école est obligatoire."
      )
      return
    }

    if (!adminFullName) {
      setError(
        "Le nom complet de l'Admin École est obligatoire."
      )
      return
    }

    if (!adminUsername) {
      setError(
        "Le nom d'utilisateur est obligatoire."
      )
      return
    }

    if (!adminEmail) {
      setError(
        "L'email de l'Admin École est obligatoire."
      )
      return
    }

    if (!adminPassword) {
      setError(
        "Le mot de passe est obligatoire."
      )
      return
    }

    if (adminPassword.length < 6) {
      setError(
        'Le mot de passe doit contenir au moins 6 caractères.'
      )
      return
    }

    if (adminPassword !== confirmation) {
      setError(
        'Les deux mots de passe ne correspondent pas.'
      )
      return
    }

    setSchoolSaving(true)

    try {
      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        'create-school-admin',
        {
          body: {
            school: {
              name: schoolName,
              address:
                schoolForm.address.trim() ||
                null,
              city:
                schoolForm.city.trim() ||
                null,
              phone:
                schoolForm.phone.trim() ||
                null,
              email:
                schoolForm.email
                  .trim()
                  .toLowerCase() ||
                null,
            },

            admin: {
              full_name: adminFullName,
              username: adminUsername,
              email: adminEmail,
              password: adminPassword,
              phone:
                schoolForm.admin_phone
                  .trim() || null,
            },
          },
        }
      )

      if (functionError) {
        throw functionError
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            'Impossible de créer l’école.'
        )
      }

      setMessage(
        `✅ ${data.message || "L'école et son Administrateur École ont été créés avec succès."}`
      )

      resetSchoolForm()

      await loadDashboard(true)
    } catch (err) {
      showError(
        'Erreur lors de la création de l’école',
        err
      )
    } finally {
      setSchoolSaving(false)
    }
  }

  // =========================================================
  // MAPS
  // =========================================================

  const schoolNameById = useMemo(
    () =>
      Object.fromEntries(
        schools.map((school) => [
          school.id,
          school.name,
        ])
      ),
    [schools]
  )

  const classNameById = useMemo(
    () =>
      Object.fromEntries(
        classes.map((item) => [
          item.id,
          item.name,
        ])
      ),
    [classes]
  )

  // =========================================================
  // TABLEAU DE BORD
  // =========================================================

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
                  Vue générale des données
                  actuellement disponibles.
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
                <span>
                  Parents
                </span>

                <strong>
                  {stats.parents}
                </strong>
              </div>

              <div>
                <span>
                  Documents
                </span>

                <strong>
                  {stats.documents}
                </strong>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>
                  Accès rapides
                </h3>

                <p>
                  Ouvrir directement une
                  section.
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

  // =========================================================
  // ÉCOLES
  // =========================================================

  function renderSchools() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>🏫 Écoles</h3>

            <p>
              {schools.length} école(s)
              affichée(s).
            </p>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              className="admin-primary-button"
              onClick={() => {
                setError('')
                setMessage('')
                setSchoolForm(
                  EMPTY_SCHOOL_FORM
                )
                setShowSchoolForm(true)
              }}
            >
              ＋ Nouvelle école
            </button>
          )}
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

  // =========================================================
  // ENSEIGNANTS
  // =========================================================

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

  // =========================================================
  // ÉLÈVES
  // =========================================================

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

  // =========================================================
  // PARENTS
  // =========================================================

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

  // =========================================================
  // ADMINISTRATEURS
  // =========================================================

  function renderAdmins() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>
              🛡️ Administrateurs
            </h3>

            <p>
              {admins.length} compte(s)
              administrateur(s)
              affiché(s).
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
                          : 'Administrateur école'}
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

  // =========================================================
  // CLASSES
  // =========================================================

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

          <span className="admin-readonly-badge">
            Lecture seule
          </span>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            title="Aucune classe"
            text="Les classes seront créées par les Administrateurs École."
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

  // =========================================================
  // MATIÈRES
  // =========================================================

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

  // =========================================================
  // DOCUMENTS
  // =========================================================

  function renderDocuments() {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h3>📄 Documents</h3>

            <p>
              {documents.length} document(s)
              affiché(s).
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            title="Aucun document"
            text="Aucun document n'est encore disponible."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Classe</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {documents.map(
                  (document) => (
                    <tr key={document.id}>
                      <td>
                        <strong>
                          {document.title ||
                            'Sans titre'}
                        </strong>
                      </td>

                      <td>
                        {document.document_type ||
                          '—'}
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
      </section>
    )
  }

  // =========================================================
  // CONTENU
  // =========================================================

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
      (item) =>
        item.id === activeMenu
    )?.label ||
    'Tableau de bord'

  // =========================================================
  // AFFICHAGE
  // =========================================================

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
              <span>
                {item.icon}
              </span>

              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <div className="admin-avatar">
              {(
                profile?.full_name ||
                'A'
              )
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
              École Connectée /
              Administration
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

        {message && (
          <div className="admin-alert admin-success-alert">
            <strong>✅ Succès</strong>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="admin-alert">
            <strong>
              ⚠️ Attention
            </strong>

            <span>{error}</span>
          </div>
        )}

        {renderContent()}
      </main>

      {/* =====================================================
          MODALE NOUVELLE ÉCOLE
      ===================================================== */}

      {showSchoolForm && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetSchoolForm()
            }
          }}
        >
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <span className="admin-modal-kicker">
                  ADMINISTRATION
                </span>

                <h2>
                  Nouvelle école
                </h2>

                <p>
                  Créez l'école et son
                  compte Administrateur
                  École.
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={
                  resetSchoolForm
                }
                disabled={schoolSaving}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveSchool}
              className="admin-modal-form"
            >
              {/* ÉCOLE */}

              <div className="admin-form-section">
                <div className="admin-form-section-title">
                  <span>🏫</span>

                  <div>
                    <strong>
                      Informations de
                      l'école
                    </strong>

                    <small>
                      Les informations
                      principales de
                      l'établissement.
                    </small>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <FormField
                    label="Nom de l'école"
                    required
                    value={
                      schoolForm.name
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'name',
                        e.target.value
                      )
                    }
                    placeholder="Ex : École Moderne de Dakar"
                  />

                  <FormField
                    label="Ville"
                    value={
                      schoolForm.city
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'city',
                        e.target.value
                      )
                    }
                    placeholder="Ex : Dakar"
                  />

                  <FormField
                    label="Adresse"
                    value={
                      schoolForm.address
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'address',
                        e.target.value
                      )
                    }
                    placeholder="Ex : Avenue Cheikh Anta Diop, Point E"
                  />

                  <FormField
                    label="Téléphone"
                    value={
                      schoolForm.phone
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'phone',
                        e.target.value
                      )
                    }
                    placeholder="Ex : 77 123 45 67"
                    type="tel"
                  />

                  <FormField
                    label="Email de l'école"
                    value={
                      schoolForm.email
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'email',
                        e.target.value
                      )
                    }
                    placeholder="contact@ecole.sn"
                    type="email"
                  />
                </div>
              </div>

              {/* ADMIN */}

              <div className="admin-form-section">
                <div className="admin-form-section-title">
                  <span>👨‍💼</span>

                  <div>
                    <strong>
                      Administrateur
                      École
                    </strong>

                    <small>
                      Ce compte permettra
                      de gérer cette école.
                    </small>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <FormField
                    label="Nom complet"
                    required
                    value={
                      schoolForm.admin_full_name
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_full_name',
                        e.target.value
                      )
                    }
                    placeholder="Ex : Mamadou Ndiaye"
                  />

                  <FormField
                    label="Nom d'utilisateur"
                    required
                    value={
                      schoolForm.admin_username
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_username',
                        e.target.value
                      )
                    }
                    placeholder="Ex : mamadou.ndiaye"
                    autoComplete="username"
                  />

                  <FormField
                    label="Email"
                    required
                    type="email"
                    value={
                      schoolForm.admin_email
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_email',
                        e.target.value
                      )
                    }
                    placeholder="admin@ecole.sn"
                    autoComplete="email"
                  />

                  <FormField
                    label="Téléphone"
                    type="tel"
                    value={
                      schoolForm.admin_phone
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_phone',
                        e.target.value
                      )
                    }
                    placeholder="Ex : 78 987 65 43"
                  />

                  <FormField
                    label="Mot de passe"
                    required
                    type="password"
                    value={
                      schoolForm.admin_password
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_password',
                        e.target.value
                      )
                    }
                    placeholder="Minimum 6 caractères"
                    autoComplete="new-password"
                  />

                  <FormField
                    label="Confirmation du mot de passe"
                    required
                    type="password"
                    value={
                      schoolForm.admin_password_confirmation
                    }
                    onChange={(e) =>
                      updateSchoolField(
                        'admin_password_confirmation',
                        e.target.value
                      )
                    }
                    placeholder="Retapez le mot de passe"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="admin-form-info">
                <span>🔐</span>

                <p>
                  Le mot de passe sert à
                  créer le compte
                  sécurisé de l'Admin
                  École. Il n'est pas
                  enregistré dans la table
                  <code>profiles</code>.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    resetSchoolForm
                  }
                  disabled={schoolSaving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={schoolSaving}
                >
                  {schoolSaving
                    ? 'Création en cours...'
                    : '🏫 Créer l’école et l’Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard