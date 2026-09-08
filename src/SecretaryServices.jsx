import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

function SecretaryServices({ session, profile, onLogout, onBack }) {
  const [activeTab, setActiveTab] = useState('parents')
  const [parents, setParents] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [messages, setMessages] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [meetings, setMeetings] = useState([])

  const [selectedParent, setSelectedParent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Message parent
  const [messageSubject, setMessageSubject] = useState('')
  const [messageText, setMessageText] = useState('')

  // Information aux parents
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementTarget, setAnnouncementTarget] = useState('all')
  const [announcementClass, setAnnouncementClass] = useState('')
  const [announcementParent, setAnnouncementParent] = useState('')

  // Convocation / rendez-vous
  const [meetingParent, setMeetingParent] = useState('')
  const [meetingStudent, setMeetingStudent] = useState('')
  const [meetingReason, setMeetingReason] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')

  const schoolId = profile?.school_id
  const userId = session?.user?.id

  useEffect(() => {
    if (schoolId) {
      loadData()
    }
  }, [schoolId])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        parentsResult,
        classesResult,
        studentsResult,
        messagesResult,
        announcementsResult,
        meetingsResult,
      ] = await Promise.all([
        supabase
          .from('parents')
          .select(`
            id,
            full_name,
            phone,
            email,
            address,
            active
          `)
          .eq('school_id', schoolId)
          .order('full_name'),

        supabase
          .from('classes')
          .select('id, name, level')
          .eq('school_id', schoolId)
          .order('name'),

        supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            student_code,
            class_id,
            active
          `)
          .eq('school_id', schoolId)
          .order('last_name'),

        supabase
          .from('secretary_parent_messages')
          .select(`
            id,
            parent_id,
            subject,
            message,
            read_at,
            created_at
          `)
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('secretary_parent_announcements')
          .select(`
            id,
            target_type,
            target_class_id,
            target_parent_id,
            title,
            message,
            published_at,
            created_at
          `)
          .eq('school_id', schoolId)
          .order('published_at', { ascending: false })
          .limit(100),

        supabase
          .from('secretary_parent_meetings')
          .select(`
            id,
            parent_id,
            student_id,
            reason,
            meeting_date,
            meeting_time,
            status,
            notes,
            created_at
          `)
          .eq('school_id', schoolId)
          .order('meeting_date', { ascending: true })
          .limit(100),
      ])

      if (parentsResult.error) throw parentsResult.error
      if (classesResult.error) throw classesResult.error
      if (studentsResult.error) throw studentsResult.error
      if (messagesResult.error) throw messagesResult.error
      if (announcementsResult.error) throw announcementsResult.error
      if (meetingsResult.error) throw meetingsResult.error

      setParents(parentsResult.data || [])
      setClasses(classesResult.data || [])
      setStudents(studentsResult.data || [])
      setMessages(messagesResult.data || [])
      setAnnouncements(announcementsResult.data || [])
      setMeetings(meetingsResult.data || [])
    } catch (err) {
      console.error('Erreur chargement services secrétaire :', err)
      setError(err.message || 'Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  const filteredParents = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) return parents

    return parents.filter((parent) => {
      return (
        parent.full_name?.toLowerCase().includes(value) ||
        parent.phone?.toLowerCase().includes(value) ||
        parent.email?.toLowerCase().includes(value)
      )
    })
  }, [parents, search])

  function getParentStudents(parentId) {
    return students.filter((student) => {
      return student.parent_id === parentId
    })
  }

  async function getChildrenOfParent(parentId) {
    const { data, error } = await supabase
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', parentId)

    if (error) {
      console.error(error)
      return []
    }

    const ids = (data || []).map((item) => item.student_id)

    return students.filter((student) => ids.includes(student.id))
  }

  const [selectedChildren, setSelectedChildren] = useState([])

  async function handleSelectParent(parent) {
    setSelectedParent(parent)
    setSelectedStudent(null)
    setMeetingParent(parent.id)
    setAnnouncementParent(parent.id)

    const children = await getChildrenOfParent(parent.id)
    setSelectedChildren(children)
  }

  function className(classId) {
    return classes.find((item) => item.id === classId)?.name || 'Classe non définie'
  }

  function parentName(parentId) {
    return parents.find((item) => item.id === parentId)?.full_name || 'Parent'
  }

  function studentName(studentId) {
    const student = students.find((item) => item.id === studentId)

    if (!student) return 'Élève'

    return `${student.first_name} ${student.last_name}`
  }

  async function sendParentMessage(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!selectedParent) {
      setError('Veuillez sélectionner un parent.')
      return
    }

    if (!messageSubject.trim() || !messageText.trim()) {
      setError('Veuillez remplir le sujet et le message.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('secretary_parent_messages')
        .insert({
          school_id: schoolId,
          secretary_id: userId,
          parent_id: selectedParent.id,
          subject: messageSubject.trim(),
          message: messageText.trim(),
        })

      if (error) throw error

      setMessage('Message envoyé au parent avec succès.')
      setMessageSubject('')
      setMessageText('')

      await loadData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erreur lors de l’envoi du message.')
    } finally {
      setSaving(false)
    }
  }

  async function publishAnnouncement(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!announcementTitle.trim() || !announcementText.trim()) {
      setError('Veuillez renseigner le titre et le contenu.')
      return
    }

    if (
      announcementTarget === 'class' &&
      !announcementClass
    ) {
      setError('Veuillez sélectionner une classe.')
      return
    }

    if (
      announcementTarget === 'parent' &&
      !announcementParent
    ) {
      setError('Veuillez sélectionner un parent.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        school_id: schoolId,
        secretary_id: userId,
        target_type: announcementTarget,
        target_class_id:
          announcementTarget === 'class'
            ? announcementClass
            : null,
        target_parent_id:
          announcementTarget === 'parent'
            ? announcementParent
            : null,
        title: announcementTitle.trim(),
        message: announcementText.trim(),
      }

      const { error } = await supabase
        .from('secretary_parent_announcements')
        .insert(payload)

      if (error) throw error

      setMessage('Information publiée avec succès.')
      setAnnouncementTitle('')
      setAnnouncementText('')
      setAnnouncementTarget('all')
      setAnnouncementClass('')
      setAnnouncementParent('')

      await loadData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erreur lors de la publication.')
    } finally {
      setSaving(false)
    }
  }

  async function createMeeting(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!meetingParent) {
      setError('Veuillez sélectionner un parent.')
      return
    }

    if (!meetingReason.trim()) {
      setError('Veuillez renseigner le motif du rendez-vous.')
      return
    }

    if (!meetingDate) {
      setError('Veuillez choisir une date.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        school_id: schoolId,
        secretary_id: userId,
        parent_id: meetingParent,
        student_id: meetingStudent || null,
        reason: meetingReason.trim(),
        meeting_date: meetingDate,
        meeting_time: meetingTime || null,
        status: 'planned',
        notes: meetingNotes.trim() || null,
      }

      const { error } = await supabase
        .from('secretary_parent_meetings')
        .insert(payload)

      if (error) throw error

      setMessage('Convocation / rendez-vous enregistré avec succès.')

      setMeetingParent('')
      setMeetingStudent('')
      setMeetingReason('')
      setMeetingDate('')
      setMeetingTime('')
      setMeetingNotes('')

      await loadData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erreur lors de la création du rendez-vous.')
    } finally {
      setSaving(false)
    }
  }

  async function updateMeetingStatus(meetingId, status) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('secretary_parent_meetings')
      .update({ status })
      .eq('id', meetingId)
      .eq('school_id', schoolId)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Statut du rendez-vous mis à jour.')
    await loadData()
  }

  function formatDate(date) {
    if (!date) return '-'

    try {
      return new Date(`${date}T00:00:00`).toLocaleDateString(
        'fr-FR'
      )
    } catch {
      return date
    }
  }

  function formatDateTime(date) {
    if (!date) return '-'

    try {
      return new Date(date).toLocaleString('fr-FR')
    } catch {
      return date
    }
  }

  function statusLabel(status) {
    switch (status) {
      case 'planned':
        return 'Planifié'
      case 'confirmed':
        return 'Confirmé'
      case 'completed':
        return 'Terminé'
      case 'cancelled':
        return 'Annulé'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.logo}>EC</div>
          <h2>Chargement...</h2>
          <p>Préparation de l’espace Scolarité & Communication.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>EC</div>

          <div>
            <h1 style={styles.title}>
              Scolarité & Communication
            </h1>

            <p style={styles.subtitle}>
              Espace secrétaire
            </p>
          </div>
        </div>

        <div style={styles.headerActions}>
  <button
    type="button"
    onClick={onBack}
    style={styles.secondaryButton}
  >
    🏠 Menu principal
  </button>

  <button
    type="button"
    onClick={onLogout}
    style={styles.logoutButton}
  >
    Déconnexion
  </button>
</div>
      </header>

      <main style={styles.container}>
        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.tabs}>
          <button
            style={
              activeTab === 'parents'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => setActiveTab('parents')}
          >
            👨‍👩‍👧 Parents
          </button>

          <button
            style={
              activeTab === 'information'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => setActiveTab('information')}
          >
            📢 Informations
          </button>

          <button
            style={
              activeTab === 'meetings'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => setActiveTab('meetings')}
          >
            📅 Convocations
          </button>

          <button
            style={
              activeTab === 'history'
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => setActiveTab('history')}
          >
            🕘 Historique
          </button>
        </div>

        {activeTab === 'parents' && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2>Communication avec les parents</h2>
                <p>
                  Recherchez un parent et envoyez-lui directement
                  une information.
                </p>
              </div>

              <div style={styles.counter}>
                {parents.length} parent(s)
              </div>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un parent, téléphone ou email..."
              style={styles.input}
            />

            <div style={styles.twoColumns}>
              <div style={styles.card}>
                <h3>Liste des parents</h3>

                {filteredParents.length === 0 ? (
                  <p style={styles.muted}>
                    Aucun parent trouvé.
                  </p>
                ) : (
                  <div style={styles.list}>
                    {filteredParents.map((parent) => (
                      <button
                        key={parent.id}
                        onClick={() => handleSelectParent(parent)}
                        style={{
                          ...styles.parentItem,
                          ...(selectedParent?.id === parent.id
                            ? styles.selectedParent
                            : {}),
                        }}
                      >
                        <strong>
                          {parent.full_name}
                        </strong>

                        <span>
                          {parent.phone || 'Téléphone non renseigné'}
                        </span>

                        <span>
                          {parent.email || 'Email non renseigné'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                {!selectedParent ? (
                  <div style={styles.empty}>
                    <div style={styles.emptyIcon}>👨‍👩‍👧</div>
                    <h3>Sélectionnez un parent</h3>
                    <p>
                      Les informations du parent et les enfants
                      associés apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3>
                      {selectedParent.full_name}
                    </h3>

                    <div style={styles.infoBox}>
                      <p>
                        <strong>Téléphone :</strong>{' '}
                        {selectedParent.phone || '-'}
                      </p>

                      <p>
                        <strong>Email :</strong>{' '}
                        {selectedParent.email || '-'}
                      </p>

                      <p>
                        <strong>Adresse :</strong>{' '}
                        {selectedParent.address || '-'}
                      </p>
                    </div>

                    <h4>Enfant(s)</h4>

                    {selectedChildren.length === 0 ? (
                      <p style={styles.muted}>
                        Aucun enfant associé trouvé.
                      </p>
                    ) : (
                      <div style={styles.children}>
                        {selectedChildren.map((student) => (
                          <button
                            key={student.id}
                            onClick={() =>
                              setSelectedStudent(student)
                            }
                            style={styles.child}
                          >
                            <strong>
                              {student.first_name}{' '}
                              {student.last_name}
                            </strong>

                            <span>
                              {className(student.class_id)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <hr style={styles.hr} />

                    <h3>Envoyer un message</h3>

                    <form onSubmit={sendParentMessage}>
                      <label style={styles.label}>
                        Sujet
                      </label>

                      <input
                        value={messageSubject}
                        onChange={(event) =>
                          setMessageSubject(event.target.value)
                        }
                        placeholder="Ex : Information importante"
                        style={styles.input}
                      />

                      <label style={styles.label}>
                        Message
                      </label>

                      <textarea
                        value={messageText}
                        onChange={(event) =>
                          setMessageText(event.target.value)
                        }
                        placeholder="Écrivez votre message..."
                        rows={6}
                        style={styles.textarea}
                      />

                      <button
                        type="submit"
                        disabled={saving}
                        style={styles.primaryButton}
                      >
                        {saving
                          ? 'Envoi...'
                          : '✉️ Envoyer au parent'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'information' && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2>Informations à transmettre aux parents</h2>
                <p>
                  Publiez une information générale, par classe ou
                  pour un parent précis.
                </p>
              </div>
            </div>

            <div style={styles.card}>
              <form onSubmit={publishAnnouncement}>
                <label style={styles.label}>
                  Destinataires
                </label>

                <select
                  value={announcementTarget}
                  onChange={(event) =>
                    setAnnouncementTarget(event.target.value)
                  }
                  style={styles.input}
                >
                  <option value="all">
                    Tous les parents
                  </option>

                  <option value="class">
                    Parents d'une classe
                  </option>

                  <option value="parent">
                    Un parent précis
                  </option>
                </select>

                {announcementTarget === 'class' && (
                  <>
                    <label style={styles.label}>
                      Classe
                    </label>

                    <select
                      value={announcementClass}
                      onChange={(event) =>
                        setAnnouncementClass(event.target.value)
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Choisir une classe
                      </option>

                      {classes.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                          {item.level
                            ? ` — ${item.level}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {announcementTarget === 'parent' && (
                  <>
                    <label style={styles.label}>
                      Parent
                    </label>

                    <select
                      value={announcementParent}
                      onChange={(event) =>
                        setAnnouncementParent(event.target.value)
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Choisir un parent
                      </option>

                      {parents.map((parent) => (
                        <option
                          key={parent.id}
                          value={parent.id}
                        >
                          {parent.full_name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <label style={styles.label}>
                  Titre
                </label>

                <input
                  value={announcementTitle}
                  onChange={(event) =>
                    setAnnouncementTitle(event.target.value)
                  }
                  placeholder="Ex : Réunion de parents"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Information
                </label>

                <textarea
                  value={announcementText}
                  onChange={(event) =>
                    setAnnouncementText(event.target.value)
                  }
                  placeholder="Écrivez l'information à transmettre..."
                  rows={8}
                  style={styles.textarea}
                />

                <button
                  type="submit"
                  disabled={saving}
                  style={styles.primaryButton}
                >
                  {saving
                    ? 'Publication...'
                    : '📢 Publier l’information'}
                </button>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'meetings' && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2>Convocations & rendez-vous</h2>
                <p>
                  Organisez les rendez-vous entre l'école et les
                  parents.
                </p>
              </div>
            </div>

            <div style={styles.twoColumns}>
              <div style={styles.card}>
                <h3>Nouveau rendez-vous</h3>

                <form onSubmit={createMeeting}>
                  <label style={styles.label}>
                    Parent
                  </label>

                  <select
                    value={meetingParent}
                    onChange={(event) => {
                      setMeetingParent(event.target.value)
                      setMeetingStudent('')
                    }}
                    style={styles.input}
                  >
                    <option value="">
                      Choisir un parent
                    </option>

                    {parents.map((parent) => (
                      <option
                        key={parent.id}
                        value={parent.id}
                      >
                        {parent.full_name}
                      </option>
                    ))}
                  </select>

                  <label style={styles.label}>
                    Élève concerné
                  </label>

                  <select
                    value={meetingStudent}
                    onChange={(event) =>
                      setMeetingStudent(event.target.value)
                    }
                    style={styles.input}
                  >
                    <option value="">
                      Aucun élève précis
                    </option>

                    {students
                      .filter((student) => {
                        if (!meetingParent) return true

                        return selectedChildren.some(
                          (child) =>
                            child.id === student.id
                        )
                      })
                      .map((student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.first_name}{' '}
                          {student.last_name}
                        </option>
                      ))}
                  </select>

                  <label style={styles.label}>
                    Motif
                  </label>

                  <input
                    value={meetingReason}
                    onChange={(event) =>
                      setMeetingReason(event.target.value)
                    }
                    placeholder="Ex : Entretien scolaire"
                    style={styles.input}
                  />

                  <label style={styles.label}>
                    Date
                  </label>

                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(event) =>
                      setMeetingDate(event.target.value)
                    }
                    style={styles.input}
                  />

                  <label style={styles.label}>
                    Heure
                  </label>

                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(event) =>
                      setMeetingTime(event.target.value)
                    }
                    style={styles.input}
                  />

                  <label style={styles.label}>
                    Notes
                  </label>

                  <textarea
                    value={meetingNotes}
                    onChange={(event) =>
                      setMeetingNotes(event.target.value)
                    }
                    rows={5}
                    placeholder="Notes internes..."
                    style={styles.textarea}
                  />

                  <button
                    type="submit"
                    disabled={saving}
                    style={styles.primaryButton}
                  >
                    {saving
                      ? 'Enregistrement...'
                      : '📅 Enregistrer le rendez-vous'}
                  </button>
                </form>
              </div>

              <div style={styles.card}>
                <h3>Rendez-vous programmés</h3>

                {meetings.length === 0 ? (
                  <p style={styles.muted}>
                    Aucun rendez-vous enregistré.
                  </p>
                ) : (
                  <div style={styles.list}>
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        style={styles.meeting}
                      >
                        <div>
                          <strong>
                            {parentName(meeting.parent_id)}
                          </strong>

                          <p>
                            {meeting.reason}
                          </p>

                          <span>
                            {formatDate(
                              meeting.meeting_date
                            )}

                            {meeting.meeting_time
                              ? ` à ${meeting.meeting_time}`
                              : ''}
                          </span>

                          {meeting.student_id && (
                            <small>
                              Élève :{' '}
                              {studentName(
                                meeting.student_id
                              )}
                            </small>
                          )}
                        </div>

                        <select
                          value={meeting.status}
                          onChange={(event) =>
                            updateMeetingStatus(
                              meeting.id,
                              event.target.value
                            )
                          }
                          style={styles.statusSelect}
                        >
                          <option value="planned">
                            Planifié
                          </option>

                          <option value="confirmed">
                            Confirmé
                          </option>

                          <option value="completed">
                            Terminé
                          </option>

                          <option value="cancelled">
                            Annulé
                          </option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'history' && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2>Historique des communications</h2>
                <p>
                  Retrouvez les messages et informations déjà
                  transmis.
                </p>
              </div>
            </div>

            <div style={styles.card}>
              <h3>Messages envoyés</h3>

              {messages.length === 0 ? (
                <p style={styles.muted}>
                  Aucun message envoyé.
                </p>
              ) : (
                <div style={styles.list}>
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      style={styles.historyItem}
                    >
                      <strong>
                        {item.subject}
                      </strong>

                      <span>
                        À : {parentName(item.parent_id)}
                      </span>

                      <p>{item.message}</p>

                      <small>
                        {formatDateTime(item.created_at)}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h3>Informations publiées</h3>

              {announcements.length === 0 ? (
                <p style={styles.muted}>
                  Aucune information publiée.
                </p>
              ) : (
                <div style={styles.list}>
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      style={styles.historyItem}
                    >
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        Destinataires :{' '}
                        {item.target_type === 'all'
                          ? 'Tous les parents'
                          : item.target_type === 'class'
                            ? `Classe ${className(
                                item.target_class_id
                              )}`
                            : parentName(
                                item.target_parent_id
                              )}
                      </span>

                      <p>{item.message}</p>

                      <small>
                        {formatDateTime(
                          item.published_at ||
                            item.created_at
                        )}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    color: '#172033',
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  logo: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: '#1d4ed8',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
  },

  title: {
    margin: 0,
    fontSize: '22px',
  },

  subtitle: {
    margin: '4px 0 0',
    color: '#64748b',
  },

  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },

  container: {
    maxWidth: '1250px',
    margin: '0 auto',
    padding: '24px',
  },

  loadingCard: {
    maxWidth: '500px',
    margin: '100px auto',
    background: '#ffffff',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },

  tabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },

  tab: {
    border: '1px solid #dbe2ea',
    background: '#ffffff',
    padding: '12px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  activeTab: {
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: '#ffffff',
    padding: '12px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'center',
    marginBottom: '20px',
  },

  counter: {
    background: '#e8efff',
    color: '#1d4ed8',
    padding: '8px 14px',
    borderRadius: '999px',
    fontWeight: '700',
  },

  twoColumns: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(280px, 0.8fr) minmax(400px, 1.2fr)',
    gap: '20px',
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '22px',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '15px',
    marginBottom: '14px',
    background: '#ffffff',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '15px',
    marginBottom: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },

  label: {
    display: 'block',
    fontWeight: '700',
    marginBottom: '7px',
  },

  primaryButton: {
    border: 0,
    background: '#1d4ed8',
    color: '#ffffff',
    padding: '12px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
  },

  secondaryButton: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    padding: '10px 15px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  logoutButton: {
    border: 0,
    background: '#dc2626',
    color: '#ffffff',
    padding: '10px 15px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  parentItem: {
    width: '100%',
    textAlign: 'left',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  selectedParent: {
    border: '2px solid #1d4ed8',
    background: '#eff6ff',
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  children: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  child: {
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '10px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  infoBox: {
    background: '#f8fafc',
    padding: '14px',
    borderRadius: '10px',
    marginBottom: '18px',
  },

  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
  },

  emptyIcon: {
    fontSize: '42px',
  },

  muted: {
    color: '#64748b',
  },

  success: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
    padding: '12px 15px',
    borderRadius: '10px',
    marginBottom: '15px',
  },

  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    padding: '12px 15px',
    borderRadius: '10px',
    marginBottom: '15px',
  },

  hr: {
    border: 0,
    borderTop: '1px solid #e5e7eb',
    margin: '24px 0',
  },

  meeting: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px',
    alignItems: 'flex-start',
  },

  statusSelect: {
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px',
    background: '#ffffff',
  },

  historyItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '15px',
  },
}

export default SecretaryServices