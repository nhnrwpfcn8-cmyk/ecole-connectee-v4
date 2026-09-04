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

function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 15,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: '#172033',
            }}
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              background: '#f8fafc',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label
      style={{
        display: 'block',
        marginBottom: 15,
      }}
    >
      <span
        style={{
          display: 'block',
          marginBottom: 6,
          color: '#475569',
          fontSize: 13,
          fontWeight: 650,
        }}
      >
        {label}
      </span>

      {children}
    </label>
  )
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '11px 12px',
        border: '1px solid #dbe2ea',
        borderRadius: 10,
        outline: 'none',
        color: '#172033',
        background: '#fff',
      }}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '11px 12px',
        border: '1px solid #dbe2ea',
        borderRadius: 10,
        outline: 'none',
        color: '#172033',
        background: '#fff',
      }}
    >
      {children}
    </select>
  )
}

function ActionButton({
  children,
  onClick,
  danger = false,
  secondary = false,
  disabled = false,
}) {
  let background = '#2563eb'
  let color = '#fff'
  let border = '1px solid #2563eb'

  if (danger) {
    background = '#fff'
    color = '#dc2626'
    border = '1px solid #fecaca'
  }

  if (secondary) {
    background = '#fff'
    color = '#475569'
    border = '1px solid #dbe2ea'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 13px',
        border,
        borderRadius: 9,
        background,
        color,
        fontSize: 12,
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

function AdminDashboard({ profile, onLogout }) {
  const [activeMenu, setActiveMenu] = useState('overview')

  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [schools, setSchools] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [admins, setAdmins] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [schoolModal, setSchoolModal] = useState(false)
  const [classModal, setClassModal] = useState(false)
  const [subjectModal, setSubjectModal] = useState(false)

  const [editingSchool, setEditingSchool] = useState(null)
  const [editingClass, setEditingClass] = useState(null)
  const [editingSubject, setEditingSubject] = useState(null)

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    city: 'Dakar',
    phone: '',
    email: '',
    active: true,
  })

  const [classForm, setClassForm] = useState({
    school_id: '',
    name: '',
    level: '',
  })

  const [subjectForm, setSubjectForm] = useState({
    name: '',
  })

  const isSuperAdmin = profile?.role === 'super_admin'

  const schoolNameById = useMemo(
    () =>
      Object.fromEntries(
        schools.map((school) => [school.id, school.name]),
      ),
    [schools],
  )

  const classNameById = useMemo(
    () =>
      Object.fromEntries(
        classes.map((item) => [item.id, item.name]),
      ),
    [classes],
  )

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function countTable(table) {
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (countError) throw countError

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

    if (adminsError) throw adminsError

    let documentsCount = 0

    const documentsResult = await supabase
      .from('documents')
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (!documentsResult.error) {
      documentsCount = documentsResult.count || 0
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
    const results = await Promise.allSettled([
      supabase
        .from('schools')
        .select(
          'id, name, address, city, phone, email, active, created_at',
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
          'id, school_id, class_id, first_name, last_name, student_code, active, created_at',
        )
        .order('created_at', {
          ascending: false,
        })
        .limit(100),

      supabase
        .from('parents')
        .select(
          'id, school_id, profile_id, full_name, phone, email, active',
        )
        .order('id')
        .limit(100),

      supabase
        .from('profiles')
        .select(
          'id, full_name, phone, role, school_id, active',
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
          'id, school_id, name, level, created_at',
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
    clearMessages()

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
        err,
      )

      setError(
        err?.message ||
          'Impossible de charger les données administrateur.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  /* =========================================================
     ÉCOLES
     ========================================================= */

  function openCreateSchool() {
    setEditingSchool(null)

    setSchoolForm({
      name: '',
      address: '',
      city: 'Dakar',
      phone: '',
      email: '',
      active: true,
    })

    setSchoolModal(true)
  }

  function openEditSchool(school) {
    setEditingSchool(school)

    setSchoolForm({
      name: school.name || '',
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
      active: school.active !== false,
    })

    setSchoolModal(true)
  }

  async function saveSchool() {
    clearMessages()

    if (!schoolForm.name.trim()) {
      setError("Le nom de l'école est obligatoire.")
      return
    }

    const payload = {
      name: schoolForm.name.trim(),
      address: schoolForm.address.trim() || null,
      city: schoolForm.city.trim() || null,
      phone: schoolForm.phone.trim() || null,
      email: schoolForm.email.trim() || null,
      active: schoolForm.active,
    }

    let result

    if (editingSchool) {
      result = await supabase
        .from('schools')
        .update(payload)
        .eq('id', editingSchool.id)
    } else {
      result = await supabase
        .from('schools')
        .insert(payload)
    }

    if (result.error) {
      console.error(result.error)

      setError(
        result.error.message ||
          "Impossible d'enregistrer l'école.",
      )

      return
    }

    setSchoolModal(false)

    setSuccess(
      editingSchool
        ? "L'école a été modifiée avec succès."
        : "L'école a été créée avec succès.",
    )

    await loadDashboard(true)
  }

  async function toggleSchool(school) {
    clearMessages()

    const { error: updateError } = await supabase
      .from('schools')
      .update({
        active: !school.active,
      })
      .eq('id', school.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(
      school.active
        ? "L'école a été désactivée."
        : "L'école a été activée.",
    )

    await loadDashboard(true)
  }

  /* =========================================================
     CLASSES
     ========================================================= */

  function openCreateClass() {
    setEditingClass(null)

    setClassForm({
      school_id: schools[0]?.id || '',
      name: '',
      level: '',
    })

    setClassModal(true)
  }

  function openEditClass(item) {
    setEditingClass(item)

    setClassForm({
      school_id: item.school_id || '',
      name: item.name || '',
      level: item.level || '',
    })

    setClassModal(true)
  }

  async function saveClass() {
    clearMessages()

    if (!classForm.school_id) {
      setError("Veuillez sélectionner une école.")
      return
    }

    if (!classForm.name.trim()) {
      setError("Le nom de la classe est obligatoire.")
      return
    }

    const payload = {
      school_id: classForm.school_id,
      name: classForm.name.trim(),
      level: classForm.level.trim() || null,
    }

    let result

    if (editingClass) {
      result = await supabase
        .from('classes')
        .update(payload)
        .eq('id', editingClass.id)
    } else {
      result = await supabase
        .from('classes')
        .insert(payload)
    }

    if (result.error) {
      console.error(result.error)

      setError(
        result.error.message ||
          "Impossible d'enregistrer la classe.",
      )

      return
    }

    setClassModal(false)

    setSuccess(
      editingClass
        ? 'La classe a été modifiée avec succès.'
        : 'La classe a été créée avec succès.',
    )

    await loadDashboard(true)
  }

  async function deleteClass(item) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la classe "${item.name}" ?`,
    )

    if (!confirmed) return

    clearMessages()

    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setSuccess('La classe a été supprimée.')

    await loadDashboard(true)
  }

  /* =========================================================
     MATIÈRES
     ========================================================= */

  function openCreateSubject() {
    setEditingSubject(null)

    setSubjectForm({
      name: '',
    })

    setSubjectModal(true)
  }

  function openEditSubject(subject) {
    setEditingSubject(subject)

    setSubjectForm({
      name: subject.name || '',
    })

    setSubjectModal(true)
  }

  async function saveSubject() {
    clearMessages()

    if (!subjectForm.name.trim()) {
      setError("Le nom de la matière est obligatoire.")
      return
    }

    const payload = {
      name: subjectForm.name.trim(),
    }

    let result

    if (editingSubject) {
      result = await supabase
        .from('subjects')
        .update(payload)
        .eq('id', editingSubject.id)
    } else {
      result = await supabase
        .from('subjects')
        .insert(payload)
    }

    if (result.error) {
      console.error(result.error)

      setError(
        result.error.message ||
          "Impossible d'enregistrer la matière.",
      )

      return
    }

    setSubjectModal(false)

    setSuccess(
      editingSubject
        ? 'La matière a été modifiée avec succès.'
        : 'La matière a été créée avec succès.',
    )

    await loadDashboard(true)
  }

  async function deleteSubject(subject) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la matière "${subject.name}" ?`,
    )

    if (!confirmed) return

    clearMessages()

    const { error: deleteError } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setSuccess('La matière a été supprimée.')

    await loadDashboard(true)
  }

  /* =========================================================
     VUES
     ========================================================= */

  function renderOverview() {
    return (
      <>
        <div className="admin-stats-grid">
          <StatCard
            icon="🏫"
            label="Écoles"
            value={stats.schools}
            onClick={() => setActiveMenu('schools')}
          />

          <StatCard
            icon="👨‍🏫"
            label="Enseignants"
            value={stats.teachers}
            onClick={() => setActiveMenu('teachers')}
          />

          <StatCard
            icon="👨‍🎓"
            label="Élèves"
            value={stats.students}
            onClick={() => setActiveMenu('students')}
          />

          <StatCard
            icon="👪"
            label="Parents"
            value={stats.parents}
            onClick={() => setActiveMenu('parents')}
          />

          <StatCard
            icon="🛡️"
            label="Administrateurs"
            value={stats.admins}
            onClick={() => setActiveMenu('admins')}
          />

          <StatCard
            icon="📚"
            label="Classes"
            value={stats.classes}
            onClick={() => setActiveMenu('classes')}
          />

          <StatCard
            icon="📖"
            label="Matières"
            value={stats.subjects}
            onClick={() => setActiveMenu('subjects')}
          />

          <StatCard
            icon="📄"
            label="Documents"
            value={stats.documents}
            onClick={() => setActiveMenu('documents')}
          />
        </div>

        <div className="admin-panel-grid">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Résumé de la plateforme</h3>
                <p>
                  Vue générale des données actuellement
                  disponibles.
                </p>
              </div>
            </div>

            <div className="admin-summary-list">
              <div>
                <span>Écoles enregistrées</span>
                <strong>{stats.schools}</strong>
              </div>

              <div>
                <span>Personnel enseignant</span>
                <strong>{stats.teachers}</strong>
              </div>

              <div>
                <span>Élèves enregistrés</span>
                <strong>{stats.students}</strong>
              </div>

              <div>
                <span>Parents</span>
                <strong>{stats.parents}</strong>
              </div>

              <div>
                <span>Classes</span>
                <strong>{stats.classes}</strong>
              </div>

              <div>
                <span>Matières</span>
                <strong>{stats.subjects}</strong>
              </div>

              <div>
                <span>Documents</span>
                <strong>{stats.documents}</strong>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Accès rapides</h3>
                <p>
                  Gérer rapidement les principaux éléments.
                </p>
              </div>
            </div>

            <div className="admin-quick-grid">
              <button
                type="button"
                onClick={openCreateSchool}
              >
                🏫 Ajouter une école
              </button>

              <button
                type="button"
                onClick={openCreateClass}
              >
                📚 Ajouter une classe
              </button>

              <button
                type="button"
                onClick={openCreateSubject}
              >
                📖 Ajouter une matière
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('teachers')}
              >
                👨‍🏫 Voir les enseignants
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

          {isSuperAdmin && (
            <ActionButton onClick={openCreateSchool}>
              + Ajouter une école
            </ActionButton>
          )}
        </div>

        {schools.length === 0 ? (
          <EmptyState
            title="Aucune école"
            text="Commencez par créer la première école."
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
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td>
                      <strong>
                        {school.name || 'Sans nom'}
                      </strong>
                    </td>

                    <td>{school.city || '—'}</td>

                    <td>{school.phone || '—'}</td>

                    <td>{school.email || '—'}</td>

                    <td>
                      <span
                        className={
                          school.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {school.active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 7,
                          flexWrap: 'wrap',
                        }}
                      >
                        <ActionButton
                          secondary
                          onClick={() =>
                            openEditSchool(school)
                          }
                        >
                          Modifier
                        </ActionButton>

                        <ActionButton
                          danger
                          onClick={() =>
                            toggleSchool(school)
                          }
                        >
                          {school.active
                            ? 'Désactiver'
                            : 'Activer'}
                        </ActionButton>
                      </div>
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
              {teachers.length} enseignant(s) affiché(s).
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
                      <code>{teacher.id}</code>
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
              {students.length} élève(s) affiché(s).
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
                        }`.trim() || 'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      {student.student_code || '—'}
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
              {parents.length} parent(s) affiché(s).
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
                        {parent.full_name ||
                          'Sans nom'}
                      </strong>
                    </td>

                    <td>{parent.phone || '—'}</td>

                    <td>{parent.email || '—'}</td>

                    <td>
                      {schoolNameById[
                        parent.school_id
                      ] || '—'}
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

          {isSuperAdmin && (
            <ActionButton
              onClick={() =>
                setSuccess(
                  "La création des comptes administrateurs sera branchée avec Supabase Auth dans l'étape suivante.",
                )
              }
            >
              + Ajouter
            </ActionButton>
          )}
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
                          ] || admin.school_id
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
              {classes.length} classe(s) affichée(s).
            </p>
          </div>

          {isSuperAdmin && (
            <ActionButton
              onClick={openCreateClass}
              disabled={schools.length === 0}
            >
              + Ajouter une classe
            </ActionButton>
          )}
        </div>

        {schools.length === 0 ? (
          <EmptyState
            title="Créez d'abord une école"
            text="Une classe doit être rattachée à une école."
          />
        ) : classes.length === 0 ? (
          <EmptyState
            title="Aucune classe"
            text="Commencez par créer votre première classe."
          />
        ) : (
          <div className="admin-table-wrap">
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
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.name || 'Sans nom'}
                      </strong>
                    </td>

                    <td>{item.level || '—'}</td>

                    <td>
                      {schoolNameById[
                        item.school_id
                      ] || '—'}
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 7,
                          flexWrap: 'wrap',
                        }}
                      >
                        <ActionButton
                          secondary
                          onClick={() =>
                            openEditClass(item)
                          }
                        >
                          Modifier
                        </ActionButton>

                        <ActionButton
                          danger
                          onClick={() =>
                            deleteClass(item)
                          }
                        >
                          Supprimer
                        </ActionButton>
                      </div>
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

          {isSuperAdmin && (
            <ActionButton onClick={openCreateSubject}>
              + Ajouter une matière
            </ActionButton>
          )}
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            title="Aucune matière"
            text="Commencez par créer une matière."
          />
        ) : (
          <>
            <div className="admin-subject-grid">
              {subjects.map((subject) => (
                <div
                  className="admin-subject-card"
                  key={subject.id}
                  style={{
                    position: 'relative',
                  }}
                >
                  <span>📖</span>

                  <strong>
                    {subject.name}
                  </strong>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 7,
                    }}
                  >
                    <ActionButton
                      secondary
                      onClick={() =>
                        openEditSubject(subject)
                      }
                    >
                      Modifier
                    </ActionButton>

                    <ActionButton
                      danger
                      onClick={() =>
                        deleteSubject(subject)
                      }
                    >
                      Supprimer
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </>
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
              {stats.documents} document(s)
              enregistré(s).
            </p>
          </div>
        </div>

        <EmptyState
          title={
            stats.documents > 0
              ? 'Documents pédagogiques'
              : 'Aucun document'
          }
          text={
            stats.documents > 0
              ? 'La gestion détaillée des documents sera ajoutée avec l’espace enseignant.'
              : 'Aucun document pédagogique n’est encore enregistré.'
          }
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
      (item) => item.id === activeMenu,
    )?.label || 'Tableau de bord'

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

        {error && (
          <div className="admin-alert">
            <strong>
              ⚠️ Erreur
            </strong>

            <span>{error}</span>
          </div>
        )}

        {success && !error && (
          <div
            className="admin-alert"
            style={{
              borderColor: '#bbf7d0',
              background: '#f0fdf4',
              color: '#166534',
            }}
          >
            <strong>
              ✅ Succès
            </strong>

            <span>{success}</span>
          </div>
        )}

        {renderContent()}
      </main>

      {/* =====================================================
          MODALE ÉCOLE
          ===================================================== */}

      {schoolModal && (
        <Modal
          title={
            editingSchool
              ? "Modifier l'école"
              : 'Ajouter une école'
          }
          onClose={() =>
            setSchoolModal(false)
          }
        >
          <FormField label="Nom de l'école *">
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

          <FormField label="Adresse">
            <Input
              value={schoolForm.address}
              onChange={(event) =>
                setSchoolForm({
                  ...schoolForm,
                  address:
                    event.target.value,
                })
              }
              placeholder="Ex : Liberté 6, Dakar"
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

          <FormField label="Téléphone">
            <Input
              value={schoolForm.phone}
              onChange={(event) =>
                setSchoolForm({
                  ...schoolForm,
                  phone:
                    event.target.value,
                })
              }
              placeholder="Ex : 77 000 00 00"
            />
          </FormField>

          <FormField label="Email">
            <Input
              type="email"
              value={schoolForm.email}
              onChange={(event) =>
                setSchoolForm({
                  ...schoolForm,
                  email:
                    event.target.value,
                })
              }
              placeholder="contact@ecole.sn"
            />
          </FormField>

          <FormField label="Statut">
            <Select
              value={
                schoolForm.active
                  ? 'active'
                  : 'inactive'
              }
              onChange={(event) =>
                setSchoolForm({
                  ...schoolForm,
                  active:
                    event.target.value ===
                    'active',
                })
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

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            <ActionButton
              secondary
              onClick={() =>
                setSchoolModal(false)
              }
            >
              Annuler
            </ActionButton>

            <ActionButton
              onClick={saveSchool}
            >
              {editingSchool
                ? 'Enregistrer les modifications'
                : "Créer l'école"}
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* =====================================================
          MODALE CLASSE
          ===================================================== */}

      {classModal && (
        <Modal
          title={
            editingClass
              ? 'Modifier la classe'
              : 'Ajouter une classe'
          }
          onClose={() =>
            setClassModal(false)
          }
        >
          <FormField label="École *">
            <Select
              value={classForm.school_id}
              onChange={(event) =>
                setClassForm({
                  ...classForm,
                  school_id:
                    event.target.value,
                })
              }
            >
              <option value="">
                Choisir une école
              </option>

              {schools.map((school) => (
                <option
                  key={school.id}
                  value={school.id}
                >
                  {school.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Nom de la classe *">
            <Input
              value={classForm.name}
              onChange={(event) =>
                setClassForm({
                  ...classForm,
                  name: event.target.value,
                })
              }
              placeholder="Ex : 6ème A"
            />
          </FormField>

          <FormField label="Niveau">
            <Input
              value={classForm.level}
              onChange={(event) =>
                setClassForm({
                  ...classForm,
                  level: event.target.value,
                })
              }
              placeholder="Ex : 6ème"
            />
          </FormField>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            <ActionButton
              secondary
              onClick={() =>
                setClassModal(false)
              }
            >
              Annuler
            </ActionButton>

            <ActionButton
              onClick={saveClass}
            >
              {editingClass
                ? 'Enregistrer'
                : 'Créer la classe'}
            </ActionButton>
          </div>
        </Modal>
      )}

      {/* =====================================================
          MODALE MATIÈRE
          ===================================================== */}

      {subjectModal && (
        <Modal
          title={
            editingSubject
              ? 'Modifier la matière'
              : 'Ajouter une matière'
          }
          onClose={() =>
            setSubjectModal(false)
          }
        >
          <FormField label="Nom de la matière *">
            <Input
              value={subjectForm.name}
              onChange={(event) =>
                setSubjectForm({
                  ...subjectForm,
                  name: event.target.value,
                })
              }
              placeholder="Ex : Mathématiques"
            />
          </FormField>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            <ActionButton
              secondary
              onClick={() =>
                setSubjectModal(false)
              }
            >
              Annuler
            </ActionButton>

            <ActionButton
              onClick={saveSubject}
            >
              {editingSubject
                ? 'Enregistrer'
                : 'Créer la matière'}
            </ActionButton>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminDashboard