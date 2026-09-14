import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import AdminDashboard from './AdminDashboard'
import AdminEcoleDashboard from './AdminEcoleDashboard'
import SecretaryDashboard from './SecretaryDashboard'
import SecretaryServices from './SecretaryServices'
import TeacherDashboard from './TeacherDashboard'

import './App.css'

/*
 * Domaine technique utilisé pour les comptes
 * Élèves / Parents créés automatiquement.
 *
 * Exemple :
 * pierre.gomis.eleve
 * devient :
 * pierre.gomis.eleve@login.ecole-connectee.local
 */
const LOGIN_DOMAIN = 'login.ecole-connectee.local'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  /*
   * Le champ accepte maintenant :
   * - une adresse email classique
   * - un identifiant Élève
   * - un identifiant Parent
   */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  /*
   * Pour le secrétaire :
   *
   * dashboard = tableau de bord secrétaire existant
   * services = communication + scolarité
   */
  const [secretaryPage, setSecretaryPage] =
    useState('dashboard')

  /*
   * Chargement de la session au démarrage
   */
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

  /*
   * Chargement du profil connecté
   */
  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, username, role, school_id, active, family_identifier'
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

  /*
   * CONNEXION
   *
   * Les comptes classiques utilisent leur email.
   *
   * Les comptes créés avec un identifiant utilisent :
   *
   * pierre.gomis.eleve
   *
   * qui devient automatiquement :
   *
   * pierre.gomis.eleve@login.ecole-connectee.local
   */
  async function handleLogin(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const cleanIdentifier =
      email.trim().toLowerCase()

    if (!cleanIdentifier || !password) {
      setError(
        'Veuillez saisir votre identifiant ou votre adresse email ainsi que votre mot de passe.'
      )
      return
    }

    setConnecting(true)

    /*
     * Si l'utilisateur saisit déjà une adresse email,
     * on l'utilise directement.
     *
     * Sinon, on construit l'adresse technique
     * utilisée par les comptes Élève / Parent.
     */
    const authEmail =
      cleanIdentifier.includes('@')
        ? cleanIdentifier
        : `${cleanIdentifier}@${LOGIN_DOMAIN}`

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      })

    if (error) {
      console.error('Erreur de connexion :', error)

      setError(
        'Identifiant ou mot de passe incorrect.'
      )

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

  /*
   * DÉCONNEXION
   */
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

  /*
   * ÉCRAN DE CHARGEMENT
   */
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
              Identifiant ou adresse email
            </label>

            <input
              id="email"
              type="text"
              placeholder="Ex : pierre.gomis.eleve ou admin@email.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
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

  /*
   * RÔLE ACTUEL
   */
  const role =
    profile?.role || 'non configuré'

  /*
   * SUPER ADMIN
   *
   * Fonctionnement conservé.
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
   * Fonctionnement conservé.
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
     * Module Communication + Scolarité
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
     * Tableau de bord secrétaire existant
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
   *
   * Fonctionnement conservé.
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
   * ÉLÈVE
   *
   * Le compte Élève est maintenant correctement reconnu.
   *
   * Le véritable StudentDashboard sera branché ici
   * dès que nous l'ajoutons au projet.
   */
  if (role === 'student') {
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
              Élève.
            </p>
          </div>

          <div className="role-card">
            <span className="role-label">
              Votre rôle
            </span>

            <strong>Élève</strong>
          </div>

          <div className="feature-card">
            <h3>
              🎓 Espace Élève
            </h3>

            <p>
              Votre espace élève est maintenant
              reconnu par École Connectée.
            </p>

            <p>
              Les prochaines fonctionnalités
              comprendront vos cours, exercices,
              évaluations, notes, présences,
              bulletins, communication et carte
              scolaire.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /*
   * PARENT
   *
   * Le compte Parent est maintenant correctement
   * reconnu par l'application.
   *
   * Le véritable ParentDashboard sera branché
   * lorsque nous construirons l'espace Parent.
   */
  if (role === 'parent') {
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
              Parent.
            </p>
          </div>

          <div className="role-card">
            <span className="role-label">
              Votre rôle
            </span>

            <strong>Parent</strong>
          </div>

          <div className="feature-card">
            <h3>
              👨‍👩‍👧 Espace Parent
            </h3>

            <p>
              Votre espace parent est maintenant
              reconnu par École Connectée.
            </p>

            <p>
              Le tableau de bord Parent sera
              construit après l'activation complète
              de l'espace Élève.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /*
   * AUTRES RÔLES / RÔLE NON CONFIGURÉ
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
            Votre espace est en cours de
            préparation.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
