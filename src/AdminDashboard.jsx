import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

const EMPTY_STATS = {
  schools: 0,
  schoolAdmins: 0,
  teachers: 0,
  students: 0,
  parents: 0,
  classes: 0,
  subjects: 0,
  documents: 0,
}

const MENU = [
  { id: 'overview', label: 'Vue générale', icon: '⌂' },
  { id: 'schools', label: 'Écoles', icon: '▣' },
  { id: 'admins', label: 'Admins École', icon: '♙' },
  { id: 'teachers', label: 'Enseignants', icon: '♟' },
  { id: 'students', label: 'Élèves', icon: '◉' },
  { id: 'parents', label: 'Parents', icon: '♧' },
  { id: 'classes', label: 'Classes', icon: '▤' },
  { id: 'subjects', label: 'Matières', icon: '▥' },
  { id: 'documents', label: 'Documents', icon: '▧' },
]

function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon">{icon}</div>

      <div className="admin-stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-icon">○</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="admin-modal-backdrop">
      <div className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`}>
        <div className="admin-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="admin-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

function FormField({ label, required = false, children }) {
  return (
    <label className="admin-form-field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>

      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}) {
  return (
    <input
      className="admin-input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

function Select({
  value,
  onChange,
  children,
  disabled = false,
}) {
  return (
    <select
      className="admin-input"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {children}
    </select>
  )
}

function ActionButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
}) {
  return (
    <button
      type={type}
      className={`admin-action-button admin-action-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default function AdminDashboard({
  profile,
  session,
  onLogout,
}) {
  const [activeMenu, setActiveMenu] = useState('overview')

  const [stats, setStats] = useState(EMPTY_STATS)

  const [schools, setSchools] = useState([])
  const [schoolAdmins, setSchoolAdmins] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [documents, setDocuments] = useState([])

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [schoolModalOpen, setSchoolModalOpen] = useState(false)
  const [savingSchool, setSavingSchool] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    city: 'Dakar',
    phone: '',
    email: '',
  })

  const [adminForm, setAdminForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
  })

  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [savingSubject, setSavingSubject] = useState(false)

  const [subjectForm, setSubjectForm] = useState({
    name: '',
  })

  const currentUserName =
    profile?.full_name ||
    session?.user?.email ||
    'Super Administrateur'

  const schoolNameById = useMemo(() => {
    const map = {}

    schools.forEach((school) => {
      map[school.id] = school.name
    })

    return map
  }, [schools])

  const classNameById = useMemo(() => {
    const map = {}

    classes.forEach((item) => {
      map[item.id] = item.name
    })

    return map
  }, [classes])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setErrorMessage('')

    try {
      const [
        schoolsResult,
        profilesResult,
        teachersResult,
        studentsResult,
        parentsResult,
        classesResult,
        subjectsResult,
        documentsResult,
      ] = await Promise.all([
        supabase
          .from('schools')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('profiles')
          .select('id, full_name, phone, role, school_id, active, username')
          .in('role', ['school_admin', 'admin'])
          .order('created_at', { ascending: false }),

        supabase
          .from('teachers')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('parents')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('classes')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true }),

        supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      const results = [
        schoolsResult,
        profilesResult,
        teachersResult,
        studentsResult,
        parentsResult,
        classesResult,
        subjectsResult,
        documentsResult,
      ]

      const failed = results.find((result) => result.error)

      if (failed?.error) {
        console.error('Erreur chargement dashboard:', failed.error)
        setErrorMessage(
          failed.error.message ||
            'Impossible de charger les données du tableau de bord.'
        )
      }

      const schoolsData = schoolsResult.data || []
      const profilesData = profilesResult.data || []
      const teachersData = teachersResult.data || []
      const studentsData = studentsResult.data || []
      const parentsData = parentsResult.data || []
      const classesData = classesResult.data || []
      const subjectsData = subjectsResult.data || []
      const documentsData = documentsResult.data || []

      setSchools(schoolsData)
      setSchoolAdmins(profilesData)
      setTeachers(teachersData)
      setStudents(studentsData)
      setParents(parentsData)
      setClasses(classesData)
      setSubjects(subjectsData)
      setDocuments(documentsData)

      setStats({
        schools: schoolsData.length,
        schoolAdmins: profilesData.length,
        teachers: teachersData.length,
        students: studentsData.length,
        parents: parentsData.length,
        classes: classesData.length,
        subjects: subjectsData.length,
        documents: documentsData.length,
      })
    } catch (error) {
      console.error('Erreur dashboard:', error)

      setErrorMessage(
        error?.message ||
          'Une erreur est survenue pendant le chargement.'
      )
    } finally {
      setLoading(false)
    }
  }

  function resetSchoolForm() {
    setEditingSchool(null)

    setSchoolForm({
      name: '',
      address: '',
      city: 'Dakar',
      phone: '',
      email: '',
    })

    setAdminForm({
      full_name: '',
      username: '',
      email: '',
      phone: '',
    })
  }

  function openCreateSchool() {
    resetSchoolForm()
    setSchoolModalOpen(true)
  }

  function openEditSchool(school) {
    setEditingSchool(school)

    setSchoolForm({
      name: school.name || '',
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
    })

    setAdminForm({
      full_name: '',
      username: '',
      email: '',
      phone: '',
    })

    setSchoolModalOpen(true)
  }

  function closeSchoolModal() {
    if (savingSchool) return

    setSchoolModalOpen(false)
    resetSchoolForm()
  }

  async function saveSchool(event) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const schoolName = schoolForm.name.trim()

    if (!schoolName) {
      setErrorMessage('Le nom de l’école est obligatoire.')
      return
    }

    if (editingSchool) {
      setSavingSchool(true)

      try {
        const { error } = await supabase
          .from('schools')
          .update({
            name: schoolName,
            address: schoolForm.address.trim() || null,
            city: schoolForm.city.trim() || null,
            phone: schoolForm.phone.trim() || null,
            email: schoolForm.email.trim() || null,
          })
          .eq('id', editingSchool.id)

        if (error) throw error

        setSuccessMessage('École mise à jour avec succès.')
        setSchoolModalOpen(false)
        resetSchoolForm()

        await loadDashboard()
      } catch (error) {
        console.error('Erreur modification école:', error)

        setErrorMessage(
          error?.message ||
            'Impossible de modifier cette école.'
        )
      } finally {
        setSavingSchool(false)
      }

      return
    }

    const adminName = adminForm.full_name.trim()
    const username = adminForm.username.trim()
    const adminEmail = adminForm.email.trim().toLowerCase()

    if (!adminName) {
      setErrorMessage(
        'Le nom complet de l’Admin École est obligatoire.'
      )
      return
    }

    if (!username) {
      setErrorMessage(
        'Le nom d’utilisateur de l’Admin École est obligatoire.'
      )
      return
    }

    if (!adminEmail) {
      setErrorMessage(
        'L’adresse email de l’Admin École est obligatoire.'
      )
      return
    }

    setSavingSchool(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        'create-school-admin',
        {
          body: {
            school: {
              name: schoolName,
              address: schoolForm.address.trim() || null,
              city: schoolForm.city.trim() || null,
              phone: schoolForm.phone.trim() || null,
              email: schoolForm.email.trim() || null,
            },

            admin: {
              full_name: adminName,
              username,
              email: adminEmail,
              phone: adminForm.phone.trim() || null,
            },

            // IMPORTANT :
            // Aucune classe n'est créée ici.
            // Les classes seront créées par l'Admin École.
          },
        }
      )

      if (error) {
        console.error(
          'Erreur Edge Function create-school-admin:',
          error
        )

        throw error
      }

      console.log(
        'École + Admin École créés:',
        data
      )

      setSuccessMessage(
        'École et Admin École créés avec succès.'
      )

      setSchoolModalOpen(false)
      resetSchoolForm()

      await loadDashboard()
    } catch (error) {
      console.error('Erreur création école:', error)

      setErrorMessage(
        error?.message ||
          'Impossible de créer l’école et son Admin École.'
      )
    } finally {
      setSavingSchool(false)
    }
  }

  function openCreateSubject() {
    setEditingSubject(null)

    setSubjectForm({
      name: '',
    })

    setSubjectModalOpen(true)
  }

  function openEditSubject(subject) {
    setEditingSubject(subject)

    setSubjectForm({
      name: subject.name || '',
    })

    setSubjectModalOpen(true)
  }

  function closeSubjectModal() {
    if (savingSubject) return

    setSubjectModalOpen(false)
    setEditingSubject(null)

    setSubjectForm({
      name: '',
    })
  }

  async function saveSubject(event) {
    event.preventDefault()

    const name = subjectForm.name.trim()

    if (!name) {
      setErrorMessage('Le nom de la matière est obligatoire.')
      return
    }

    setSavingSubject(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name,
          })
          .eq('id', editingSubject.id)

        if (error) throw error

        setSuccessMessage(
          'Matière modifiée avec succès.'
        )
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({
            name,
          })

        if (error) throw error

        setSuccessMessage(
          'Matière créée avec succès.'
        )
      }

      closeSubjectModal()
      await loadDashboard()
    } catch (error) {
      console.error('Erreur matière:', error)

      setErrorMessage(
        error?.message ||
          'Impossible d’enregistrer cette matière.'
      )
    } finally {
      setSavingSubject(false)
    }
  }

  async function deleteSubject(subject) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la matière "${subject.name}" ?`
    )

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id)

      if (error) throw error

      setSuccessMessage(
        'Matière supprimée avec succès.'
      )

      await loadDashboard()
    } catch (error) {
      console.error('Erreur suppression matière:', error)

      setErrorMessage(
        error?.message ||
          'Impossible de supprimer cette matière.'
      )
    }
  }

  function getSchoolName(schoolId) {
    if (!schoolId) return '—'

    return schoolNameById[schoolId] || 'École inconnue'
  }

  function getClassName(classId) {
    if (!classId) return '—'

    return classNameById[classId] || 'Classe inconnue'
  }

  function renderOverview() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              ADMINISTRATION
            </span>

            <h1>Vue générale</h1>

            <p>
              Gérez l’environnement global d’École Connectée.
            </p>
          </div>

          <ActionButton onClick={openCreateSchool}>
            + Nouvelle école
          </ActionButton>
        </div>

        <div className="admin-stats-grid">
          <StatCard
            label="Écoles"
            value={stats.schools}
            icon="▣"
          />

          <StatCard
            label="Admins École"
            value={stats.schoolAdmins}
            icon="♙"
          />

          <StatCard
            label="Enseignants"
            value={stats.teachers}
            icon="♟"
          />

          <StatCard
            label="Élèves"
            value={stats.students}
            icon="◉"
          />

          <StatCard
            label="Parents"
            value={stats.parents}
            icon="♧"
          />

          <StatCard
            label="Classes"
            value={stats.classes}
            icon="▤"
          />

          <StatCard
            label="Matières"
            value={stats.subjects}
            icon="▥"
          />

          <StatCard
            label="Documents"
            value={stats.documents}
            icon="▧"
          />
        </div>

        <div className="admin-content-grid">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Actions rapides</h2>
                <p>
                  Les principales actions d’administration.
                </p>
              </div>
            </div>

            <div className="admin-quick-actions">
              <button
                type="button"
                onClick={openCreateSchool}
                className="admin-quick-action"
              >
                <span>＋</span>
                <strong>Nouvelle école</strong>
                <small>
                  École + Admin École
                </small>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('admins')}
                className="admin-quick-action"
              >
                <span>♙</span>
                <strong>Admins École</strong>
                <small>
                  Consulter les administrateurs
                </small>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('classes')}
                className="admin-quick-action"
              >
                <span>▤</span>
                <strong>Classes</strong>
                <small>
                  Voir les classes des écoles
                </small>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('subjects')}
                className="admin-quick-action"
              >
                <span>▥</span>
                <strong>Matières</strong>
                <small>
                  Gérer les matières
                </small>
              </button>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Dernières écoles</h2>
                <p>
                  Les écoles récemment enregistrées.
                </p>
              </div>
            </div>

            {schools.length === 0 ? (
              <EmptyState
                title="Aucune école"
                text="Créez votre première école pour commencer."
              />
            ) : (
              <div className="admin-list">
                {schools.slice(0, 5).map((school) => (
                  <div
                    key={school.id}
                    className="admin-list-item"
                  >
                    <div>
                      <strong>{school.name}</strong>
                      <span>
                        {school.city || 'Ville non renseignée'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditSchool(school)}
                      className="admin-link-button"
                    >
                      Voir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </>
    )
  }

  function renderSchools() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              STRUCTURE
            </span>

            <h1>Écoles</h1>

            <p>
              Créez et gérez les établissements présents sur la plateforme.
            </p>
          </div>

          <ActionButton onClick={openCreateSchool}>
            + Nouvelle école
          </ActionButton>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Liste des écoles</h2>
              <p>
                Chaque école possède son propre espace d’administration.
              </p>
            </div>

            <span className="admin-count">
              {schools.length} école
              {schools.length !== 1 ? 's' : ''}
            </span>
          </div>

          {schools.length === 0 ? (
            <EmptyState
              title="Aucune école"
              text="Aucune école n’a encore été créée."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>École</th>
                    <th>Ville</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td>
                        <strong>{school.name}</strong>
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

                      <td>
                        <span className="admin-status">
                          {school.active === false
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() =>
                            openEditSchool(school)
                          }
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderAdmins() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              ADMINISTRATION
            </span>

            <h1>Admins École</h1>

            <p>
              Consultez les administrateurs responsables de chaque établissement.
            </p>
          </div>
        </div>

        <div className="admin-info-banner">
          <strong>Organisation des écoles</strong>

          <p>
            Le Super Admin crée l’école et son Admin École.
            L’Admin École crée ensuite les classes et organise
            la structure pédagogique de son établissement.
          </p>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Administrateurs</h2>
              <p>
                Liste des comptes administrateurs des écoles.
              </p>
            </div>

            <span className="admin-count">
              {schoolAdmins.length}
            </span>
          </div>

          {schoolAdmins.length === 0 ? (
            <EmptyState
              title="Aucun Admin École"
              text="Les administrateurs apparaîtront ici après la création des écoles."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Utilisateur</th>
                    <th>École</th>
                    <th>Téléphone</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {schoolAdmins.map((admin) => (
                    <tr key={admin.id}>
                      <td>
                        <strong>
                          {admin.full_name || '—'}
                        </strong>
                      </td>

                      <td>
                        {admin.username || '—'}
                      </td>

                      <td>
                        {getSchoolName(admin.school_id)}
                      </td>

                      <td>
                        {admin.phone || '—'}
                      </td>

                      <td>
                        <span className="admin-status">
                          {admin.active === false
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderTeachers() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              PERSONNEL
            </span>

            <h1>Enseignants</h1>

            <p>
              Vue globale des enseignants enregistrés dans les écoles.
            </p>
          </div>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Liste des enseignants</h2>
            </div>

            <span className="admin-count">
              {teachers.length}
            </span>
          </div>

          {teachers.length === 0 ? (
            <EmptyState
              title="Aucun enseignant"
              text="Les enseignants apparaîtront ici lorsqu’ils seront créés par les écoles."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>École</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>
                        <strong>
                          {teacher.display_name || '—'}
                        </strong>
                      </td>

                      <td>
                        {getSchoolName(teacher.school_id)}
                      </td>

                      <td>
                        <span className="admin-status">
                          {teacher.active === false
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderStudents() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              SCOLARITÉ
            </span>

            <h1>Élèves</h1>

            <p>
              Vue globale des élèves inscrits dans les établissements.
            </p>
          </div>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Liste des élèves</h2>
            </div>

            <span className="admin-count">
              {students.length}
            </span>
          </div>

          {students.length === 0 ? (
            <EmptyState
              title="Aucun élève"
              text="Les élèves apparaîtront ici après leur inscription."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Élève</th>
                    <th>Code</th>
                    <th>École</th>
                    <th>Classe</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>
                          {student.first_name || ''}{' '}
                          {student.last_name || ''}
                        </strong>
                      </td>

                      <td>
                        {student.student_code || '—'}
                      </td>

                      <td>
                        {getSchoolName(student.school_id)}
                      </td>

                      <td>
                        {getClassName(student.class_id)}
                      </td>

                      <td>
                        <span className="admin-status">
                          {student.active === false
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderParents() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              FAMILLES
            </span>

            <h1>Parents</h1>

            <p>
              Vue globale des parents présents sur la plateforme.
            </p>
          </div>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Liste des parents</h2>
            </div>

            <span className="admin-count">
              {parents.length}
            </span>
          </div>

          {parents.length === 0 ? (
            <EmptyState
              title="Aucun parent"
              text="Les parents apparaîtront ici après leur inscription."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>École</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {parents.map((parent) => (
                    <tr key={parent.id}>
                      <td>
                        <strong>
                          {parent.full_name || '—'}
                        </strong>
                      </td>

                      <td>
                        {parent.phone || '—'}
                      </td>

                      <td>
                        {parent.email || '—'}
                      </td>

                      <td>
                        {getSchoolName(parent.school_id)}
                      </td>

                      <td>
                        <span className="admin-status">
                          {parent.active === false
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderClasses() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              STRUCTURE PÉDAGOGIQUE
            </span>

            <h1>Classes</h1>

            <p>
              Vue globale des classes créées et gérées par les Administrateurs d’école.
            </p>
          </div>
        </div>

        <div className="admin-info-banner">
          <strong>Gestion des classes</strong>

          <p>
            Les classes ne sont plus créées par le Super Admin.
            Chaque Admin École crée et gère les classes de son établissement.
          </p>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Classes enregistrées</h2>

              <p>
                Consultation globale uniquement.
              </p>
            </div>

            <span className="admin-count">
              {classes.length}
            </span>
          </div>

          {classes.length === 0 ? (
            <EmptyState
              title="Aucune classe"
              text="Les classes apparaîtront ici lorsque les Administrateurs d’école les auront créées."
            />
          ) : (
            <div className="admin-table-wrapper">
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
                          {item.name || '—'}
                        </strong>
                      </td>

                      <td>
                        {item.level || '—'}
                      </td>

                      <td>
                        {getSchoolName(item.school_id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderSubjects() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              PÉDAGOGIE
            </span>

            <h1>Matières</h1>

            <p>
              Gérez les matières disponibles dans École Connectée.
            </p>
          </div>

          <ActionButton onClick={openCreateSubject}>
            + Nouvelle matière
          </ActionButton>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Matières disponibles</h2>
            </div>

            <span className="admin-count">
              {subjects.length}
            </span>
          </div>

          {subjects.length === 0 ? (
            <EmptyState
              title="Aucune matière"
              text="Ajoutez votre première matière."
            />
          ) : (
            <div className="admin-subject-grid">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="admin-subject-card"
                >
                  <div>
                    <span className="admin-subject-icon">
                      ▥
                    </span>

                    <strong>
                      {subject.name}
                    </strong>
                  </div>

                  <div className="admin-subject-actions">
                    <button
                      type="button"
                      onClick={() =>
                        openEditSubject(subject)
                      }
                      className="admin-table-action"
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSubject(subject)
                      }
                      className="admin-danger-link"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    )
  }

  function renderDocuments() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">
              CONTENU
            </span>

            <h1>Documents</h1>

            <p>
              Vue globale des contenus pédagogiques publiés.
            </p>
          </div>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Documents pédagogiques</h2>
            </div>

            <span className="admin-count">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <EmptyState
              title="Aucun document"
              text="Les documents pédagogiques apparaîtront ici après leur publication."
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Classe</th>
                    <th>École</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <strong>
                          {document.title || 'Sans titre'}
                        </strong>
                      </td>

                      <td>
                        {document.document_type || '—'}
                      </td>

                      <td>
                        {getClassName(document.class_id)}
                      </td>

                      <td>
                        {document.school_id
                          ? getSchoolName(document.school_id)
                          : '—'}
                      </td>

                      <td>
                        {document.created_at
                          ? new Date(
                              document.created_at
                            ).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    )
  }

  function renderActivePage() {
    switch (activeMenu) {
      case 'schools':
        return renderSchools()

      case 'admins':
        return renderAdmins()

      case 'teachers':
        return renderTeachers()

      case 'students':
        return renderStudents()

      case 'parents':
        return renderParents()

      case 'classes':
        return renderClasses()

      case 'subjects':
        return renderSubjects()

      case 'documents':
        return renderDocuments()

      case 'overview':
      default:
        return renderOverview()
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">
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
          <span className="admin-nav-section">
            MENU PRINCIPAL
          </span>

          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${
                activeMenu === item.id
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveMenu(item.id)
              }
            >
              <span className="admin-nav-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-mini">
            <div className="admin-avatar">
              {currentUserName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {currentUserName}
              </strong>

              <span>
                Super Admin
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={onLogout}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar-title">
              Administration
            </span>

            <span className="admin-topbar-subtitle">
              Gestion centrale d’École Connectée
            </span>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-refresh"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading
                ? 'Actualisation…'
                : 'Actualiser'}
            </button>

            <div className="admin-topbar-user">
              <div className="admin-avatar">
                {currentUserName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {currentUserName}
                </strong>

                <span>
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {errorMessage && (
            <div className="admin-alert admin-alert-error">
              <strong>Erreur</strong>

              <span>
                {errorMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage('')
                }
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="admin-alert admin-alert-success">
              <strong>Succès</strong>

              <span>
                {successMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage('')
                }
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="admin-loading">
              <div className="admin-loading-spinner" />

              <h2>
                Chargement du tableau de bord…
              </h2>

              <p>
                Récupération des données École Connectée.
              </p>
            </div>
          ) : (
            renderActivePage()
          )}
        </div>
      </main>

      {schoolModalOpen && (
        <Modal
          title={
            editingSchool
              ? 'Modifier l’école'
              : 'Nouvelle école'
          }
          subtitle={
            editingSchool
              ? 'Modifiez les informations de l’établissement.'
              : 'Créez une école et son Admin École.'
          }
          onClose={closeSchoolModal}
          wide
        >
          <form
            onSubmit={saveSchool}
            className="admin-form"
          >
            <div className="admin-form-section">
              <div className="admin-form-section-heading">
                <div>
                  <span className="admin-form-section-number">
                    01
                  </span>
                </div>

                <div>
                  <h3>
                    Informations de l’école
                  </h3>

                  <p>
                    Informations principales de l’établissement.
                  </p>
                </div>
              </div>

              <div className="admin-form-grid">
                <FormField
                  label="Nom de l’école"
                  required
                >
                  <Input
                    value={schoolForm.name}
                    onChange={(event) =>
                      setSchoolForm({
                        ...schoolForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="Ex : École Connectée Dakar"
                  />
                </FormField>

                <FormField label="Ville">
                  <Input
                    value={schoolForm.city}
                    onChange={(event) =>
                      setSchoolForm({
                        ...schoolForm,
                        city: event.target.value,
                      })
                    }
                    placeholder="Dakar"
                  />
                </FormField>

                <FormField label="Adresse">
                  <Input
                    value={schoolForm.address}
                    onChange={(event) =>
                      setSchoolForm({
                        ...schoolForm,
                        address: event.target.value,
                      })
                    }
                    placeholder="Adresse de l’établissement"
                  />
                </FormField>

                <FormField label="Téléphone">
                  <Input
                    value={schoolForm.phone}
                    onChange={(event) =>
                      setSchoolForm({
                        ...schoolForm,
                        phone: event.target.value,
                      })
                    }
                    placeholder="Ex : 77 000 00 00"
                  />
                </FormField>

                <FormField label="Email de l’école">
                  <Input
                    type="email"
                    value={schoolForm.email}
                    onChange={(event) =>
                      setSchoolForm({
                        ...schoolForm,
                        email: event.target.value,
                      })
                    }
                    placeholder="contact@ecole.sn"
                  />
                </FormField>
              </div>
            </div>

            {!editingSchool && (
              <div className="admin-form-section">
                <div className="admin-form-section-heading">
                  <div>
                    <span className="admin-form-section-number">
                      02
                    </span>
                  </div>

                  <div>
                    <h3>
                      Admin École
                    </h3>

                    <p>
                      Le compte responsable de cet établissement.
                    </p>
                  </div>
                </div>

                <div className="admin-info-banner">
                  <strong>
                    Gestion des classes
                  </strong>

                  <p>
                    Aucune classe n’est créée à cette étape.
                    L’Admin École créera ensuite les classes
                    de son établissement depuis son propre tableau de bord.
                  </p>
                </div>

                <div className="admin-form-grid">
                  <FormField
                    label="Nom complet"
                    required
                  >
                    <Input
                      value={adminForm.full_name}
                      onChange={(event) =>
                        setAdminForm({
                          ...adminForm,
                          full_name:
                            event.target.value,
                        })
                      }
                      placeholder="Ex : Fatou Diop"
                    />
                  </FormField>

                  <FormField
                    label="Nom d’utilisateur"
                    required
                  >
                    <Input
                      value={adminForm.username}
                      onChange={(event) =>
                        setAdminForm({
                          ...adminForm,
                          username:
                            event.target.value,
                        })
                      }
                      placeholder="Ex : admin_ecole"
                    />
                  </FormField>

                  <FormField
                    label="Email"
                    required
                  >
                    <Input
                      type="email"
                      value={adminForm.email}
                      onChange={(event) =>
                        setAdminForm({
                          ...adminForm,
                          email:
                            event.target.value,
                        })
                      }
                      placeholder="admin@ecole.sn"
                    />
                  </FormField>

                  <FormField label="Téléphone">
                    <Input
                      value={adminForm.phone}
                      onChange={(event) =>
                        setAdminForm({
                          ...adminForm,
                          phone:
                            event.target.value,
                        })
                      }
                      placeholder="Ex : 77 000 00 00"
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="admin-modal-footer">
              <ActionButton
                variant="secondary"
                onClick={closeSchoolModal}
                disabled={savingSchool}
              >
                Annuler
              </ActionButton>

              <ActionButton
                type="submit"
                disabled={savingSchool}
              >
                {savingSchool
                  ? 'Enregistrement…'
                  : editingSchool
                  ? 'Enregistrer les modifications'
                  : 'Créer l’école et l’Admin École'}
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}

      {subjectModalOpen && (
        <Modal
          title={
            editingSubject
              ? 'Modifier la matière'
              : 'Nouvelle matière'
          }
          subtitle="Gérez les matières disponibles dans École Connectée."
          onClose={closeSubjectModal}
        >
          <form
            onSubmit={saveSubject}
            className="admin-form"
          >
            <FormField
              label="Nom de la matière"
              required
            >
              <Input
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm({
                    name: event.target.value,
                  })
                }
                placeholder="Ex : Mathématiques"
              />
            </FormField>

            <div className="admin-modal-footer">
              <ActionButton
                variant="secondary"
                onClick={closeSubjectModal}
                disabled={savingSubject}
              >
                Annuler
              </ActionButton>

              <ActionButton
                type="submit"
                disabled={savingSubject}
              >
                {savingSubject
                  ? 'Enregistrement…'
                  : editingSubject
                  ? 'Enregistrer'
                  : 'Créer la matière'}
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}