import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

import AdminDashboard from './AdminDashboard'
import AdminEcoleDashboard from './AdminEcoleDashboard'
import SecretaryDashboard from './SecretaryDashboard'
import SecretaryServices from './SecretaryServices'
import TeacherDashboard from './TeacherDashboard'
import StudentDashboard from './StudentDashboard'
import ParentDashboard from './ParentDashboard'
import SecretaryParentCommunicationPage from "./SecretaryParentCommunicationPage";

import './App.css'

const LOGIN_DOMAIN = 'login.ecole-connectee.local'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [secretaryPage, setSecretaryPage] =
    useState('dashboard')

  const profileRequestRef = useRef(0)

  /*
   * Récupère uniquement le profil
   * de l'utilisateur actuellement connecté.
   */
  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return null
    }

    const requestId =
      ++profileRequestRef.current

    let lastError = null

    for (
      let attempt = 0;
      attempt < 3;
      attempt += 1
    ) {
      try {
        const {
          data,
          error: profileError,
        } = await supabase.rpc(
          'get_my_profile'
        )

        if (
          requestId !==
          profileRequestRef.current
        ) {
          return null
        }

        if (
          !profileError &&
          data
        ) {
          console.log(
            'Profil connecté récupéré :',
            data
          )

          setProfile(data)

          return data
        }

        lastError = profileError

        console.error(
          'Erreur récupération profil :',
          profileError
        )
      } catch (err) {
        lastError = err

        console.error(
          'Erreur inattendue récupération profil :',
          err
        )
      }

      if (attempt < 2) {
        await new Promise(
          (resolve) =>
            setTimeout(resolve, 300)
        )
      }
    }

    console.error(
      'Impossible de récupérer le profil :',
      lastError
    )

    if (
      requestId ===
      profileRequestRef.current
    ) {
      setProfile(null)
    }

    return null
  }

  /*
   * Applique la session et récupère
   * le profil correspondant.
   */
  async function applySession(
    newSession
  ) {
    setSession(newSession)

    if (
      !newSession?.user?.id
    ) {
      profileRequestRef.current += 1
      setProfile(null)
      return null
    }

    return loadProfile(
      newSession.user.id
    )
  }

  /*
   * Chargement initial de la session
   * + écoute des changements Auth.
   */
  useEffect(() => {
    let mounted = true

    async function loadInitialSession() {
      const {
        data: {
          session: currentSession,
        },
        error: sessionError,
      } =
        await supabase.auth.getSession()

      if (!mounted) return

      if (sessionError) {
        console.error(
          'Erreur session :',
          sessionError
        )

        setError(
          'Impossible de récupérer votre session.'
        )
      }

      if (currentSession) {
        await applySession(
          currentSession
        )
      } else {
        setSession(null)
        setProfile(null)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    loadInitialSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!mounted) return

          setTimeout(
            async () => {
              if (!mounted) return

              if (
                event ===
                  'SIGNED_OUT' ||
                !newSession
              ) {
                profileRequestRef.current += 1

                setSession(null)
                setProfile(null)
                setLoading(false)

                return
              }

              await applySession(
                newSession
              )

              if (mounted) {
                setLoading(false)
              }
            },
            0
          )
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /*
   * CONNEXION
   */
  async function handleLogin(
    event
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    const cleanIdentifier =
      email
        .trim()
        .toLowerCase()

    if (
      !cleanIdentifier ||
      !password
    ) {
      setError(
        'Veuillez saisir votre identifiant ou votre adresse email ainsi que votre mot de passe.'
      )

      return
    }

    setConnecting(true)

    const authEmail =
      cleanIdentifier.includes('@')
        ? cleanIdentifier
        : `${cleanIdentifier}@${LOGIN_DOMAIN}`

    const {
      data,
      error: loginError,
    } =
      await supabase.auth.signInWithPassword(
        {
          email: authEmail,
          password,
        }
      )

    if (loginError) {
      console.error(
        'Erreur de connexion :',
        loginError
      )

      setError(
        'Identifiant ou mot de passe incorrect.'
      )

      setConnecting(false)

      return
    }

    await applySession(
      data.session
    )

    setMessage(
      'Connexion réussie.'
    )

    setConnecting(false)
  }

  /*
   * DÉCONNEXION
   */
  async function handleLogout() {
    setError('')
    setMessage('')

    const {
      error: logoutError,
    } =
      await supabase.auth.signOut()

    if (logoutError) {
      setError(
        logoutError.message
      )

      return
    }

    profileRequestRef.current += 1

    setSession(null)
    setProfile(null)

    setEmail('')
    setPassword('')

    setSecretaryPage(
      'dashboard'
    )
  }

  /*
   * CHARGEMENT
   */
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-card">

          <div className="logo-circle">
            EC
          </div>

          <h1>
            École Connectée
          </h1>

          <p>
            Chargement...
          </p>

        </div>
      </div>
    )
  }

  /*
   * CONNEXION
   */
  if (!session) {
    return (
      <div className="app-container">

        <div className="login-card">

          <div className="logo-circle">
            EC
          </div>

          <h1>
            École Connectée
          </h1>

          <p className="subtitle">
            La plateforme numérique de gestion scolaire
          </p>

          <h2>
            Se connecter
          </h2>

          <form
            onSubmit={handleLogin}
          >

            <label htmlFor="email">
              Identifiant ou adresse email
            </label>

            <input
              id="email"
              type="text"
              placeholder="Ex : pierre.gomis.eleve ou admin@email.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
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
                setPassword(
                  event.target.value
                )
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
   * RÔLE
   */
  const role =
    profile?.role ||
    'non configuré'

  /*
   * SUPER ADMIN
   */
  if (
    role === 'super_admin'
  ) {
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
   */
  if (
    role === 'school_admin'
  ) {
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
  if (role === "secretary") {
  if (secretaryPage === "services") {
    return (
      <SecretaryServices
        session={session}
        profile={profile}
        onLogout={handleLogout}
        onBack={() => setSecretaryPage("dashboard")}
      />
    );
  }

  if (secretaryPage === "parent_communication") {
    return (
      <SecretaryParentCommunicationPage
        schoolId={profile?.school_id}
        secretaryId={profile?.id}
        onBack={() => setSecretaryPage("dashboard")}
      />
    );
  }

  return (
    <SecretaryDashboard
      session={session}
      profile={profile}
      onLogout={handleLogout}
      onOpenServices={() => setSecretaryPage("services")}
      onOpenParentCommunication={() =>
        setSecretaryPage("parent_communication")
      }
    />
  );
}

  /*
   * PROFESSEUR
   */
  if (
    role === 'teacher'
  ) {
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
   */
  if (
    role === 'student'
  ) {
    return (
      <StudentDashboard
        profile={profile}
        session={session}
        onLogout={handleLogout}
      />
    )
  }

  /*
   * PARENT
   */
  if (
    role === 'parent'
  ) {
    return (
      <ParentDashboard
        profile={profile}
        session={session}
        onLogout={handleLogout}
      />
    )
  }

  /*
   * RÔLE NON CONFIGURÉ
   */
  return (
    <div className="app-container">

      <div className="dashboard-card">

        <div className="dashboard-header">

          <div>

            <div className="small-logo">
              EC
            </div>

            <h1>
              École Connectée
            </h1>

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
            Vous êtes connecté à votre espace École Connectée.
          </p>

        </div>

        <div className="role-card">

          <span className="role-label">
            Votre rôle
          </span>

          <strong>
            {role}
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
