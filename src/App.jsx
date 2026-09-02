import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
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
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      setSession(newSession)

      if (newSession) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, school_id, active')
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
      setError('Veuillez saisir votre email et votre mot de passe.')
      return
    }

    setConnecting(true)

    const { data, error } = await supabase.auth.signInWithPassword({
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

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    setSession(null)
    setProfile(null)
    setEmail('')
    setPassword('')
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-card">
          <div className="logo-circle">EC</div>
          <h1>École Connectée</h1>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-container">
        <div className="login-card">
          <div className="logo-circle">EC</div>

          <h1>École Connectée</h1>

          <p className="subtitle">
            La plateforme numérique de gestion scolaire
          </p>

          <h2>Se connecter</h2>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Adresse email</label>

            <input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />

            <label htmlFor="password">Mot de passe</label>

            <input
              id="password"
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />

            {error && <div className="error-message">{error}</div>}

            {message && <div className="success-message">{message}</div>}

            <button type="submit" disabled={connecting}>
              {connecting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="login-info">
            Accès sécurisé par Supabase
          </p>
        </div>
      </div>
    )
  }

  const role = profile?.role || 'non configuré'

  return (
    <div className="app-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <div className="small-logo">EC</div>
            <h1>École Connectée</h1>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>

        <div className="welcome-section">
          <h2>
            Bienvenue
            {profile?.full_name ? `, ${profile.full_name}` : ''} 👋
          </h2>

          <p>
            Vous êtes connecté à votre espace École Connectée.
          </p>
        </div>

        <div className="role-card">
          <span className="role-label">Votre rôle</span>

          <strong>
            {role === 'admin'
              ? 'Administrateur'
              : role === 'teacher'
                ? 'Enseignant'
                : role === 'parent'
                  ? 'Parent'
                  : role === 'student'
                    ? 'Élève'
                    : role}
          </strong>
        </div>

        {role === 'admin' && (
          <div className="feature-card">
            <h3>👨‍💼 Espace Administrateur</h3>
            <p>
              Le tableau de bord administrateur sera disponible ici.
            </p>

            <div className="feature-grid">
              <div>👨‍🏫 Enseignants</div>
              <div>👨‍🎓 Élèves</div>
              <div>👪 Parents</div>
              <div>🏫 Écoles</div>
              <div>📚 Classes</div>
              <div>📖 Matières</div>
            </div>
          </div>
        )}

        {role === 'teacher' && (
          <div className="feature-card">
            <h3>👨‍🏫 Espace Enseignant</h3>
            <p>
              Votre tableau de bord enseignant sera disponible ici.
            </p>

            <div className="feature-grid">
              <div>📚 Mes cours</div>
              <div>📝 Exercices</div>
              <div>⭐ Évaluations</div>
              <div>🎥 Vidéos</div>
              <div>📄 Documents</div>
              <div>👨‍🎓 Mes élèves</div>
            </div>
          </div>
        )}

        {role === 'parent' && (
          <div className="feature-card">
            <h3>👪 Espace Parent</h3>
            <p>
              Votre espace parent sera disponible ici.
            </p>

            <div className="feature-grid">
              <div>👨‍🎓 Mes enfants</div>
              <div>📚 Cours</div>
              <div>📝 Exercices</div>
              <div>⭐ Évaluations</div>
              <div>📊 Notes</div>
              <div>🔔 Notifications</div>
            </div>
          </div>
        )}

        {role === 'student' && (
          <div className="feature-card">
            <h3>👨‍🎓 Espace Élève</h3>
            <p>
              Votre espace élève sera disponible ici.
            </p>

            <div className="feature-grid">
              <div>📚 Mes cours</div>
              <div>📝 Mes exercices</div>
              <div>⭐ Mes évaluations</div>
              <div>📊 Mes notes</div>
              <div>🎥 Mes vidéos</div>
              <div>🔔 Notifications</div>
            </div>
          </div>
        )}

        {!['admin', 'teacher', 'parent', 'student'].includes(role) && (
          <div className="feature-card warning-card">
            <h3>⚠️ Rôle non configuré</h3>
            <p>
              Votre compte est bien connecté, mais aucun rôle
              valide n'est encore associé à votre profil.
            </p>

            <p>
              Rôle détecté : <strong>{role}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App