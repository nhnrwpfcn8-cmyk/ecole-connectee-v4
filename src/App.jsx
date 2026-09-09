import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import AdminDashboard from './AdminDashboard'
import AdminEcoleDashboard from './AdminEcoleDashboard'
import SecretaryDashboard from './SecretaryDashboard'
import SecretaryServices from './SecretaryServices'
import TeacherDashboard from './TeacherDashboard'

import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  /*
   * Pour le secrétaire :
   * dashboard = tableau de bord secrétaire existant
   * services = communication + scolarité
   */
  const [secretaryPage, setSecretaryPage] =
    useState('dashboard')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)

      if (session) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return

        setSession(newSession)

        if (newSession) {
          await loadProfile(newSession.user.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, role, school_id, active'
      )
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erreur profil :', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  async function handleLogin(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      setError(
        'Veuillez saisir votre email et votre mot de passe.'
      )
      return
    }

    setConnecting(true)

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    if (error) {
      console.error(error)
      setError(error.message)
      setConnecting(false)
      return
    }

    setSession(data.session)

    if (data.user) {
      await loadProfile(data.user.id)
    }

    setMessage('Connexion réussie.')
    setConnecting(false)
  }

  async function handleLogout() {
    setError('')
    setMessage('')

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    setSession(null)
    setProfile(null)
    setEmail('')
    setPassword('')
    setSecretaryPage('dashboard')
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-card">
          <div className="logo-circle">
            EC
          </div>

          <h1>École Connectée</h1>

          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  /*
   * PAGE DE CONNEXION
   */
  if (!session) {
    return (
      <div className="app-container">
        <div className="login-card">
          <div className="logo-circle">
            EC
          </div>

          <h1>École Connectée</h1>

          <p className="subtitle">
            La plateforme numérique de gestion scolaire
          </p>

          <h2>Se connecter</h2>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">
              Adresse email
            </label>

            <input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
            />

            <label htmlFor="password">
              Mot de passe
            </label>

            <input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {message && (
              <div className="success-message">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={connecting}
            >
              {connecting
                ? 'Connexion...'
                : 'Se connecter'}
            </button>
          </form>

          <p className="login-info">
            Accès sécurisé par Supabase
          </p>
        </div>
      </div>
    )
  }

  const role =
    profile?.role || 'non configuré'

  /*
   * SUPER ADMIN
   *
   * On ne modifie pas son fonctionnement.
   */
  if (role === 'super_admin') {
    return (
      <AdminDashboard
        profile={profile}
        session={session}
        onLogout={handleLogout}
      />
    )
  }

  /*
   * ADMIN ÉCOLE
   *
   * On ne modifie pas son fonctionnement.
   */
  if (role === 'school_admin') {
    return (
      <AdminEcoleDashboard
        profile={profile}
        session={session}
        onLogout={handleLogout}
      />
    )
  }

  /*
   * SECRÉTAIRE
   */
  if (role === 'secretary') {
    /*
     * Nouveau module :
     * Communication + Scolarité
     */
    if (secretaryPage === 'services') {
      return (
        <SecretaryServices
          session={session}
          profile={profile}
          onLogout={handleLogout}
          onBack={() =>
            setSecretaryPage('dashboard')
          }
        />
      )
    }

    /*
     * Tableau de bord secrétaire EXISTANT
     */
    return (
      <SecretaryDashboard
        session={session}
        profile={profile}
        onLogout={handleLogout}
        onOpenServices={() =>
          setSecretaryPage('services')
        }
      />
    )
  }
  /*
   * ENSEIGNANT
   */
  if (role === 'teacher') {
    return (
      <TeacherDashboard
        profile={profile}
        session={session}
        onLogout={handleLogout}
      />
    )
  }
  /*
   * AUTRES RÔLES
   */
  return (
    <div className="app-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <div className="small-logo">
              EC
            </div>

            <h1>École Connectée</h1>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Se déconnecter
          </button>
        </div>

        <div className="welcome-section">
          <h2>
            Bienvenue
            {profile?.full_name
              ? `, ${profile.full_name}`
              : ''}{' '}
            👋
          </h2>

          <p>
            Vous êtes connecté à votre espace
            École Connectée.
          </p>
        </div>

        <div className="role-card">
          <span className="role-label">
            Votre rôle
          </span>

          <strong>
            {role === 'teacher'
              ? 'Enseignant'
              : role === 'parent'
                ? 'Parent'
                : role === 'student'
                  ? 'Élève'
                  : role}
          </strong>
        </div>

        <div className="feature-card">
          <h3>
            Bienvenue dans École Connectée
          </h3>

          <p>
            Votre espace est en cours de préparation.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App