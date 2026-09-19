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
  logo_url: '',
  logo_file: null,
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
      title={`Ouvrir ${label}`}
      style={{ color: '#000', cursor: 'pointer' }}
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
    <div className="admin-empty" style={{ color: '#000' }}>
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
    <label className="admin-form-field" style={{ color: '#000' }}>
      <span style={{ color: '#000' }}>
        {label} {required && <b>*</b>}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={{ color: '#000' }}
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

  const [editingSchool, setEditingSchool] = useState(null)
  const [schoolUpdating, setSchoolUpdating] = useState(false)

  // =========================================================
  // NOUVEAU : FICHE DÉTAILLÉE ÉCOLE
  // =========================================================

  const [selectedSchool, setSelectedSchool] = useState(null)

  const isSuperAdmin = profile?.role === 'super_admin'

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
    setSchoolForm({ ...EMPTY_SCHOOL_FORM })
    setShowSchoolForm(false)
    setEditingSchool(null)
  }

  function updateSchoolField(field, value) {
    setSchoolForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // =========================================================
  // LOGO ÉCOLE
  // =========================================================

  function handleLogoFileChange(event) {
    const file = event.target.files?.[0] || null

    if (!file) {
      updateSchoolField('logo_file', null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(
        'Veuillez sélectionner une image pour le logo.'
      )
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        'Le logo ne doit pas dépasser 5 Mo.'
      )
      event.target.value = ''
      return
    }

    setError('')

    updateSchoolField('logo_file', file)

    const previewUrl = URL.createObjectURL(file)

    updateSchoolField('logo_url', previewUrl)
  }

  async function uploadSchoolLogo(file, schoolId) {
    if (!file || !schoolId) {
      return null
    }

    const extension =
      file.name.split('.').pop()?.toLowerCase() ||
      'png'

    const filePath = `${schoolId}/logo-${Date.now()}.${extension}`

    const { error: uploadError } =
      await supabase.storage
        .from('school-branding')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: signedUrlData,
      error: signedUrlError,
    } = await supabase.storage
      .from('school-branding')
      .createSignedUrl(
        filePath,
        60 * 60 * 24 * 365
      )

    if (signedUrlError) {
      throw signedUrlError
    }

    return signedUrlData?.signedUrl || null
  }

  function goBack() {
    setError('')
    setMessage('')
    setSelectedSchool(null)
    setActiveMenu('overview')
  }

  function openMenu(menuId) {
    setError('')
    setMessage('')
    setSelectedSchool(null)
    setActiveMenu(menuId)
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
          'id, name, address, city, phone, email, logo_url, active, created_at'
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
  // NOUVEAU : OUVRIR LA FICHE DÉTAILLÉE D'UNE ÉCOLE
  // =========================================================

  function openSchoolDetails(school) {
    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut consulter la fiche détaillée d’une école.'
      )
      return
    }

    setError('')
    setMessage('')
    setSelectedSchool(school)
  }

  function closeSchoolDetails() {
    setError('')
    setMessage('')
    setSelectedSchool(null)
  }

  // =========================================================
  // CRÉATION ÉCOLE + ADMIN ÉCOLE
  // =========================================================

  async function saveSchool(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    const schoolName = schoolForm.name.trim()
    const adminFullName =
      schoolForm.admin_full_name.trim()
    const adminUsername =
      schoolForm.admin_username.trim()
    const adminEmail =
      schoolForm.admin_email.trim().toLowerCase()
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
        'Le mot de passe est obligatoire.'
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

    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut créer une école.'
      )
      return
    }

    setSchoolSaving(true)

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      const session = sessionData?.session

      if (!session?.access_token) {
        throw new Error(
          'Votre session Super Admin a expiré. Veuillez vous reconnecter.'
        )
      }

      const { data, error: functionError } =
        await supabase.functions.invoke(
          'create-school-admin',
          {
            body: {
              school: {
                name: schoolName,
                address:
                  schoolForm.address.trim() || null,
                city:
                  schoolForm.city.trim() || null,
                phone:
                  schoolForm.phone.trim() || null,
                email:
                  schoolForm.email.trim().toLowerCase() ||
                  null,
              },

              admin: {
                full_name: adminFullName,
                username: adminUsername,
                email: adminEmail,
                password: adminPassword,
                phone:
                  schoolForm.admin_phone.trim() || null,
              },
            },

            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

      if (functionError) {
        console.error(
          'Erreur create-school-admin :',
          functionError
        )

        throw new Error(
          functionError.message ||
            "Impossible de créer l'école et l'Admin École."
        )
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Impossible de créer l'école et l'Admin École."
        )
      }

      if (
        schoolForm.logo_file &&
        data?.school_id
      ) {
        const logoUrl =
          await uploadSchoolLogo(
            schoolForm.logo_file,
            data.school_id
          )

        if (logoUrl) {
          const { error: logoError } =
            await supabase
              .from('schools')
              .update({
                logo_url: logoUrl,
              })
              .eq('id', data.school_id)

          if (logoError) {
            throw logoError
          }
        }
      }

      setMessage(
        `✅ ${
          data.message ||
          "L'école et son Administrateur École ont été créés avec succès."
        }`
      )

      resetSchoolForm()

      await loadDashboard(true)
    } catch (err) {
      console.error(
        "Erreur lors de la création de l'école :",
        err
      )

      showError(
        'Erreur lors de la création de l’école',
        err
      )
    } finally {
      setSchoolSaving(false)
    }
  }

  // =========================================================
  // MODIFIER UNE ÉCOLE
  // =========================================================

  function openEditSchool(school) {
    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut modifier une école.'
      )
      return
    }

    setError('')
    setMessage('')
    setSelectedSchool(null)
    setEditingSchool(school)

    setSchoolForm({
      ...EMPTY_SCHOOL_FORM,
      name: school.name || '',
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
      logo_url: school.logo_url || '',
      logo_file: null,
    })

    setShowSchoolForm(true)
  }

  async function updateSchool(e) {
    e.preventDefault()

    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut modifier une école.'
      )
      return
    }

    if (!editingSchool?.id) {
      setError(
        'Aucune école sélectionnée.'
      )
      return
    }

    const name = schoolForm.name.trim()

    if (!name) {
      setError(
        "Le nom de l'école est obligatoire."
      )
      return
    }

    setSchoolUpdating(true)
    setError('')
    setMessage('')

    try {
      let logoUrl =
        editingSchool.logo_url || null

      if (schoolForm.logo_file) {
        logoUrl = await uploadSchoolLogo(
          schoolForm.logo_file,
          editingSchool.id
        )
      }

      const { error: updateError } =
        await supabase
          .from('schools')
          .update({
            name,
            address:
              schoolForm.address.trim() || null,
            city:
              schoolForm.city.trim() || null,
            phone:
              schoolForm.phone.trim() || null,
            email:
              schoolForm.email.trim().toLowerCase() ||
              null,
            logo_url: logoUrl,
          })
          .eq('id', editingSchool.id)

      if (updateError) {
        throw updateError
      }

      setMessage(
        `✅ Les informations de « ${
          name
        } » ont été mises à jour.`
      )

      resetSchoolForm()
      await loadDashboard(true)
    } catch (err) {
      showError(
        'Erreur lors de la modification de l’école',
        err
      )
    } finally {
      setSchoolUpdating(false)
    }
  }

  // =========================================================
  // ACTIVER / DÉSACTIVER UNE ÉCOLE
  // =========================================================

  async function toggleSchoolStatus(school) {
    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut changer le statut d’une école.'
      )
      return
    }

    const nextStatus = !school.active

    const actionText = nextStatus
      ? 'activer'
      : 'désactiver'

    const confirmed = window.confirm(
      `Voulez-vous vraiment ${actionText} l’école « ${
        school.name || 'Sans nom'
      } » ?`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')

    try {
      const { error: updateError } =
        await supabase
          .from('schools')
          .update({
            active: nextStatus,
          })
          .eq('id', school.id)

      if (updateError) {
        throw updateError
      }

      const updatedSchool = {
        ...school,
        active: nextStatus,
      }

      if (selectedSchool?.id === school.id) {
        setSelectedSchool(updatedSchool)
      }

      setMessage(
        `✅ L’école « ${
          school.name || 'Sans nom'
        } » est maintenant ${
          nextStatus ? 'active' : 'inactive'
        }.`
      )

      await loadDashboard(true)
    } catch (err) {
      showError(
        'Erreur lors du changement de statut de l’école',
        err
      )
    }
  }

  // =========================================================
  // SUPPRIMER UNE ÉCOLE
  // =========================================================

  async function deleteSchool(school) {
    if (!isSuperAdmin) {
      setError(
        'Seul le Super Administrateur peut supprimer une école.'
      )
      return
    }

    const schoolName =
      school.name || 'cette école'

    const firstConfirmation = window.confirm(
      `⚠️ ATTENTION\n\nLa suppression de « ${schoolName} » est définitive.\n\nLes données rattachées à cette école peuvent également être supprimées : élèves, parents, enseignants, classes, notes, bulletins, documents, APE, messages, factures, etc.\n\nVoulez-vous continuer ?`
    )

    if (!firstConfirmation) {
      return
    }

    const secondConfirmation = window.confirm(
      `🚨 DERNIÈRE CONFIRMATION\n\nVous allez supprimer définitivement « ${schoolName} » et ses données rattachées.\n\nCliquez sur OK uniquement si vous êtes certain.`
    )

    if (!secondConfirmation) {
      return
    }

    setError('')
    setMessage('')

    try {
      const { error: deleteError } =
        await supabase
          .from('schools')
          .delete()
          .eq('id', school.id)

      if (deleteError) {
        throw deleteError
      }

      setSelectedSchool(null)

      setMessage(
        `✅ L’école « ${schoolName} » a été supprimée définitivement.`
      )

      await loadDashboard(true)
    } catch (err) {
      showError(
        'Erreur lors de la suppression de l’école',
        err
      )
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
  // DONNÉES DE LA FICHE ÉCOLE
  // =========================================================

  const selectedSchoolData = useMemo(() => {
    if (!selectedSchool) {
      return null
    }

    const schoolId = selectedSchool.id

    const schoolTeachers = teachers.filter(
      (teacher) =>
        teacher.school_id === schoolId
    )

    const schoolStudents = students.filter(
      (student) =>
        student.school_id === schoolId
    )

    const schoolParents = parents.filter(
      (parent) =>
        parent.school_id === schoolId
    )

    const schoolClasses = classes.filter(
      (item) =>
        item.school_id === schoolId
    )

    const schoolTeacherIds = new Set(
      schoolTeachers.map(
        (teacher) => teacher.id
      )
    )

    const schoolDocuments = documents.filter(
      (document) =>
        schoolTeacherIds.has(
          document.teacher_id
        )
    )

    const schoolAdmins = admins.filter(
      (admin) =>
        admin.school_id === schoolId &&
        (
          admin.role === 'admin' ||
          admin.role === 'school_admin'
        )
    )

    /*
     * La table subjects utilisée actuellement
     * par le dashboard ne contient pas school_id
     * dans la requête existante.
     *
     * Nous ne modifions donc pas sa structure.
     * On affiche les matières actuellement
     * référencées par les documents de cette école.
     */
    const schoolSubjectIds = new Set(
      schoolDocuments
        .map((document) => document.subject_id)
        .filter(Boolean)
    )

    const schoolSubjects = subjects.filter(
      (subject) =>
        schoolSubjectIds.has(subject.id)
    )

    return {
      teachers: schoolTeachers,
      students: schoolStudents,
      parents: schoolParents,
      classes: schoolClasses,
      documents: schoolDocuments,
      subjects: schoolSubjects,
      admins: schoolAdmins,
    }
  }, [
    selectedSchool,
    teachers,
    students,
    parents,
    classes,
    documents,
    subjects,
    admins,
  ])

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
            onClick={() => openMenu('schools')}
          />

          <StatCard
            icon="👨‍🏫"
            label="Enseignants"
            value={stats.teachers}
            onClick={() => openMenu('teachers')}
          />

          <StatCard
            icon="👨‍🎓"
            label="Élèves"
            value={stats.students}
            onClick={() => openMenu('students')}
          />

          <StatCard
            icon="👪"
            label="Parents"
            value={stats.parents}
            onClick={() => openMenu('parents')}
          />

          <StatCard
            icon="🛡️"
            label="Administrateurs"
            value={stats.admins}
            onClick={() => openMenu('admins')}
          />

          <StatCard
            icon="📚"
            label="Classes"
            value={stats.classes}
            onClick={() => openMenu('classes')}
          />

          <StatCard
            icon="📖"
            label="Matières"
            value={stats.subjects}
            onClick={() => openMenu('subjects')}
          />

          <StatCard
            icon="📄"
            label="Documents"
            value={stats.documents}
            onClick={() => openMenu('documents')}
          />
        </div>

        <div className="admin-panel-grid">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h3>Résumé de la plateforme</h3>
                <p>
                  Vue générale des données
                  actuellement disponibles.
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
                  Ouvrir directement une section.
                </p>
              </div>
            </div>

            <div className="admin-quick-grid">
              <button
                type="button"
                onClick={() => openMenu('schools')}
                style={{
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                🏫 Gérer les écoles
              </button>

              <button
                type="button"
                onClick={() => openMenu('teachers')}
                style={{
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                👨‍🏫 Gérer les enseignants
              </button>

              <button
                type="button"
                onClick={() => openMenu('students')}
                style={{
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                👨‍🎓 Gérer les élèves
              </button>

              <button
                type="button"
                onClick={() => openMenu('admins')}
                style={{
                  color: '#000',
                  cursor: 'pointer',
                }}
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
  // FICHE DÉTAILLÉE ÉCOLE
  // =========================================================

  function renderSchoolDetails() {
    if (!selectedSchool || !selectedSchoolData) {
      return null
    }

    const schoolAdmin =
      selectedSchoolData.admins[0] || null

    return (
      <section
        className="admin-panel"
        style={{
          color: '#000',
        }}
      >
        <div
          className="admin-panel-header"
          style={{
            alignItems: 'flex-start',
          }}
        >
          <div>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={closeSchoolDetails}
              style={{
                color: '#000',
                marginBottom: '12px',
              }}
            >
              ← Retour aux écoles
            </button>

            <span
              className="admin-modal-kicker"
              style={{ color: '#000' }}
            >
              FICHE ÉCOLE
            </span>

            <h3
              style={{
                fontSize: '26px',
                marginTop: '6px',
              }}
            >
              {selectedSchool.name ||
                'École sans nom'}
            </h3>

            <p>
              Vue complète de l’établissement
              sélectionné.
            </p>
          </div>

          {isSuperAdmin && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  openEditSchool(
                    selectedSchool
                  )
                }
                style={{ color: '#000' }}
              >
                ✏️ Modifier
              </button>

              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  toggleSchoolStatus(
                    selectedSchool
                  )
                }
                style={{ color: '#000' }}
              >
                {selectedSchool.active
                  ? '🔴 Désactiver'
                  : '🟢 Activer'}
              </button>

              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  deleteSchool(
                    selectedSchool
                  )
                }
                style={{ color: '#000' }}
              >
                🗑️ Supprimer
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(180px, 260px) minmax(0, 1fr)',
            gap: '24px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              background: '#fff',
            }}
          >
            {selectedSchool.logo_url ? (
              <img
                src={selectedSchool.logo_url}
                alt={`Logo ${
                  selectedSchool.name ||
                  'école'
                }`}
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  background: '#fff',
                }}
                onError={(event) => {
                  event.currentTarget.style.display =
                    'none'
                }}
              />
            ) : (
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  fontSize: '60px',
                }}
              >
                🏫
              </div>
            )}

            <div
              style={{
                marginTop: '14px',
              }}
            >
              <span
                className={
                  selectedSchool.active
                    ? 'status-active'
                    : 'status-inactive'
                }
              >
                {selectedSchool.active
                  ? '🟢 École active'
                  : '🔴 École inactive'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>🏫 Nom de l’école</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {selectedSchool.name ||
                  '—'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>📍 Adresse</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {selectedSchool.address ||
                  '—'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>🌍 Ville</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {selectedSchool.city ||
                  '—'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>📞 Téléphone</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {selectedSchool.phone ||
                  '—'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>✉️ Email</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                  wordBreak: 'break-word',
                }}
              >
                {selectedSchool.email ||
                  '—'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <small>📅 Créée le</small>
              <strong
                style={{
                  display: 'block',
                  marginTop: '5px',
                }}
              >
                {selectedSchool.created_at
                  ? new Date(
                      selectedSchool.created_at
                    ).toLocaleDateString(
                      'fr-FR'
                    )
                  : '—'}
              </strong>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '24px',
          }}
        >
          <h4
            style={{
              marginBottom: '12px',
            }}
          >
            👨‍💼 Administrateur de l’école
          </h4>

          {schoolAdmin ? (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #ddd',
                  fontSize: '22px',
                }}
              >
                🛡️
              </div>

              <div>
                <strong>
                  {schoolAdmin.full_name ||
                    'Sans nom'}
                </strong>

                <div
                  style={{
                    marginTop: '5px',
                  }}
                >
                  <span className="role-badge">
                    Administrateur école
                  </span>
                </div>
              </div>

              <div>
                <small>Téléphone</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: '4px',
                  }}
                >
                  {schoolAdmin.phone ||
                    '—'}
                </strong>
              </div>

              <div>
                <small>Statut</small>
                <strong
                  style={{
                    display: 'block',
                    marginTop: '4px',
                  }}
                >
                  {schoolAdmin.active
                    ? '🟢 Actif'
                    : '🔴 Inactif'}
                </strong>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Aucun Admin École trouvé"
              text="Aucun compte administrateur n'est actuellement associé à cette école."
            />
          )}
        </div>

        <div
          style={{
            marginTop: '24px',
          }}
        >
          <h4
            style={{
              marginBottom: '12px',
            }}
          >
            📊 Activité et effectifs de l’école
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={() =>
                openMenu('teachers')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                👨‍🏫
              </span>

              <small>Enseignants</small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.teachers.length}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                openMenu('students')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                👨‍🎓
              </span>

              <small>Élèves</small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.students.length}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                openMenu('parents')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                👪
              </span>

              <small>Parents</small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.parents.length}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                openMenu('classes')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                📚
              </span>

              <small>Classes</small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.classes.length}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                openMenu('subjects')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                📖
              </span>

              <small>
                Matières référencées
              </small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.subjects.length}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                openMenu('documents')
              }
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '18px',
                background: '#fff',
                color: '#000',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '26px',
                }}
              >
                📄
              </span>

              <small>Documents</small>

              <strong
                style={{
                  display: 'block',
                  fontSize: '24px',
                  marginTop: '5px',
                }}
              >
                {selectedSchoolData.documents.length}
              </strong>
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '24px',
          }}
        >
          <h4
            style={{
              marginBottom: '12px',
            }}
          >
            📋 Répartition rapide
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {selectedSchoolData.classes.map(
              (item) => {
                const studentCount =
                  selectedSchoolData.students.filter(
                    (student) =>
                      student.class_id ===
                      item.id
                  ).length

                return (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <strong>
                      {item.name ||
                        'Classe sans nom'}
                    </strong>

                    <div
                      style={{
                        marginTop: '5px',
                      }}
                    >
                      Niveau :{' '}
                      {item.level || '—'}
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                      }}
                    >
                      👨‍🎓 {studentCount}{' '}
                      élève(s)
                    </div>
                  </div>
                )
              }
            )}

            {selectedSchoolData.classes
              .length === 0 && (
              <p>
                Aucune classe enregistrée
                pour cette école.
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  // =========================================================
  // ÉCOLES
  // =========================================================

  function renderSchools() {
    if (selectedSchool) {
      return renderSchoolDetails()
    }

    const activeSchools = schools.filter(
      (school) => school.active
    )

    const inactiveSchools = schools.filter(
      (school) => !school.active
    )

    return (
      <>
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
                  setSelectedSchool(null)
                  setEditingSchool(null)
                  setSchoolForm({
                    ...EMPTY_SCHOOL_FORM,
                  })
                  setShowSchoolForm(true)
                }}
                style={{ color: '#000' }}
              >
                ＋ Nouvelle école
              </button>
            )}
          </div>

          {schools.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '15px',
                }}
              >
                <small>Total écoles</small>

                <strong
                  style={{
                    display: 'block',
                    fontSize: '25px',
                    marginTop: '4px',
                  }}
                >
                  {schools.length}
                </strong>
              </div>

              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '15px',
                }}
              >
                <small>Écoles actives</small>

                <strong
                  style={{
                    display: 'block',
                    fontSize: '25px',
                    marginTop: '4px',
                  }}
                >
                  {activeSchools.length}
                </strong>
              </div>

              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '15px',
                }}
              >
                <small>Écoles inactives</small>

                <strong
                  style={{
                    display: 'block',
                    fontSize: '25px',
                    marginTop: '4px',
                  }}
                >
                  {inactiveSchools.length}
                </strong>
              </div>
            </div>
          )}

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
                    <th>Logo</th>
                    <th>École</th>
                    <th>Ville</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Statut</th>

                    {isSuperAdmin && (
                      <th>Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td>
                        {school.logo_url ? (
                          <img
                            src={school.logo_url}
                            alt={`Logo ${
                              school.name ||
                              'école'
                            }`}
                            style={{
                              width: '44px',
                              height: '44px',
                              objectFit:
                                'contain',
                              borderRadius:
                                '8px',
                              border:
                                '1px solid #ddd',
                              background:
                                '#fff',
                            }}
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                'none'
                            }}
                          />
                        ) : (
                          <span
                            title="Aucun logo"
                            style={{
                              fontSize: '24px',
                              cursor:
                                'pointer',
                            }}
                            onClick={() =>
                              openSchoolDetails(
                                school
                              )
                            }
                          >
                            🏫
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            openSchoolDetails(
                              school
                            )
                          }
                          title="Voir la fiche détaillée"
                          style={{
                            border: 'none',
                            background:
                              'transparent',
                            padding: 0,
                            color: '#000',
                            cursor:
                              'pointer',
                            textAlign:
                              'left',
                          }}
                        >
                          <strong>
                            {school.name ||
                              'Sans nom'}
                          </strong>

                          <small
                            style={{
                              display:
                                'block',
                              marginTop:
                                '4px',
                            }}
                          >
                            👁️ Voir la fiche
                          </small>
                        </button>
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
                        <button
                          type="button"
                          onClick={() =>
                            toggleSchoolStatus(
                              school
                            )
                          }
                          title={
                            school.active
                              ? 'Cliquer pour désactiver'
                              : 'Cliquer pour activer'
                          }
                          style={{
                            border: 'none',
                            background:
                              'transparent',
                            cursor:
                              'pointer',
                            color: '#000',
                          }}
                        >
                          <span
                            className={
                              school.active
                                ? 'status-active'
                                : 'status-inactive'
                            }
                          >
                            {school.active
                              ? '🟢 Active'
                              : '🔴 Inactive'}
                          </span>
                        </button>
                      </td>

                      {isSuperAdmin && (
                        <td>
                          <div
                            style={{
                              display:
                                'flex',
                              flexWrap:
                                'wrap',
                              gap: '6px',
                            }}
                          >
                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() =>
                                openSchoolDetails(
                                  school
                                )
                              }
                              title="Voir la fiche"
                              style={{
                                color:
                                  '#000',
                              }}
                            >
                              👁️ Fiche
                            </button>

                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() =>
                                openEditSchool(
                                  school
                                )
                              }
                              title="Modifier l'école"
                              style={{
                                color:
                                  '#000',
                              }}
                            >
                              ✏️ Modifier
                            </button>

                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() =>
                                toggleSchoolStatus(
                                  school
                                )
                              }
                              title={
                                school.active
                                  ? 'Désactiver'
                                  : 'Activer'
                              }
                              style={{
                                color:
                                  '#000',
                              }}
                            >
                              {school.active
                                ? '🔴 Désactiver'
                                : '🟢 Activer'}
                            </button>

                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() =>
                                deleteSchool(
                                  school
                                )
                              }
                              title="Supprimer définitivement"
                              style={{
                                color:
                                  '#000',
                              }}
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =================================================
            VUE GLOBALE PAR ÉCOLE
        ================================================= */}

        {schools.length > 0 && (
          <section
            className="admin-panel"
            style={{
              marginTop: '20px',
            }}
          >
            <div className="admin-panel-header">
              <div>
                <h3>
                  📊 Vue globale des écoles
                </h3>

                <p>
                  Ouvrez une école pour consulter
                  sa fiche détaillée.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
              }}
            >
              {schools.map((school) => {
                const schoolTeacherCount =
                  teachers.filter(
                    (teacher) =>
                      teacher.school_id ===
                      school.id
                  ).length

                const schoolStudentCount =
                  students.filter(
                    (student) =>
                      student.school_id ===
                      school.id
                  ).length

                const schoolParentCount =
                  parents.filter(
                    (parent) =>
                      parent.school_id ===
                      school.id
                  ).length

                const schoolClassCount =
                  classes.filter(
                    (item) =>
                      item.school_id ===
                      school.id
                  ).length

                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() =>
                      openSchoolDetails(
                        school
                      )
                    }
                    style={{
                      color: '#000',
                      background:
                        '#fff',
                      border:
                        '1px solid #ddd',
                      borderRadius:
                        '14px',
                      padding: '16px',
                      textAlign:
                        'left',
                      cursor:
                        'pointer',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '12px',
                      }}
                    >
                      {school.logo_url ? (
                        <img
                          src={
                            school.logo_url
                          }
                          alt=""
                          style={{
                            width:
                              '55px',
                            height:
                              '55px',
                            objectFit:
                              'contain',
                            border:
                              '1px solid #ddd',
                            borderRadius:
                              '10px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width:
                              '55px',
                            height:
                              '55px',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            border:
                              '1px solid #ddd',
                            borderRadius:
                              '10px',
                            fontSize:
                              '25px',
                          }}
                        >
                          🏫
                        </div>
                      )}

                      <div>
                        <strong>
                          {school.name ||
                            'Sans nom'}
                        </strong>

                        <div
                          style={{
                            marginTop:
                              '4px',
                          }}
                        >
                          <span
                            className={
                              school.active
                                ? 'status-active'
                                : 'status-inactive'
                            }
                          >
                            {school.active
                              ? '🟢 Active'
                              : '🔴 Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          '1fr 1fr',
                        gap: '8px',
                        marginTop:
                          '15px',
                      }}
                    >
                      <span>
                        👨‍🏫{' '}
                        {schoolTeacherCount}{' '}
                        enseignants
                      </span>

                      <span>
                        👨‍🎓{' '}
                        {schoolStudentCount}{' '}
                        élèves
                      </span>

                      <span>
                        👪{' '}
                        {schoolParentCount}{' '}
                        parents
                      </span>

                      <span>
                        📚{' '}
                        {schoolClassCount}{' '}
                        classes
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop:
                          '14px',
                        fontWeight:
                          '600',
                      }}
                    >
                      👁️ Ouvrir la fiche →
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </>
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
                      <code>{parent.id}</code>
                    </td>

                    <td>
                      {schoolNameById[
                        parent.school_id
                      ] || '—'}
                    </td>

                    <td>
                      <code>
                        {parent.profile_id || '—'}
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
                        {admin.full_name || 'Sans nom'}
                      </strong>
                    </td>

                    <td>
                      <span className="role-badge">
                        {admin.role === 'super_admin'
                          ? 'Super administrateur'
                          : 'Administrateur école'}
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
              {classes.length} classe(s) affichée(s).
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
                        {item.name || 'Sans nom'}
                      </strong>
                    </td>

                    <td>{item.level || '—'}</td>

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
              <button
                type="button"
                className="admin-subject-card"
                key={subject.id}
                onClick={() => {
                  setMessage(
                    `📖 Matière sélectionnée : ${
                      subject.name
                    }`
                  )
                }}
                style={{
                  color: '#000',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                title={`Ouvrir ${subject.name}`}
              >
                <span>📖</span>
                <strong>{subject.name}</strong>
              </button>
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
                      {classNameById[
                        document.class_id
                      ] || '—'}
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
    )
  }

  // =========================================================
  // CONTENU
  // =========================================================

  function renderContent() {
    if (loading) {
      return (
        <div
          className="admin-loading"
          style={{ color: '#000' }}
        >
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
    selectedSchool && activeMenu === 'schools'
      ? `Fiche — ${
          selectedSchool.name ||
          'École'
        }`
      : MENU.find(
          (item) => item.id === activeMenu
        )?.label || 'Tableau de bord'

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <div
      className="admin-layout"
      style={{
        color: '#000',
      }}
    >
      <style>
        {`
          .admin-layout,
          .admin-layout h1,
          .admin-layout h2,
          .admin-layout h3,
          .admin-layout h4,
          .admin-layout p,
          .admin-layout span,
          .admin-layout strong,
          .admin-layout small,
          .admin-layout label,
          .admin-layout td,
          .admin-layout th,
          .admin-layout button {
            color: #000;
          }

          .admin-layout input,
          .admin-layout textarea,
          .admin-layout select {
            color: #000;
          }

          .admin-layout button {
            cursor: pointer;
          }
        `}
      </style>

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo">EC</div>

          <div>
            <strong>École Connectée</strong>
            <span>Administration</span>
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
                openMenu(item.id)
              }
              title={`Ouvrir ${item.label}`}
              style={{ color: '#000' }}
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
                profile?.full_name || 'A'
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
            style={{ color: '#000' }}
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

          <div
            className="admin-topbar-actions"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {activeMenu !== 'overview' && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => {
                  if (
                    activeMenu === 'schools' &&
                    selectedSchool
                  ) {
                    closeSchoolDetails()
                    return
                  }

                  goBack()
                }}
                title="Retour"
                style={{ color: '#000' }}
              >
                ← Retour
              </button>
            )}

            <button
              type="button"
              className="admin-refresh"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              style={{ color: '#000' }}
            >
              {refreshing
                ? 'Actualisation...'
                : '↻ Actualiser'}
            </button>
          </div>
        </header>

        {message && (
          <div
            className="admin-alert admin-success-alert"
            style={{ color: '#000' }}
          >
            <strong>✅ Succès</strong>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div
            className="admin-alert"
            style={{ color: '#000' }}
          >
            <strong>⚠️ Attention</strong>
            <span>{error}</span>
          </div>
        )}

        {renderContent()}
      </main>

      {/* =====================================================
          MODALE ÉCOLE
      ===================================================== */}

      {showSchoolForm && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              if (
                !schoolSaving &&
                !schoolUpdating
              ) {
                resetSchoolForm()
              }
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
                  {editingSchool
                    ? 'Modifier une école'
                    : 'Nouvelle école'}
                </h2>

                <p>
                  {editingSchool
                    ? "Modifiez les informations de l'établissement."
                    : "Créez l'école et son compte Administrateur École."}
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={resetSchoolForm}
                disabled={
                  schoolSaving ||
                  schoolUpdating
                }
                style={{ color: '#000' }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                editingSchool
                  ? updateSchool
                  : saveSchool
              }
              className="admin-modal-form"
            >
              {/* ÉCOLE */}

              <div className="admin-form-section">
                <div className="admin-form-section-title">
                  <span>🏫</span>

                  <div>
                    <strong>
                      Informations de l'école
                    </strong>

                    <small>
                      Les informations principales
                      de l'établissement.
                    </small>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <FormField
                    label="Nom de l'école"
                    required
                    value={schoolForm.name}
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
                    value={schoolForm.city}
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
                    value={schoolForm.address}
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
                    value={schoolForm.phone}
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
                    value={schoolForm.email}
                    onChange={(e) =>
                      updateSchoolField(
                        'email',
                        e.target.value
                      )
                    }
                    placeholder="contact@ecole.sn"
                    type="email"
                  />

                  <label
                    className="admin-form-field"
                    style={{ color: '#000' }}
                  >
                    <span style={{ color: '#000' }}>
                      Logo de l'école
                    </span>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={
                        handleLogoFileChange
                      }
                      style={{ color: '#000' }}
                    />

                    <small style={{ color: '#000' }}>
                      Choisissez le logo directement
                      depuis votre téléphone.
                      Taille maximale : 5 Mo.
                    </small>
                  </label>
                </div>

                {schoolForm.logo_url && (
                  <div
                    style={{
                      marginTop: '15px',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '10px',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        marginBottom: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Aperçu du logo
                    </p>

                    <img
                      src={schoolForm.logo_url}
                      alt="Aperçu du logo"
                      style={{
                        maxWidth: '100px',
                        maxHeight: '100px',
                        objectFit: 'contain',
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* ADMIN */}

              {!editingSchool && (
                <div className="admin-form-section">
                  <div className="admin-form-section-title">
                    <span>👨‍💼</span>

                    <div>
                      <strong>
                        Administrateur École
                      </strong>

                      <small>
                        Ce compte permettra de gérer
                        cette école.
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
              )}

              {!editingSchool && (
                <div
                  className="admin-form-info"
                  style={{ color: '#000' }}
                >
                  <span>🔐</span>

                  <p>
                    Le mot de passe sert à créer le
                    compte sécurisé de l'Admin École.
                    Il n'est pas enregistré dans la
                    table <code>profiles</code>.
                  </p>
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={resetSchoolForm}
                  disabled={
                    schoolSaving ||
                    schoolUpdating
                  }
                  style={{ color: '#000' }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={
                    schoolSaving ||
                    schoolUpdating
                  }
                  style={{ color: '#000' }}
                >
                  {editingSchool
                    ? schoolUpdating
                      ? 'Modification en cours...'
                      : '💾 Enregistrer les modifications'
                    : schoolSaving
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
