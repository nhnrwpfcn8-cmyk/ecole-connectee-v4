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
  { key: 'overview', label: 'Vue générale', icon: '▦' },
  { key: 'schools', label: 'Écoles', icon: '🏫' },
  { key: 'admins', label: 'Admins École', icon: '👤' },
  { key: 'teachers', label: 'Enseignants', icon: '👨‍🏫' },
  { key: 'students', label: 'Élèves', icon: '🎓' },
  { key: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
  { key: 'classes', label: 'Classes', icon: '📚' },
  { key: 'subjects', label: 'Matières', icon: '📖' },
  { key: 'documents', label: 'Documents', icon: '📄' },
]

function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon">{icon}</div>

      <div>
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-icon">📭</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div
      className="admin-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className={`admin-modal ${
          wide ? 'admin-modal-wide' : ''
        }`}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="admin-modal-header">
          <h2>{title}</h2>

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

function FormField({
  label,
  required = false,
  children,
}) {
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
  variant = 'secondary',
  type = 'button',
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
  onLogout,
}) {
  const isSuperAdmin =
    profile?.role === 'super_admin'

  const [activeMenu, setActiveMenu] =
    useState('overview')

  const [stats, setStats] =
    useState(EMPTY_STATS)

  const [schools, setSchools] =
    useState([])

  const [admins, setAdmins] =
    useState([])

  const [teachers, setTeachers] =
    useState([])

  const [students, setStudents] =
    useState([])

  const [parents, setParents] =
    useState([])

  const [classes, setClasses] =
    useState([])

  const [subjects, setSubjects] =
    useState([])

  const [documents, setDocuments] =
    useState([])

  const [schoolAdminClasses, setSchoolAdminClasses] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [schoolModalOpen, setSchoolModalOpen] =
    useState(false)

  const [editingSchool, setEditingSchool] =
    useState(null)

  const [classModalOpen, setClassModalOpen] =
    useState(false)

  const [editingClass, setEditingClass] =
    useState(null)

  const [subjectModalOpen, setSubjectModalOpen] =
    useState(false)

  const [editingSubject, setEditingSubject] =
    useState(null)

  const [savingSchool, setSavingSchool] =
    useState(false)

  const [savingClass, setSavingClass] =
    useState(false)

  const [savingSubject, setSavingSubject] =
    useState(false)

  const [schoolForm, setSchoolForm] =
    useState({
      name: '',
      address: '',
      city: 'Dakar',
      phone: '',
      email: '',
      active: true,

      admin_full_name: '',
      admin_email: '',
      admin_password: '',
      admin_phone: '',
    })

  const [schoolClasses, setSchoolClasses] =
    useState([
      {
        name: '',
        level: '',
      },
    ])

  const [classForm, setClassForm] =
    useState({
      name: '',
      level: '',
      school_id: '',
    })

  const [subjectForm, setSubjectForm] =
    useState({
      name: '',
    })

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function loadDashboard(
    showRefresh = false,
  ) {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const results =
        await Promise.all([
          supabase
            .from('schools')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('profiles')
            .select(
              'id, full_name, phone, username, role, school_id, active, created_at',
            )
            .in('role', [
              'school_admin',
              'admin',
            ])
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('teachers')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('students')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('parents')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('classes')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('subjects')
            .select('*')
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('documents')
            .select('*')
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('school_admin_classes')
            .select(
              'id, school_admin_id, class_id, created_at',
            ),
        ])

      const [
        schoolsResult,
        adminsResult,
        teachersResult,
        studentsResult,
        parentsResult,
        classesResult,
        subjectsResult,
        documentsResult,
        schoolAdminClassesResult,
      ] = results

      const schoolData =
        schoolsResult.data || []

      const adminData =
        adminsResult.data || []

      const teacherData =
        teachersResult.data || []

      const studentData =
        studentsResult.data || []

      const parentData =
        parentsResult.data || []

      const classData =
        classesResult.data || []

      const subjectData =
        subjectsResult.data || []

      const documentData =
        documentsResult.data || []

      const schoolAdminClassData =
        schoolAdminClassesResult.data || []

      setSchools(schoolData)
      setAdmins(adminData)
      setTeachers(teacherData)
      setStudents(studentData)
      setParents(parentData)
      setClasses(classData)
      setSubjects(subjectData)
      setDocuments(documentData)
      setSchoolAdminClasses(
        schoolAdminClassData,
      )

      setStats({
        schools: schoolData.length,
        teachers: teacherData.length,
        students: studentData.length,
        parents: parentData.length,
        admins: adminData.length,
        classes: classData.length,
        subjects: subjectData.length,
        documents: documentData.length,
      })

      const firstError =
        results.find(
          (result) => result.error,
        )?.error

      if (firstError) {
        console.warn(
          'Certaines données n’ont pas pu être chargées :',
          firstError.message,
        )
      }
    } catch (err) {
      console.error(
        'Erreur chargement tableau de bord :',
        err,
      )

      setError(
        err?.message ||
          'Impossible de charger les données.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }

    loadDashboard()
  }, [isSuperAdmin])

  const schoolNameById =
    useMemo(() => {
      const map = {}

      schools.forEach((school) => {
        map[school.id] = school.name
      })

      return map
    }, [schools])

  const classNameById =
    useMemo(() => {
      const map = {}

      classes.forEach((item) => {
        map[item.id] = item.name
      })

      return map
    }, [classes])

  const adminClassNamesByAdminId =
    useMemo(() => {
      const map = {}

      schoolAdminClasses.forEach(
        (link) => {
          if (
            !map[link.school_admin_id]
          ) {
            map[link.school_admin_id] =
              []
          }

          const className =
            classNameById[
              link.class_id
            ]

          if (
            className &&
            !map[
              link.school_admin_id
            ].includes(className)
          ) {
            map[
              link.school_admin_id
            ].push(className)
          }
        },
      )

      return map
    }, [
      schoolAdminClasses,
      classNameById,
    ])

  function openCreateSchool() {
    clearMessages()

    setEditingSchool(null)

    setSchoolForm({
      name: '',
      address: '',
      city: 'Dakar',
      phone: '',
      email: '',
      active: true,

      admin_full_name: '',
      admin_email: '',
      admin_password: '',
      admin_phone: '',
    })

    setSchoolClasses([
      {
        name: '',
        level: '',
      },
    ])

    setSchoolModalOpen(true)
  }

  function openEditSchool(school) {
    clearMessages()

    setEditingSchool(school)

    setSchoolForm({
      name: school.name || '',
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
      active:
        school.active !== false,

      admin_full_name: '',
      admin_email: '',
      admin_password: '',
      admin_phone: '',
    })

    setSchoolClasses([])

    setSchoolModalOpen(true)
  }

  function closeSchoolModal() {
    if (savingSchool) return

    setSchoolModalOpen(false)
    setEditingSchool(null)
  }

  function updateSchoolField(
    field,
    value,
  ) {
    setSchoolForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateSchoolClass(
    index,
    field,
    value,
  ) {
    setSchoolClasses((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
      ),
    )
  }

  function addSchoolClass() {
    setSchoolClasses((current) => [
      ...current,
      {
        name: '',
        level: '',
      },
    ])
  }

  function removeSchoolClass(index) {
    setSchoolClasses((current) => {
      if (current.length === 1) {
        return current
      }

      return current.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      )
    })
  }

  async function saveSchool(event) {
    event.preventDefault()

    clearMessages()

    if (!schoolForm.name.trim()) {
      setError(
        "Le nom de l'école est obligatoire.",
      )
      return
    }

    setSavingSchool(true)

    try {
      if (editingSchool) {
        const {
          error: updateError,
        } = await supabase
          .from('schools')
          .update({
            name: schoolForm.name.trim(),
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
              schoolForm.email.trim() ||
              null,
            active:
              schoolForm.active,
          })
          .eq(
            'id',
            editingSchool.id,
          )

        if (updateError) {
          throw updateError
        }

        setSchoolModalOpen(false)
        setEditingSchool(null)

        setSuccess(
          "L'école a été mise à jour avec succès.",
        )

        await loadDashboard(true)

        return
      }

      const adminName =
        schoolForm.admin_full_name.trim()

      const adminEmail =
        schoolForm.admin_email
          .trim()
          .toLowerCase()

      const adminPassword =
        schoolForm.admin_password

      if (!adminName) {
        setError(
          "Le nom de l'Administrateur d'école est obligatoire.",
        )
        return
      }

      if (!adminEmail) {
        setError(
          "L'adresse email de l'Administrateur d'école est obligatoire.",
        )
        return
      }

      if (!adminPassword) {
        setError(
          "Le mot de passe de l'Administrateur d'école est obligatoire.",
        )
        return
      }

      if (adminPassword.length < 6) {
        setError(
          'Le mot de passe doit contenir au moins 6 caractères.',
        )
        return
      }

      const validClasses =
        schoolClasses
          .filter(
            (item) =>
              item.name &&
              item.name.trim(),
          )
          .map((item) => ({
            name: item.name.trim(),
            level:
              item.level?.trim() ||
              null,
          }))

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        'create-school-admin',
        {
          body: {
            school: {
              name: schoolForm.name.trim(),
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
                schoolForm.email.trim() ||
                null,
            },

            admin: {
              full_name: adminName,
              email: adminEmail,
              password:
                adminPassword,
              phone:
                schoolForm.admin_phone.trim() ||
                null,
            },

            classes: validClasses,
          },
        },
      )

      if (functionError) {
        console.error(
          'Erreur Edge Function :',
          functionError,
        )

        throw new Error(
          functionError.message ||
            "Impossible de créer l'école.",
        )
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Impossible de créer l'école.",
        )
      }

      setSchoolModalOpen(false)
      setEditingSchool(null)

      setSuccess(
        data.message ||
          "L'école et son Administrateur d'école ont été créés avec succès.",
      )

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur école :',
        err,
      )

      setError(
        err?.message ||
          "Une erreur est survenue lors de la création de l'école.",
      )
    } finally {
      setSavingSchool(false)
    }
  }

  async function toggleSchool(
    school,
  ) {
    clearMessages()

    try {
      const {
        error: updateError,
      } = await supabase
        .from('schools')
        .update({
          active:
            school.active === false,
        })
        .eq('id', school.id)

      if (updateError) {
        throw updateError
      }

      setSuccess(
        school.active === false
          ? "L'école a été activée."
          : "L'école a été désactivée.",
      )

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur statut école :',
        err,
      )

      setError(
        err?.message ||
          "Impossible de modifier le statut de l'école.",
      )
    }
  }

  function openCreateClass() {
    clearMessages()

    setEditingClass(null)

    setClassForm({
      name: '',
      level: '',
      school_id:
        schools[0]?.id || '',
    })

    setClassModalOpen(true)
  }

  function openEditClass(item) {
    clearMessages()

    setEditingClass(item)

    setClassForm({
      name: item.name || '',
      level: item.level || '',
      school_id:
        item.school_id || '',
    })

    setClassModalOpen(true)
  }

  function closeClassModal() {
    if (savingClass) return

    setClassModalOpen(false)
    setEditingClass(null)
  }

  async function saveClass(event) {
    event.preventDefault()

    clearMessages()

    if (!classForm.name.trim()) {
      setError(
        'Le nom de la classe est obligatoire.',
      )
      return
    }

    if (!classForm.school_id) {
      setError(
        'Veuillez sélectionner une école.',
      )
      return
    }

    setSavingClass(true)

    try {
      const payload = {
        name: classForm.name.trim(),
        level:
          classForm.level.trim() ||
          null,
        school_id:
          classForm.school_id,
      }

      if (editingClass) {
        const {
          error: updateError,
        } = await supabase
          .from('classes')
          .update(payload)
          .eq(
            'id',
            editingClass.id,
          )

        if (updateError) {
          throw updateError
        }

        setSuccess(
          'La classe a été mise à jour.',
        )
      } else {
        const {
          error: insertError,
        } = await supabase
          .from('classes')
          .insert(payload)

        if (insertError) {
          throw insertError
        }

        setSuccess(
          'La classe a été créée.',
        )
      }

      setClassModalOpen(false)
      setEditingClass(null)

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur classe :',
        err,
      )

      setError(
        err?.message ||
          'Impossible de sauvegarder la classe.',
      )
    } finally {
      setSavingClass(false)
    }
  }

  async function deleteClass(item) {
    clearMessages()

    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer la classe "${item.name}" ?`,
      )

    if (!confirmed) {
      return
    }

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('classes')
        .delete()
        .eq('id', item.id)

      if (deleteError) {
        throw deleteError
      }

      setSuccess(
        'La classe a été supprimée.',
      )

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur suppression classe :',
        err,
      )

      setError(
        err?.message ||
          'Impossible de supprimer la classe.',
      )
    }
  }

  function openCreateSubject() {
    clearMessages()

    setEditingSubject(null)

    setSubjectForm({
      name: '',
    })

    setSubjectModalOpen(true)
  }

  function openEditSubject(item) {
    clearMessages()

    setEditingSubject(item)

    setSubjectForm({
      name: item.name || '',
    })

    setSubjectModalOpen(true)
  }

  function closeSubjectModal() {
    if (savingSubject) return

    setSubjectModalOpen(false)
    setEditingSubject(null)
  }

  async function saveSubject(event) {
    event.preventDefault()

    clearMessages()

    if (!subjectForm.name.trim()) {
      setError(
        'Le nom de la matière est obligatoire.',
      )
      return
    }

    setSavingSubject(true)

    try {
      if (editingSubject) {
        const {
          error: updateError,
        } = await supabase
          .from('subjects')
          .update({
            name:
              subjectForm.name.trim(),
          })
          .eq(
            'id',
            editingSubject.id,
          )

        if (updateError) {
          throw updateError
        }

        setSuccess(
          'La matière a été mise à jour.',
        )
      } else {
        const {
          error: insertError,
        } = await supabase
          .from('subjects')
          .insert({
            name:
              subjectForm.name.trim(),
          })

        if (insertError) {
          throw insertError
        }

        setSuccess(
          'La matière a été créée.',
        )
      }

      setSubjectModalOpen(false)
      setEditingSubject(null)

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur matière :',
        err,
      )

      setError(
        err?.message ||
          'Impossible de sauvegarder la matière.',
      )
    } finally {
      setSavingSubject(false)
    }
  }

  async function deleteSubject(
    item,
  ) {
    clearMessages()

    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer la matière "${item.name}" ?`,
      )

    if (!confirmed) {
      return
    }

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('subjects')
        .delete()
        .eq('id', item.id)

      if (deleteError) {
        throw deleteError
      }

      setSuccess(
        'La matière a été supprimée.',
      )

      await loadDashboard(true)
    } catch (err) {
      console.error(
        'Erreur suppression matière :',
        err,
      )

      setError(
        err?.message ||
          'Impossible de supprimer la matière.',
      )
    }
  }

  function renderOverview() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Vue générale</h1>

            <p>
              Bienvenue dans le centre
              d'administration d'École
              Connectée.
            </p>
          </div>

          <ActionButton
            variant="primary"
            onClick={() =>
              loadDashboard(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? 'Actualisation...'
              : '↻ Actualiser'}
          </ActionButton>
        </div>

        <div className="admin-stats-grid">
          <StatCard
            label="Écoles"
            value={stats.schools}
            icon="🏫"
          />

          <StatCard
            label="Admins École"
            value={stats.admins}
            icon="👤"
          />

          <StatCard
            label="Enseignants"
            value={stats.teachers}
            icon="👨‍🏫"
          />

          <StatCard
            label="Élèves"
            value={stats.students}
            icon="🎓"
          />

          <StatCard
            label="Parents"
            value={stats.parents}
            icon="👨‍👩‍👧"
          />

          <StatCard
            label="Classes"
            value={stats.classes}
            icon="📚"
          />

          <StatCard
            label="Matières"
            value={stats.subjects}
            icon="📖"
          />

          <StatCard
            label="Documents"
            value={stats.documents}
            icon="📄"
          />
        </div>

        <div className="admin-content-grid">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Administration</h2>

                <p>
                  Gestion centralisée de la
                  plateforme.
                </p>
              </div>
            </div>

            <div className="admin-quick-actions">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(
                    'schools',
                  )
                  openCreateSchool()
                }}
              >
                <span>🏫</span>

                <strong>
                  Nouvelle école
                </strong>

                <small>
                  École + Admin École +
                  classes
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu(
                    'admins',
                  )
                }
              >
                <span>👤</span>

                <strong>
                  Admins École
                </strong>

                <small>
                  Consulter les
                  administrateurs
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu(
                    'classes',
                  )
                }
              >
                <span>📚</span>

                <strong>
                  Classes
                </strong>

                <small>
                  Gérer les classes
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveMenu(
                    'subjects',
                  )
                }
              >
                <span>📖</span>

                <strong>
                  Matières
                </strong>

                <small>
                  Gérer les matières
                </small>
              </button>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>
                  Écoles récentes
                </h2>

                <p>
                  Les dernières écoles
                  créées.
                </p>
              </div>
            </div>

            {schools.length === 0 ? (
              <EmptyState
                title="Aucune école"
                text="Commencez par créer votre première école."
              />
            ) : (
              <div className="admin-mini-list">
                {schools
                  .slice(0, 5)
                  .map((school) => (
                    <div
                      className="admin-mini-item"
                      key={school.id}
                    >
                      <div className="admin-mini-avatar">
                        🏫
                      </div>

                      <div>
                        <strong>
                          {school.name}
                        </strong>

                        <span>
                          {school.city ||
                            'Ville non renseignée'}
                        </span>
                      </div>

                      <span
                        className={`admin-status ${
                          school.active ===
                          false
                            ? 'admin-status-off'
                            : 'admin-status-on'
                        }`}
                      >
                        {school.active ===
                        false
                          ? 'Inactive'
                          : 'Active'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  function renderSchools() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Écoles</h1>

            <p>
              Créez et gérez les
              établissements de la
              plateforme.
            </p>
          </div>

          <ActionButton
            variant="primary"
            onClick={
              openCreateSchool
            }
          >
            + Nouvelle école
          </ActionButton>
        </div>

        {schools.length === 0 ? (
          <EmptyState
            title="Aucune école"
            text="Créez votre première école pour commencer."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>École</th>
                    <th>Ville</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {schools.map(
                    (school) => (
                      <tr
                        key={
                          school.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              school.name
                            }
                          </strong>
                        </td>

                        <td>
                          {school.city ||
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

                        <td>
                          <span
                            className={`admin-status ${
                              school.active ===
                              false
                                ? 'admin-status-off'
                                : 'admin-status-on'
                            }`}
                          >
                            {school.active ===
                            false
                              ? 'Inactive'
                              : 'Active'}
                          </span>
                        </td>

                        <td>
                          <div className="admin-table-actions">
                            <ActionButton
                              onClick={() =>
                                openEditSchool(
                                  school,
                                )
                              }
                            >
                              Modifier
                            </ActionButton>

                            <ActionButton
                              variant={
                                school.active ===
                                false
                                  ? 'success'
                                  : 'danger'
                              }
                              onClick={() =>
                                toggleSchool(
                                  school,
                                )
                              }
                            >
                              {school.active ===
                              false
                                ? 'Activer'
                                : 'Désactiver'}
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderAdmins() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>
              Admins École
            </h1>

            <p>
              Chaque Admin École est
              directement rattaché à son
              établissement.
            </p>
          </div>

          <ActionButton
            variant="primary"
            onClick={() => {
              setActiveMenu(
                'schools',
              )
              openCreateSchool()
            }}
          >
            + Créer via une école
          </ActionButton>
        </div>

        <div className="admin-info-banner">
          <span>ℹ️</span>

          <div>
            <strong>
              Création des Admins École
            </strong>

            <p>
              Un Admin École est créé
              automatiquement lors de la
              création de son école. Les
              premières classes peuvent
              également lui être
              rattachées.
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <EmptyState
            title="Aucun Admin École"
            text="Créez une école pour créer automatiquement son administrateur."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      Administrateur
                    </th>

                    <th>
                      Identifiant
                    </th>

                    <th>École</th>

                    <th>Classes</th>

                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {admins.map(
                    (admin) => {
                      const adminClasses =
                        adminClassNamesByAdminId[
                          admin.id
                        ] || []

                      return (
                        <tr
                          key={
                            admin.id
                          }
                        >
                          <td>
                            <strong>
                              {admin.full_name ||
                                'Nom non renseigné'}
                            </strong>
                          </td>

                          <td>
                            {admin.username ||
                              '—'}
                          </td>

                          <td>
                            {schoolNameById[
                              admin.school_id
                            ] ||
                              '—'}
                          </td>

                          <td>
                            {adminClasses.length ===
                            0 ? (
                              <span className="admin-muted">
                                Aucune
                                classe
                              </span>
                            ) : (
                              <div className="admin-tag-list">
                                {adminClasses.map(
                                  (
                                    className,
                                  ) => (
                                    <span
                                      className="admin-tag"
                                      key={
                                        className
                                      }
                                    >
                                      {
                                        className
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              className={`admin-status ${
                                admin.active ===
                                false
                                  ? 'admin-status-off'
                                  : 'admin-status-on'
                              }`}
                            >
                              {admin.active ===
                              false
                                ? 'Inactive'
                                : 'Active'}
                            </span>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderTeachers() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>
              Enseignants
            </h1>

            <p>
              Vue globale des
              enseignants enregistrés.
            </p>
          </div>
        </div>

        {teachers.length === 0 ? (
          <EmptyState
            title="Aucun enseignant"
            text="Les enseignants seront créés par les Administrateurs d'école."
          />
        ) : (
          <div className="admin-panel">
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
                  {teachers.map(
                    (teacher) => (
                      <tr
                        key={
                          teacher.id
                        }
                      >
                        <td>
                          <strong>
                            {teacher.display_name ||
                              'Nom non renseigné'}
                          </strong>
                        </td>

                        <td>
                          {schoolNameById[
                            teacher.school_id
                          ] ||
                            '—'}
                        </td>

                        <td>
                          <span
                            className={`admin-status ${
                              teacher.active ===
                              false
                                ? 'admin-status-off'
                                : 'admin-status-on'
                            }`}
                          >
                            {teacher.active ===
                            false
                              ? 'Inactive'
                              : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderStudents() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Élèves</h1>

            <p>
              Vue globale des élèves de
              toutes les écoles.
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <EmptyState
            title="Aucun élève"
            text="Les élèves seront créés par les Administrateurs d'école."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
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
                  {students.map(
                    (student) => (
                      <tr
                        key={
                          student.id
                        }
                      >
                        <td>
                          <strong>
                            {student.first_name ||
                              ''}{' '}
                            {student.last_name ||
                              ''}
                          </strong>
                        </td>

                        <td>
                          {student.student_code ||
                            '—'}
                        </td>

                        <td>
                          {classNameById[
                            student.class_id
                          ] ||
                            '—'}
                        </td>

                        <td>
                          {schoolNameById[
                            student.school_id
                          ] ||
                            '—'}
                        </td>

                        <td>
                          <span
                            className={`admin-status ${
                              student.active ===
                              false
                                ? 'admin-status-off'
                                : 'admin-status-on'
                            }`}
                          >
                            {student.active ===
                            false
                              ? 'Inactive'
                              : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderParents() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Parents</h1>

            <p>
              Vue globale des parents
              inscrits sur la plateforme.
            </p>
          </div>
        </div>

        {parents.length === 0 ? (
          <EmptyState
            title="Aucun parent"
            text="Les comptes parents seront créés sur la plateforme."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>
                      Téléphone
                    </th>
                    <th>Email</th>
                    <th>École</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {parents.map(
                    (parent) => (
                      <tr
                        key={
                          parent.id
                        }
                      >
                        <td>
                          <strong>
                            {parent.full_name ||
                              'Nom non renseigné'}
                          </strong>
                        </td>

                        <td>
                          {parent.phone ||
                            '—'}
                        </td>

                        <td>
                          {parent.email ||
                            '—'}
                        </td>

                        <td>
                          {schoolNameById[
                            parent.school_id
                          ] ||
                            '—'}
                        </td>

                        <td>
                          <span
                            className={`admin-status ${
                              parent.active ===
                              false
                                ? 'admin-status-off'
                                : 'admin-status-on'
                            }`}
                          >
                            {parent.active ===
                            false
                              ? 'Inactive'
                              : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderClasses() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Classes</h1>

            <p>
              Gestion globale des classes
              des établissements.
            </p>
          </div>

          <ActionButton
            variant="primary"
            onClick={
              openCreateClass
            }
          >
            + Nouvelle classe
          </ActionButton>
        </div>

        {classes.length === 0 ? (
          <EmptyState
            title="Aucune classe"
            text="Les classes peuvent être créées avec une nouvelle école ou ici."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Niveau</th>
                    <th>École</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {classes.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          <strong>
                            {item.name}
                          </strong>
                        </td>

                        <td>
                          {item.level ||
                            '—'}
                        </td>

                        <td>
                          {schoolNameById[
                            item.school_id
                          ] ||
                            '—'}
                        </td>

                        <td>
                          <div className="admin-table-actions">
                            <ActionButton
                              onClick={() =>
                                openEditClass(
                                  item,
                                )
                              }
                            >
                              Modifier
                            </ActionButton>

                            <ActionButton
                              variant="danger"
                              onClick={() =>
                                deleteClass(
                                  item,
                                )
                              }
                            >
                              Supprimer
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderSubjects() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>
              Matières
            </h1>

            <p>
              Gestion des matières
              disponibles dans École
              Connectée.
            </p>
          </div>

          <ActionButton
            variant="primary"
            onClick={
              openCreateSubject
            }
          >
            + Nouvelle matière
          </ActionButton>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            title="Aucune matière"
            text="Créez les matières utilisées par les établissements."
          />
        ) : (
          <div className="admin-subject-grid">
            {subjects.map(
              (subject) => (
                <div
                  className="admin-subject-card"
                  key={
                    subject.id
                  }
                >
                  <div className="admin-subject-icon">
                    📖
                  </div>

                  <div className="admin-subject-content">
                    <strong>
                      {
                        subject.name
                      }
                    </strong>

                    <span>
                      Matière
                      disponible
                    </span>
                  </div>

                  <div className="admin-subject-actions">
                    <ActionButton
                      onClick={() =>
                        openEditSubject(
                          subject,
                        )
                      }
                    >
                      Modifier
                    </ActionButton>

                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        deleteSubject(
                          subject,
                        )
                      }
                    >
                      Supprimer
                    </ActionButton>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </>
    )
  }

  function renderDocuments() {
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>
              Documents
            </h1>

            <p>
              Vue globale des ressources
              pédagogiques.
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            title="Aucun document"
            text="Aucun document pédagogique n'a encore été publié."
          />
        ) : (
          <div className="admin-panel">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Classe</th>
                    <th>
                      Créé le
                    </th>
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
                          ] ||
                            '—'}
                        </td>

                        <td>
                          {document.created_at
                            ? new Date(
                                document.created_at,
                              ).toLocaleDateString(
                                'fr-FR',
                              )
                            : '—'}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderContent() {
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

  /*
   * Pour le moment, seul le Super Admin
   * accède au tableau de bord global.
   *
   * L'Admin École aura son propre
   * tableau de bord dans l'étape suivante.
   */

  if (!isSuperAdmin) {
    return (
      <div className="admin-layout">
        <main
          className="admin-main"
          style={{
            marginLeft: 0,
            width: '100%',
          }}
        >
          <div className="admin-topbar">
            <div>
              <h2>
                École Connectée
              </h2>

              <span>
                Espace Administrateur
              </span>
            </div>

            <button
              type="button"
              className="admin-logout-button"
              onClick={onLogout}
            >
              Déconnexion
            </button>
          </div>

          <div className="admin-page">
            <div className="admin-panel">
              <div className="admin-empty">
                <div className="admin-empty-icon">
                  🏫
                </div>

                <h2>
                  Espace Admin École
                </h2>

                <p>
                  Votre espace
                  Administrateur d'école
                  sera disponible dans la
                  prochaine étape.
                </p>

                <p>
                  Votre compte est bien
                  reconnu comme
                  Administrateur d'école.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">
            EC
          </div>

          <div>
            <strong>
              École Connectée
            </strong>

            <span>
              Super Administration
            </span>
          </div>
        </div>

        <nav className="admin-nav">
          {MENU.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`admin-nav-item ${
                activeMenu ===
                item.key
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveMenu(
                  item.key,
                )
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

        <div className="admin-sidebar-bottom">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {(
                profile?.full_name ||
                'S'
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {profile?.full_name ||
                  'Super Admin'}
              </strong>

              <span>
                Super Administrateur
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={onLogout}
          >
            ↪ Déconnexion
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">
              Administration
            </span>

            <h2>
              {MENU.find(
                (item) =>
                  item.key ===
                  activeMenu,
              )?.label ||
                'Vue générale'}
            </h2>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-topbar-user">
              <div className="admin-user-avatar small">
                {(
                  profile?.full_name ||
                  'S'
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {profile?.full_name ||
                    'Super Admin'}
                </strong>

                <span>
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-page">
          {success && (
            <div className="admin-alert admin-alert-success">
              <span>✓</span>

              <div>
                {success}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccess('')
                }
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="admin-alert admin-alert-error">
              <span>!</span>

              <div>
                {error}
              </div>

              <button
                type="button"
                onClick={() =>
                  setError('')
                }
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="admin-loading">
              <div className="admin-loading-spinner" />

              <p>
                Chargement du tableau
                de bord...
              </p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>

      {schoolModalOpen && (
        <Modal
          title={
            editingSchool
              ? "Modifier l'école"
              : 'Nouvelle école'
          }
          onClose={
            closeSchoolModal
          }
          wide={!editingSchool}
        >
          <form
            onSubmit={
              saveSchool
            }
          >
            <div className="admin-form-grid">
              <FormField
                label="Nom de l'école"
                required
              >
                <Input
                  value={
                    schoolForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSchoolField(
                      'name',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ex : École Connectée"
                />
              </FormField>

              <FormField label="Ville">
                <Input
                  value={
                    schoolForm.city
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSchoolField(
                      'city',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ex : Dakar"
                />
              </FormField>

              <FormField label="Adresse">
                <Input
                  value={
                    schoolForm.address
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSchoolField(
                      'address',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Adresse de l'école"
                />
              </FormField>

              <FormField label="Téléphone">
                <Input
                  value={
                    schoolForm.phone
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSchoolField(
                      'phone',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Téléphone"
                />
              </FormField>

              <FormField label="Email">
                <Input
                  type="email"
                  value={
                    schoolForm.email
                  }
                  onChange={(
                    event,
                  ) =>
                    updateSchoolField(
                      'email',
                      event.target
                        .value,
                    )
                  }
                  placeholder="Email de l'école"
                />
              </FormField>

              {editingSchool && (
                <FormField label="Statut">
                  <Select
                    value={
                      schoolForm.active
                        ? 'active'
                        : 'inactive'
                    }
                    onChange={(
                      event,
                    ) =>
                      updateSchoolField(
                        'active',
                        event.target
                          .value ===
                          'active',
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </Select>
                </FormField>
              )}
            </div>

            {!editingSchool && (
              <>
                <div className="admin-section-divider" />

                <div className="admin-form-section">
                  <div className="admin-form-section-title">
                    <div>
                      <h3>
                        Administrateur
                        d'école
                      </h3>

                      <p>
                        Ce compte sera créé
                        automatiquement et
                        rattaché à cette
                        école.
                      </p>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <FormField
                      label="Nom complet"
                      required
                    >
                      <Input
                        value={
                          schoolForm.admin_full_name
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSchoolField(
                            'admin_full_name',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Ex : Marie Ndiaye"
                      />
                    </FormField>

                    <FormField
                      label="Email / identifiant"
                      required
                    >
                      <Input
                        type="email"
                        value={
                          schoolForm.admin_email
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSchoolField(
                            'admin_email',
                            event.target
                              .value,
                          )
                        }
                        placeholder="admin@ecole.com"
                      />
                    </FormField>

                    <FormField
                      label="Mot de passe"
                      required
                    >
                      <Input
                        type="password"
                        value={
                          schoolForm.admin_password
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSchoolField(
                            'admin_password',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Minimum 6 caractères"
                      />
                    </FormField>

                    <FormField label="Téléphone">
                      <Input
                        value={
                          schoolForm.admin_phone
                        }
                        onChange={(
                          event,
                        ) =>
                          updateSchoolField(
                            'admin_phone',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Téléphone"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="admin-section-divider" />

                <div className="admin-form-section">
                  <div className="admin-form-section-title">
                    <div>
                      <h3>
                        Premières classes
                      </h3>

                      <p>
                        Ces classes seront
                        créées et rattachées
                        automatiquement à
                        l'Administrateur
                        d'école.
                      </p>
                    </div>

                    <ActionButton
                      type="button"
                      onClick={
                        addSchoolClass
                      }
                    >
                      + Ajouter une
                      classe
                    </ActionButton>
                  </div>

                  <div className="admin-class-form-list">
                    {schoolClasses.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          className="admin-class-form-row"
                          key={
                            index
                          }
                        >
                          <FormField
                            label={`Classe ${
                              index +
                              1
                            }`}
                          >
                            <Input
                              value={
                                item.name
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSchoolClass(
                                  index,
                                  'name',
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Ex : 6ème A"
                            />
                          </FormField>

                          <FormField label="Niveau">
                            <Input
                              value={
                                item.level
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSchoolClass(
                                  index,
                                  'level',
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Ex : Collège"
                            />
                          </FormField>

                          <button
                            type="button"
                            className="admin-remove-row"
                            onClick={() =>
                              removeSchoolClass(
                                index,
                              )
                            }
                            disabled={
                              schoolClasses.length ===
                              1
                            }
                            title="Supprimer cette ligne"
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="admin-modal-footer">
              <ActionButton
                type="button"
                onClick={
                  closeSchoolModal
                }
              >
                Annuler
              </ActionButton>

              <ActionButton
                type="submit"
                variant="primary"
                disabled={
                  savingSchool
                }
              >
                {savingSchool
                  ? editingSchool
                    ? 'Enregistrement...'
                    : 'Création en cours...'
                  : editingSchool
                    ? 'Enregistrer'
                    : "Créer l'école"}
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}

      {classModalOpen && (
        <Modal
          title={
            editingClass
              ? 'Modifier la classe'
              : 'Nouvelle classe'
          }
          onClose={
            closeClassModal
          }
        >
          <form
            onSubmit={
              saveClass
            }
          >
            <div className="admin-form-grid">
              <FormField
                label="École"
                required
              >
                <Select
                  value={
                    classForm.school_id
                  }
                  onChange={(
                    event,
                  ) =>
                    setClassForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        school_id:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="">
                    Choisir une
                    école
                  </option>

                  {schools.map(
                    (school) => (
                      <option
                        key={
                          school.id
                        }
                        value={
                          school.id
                        }
                      >
                        {
                          school.name
                        }
                      </option>
                    ),
                  )}
                </Select>
              </FormField>

              <FormField
                label="Nom de la classe"
                required
              >
                <Input
                  value={
                    classForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setClassForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        name: event
                          .target
                          .value,
                      }),
                    )
                  }
                  placeholder="Ex : 6ème A"
                />
              </FormField>

              <FormField label="Niveau">
                <Input
                  value={
                    classForm.level
                  }
                  onChange={(
                    event,
                  ) =>
                    setClassForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        level:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ex : Collège"
                />
              </FormField>
            </div>

            <div className="admin-modal-footer">
              <ActionButton
                type="button"
                onClick={
                  closeClassModal
                }
              >
                Annuler
              </ActionButton>

              <ActionButton
                type="submit"
                variant="primary"
                disabled={
                  savingClass
                }
              >
                {savingClass
                  ? 'Enregistrement...'
                  : 'Enregistrer'}
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
          onClose={
            closeSubjectModal
          }
        >
          <form
            onSubmit={
              saveSubject
            }
          >
            <FormField
              label="Nom de la matière"
              required
            >
              <Input
                value={
                  subjectForm.name
                }
                onChange={(
                  event,
                ) =>
                  setSubjectForm({
                    name: event
                      .target
                      .value,
                  })
                }
                placeholder="Ex : Mathématiques"
              />
            </FormField>

            <div className="admin-modal-footer">
              <ActionButton
                type="button"
                onClick={
                  closeSubjectModal
                }
              >
                Annuler
              </ActionButton>

              <ActionButton
                type="submit"
                variant="primary"
                disabled={
                  savingSubject
                }
              >
                {savingSubject
                  ? 'Enregistrement...'
                  : 'Enregistrer'}
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}