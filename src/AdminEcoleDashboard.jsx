import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
CONFIGURATION
========================================================= */

const MENU = [
{ id: "overview", label: "Vue d'ensemble", icon: "📊" },
{ id: "teachers", label: "Enseignants", icon: "👨‍🏫" },
{ id: "secretaries", label: "Secrétaires", icon: "🗂️" },
{ id: "secretary_tracking", label: "Suivi secrétaire", icon: "📋" },
{ id: "students", label: "Élèves", icon: "🎓" },
{ id: "parents", label: "Parents", icon: "👨‍👩‍👧" },
{ id: "classes", label: "Classes", icon: "🏫" },
{ id: "subjects", label: "Matières", icon: "📚" },
{ id: "assignments", label: "Affectations", icon: "🔗" },
{ id: "grades", label: "Notes", icon: "📝" },
{ id: "bulletins", label: "Bulletins", icon: "📄" },
{ id: "communication", label: "Communication", icon: "📢" },
{ id: "documents", label: "Documents administratifs", icon: "📁" },
{ id: "settings", label: "Paramètres", icon: "⚙️" },
];

const DOCUMENT_TYPES = [
{ value: "certificat_scolarite", label: "Certificat de scolarité" },
{ value: "attestation_frequentation", label: "Attestation de fréquentation" },
{ value: "attestation_inscription", label: "Attestation d'inscription" },
{ value: "attestation_reussite", label: "Attestation de réussite" },
{ value: "releve_notes", label: "Relevé de notes" },
{ value: "bulletin", label: "Bulletin scolaire" },
{ value: "certificat_radiation", label: "Certificat de radiation" },
{ value: "certificat_transfert", label: "Certificat de transfert" },
{ value: "convocation", label: "Convocation" },
{ value: "dossier_inscription", label: "Dossier d'inscription" },
{ value: "contrat", label: "Contrat" },
{ value: "document_enseignant", label: "Document enseignant" },
{ value: "document_eleve", label: "Document élève" },
{ value: "document_parent", label: "Document parent" },
{ value: "autre", label: "Autre" },
];

/* =========================================================
UTILITAIRES
========================================================= */

function formatDate(date) {
if (!date) return "-";

return new Date(date).toLocaleDateString("fr-FR", {
day: "2-digit",
month: "2-digit",
year: "numeric",
});
}

function normalizeSearch(value) {
return String(value || "")
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "");
}

function formatDateTime(value) {
if (!value) return "-";
const date = new Date(value);
if (Number.isNaN(date.getTime())) return "-";
return date.toLocaleString("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});
}

function getInitial(value, fallback = "E") {
return String(value || fallback)
.trim()
.charAt(0)
.toUpperCase() || fallback;
}

/* =========================================================
COMPOSANT PRINCIPAL
========================================================= */

class DashboardPageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Erreur dans une page du tableau de bord :", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ec-error-card" style={{ margin: "24px" }}>
          <div className="ec-error-icon">⚠️</div>
          <h2>Cette page rencontre une erreur</h2>
          <p>
            La page n'a pas pu être affichée. Les autres modules de votre
            établissement restent inchangés.
          </p>
          <button
            className="ec-btn ec-btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
          {this.state.error?.message && (
            <details style={{ marginTop: "16px" }}>
              <summary>Détail technique</summary>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: "8px" }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AdminEcoleDashboard({ profile }) {
const [activePage, setActivePage] = useState("overview");

const [currentProfile, setCurrentProfile] = useState(
profile || null
);

const [school, setSchool] = useState(null);

const [loading, setLoading] = useState(true);
const [globalError, setGlobalError] = useState("");

const [stats, setStats] = useState({
teachers: 0,
secretaries: 0,
students: 0,
parents: 0,
classes: 0,
subjects: 0,
});

const [teachers, setTeachers] = useState([]);
const [secretaries, setSecretaries] = useState([]);
const [secretaryLogs, setSecretaryLogs] = useState([]);

const [classes, setClasses] = useState([]);
const [subjects, setSubjects] = useState([]);
const [students, setStudents] = useState([]);
const [parents, setParents] = useState([]);
const [assessments, setAssessments] = useState([]);
const [grades, setGrades] = useState([]);

/* ---------------------------------------------------------
PROFIL
--------------------------------------------------------- */

async function loadCurrentProfile() {
try {
const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
throw new Error("Utilisateur non connecté.");
}

const { data, error } = await supabase
.from("profiles")
.select(
"id, full_name, role, school_id, active"
)
.eq("id", user.id)
.maybeSingle();

if (error) throw error;

if (!data) {
throw new Error(
"Profil utilisateur introuvable."
);
}

if (data.role !== "school_admin") {
throw new Error(
"Ce tableau de bord est réservé à l'Admin École."
);
}

if (!data.active) {
throw new Error(
"Ce compte administrateur est désactivé."
);
}

if (!data.school_id) {
throw new Error(
"Aucune école n'est associée à ce compte."
);
}

setCurrentProfile(data);

return data;
} catch (error) {
console.error("Erreur profil :", error);

setGlobalError(
error.message || "Erreur de profil."
);

return null;
}
}

/* ---------------------------------------------------------
ÉCOLE
--------------------------------------------------------- */

async function loadSchool(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("schools")
.select("*")
.eq("id", schoolId)
.maybeSingle();

if (error) {
console.error("Erreur école :", error);
return;
}

setSchool(data || null);
}

/* ---------------------------------------------------------
ENSEIGNANTS
--------------------------------------------------------- */

async function loadTeachers(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("teachers")
.select(
`
id,
school_id,
display_name,
active,
created_at
`
)
.eq("school_id", schoolId)
.order("display_name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement enseignants :",
error
);
return;
}

setTeachers(data || []);
}

/* ---------------------------------------------------------
SECRÉTAIRES
MODULE CONSERVÉ
--------------------------------------------------------- */

async function loadSecretaries(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("secretaries")
.select(
`
id,
school_id,
display_name,
email,
active,
created_at,
updated_at
`
)
.eq("school_id", schoolId)
.order("display_name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement secrétaires :",
error
);
return;
}

setSecretaries(data || []);
}

/* ---------------------------------------------------------
SUIVI SECRÉTAIRE
--------------------------------------------------------- */

async function loadSecretaryLogs(schoolId) {
if (!schoolId) {
setSecretaryLogs([]);
return;
}

const { data, error } = await supabase
.from("secretary_activity_logs")
.select(
`
id,
school_id,
secretary_id,
module,
action_type,
description,
target_type,
target_id,
metadata,
created_at,
secretaries (
  display_name,
  email,
  active
)
`
)
.eq("school_id", schoolId)
.order("created_at", {
ascending: false,
})
.limit(500);

if (error) {
console.error("Erreur chargement suivi secrétaire :", error);
setSecretaryLogs([]);
return;
}

setSecretaryLogs(data || []);
}

/* ---------------------------------------------------------
CLASSES
--------------------------------------------------------- */

async function loadClasses(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("classes")
.select(
"id, school_id, name, level, created_at"
)
.eq("school_id", schoolId)
.order("name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement classes :",
error
);
return;
}

setClasses(data || []);
}

/* ---------------------------------------------------------
MATIÈRES
--------------------------------------------------------- */

async function loadSubjects() {
const { data, error } = await supabase
.from("subjects")
.select("id, name, created_at")
.order("name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement matières :",
error
);
return;
}

setSubjects(data || []);
}

/* ---------------------------------------------------------
ÉLÈVES
--------------------------------------------------------- */

async function loadStudents(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("students")
.select(
`
id,
profile_id,
school_id,
class_id,
first_name,
last_name,
student_code,
photo_url,
active,
created_at
`
)
.eq("school_id", schoolId)
.order("last_name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement élèves :",
error
);
return;
}

setStudents(data || []);
}

/* ---------------------------------------------------------
PARENTS
--------------------------------------------------------- */

async function loadParents(schoolId) {
if (!schoolId) return;

const { data, error } = await supabase
.from("parents")
.select(
`
id,
profile_id,
school_id,
full_name,
phone,
email,
address,
active,
created_at
`
)
.eq("school_id", schoolId)
.order("full_name", {
ascending: true,
});

if (error) {
console.error(
"Erreur chargement parents :",
error
);
return;
}

setParents(data || []);
}

/* ---------------------------------------------------------
COMPTEURS
--------------------------------------------------------- */

async function countTable(table, schoolId) {
const { count, error } = await supabase
.from(table)
.select("*", {
count: "exact",
head: true,
})
.eq("school_id", schoolId);

if (error) {
console.error(
`Erreur compteur ${table}:`,
error
);
return 0;
}

return count || 0;
}

async function loadDashboardStats(schoolId) {
if (!schoolId) return;

const [
teachersCount,
secretariesCount,
studentsCount,
parentsCount,
classesCount,
] = await Promise.all([
countTable("teachers", schoolId),
countTable("secretaries", schoolId),
countTable("students", schoolId),
countTable("parents", schoolId),
countTable("classes", schoolId),
]);

const {
count: subjectsCount,
error: subjectsError,
} = await supabase
.from("subjects")
.select("*", {
count: "exact",
head: true,
});

if (subjectsError) {
console.error(
"Erreur compteur matières :",
subjectsError
);
}

setStats({
teachers: teachersCount,
secretaries: secretariesCount,
students: studentsCount,
parents: parentsCount,
classes: classesCount,
subjects: subjectsCount || 0,
});
}

/* ---------------------------------------------------------
NOTES / ÉVALUATIONS
--------------------------------------------------------- */

async function loadAssessments(schoolId) {
if (!schoolId) return;
const { data, error } = await supabase
.from("assessments")
.select("id, school_id, teacher_id, class_id, subject_id, title, description, assessment_type, max_score, evaluation_date, coefficient, published, created_at")
.eq("school_id", schoolId)
.order("evaluation_date", { ascending: false });
if (error) {
console.error("Erreur chargement évaluations :", error);
return;
}
setAssessments(data || []);
}

async function loadGrades(schoolId) {
if (!schoolId) return;
const { data, error } = await supabase
.from("student_grades_view")
.select("id, school_id, student_id, student_first_name, student_last_name, student_code, teacher_id, assessment_id, assessment_title, assessment_type, evaluation_date, max_score, coefficient, class_id, subject_id, subject_name, score, stars, appreciation, comment, created_at, updated_at")
.eq("school_id", schoolId)
.order("evaluation_date", { ascending: false });
if (error) {
console.error("Erreur chargement notes :", error);
setGrades([]);
return;
}
setGrades(data || []);
}

/* ---------------------------------------------------------
REFRESH
--------------------------------------------------------- */

async function refreshAll(schoolId) {
if (!schoolId) return;

await Promise.all([
loadSchool(schoolId),
loadTeachers(schoolId),
loadSecretaries(schoolId),
loadSecretaryLogs(schoolId),
loadClasses(schoolId),
loadSubjects(),
loadStudents(schoolId),
loadParents(schoolId),
loadAssessments(schoolId),
loadGrades(schoolId),
loadDashboardStats(schoolId),
]);
}

/* ---------------------------------------------------------
INITIALISATION
--------------------------------------------------------- */

useEffect(() => {
async function initialize() {
setLoading(true);
setGlobalError("");

const loadedProfile =
await loadCurrentProfile();

if (loadedProfile?.school_id) {
await refreshAll(
loadedProfile.school_id
);
}

setLoading(false);
}

initialize();
}, []);

/* =========================================================
LOADING
========================================================= */

if (loading) {
return (
<>
<style>{styles}</style>

<div className="ec-loading">
<div className="ec-spinner" />

<h2>
Chargement d'École Connectée...
</h2>

<p>
Préparation de votre espace administrateur.
</p>
</div>
</>
);
}

/* =========================================================
ERREUR
========================================================= */

if (globalError) {
return (
<>
<style>{styles}</style>

<div className="ec-error-screen">
<div className="ec-error-card">
<div className="ec-error-icon">
⚠️
</div>

<h2>
Impossible de charger le tableau de bord
</h2>

<p>{globalError}</p>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
window.location.reload()
}
>
Réessayer
</button>
</div>
</div>
</>
);
}

/* =========================================================
RENDU
========================================================= */

function renderPage() {
const schoolId =
currentProfile?.school_id;

switch (activePage) {
case "overview":
return (
<OverviewPage
school={school}
stats={stats}
teachers={teachers}
secretaries={secretaries}
/>
);

case "teachers":
return (
<TeachersPage
teachers={teachers}
schoolId={schoolId}
classes={classes}
subjects={subjects}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "secretaries":
return (
<SecretariesPage
secretaries={secretaries}
schoolId={schoolId}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "secretary_tracking":
return (
<SecretaryTrackingPage
secretaries={secretaries}
logs={secretaryLogs}
onRefresh={() =>
loadSecretaryLogs(schoolId)
}
/>
);

case "students":
return (
<StudentsPage
students={students}
classes={classes}
schoolId={schoolId}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "parents":
return (
<ParentsPage
parents={parents}
students={students}
schoolId={schoolId}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "classes":
return (
<ClassesPage
classes={classes}
schoolId={schoolId}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "subjects":
return (
<SubjectsPage
subjects={subjects}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "assignments":
return (
<AssignmentsPage
teachers={teachers}
classes={classes}
subjects={subjects}
schoolId={schoolId}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

case "grades":
return (
<GradesPage
schoolId={schoolId}
teachers={teachers}
classes={classes}
subjects={subjects}
students={students}
assessments={assessments}
grades={grades}
onRefresh={() => refreshAll(schoolId)}
/>
);

case "bulletins":
return (
<ReportCardsPage
school={school}
students={students}
teachers={teachers}
grades={grades}
/>
);

case "communication":
return (
<CommunicationPage
schoolId={schoolId}
secretaries={secretaries}
currentProfile={currentProfile}
/>
);

case "documents":
return (
<AdministrativeDocumentsPage
schoolId={schoolId}
school={school}
students={students}
parents={parents}
teachers={teachers}
/>
);



case "settings":
return (
<SettingsPage
school={school}
onRefresh={() =>
refreshAll(schoolId)
}
/>
);

default:
return (
<OverviewPage
school={school}
stats={stats}
teachers={teachers}
secretaries={secretaries}
/>
);
}
}

return (
<>
<style>{styles}</style>

<div className="ec-app">

{/* SIDEBAR */}

<aside className="ec-sidebar">

<div className="ec-brand">
<div className="ec-brand-logo">
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

<div className="ec-school-mini">

<div className="ec-school-avatar">
{getInitial(
school?.name,
"E"
)}
</div>

<div>
<strong>
{school?.name ||
"Mon établissement"}
</strong>

<span>
Admin École
</span>
</div>

</div>

<nav className="ec-menu">

{MENU.map((item) => (
<button
key={item.id}
className={
activePage === item.id
? "ec-menu-item active"
: "ec-menu-item"
}
onClick={() =>
setActivePage(item.id)
}
>
<span className="ec-menu-icon">
{item.icon}
</span>

<span>
{item.label}
</span>
</button>
))}

</nav>

<div className="ec-sidebar-bottom">

<button
className="ec-logout"
onClick={async () => {
await supabase.auth.signOut();
window.location.reload();
}}
>
🚪 Déconnexion
</button>

</div>

</aside>

{/* MAIN */}

<main className="ec-main">

<header className="ec-topbar">

<div>
<h1>
{
MENU.find(
(item) =>
item.id === activePage
)?.label
}
</h1>

<p>
{school?.name ||
"Administration de votre établissement"}
</p>
</div>

<div className="ec-user">

<div className="ec-user-avatar">
{getInitial(
currentProfile?.full_name,
"A"
)}
</div>

<div>
<strong>
{currentProfile?.full_name ||
"Administrateur"}
</strong>

<span>
Admin École
</span>
</div>

</div>

</header>

<section className="ec-content">
<DashboardPageErrorBoundary>{renderPage()}</DashboardPageErrorBoundary>
</section>

</main>

</div>
</>
);
}

/* =========================================================
VUE D'ENSEMBLE
========================================================= */

function OverviewPage({
school,
stats,
teachers,
secretaries,
}) {
return (
<div className="ec-page">

<div className="ec-welcome">

<div>
<span className="ec-eyebrow">
TABLEAU DE BORD
</span>

<h2>
Bienvenue dans votre espace administratif 👋
</h2>

<p>
Gérez votre établissement depuis un seul espace.
</p>
</div>

<div className="ec-date-card">
<span>
Aujourd'hui
</span>

<strong>
{formatDate(new Date())}
</strong>
</div>

</div>

<div className="ec-stats-grid">

<StatCard
icon="👨‍🏫"
label="Enseignants"
value={stats.teachers}
/>

<StatCard
icon="🗂️"
label="Secrétaires"
value={stats.secretaries}
/>

<StatCard
icon="🎓"
label="Élèves"
value={stats.students}
/>

<StatCard
icon="👨‍👩‍👧"
label="Parents"
value={stats.parents}
/>

<StatCard
icon="🏫"
label="Classes"
value={stats.classes}
/>

<StatCard
icon="📚"
label="Matières"
value={stats.subjects}
/>

</div>

<div className="ec-dashboard-grid">

<div className="ec-panel">

<div className="ec-panel-header">
<div>
<h3>
Établissement
</h3>

<p>
Informations principales
</p>
</div>

<span className="ec-status">
● Actif
</span>
</div>

<div className="ec-school-info">

<div className="ec-school-large">
{getInitial(
school?.name,
"E"
)}
</div>

<div>
<h3>
{school?.name ||
"École Connectée"}
</h3>

<p>
📍{" "}
{school?.address ||
"Adresse non renseignée"}
</p>

<p>
📞{" "}
{school?.phone ||
"Téléphone non renseigné"}
</p>

<p>
✉️{" "}
{school?.email ||
"Email non renseigné"}
</p>
</div>

</div>

</div>

<div className="ec-panel">

<div className="ec-panel-header">
<div>
<h3>
Équipe administrative
</h3>

<p>
Personnel actuellement enregistré
</p>
</div>
</div>

<div className="ec-team-list">

{teachers.slice(0, 3).map(
(teacher) => (
<div
className="ec-team-row"
key={teacher.id}
>

<div className="ec-avatar teacher">
{getInitial(
teacher.display_name
)}
</div>

<div>
<strong>
{teacher.display_name}
</strong>

<span>
Enseignant
</span>
</div>

<span
className={
teacher.active
? "ec-badge success"
: "ec-badge danger"
}
>
{teacher.active
? "Actif"
: "Inactif"}
</span>

</div>
)
)}

{secretaries.slice(0, 3).map(
(secretary) => (
<div
className="ec-team-row"
key={secretary.id}
>

<div className="ec-avatar secretary">
{getInitial(
secretary.display_name,
"S"
)}
</div>

<div>
<strong>
{secretary.display_name}
</strong>

<span>
Secrétaire
</span>
</div>

<span
className={
secretary.active
? "ec-badge success"
: "ec-badge danger"
}
>
{secretary.active
? "Actif"
: "Inactif"}
</span>

</div>
)
)}

{teachers.length === 0 &&
secretaries.length === 0 && (
<div className="ec-empty">
Aucun membre du personnel enregistré.
</div>
)}

</div>

</div>

</div>
</div>
);
}

/* =========================================================
STAT CARD
========================================================= */

function StatCard({
icon,
label,
value,
}) {
return (
<div className="ec-stat-card">

<div className="ec-stat-icon">
{icon}
</div>

<div>
<span>{label}</span>
<strong>{value}</strong>
</div>

</div>
);
}

/* =========================================================
SECRÉTAIRES
========================================================= */

function SecretariesPage({
secretaries,
schoolId,
onRefresh,
}) {
const [search, setSearch] =
useState("");

const [showModal, setShowModal] =
useState(false);

const [previewDocument, setPreviewDocument] = useState(null);

const filteredSecretaries =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return secretaries;

return secretaries.filter(
(secretary) =>
normalizeSearch(
secretary.display_name
).includes(query) ||
normalizeSearch(
secretary.email
).includes(query)
);
}, [secretaries, search]);

async function toggleSecretary(
secretary
) {
const { error } =
await supabase
.from("secretaries")
.update({
active: !secretary.active,
updated_at:
new Date().toISOString(),
})
.eq("id", secretary.id)
.eq("school_id", schoolId);

if (error) {
alert(
"Impossible de modifier le statut du secrétaire."
);
console.error(error);
return;
}

await onRefresh();
}

async function deleteSecretary(
secretary
) {
const confirmed =
window.confirm(
`Voulez-vous vraiment supprimer le secrétaire "${secretary.display_name}" ?`
);

if (!confirmed) return;

const { error } =
await supabase
.from("secretaries")
.delete()
.eq("id", secretary.id)
.eq("school_id", schoolId);

if (error) {
alert(
"Impossible de supprimer ce secrétaire."
);
console.error(error);
return;
}

await onRefresh();
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
ADMINISTRATION
</span>

<h2>
Secrétaires
</h2>

<p>
Gérez les secrétaires de votre établissement.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un secrétaire
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
type="text"
placeholder="Rechercher par nom ou email..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filteredSecretaries.length} secrétaire
{filteredSecretaries.length !==
1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filteredSecretaries.length ===
0 ? (
<div className="ec-empty-large">

<div className="ec-empty-icon">
🗂️
</div>

<h3>
{search
? "Aucun résultat"
: "Aucun secrétaire"}
</h3>

<p>
{search
? "Aucun secrétaire ne correspond à votre recherche."
: "Commencez par ajouter un secrétaire à votre établissement."}
</p>

{!search && (
<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter le premier secrétaire
</button>
)}

</div>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>
Secrétaire
</th>

<th>Email</th>
<th>Statut</th>
<th>Création</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filteredSecretaries.map(
(secretary) => (
<tr
key={secretary.id}
>

<td>
<div className="ec-person">

<div className="ec-avatar secretary">
{getInitial(
secretary.display_name,
"S"
)}
</div>

<div>
<strong>
{
secretary.display_name
}
</strong>

<span>
Secrétaire
</span>
</div>

</div>
</td>

<td>
{secretary.email}
</td>

<td>
<span
className={
secretary.active
? "ec-badge success"
: "ec-badge danger"
}
>
{secretary.active
? "Actif"
: "Inactif"}
</span>
</td>

<td>
{formatDate(
secretary.created_at
)}
</td>

<td>

<div className="ec-actions">

<button
className="ec-action-btn"
title={
secretary.active
? "Désactiver"
: "Activer"
}
onClick={() =>
toggleSecretary(
secretary
)
}
>
{secretary.active
? "⏸️"
: "▶️"}
</button>

<button
className="ec-action-btn danger"
title="Supprimer"
onClick={() =>
deleteSecretary(
secretary
)
}
>
🗑️
</button>

</div>

</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<SecretaryFormModal
schoolId={schoolId}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE SECRÉTAIRE
========================================================= */

function SecretaryFormModal({
schoolId,
onClose,
onSuccess,
}) {
const [name, setName] =
useState("");

const [email, setEmail] =
useState("");

const [password, setPassword] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

const cleanName =
name.trim();

const cleanEmail =
email.trim().toLowerCase();

if (cleanName.length < 2) {
setError(
"Le nom du secrétaire doit contenir au moins 2 caractères."
);
return;
}

if (
!cleanEmail.includes("@") ||
!cleanEmail.includes(".")
) {
setError(
"Veuillez saisir une adresse email valide."
);
return;
}

if (password.length < 6) {
setError(
"Le mot de passe doit contenir au moins 6 caractères."
);
return;
}

setSaving(true);

try {
const {
data: { session },
error: sessionError,
} =
await supabase.auth.getSession();

if (
sessionError ||
!session
) {
throw new Error(
"Votre session a expiré. Veuillez vous reconnecter."
);
}

const {
data,
error: functionError,
} =
await supabase.functions.invoke(
"create-secretary",
{
body: {
name: cleanName,
email: cleanEmail,
password,
school_id: schoolId,
},
headers: {
Authorization: `Bearer ${session.access_token}`,
},
}
);

if (functionError) {
console.error(
"Erreur Edge Function create-secretary:",
functionError
);

throw new Error(
functionError.message ||
"Impossible de créer le secrétaire."
);
}

if (data?.error) {
throw new Error(
data.error
);
}

if (!data?.success) {
throw new Error(
"La création du secrétaire n'a pas abouti."
);
}

alert(
"Secrétaire créé avec succès !"
);

await onSuccess();

} catch (error) {
console.error(
"Erreur création secrétaire:",
error
);

setError(
error.message ||
"Une erreur est survenue lors de la création."
);
} finally {
setSaving(false);
}
}

return (
<div
className="ec-modal-overlay"
onMouseDown={(event) => {
if (
event.target ===
event.currentTarget
) {
onClose();
}
}}
>

<div className="ec-modal">

<div className="ec-modal-header">

<div>
<span className="ec-eyebrow">
NOUVEAU COMPTE
</span>

<h2>
Ajouter un secrétaire
</h2>

<p>
Créez un compte pour le secrétariat de votre école.
</p>
</div>

<button
className="ec-modal-close"
onClick={onClose}
>
×
</button>

</div>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Nom complet"
placeholder="Ex : Fatou Ndiaye"
value={name}
onChange={setName}
disabled={saving}
/>

<FormInput
label="Adresse email"
type="email"
placeholder="Ex : secretaire@ecole.com"
value={email}
onChange={setEmail}
disabled={saving}
/>

<FormInput
label="Mot de passe"
type="password"
placeholder="Minimum 6 caractères"
value={password}
onChange={setPassword}
disabled={saving}
/>

<div className="ec-form-info">

<span>🔐</span>

<p>
Le compte sera automatiquement associé à votre établissement avec le rôle
<strong> Secrétaire</strong>.
</p>

</div>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer le secrétaire"
/>

</form>

</div>

</div>
);
}

/* =========================================================
ENSEIGNANTS
========================================================= */

function TeachersPage({
teachers,
schoolId,
classes,
subjects,
onRefresh,
}) {
const [search, setSearch] =
useState("");

const [showModal, setShowModal] =
useState(false);

const filteredTeachers =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return teachers;

return teachers.filter(
(teacher) =>
normalizeSearch(
teacher.display_name
).includes(query)
);
}, [teachers, search]);

async function toggleTeacher(
teacher
) {
const { error } =
await supabase
.from("teachers")
.update({
active: !teacher.active,
})
.eq("id", teacher.id)
.eq("school_id", schoolId);

if (error) {
alert(
"Impossible de modifier cet enseignant."
);
console.error(error);
return;
}

await onRefresh();
}

async function deleteTeacher(
teacher
) {
const confirmed =
window.confirm(
`Voulez-vous vraiment supprimer "${teacher.display_name}" ?`
);

if (!confirmed) return;

const { error } =
await supabase
.from("teachers")
.delete()
.eq("id", teacher.id)
.eq("school_id", schoolId);

if (error) {
alert(
"Impossible de supprimer cet enseignant."
);
console.error(error);
return;
}

await onRefresh();
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
ÉQUIPE PÉDAGOGIQUE
</span>

<h2>
Enseignants
</h2>

<p>
Créez et gérez les enseignants de votre établissement.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un enseignant
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
type="text"
placeholder="Rechercher un enseignant..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filteredTeachers.length} enseignant
{filteredTeachers.length !==
1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filteredTeachers.length ===
0 ? (
<div className="ec-empty-large">

<div className="ec-empty-icon">
👨‍🏫
</div>

<h3>
{search
? "Aucun résultat"
: "Aucun enseignant"}
</h3>

<p>
Ajoutez votre premier enseignant.
</p>

{!search && (
<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un enseignant
</button>
)}

</div>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Enseignant</th>
<th>Statut</th>
<th>Création</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filteredTeachers.map(
(teacher) => (
<tr
key={teacher.id}
>

<td>
<div className="ec-person">

<div className="ec-avatar teacher">
{getInitial(
teacher.display_name
)}
</div>

<div>
<strong>
{
teacher.display_name
}
</strong>

<span>
Enseignant
</span>
</div>

</div>
</td>

<td>
<span
className={
teacher.active
? "ec-badge success"
: "ec-badge danger"
}
>
{teacher.active
? "Actif"
: "Inactif"}
</span>
</td>

<td>
{formatDate(
teacher.created_at
)}
</td>

<td>

<div className="ec-actions">

<button
className="ec-action-btn"
title={
teacher.active
? "Désactiver"
: "Activer"
}
onClick={() =>
toggleTeacher(
teacher
)
}
>
{teacher.active
? "⏸️"
: "▶️"}
</button>

<button
className="ec-action-btn danger"
title="Supprimer"
onClick={() =>
deleteTeacher(
teacher
)
}
>
🗑️
</button>

</div>

</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<TeacherFormModal
schoolId={schoolId}
classes={classes}
subjects={subjects}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE ENSEIGNANT
========================================================= */

function TeacherFormModal({
schoolId,
classes,
subjects,
onClose,
onSuccess,
}) {
const [name, setName] =
useState("");

const [email, setEmail] =
useState("");

const [password, setPassword] =
useState("");

const [selectedClasses, setSelectedClasses] =
useState([]);

const [selectedSubjects, setSelectedSubjects] =
useState([]);

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

function toggleSelection(
value,
setter,
current
) {
setter(
current.includes(value)
? current.filter(
(item) =>
item !== value
)
: [...current, value]
);
}

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

const cleanName =
name.trim();

const cleanEmail =
email.trim().toLowerCase();

if (cleanName.length < 2) {
setError(
"Le nom de l'enseignant doit contenir au moins 2 caractères."
);
return;
}

if (
!cleanEmail.includes("@") ||
!cleanEmail.includes(".")
) {
setError(
"Veuillez saisir une adresse email valide."
);
return;
}

if (password.length < 6) {
setError(
"Le mot de passe doit contenir au moins 6 caractères."
);
return;
}

setSaving(true);

try {
const {
data: { session },
error: sessionError,
} =
await supabase.auth.getSession();

if (
sessionError ||
!session
) {
throw new Error(
"Votre session a expiré."
);
}

const {
data,
error: functionError,
} =
await supabase.functions.invoke(
"create-teacher",
{
body: {
name: cleanName,
email: cleanEmail,
password,
school_id: schoolId,
},
headers: {
Authorization: `Bearer ${session.access_token}`,
},
}
);

if (functionError) {
throw new Error(
functionError.message ||
"Impossible de créer l'enseignant."
);
}

if (data?.error) {
throw new Error(
data.error
);
}

if (!data?.success) {
throw new Error(
"La création de l'enseignant n'a pas abouti."
);
}

const teacherId =
data?.teacher?.id;

if (!teacherId) {
throw new Error(
"L'enseignant a été créé mais son identifiant est introuvable."
);
}

if (
selectedClasses.length > 0
) {
const classRows =
selectedClasses.map(
(classId) => ({
teacher_id:
teacherId,
class_id:
classId,
})
);

const {
error: classError,
} =
await supabase
.from("teacher_classes")
.insert(classRows);

if (classError) {
console.error(
"Erreur affectation classes :",
classError
);
}
}

if (
selectedSubjects.length > 0
) {
const subjectRows =
selectedSubjects.map(
(subjectId) => ({
teacher_id:
teacherId,
subject_id:
Number(subjectId),
})
);

const {
error: subjectError,
} =
await supabase
.from("teacher_subjects")
.insert(subjectRows);

if (subjectError) {
console.error(
"Erreur affectation matières :",
subjectError
);
}
}

alert(
"Enseignant créé avec succès !"
);

await onSuccess();

} catch (error) {
console.error(
"Erreur création enseignant:",
error
);

setError(
error.message ||
"Une erreur est survenue."
);
} finally {
setSaving(false);
}
}

return (
<div
className="ec-modal-overlay"
onMouseDown={(event) => {
if (
event.target ===
event.currentTarget
) {
onClose();
}
}}
>

<div className="ec-modal">

<div className="ec-modal-header">

<div>
<span className="ec-eyebrow">
NOUVEL ENSEIGNANT
</span>

<h2>
Ajouter un enseignant
</h2>

<p>
Créez le compte et préparez ses affectations.
</p>
</div>

<button
className="ec-modal-close"
onClick={onClose}
>
×
</button>

</div>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Nom complet"
placeholder="Ex : Sophia Ndiaye"
value={name}
onChange={setName}
disabled={saving}
/>

<FormInput
label="Email"
type="email"
placeholder="enseignant@ecole.com"
value={email}
onChange={setEmail}
disabled={saving}
/>

<FormInput
label="Mot de passe"
type="password"
placeholder="Minimum 6 caractères"
value={password}
onChange={setPassword}
disabled={saving}
/>

<MultiSelectBox
label="Classes"
items={classes}
selected={selectedClasses}
onToggle={(id) =>
toggleSelection(
id,
setSelectedClasses,
selectedClasses
)
}
getId={(item) =>
item.id
}
getLabel={(item) =>
`${item.name}${item.level ? ` — ${item.level}` : ""}`
}
emptyText="Aucune classe disponible."
/>

<MultiSelectBox
label="Matières"
items={subjects}
selected={selectedSubjects}
onToggle={(id) =>
toggleSelection(
id,
setSelectedSubjects,
selectedSubjects
)
}
getId={(item) =>
String(item.id)
}
getLabel={(item) =>
item.name
}
emptyText="Aucune matière disponible."
/>

<div className="ec-form-info">
<span>🔐</span>
<p>
Le compte sera créé avec le rôle
<strong> Enseignant</strong>.
</p>
</div>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer l'enseignant"
/>

</form>

</div>

</div>
);
}

/* =========================================================
SUIVI SECRÉTAIRE
========================================================= */

function SecretaryTrackingPage({
secretaries,
logs,
onRefresh,
}) {
const [search, setSearch] = useState("");
const [secretaryFilter, setSecretaryFilter] = useState("");
const [moduleFilter, setModuleFilter] = useState("");
const [refreshing, setRefreshing] = useState(false);

const filteredLogs = useMemo(() => {
const query = normalizeSearch(search);

return logs.filter((log) => {
const secretaryName = log.secretaries?.display_name || "Secrétaire";
const secretaryEmail = log.secretaries?.email || "";
const moduleName = log.module || "";
const actionName = actionLabel(log.action_type);
const detail = log.description || "";

const matchesSearch = !query || [
secretaryName,
secretaryEmail,
moduleName,
actionName,
detail,
].some((value) => normalizeSearch(value).includes(query));

const matchesSecretary = !secretaryFilter || log.secretary_id === secretaryFilter;
const matchesModule = !moduleFilter || log.module === moduleFilter;

return matchesSearch && matchesSecretary && matchesModule;
});
}, [logs, search, secretaryFilter, moduleFilter]);

const activeSecretaries = secretaries.filter((item) => item.active).length;
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const activitiesToday = logs.filter((log) => {
const date = log.created_at ? new Date(log.created_at) : null;
return date && date >= startOfToday;
}).length;
const lastActivity = logs.length > 0 ? logs[0] : null;
const modules = [...new Set(logs.map((log) => log.module).filter(Boolean))].sort();

async function handleRefresh() {
setRefreshing(true);
try {
await onRefresh();
} finally {
setRefreshing(false);
}
}

return (
<div className="ec-page">
<div className="ec-page-heading">
<div>
<span className="ec-eyebrow">SUPERVISION</span>
<h2>Suivi secrétaire</h2>
<p>Suivez l'activité des secrétaires de votre établissement.</p>
</div>

<button
className="ec-btn ec-btn-secondary"
onClick={handleRefresh}
disabled={refreshing}
>
{refreshing ? "Actualisation..." : "↻ Actualiser"}
</button>
</div>

<div className="ec-stats-grid secretary-tracking-stats">
<div className="ec-stat-card">
<div className="ec-stat-icon">👩‍💼</div>
<div><span>Secrétaires actifs</span><strong>{activeSecretaries}</strong></div>
</div>
<div className="ec-stat-card">
<div className="ec-stat-icon">📅</div>
<div><span>Activités aujourd'hui</span><strong>{activitiesToday}</strong></div>
</div>
<div className="ec-stat-card">
<div className="ec-stat-icon">📋</div>
<div><span>Total activités</span><strong>{logs.length}</strong></div>
</div>
<div className="ec-stat-card">
<div className="ec-stat-icon">🕒</div>
<div>
<span>Dernière activité</span>
<strong className="secretary-last-activity">
{lastActivity?.created_at ? formatDateTime(lastActivity.created_at) : "Aucune"}
</strong>
</div>
</div>
</div>

<div className="ec-toolbar secretary-tracking-toolbar">
<div className="ec-search">
<span>🔎</span>
<input
placeholder="Rechercher une activité..."
value={search}
onChange={(event) => setSearch(event.target.value)}
/>
</div>

<select
className="secretary-filter-select"
value={secretaryFilter}
onChange={(event) => setSecretaryFilter(event.target.value)}
>
<option value="">Tous les secrétaires</option>
{secretaries.map((secretary) => (
<option key={secretary.id} value={secretary.id}>
{secretary.display_name}
</option>
))}
</select>

<select
className="secretary-filter-select"
value={moduleFilter}
onChange={(event) => setModuleFilter(event.target.value)}
>
<option value="">Tous les modules</option>
{modules.map((module) => (
<option key={module} value={module}>{module}</option>
))}
</select>

<div className="ec-count">
{filteredLogs.length} activité{filteredLogs.length !== 1 ? "s" : ""}
</div>
</div>

<div className="ec-panel">
{filteredLogs.length === 0 ? (
<EmptyState
icon="📋"
title={logs.length === 0 ? "Aucune activité enregistrée" : "Aucun résultat"}
description={logs.length === 0
? "Le suivi est prêt. Les activités apparaîtront lorsque les secrétaires effectueront des opérations enregistrées."
: "Aucune activité ne correspond aux critères sélectionnés."}
/>
) : (
<div className="ec-table-wrapper">
<table className="ec-table">
<thead>
<tr>
<th>Secrétaire</th>
<th>Module</th>
<th>Action</th>
<th>Détail</th>
<th>Date</th>
</tr>
</thead>
<tbody>
{filteredLogs.map((log) => {
const secretaryName = log.secretaries?.display_name || "Secrétaire";
return (
<tr key={log.id}>
<td>
<div className="ec-person">
<div className="ec-avatar secretary">{getInitial(secretaryName, "S")}</div>
<div>
<strong>{secretaryName}</strong>
<span>{log.secretaries?.email || ""}</span>
</div>
</div>
</td>
<td><span className="ec-badge neutral">{log.module || "Autre"}</span></td>
<td><span className={`ec-badge ${actionClass(log.action_type)}`}>{actionLabel(log.action_type)}</span></td>
<td>{log.description || "—"}</td>
<td>
<strong>{formatDateTime(log.created_at)}</strong>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
)}
</div>
</div>
);
}

function actionLabel(actionType) {
const labels = {
create: "Création",
update: "Modification",
delete: "Suppression",
activate: "Activation",
deactivate: "Désactivation",
login: "Connexion",
logout: "Déconnexion",
view: "Consultation",
upload: "Téléversement",
download: "Téléchargement",
payment: "Paiement",
request: "Demande",
other: "Action",
};
return labels[actionType] || "Action";
}

function actionClass(actionType) {
if (actionType === "delete") return "danger";
if (["create", "activate"].includes(actionType)) return "success";
if (actionType === "update") return "info";
return "neutral";
}

/* =========================================================
ÉLÈVES
========================================================= */

function StudentsPage({
students,
classes,
schoolId,
onRefresh,
}) {
const [search, setSearch] =
useState("");

const [showModal, setShowModal] =
useState(false);

const safeStudents = Array.isArray(students) ? students : [];
const safeClasses = Array.isArray(classes) ? classes : [];

const filtered =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return safeStudents;

return safeStudents.filter(
(student) =>
normalizeSearch(
`${student.first_name} ${student.last_name}`
).includes(query) ||
normalizeSearch(
student.student_code
).includes(query)
);
}, [safeStudents, search]);

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
SCOLARITÉ
</span>

<h2>
Élèves
</h2>

<p>
Gérez les élèves et leur affectation aux classes.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un élève
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
placeholder="Rechercher un élève ou matricule..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filtered.length} élève
{filtered.length !== 1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filtered.length === 0 ? (
<EmptyState
icon="🎓"
title={
search
? "Aucun résultat"
: "Aucun élève"
}
description={
search
? "Aucun élève ne correspond à votre recherche."
: "Commencez par ajouter un élève."
}
button={
!search
? "Ajouter un élève"
: null
}
onButton={() =>
setShowModal(true)
}
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Élève</th>
<th>Matricule</th>
<th>Classe</th>
<th>Statut</th>
<th>Création</th>
</tr>
</thead>

<tbody>

{filtered.map(
(student) => {
const studentClass =
safeClasses.find(
(item) =>
item.id ===
student.class_id
);

return (
<tr
key={student.id}
>

<td>
<div className="ec-person">

{student.photo_url ? (
<img
className="ec-avatar student-photo"
src={student.photo_url}
alt={`${student.first_name} ${student.last_name}`}
/>
) : (
<div className="ec-avatar student">
{getInitial(
student.first_name,
"E"
)}
</div>
)}

<div>
<strong>
{
student.first_name
}{" "}
{
student.last_name
}
</strong>

<span>
Élève
</span>
</div>

</div>
</td>

<td>
{
student.student_code ||
"-"
}
</td>

<td>
{
studentClass?.name ||
"Non affecté"
}
</td>

<td>
<span
className={
student.active
? "ec-badge success"
: "ec-badge danger"
}
>
{student.active
? "Actif"
: "Inactif"}
</span>
</td>

<td>
{formatDate(
student.created_at
)}
</td>

</tr>
);
}
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<StudentFormModal
schoolId={schoolId}
classes={classes}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE ÉLÈVE
========================================================= */

function StudentFormModal({
schoolId,
classes,
onClose,
onSuccess,
}) {
const [firstName, setFirstName] =
useState("");

const [lastName, setLastName] =
useState("");

const [studentCode, setStudentCode] =
useState("");

const [classId, setClassId] =
useState("");

const [email, setEmail] =
useState("");

const [password, setPassword] =
useState("");

const [photoUrl, setPhotoUrl] =
useState("");

const [photoName, setPhotoName] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handlePhotoChange(event) {
const file = event.target.files?.[0];
if (!file) return;

if (!file.type.startsWith("image/")) {
setError("Veuillez sélectionner une image.");
return;
}

if (file.size > 5 * 1024 * 1024) {
setError("La photo doit faire moins de 5 Mo.");
return;
}

try {
const dataUrl = await new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = reject;
reader.readAsDataURL(file);
});

const image = new Image();
image.onload = () => {
const max = 500;
const ratio = Math.min(1, max / Math.max(image.width, image.height));
const canvas = document.createElement("canvas");
canvas.width = Math.max(1, Math.round(image.width * ratio));
canvas.height = Math.max(1, Math.round(image.height * ratio));
const ctx = canvas.getContext("2d");
ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
const compressed = canvas.toDataURL("image/jpeg", 0.78);
setPhotoUrl(compressed);
setPhotoName(file.name);
};
image.onerror = () => setError("Impossible de lire la photo.");
image.src = dataUrl;
} catch {
setError("Impossible de préparer la photo.");
}
}

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

if (
firstName.trim().length < 2
) {
setError(
"Le prénom est obligatoire."
);
return;
}

if (
lastName.trim().length < 2
) {
setError(
"Le nom est obligatoire."
);
return;
}

if (!classId) {
setError(
"Veuillez sélectionner une classe."
);
return;
}

if (
!email.trim() ||
!email.includes("@")
) {
setError(
"Veuillez saisir un email valide."
);
return;
}

if (password.length < 6) {
setError(
"Le mot de passe doit contenir au moins 6 caractères."
);
return;
}

setSaving(true);

try {
const {
data: { session },
} =
await supabase.auth.getSession();

if (!session) {
throw new Error(
"Session expirée."
);
}

const {
data,
error: functionError,
} =
await supabase.functions.invoke(
"create-student",
{
body: {
firstName:
firstName.trim(),
lastName:
lastName.trim(),
studentCode:
studentCode.trim() ||
"",
classId,
email:
email.trim().toLowerCase(),
password,
},
headers: {
Authorization: `Bearer ${session.access_token}`,
},
}
);

if (functionError) {
throw functionError;
}

if (data?.error) {
throw new Error(
data.error
);
}

if (photoUrl && data?.student?.id) {
const { error: photoError } = await supabase
  .from("students")
  .update({ photo_url: photoUrl })
  .eq("id", data.student.id)
  .eq("school_id", schoolId);

if (photoError) {
  console.warn("Élève créé mais photo non enregistrée :", photoError);
}
}

alert(
photoUrl
  ? "Élève créé avec sa photo !"
  : "Élève créé avec succès !"
);

await onSuccess();

} catch (error) {
setError(
error.message ||
"Impossible de créer l'élève."
);
} finally {
setSaving(false);
}
}

return (
<Modal
title="Ajouter un élève"
eyebrow="NOUVEL ÉLÈVE"
description="Préparez le compte et l'affectation de l'élève."
onClose={onClose}
>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Prénom"
value={firstName}
onChange={setFirstName}
disabled={saving}
/>

<FormInput
label="Nom"
value={lastName}
onChange={setLastName}
disabled={saving}
/>

<FormInput
label="Matricule"
placeholder="Ex : ELEVE-002"
value={studentCode}
onChange={setStudentCode}
disabled={saving}
/>

<SelectInput
label="Classe"
value={classId}
onChange={setClassId}
options={classes.map(
(item) => ({
value: item.id,
label: `${item.name}${item.level ? ` — ${item.level}` : ""}`,
})
)}
placeholder="Choisir une classe"
disabled={saving}
/>

<div className="ec-form-group">
<label>Photo de l'élève</label>
<input
type="file"
accept="image/*"
onChange={handlePhotoChange}
disabled={saving}
/>
{photoUrl && (
<div className="student-photo-preview">
<img src={photoUrl} alt="Aperçu de l'élève" />
<div>
<strong>Photo sélectionnée</strong>
<span>{photoName}</span>
</div>
</div>
)}
</div>

<FormInput
label="Email de connexion"
type="email"
value={email}
onChange={setEmail}
disabled={saving}
/>

<FormInput
label="Code / mot de passe"
type="password"
value={password}
onChange={setPassword}
disabled={saving}
/>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer l'élève"
/>

</form>

</Modal>
);
}

/* =========================================================
PARENTS
========================================================= */

function ParentsPage({
parents,
students,
schoolId,
onRefresh,
}) {
const [search, setSearch] =
useState("");

const [showModal, setShowModal] =
useState(false);

const filtered =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return parents;

return parents.filter(
(parent) =>
normalizeSearch(
parent.full_name
).includes(query) ||
normalizeSearch(
parent.email
).includes(query) ||
normalizeSearch(
parent.phone
).includes(query)
);
}, [parents, search]);

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
FAMILLES
</span>

<h2>
Parents
</h2>

<p>
Gérez les parents et responsables des élèves.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un parent
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
placeholder="Rechercher un parent..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filtered.length} parent
{filtered.length !== 1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filtered.length === 0 ? (
<EmptyState
icon="👨‍👩‍👧"
title={
search
? "Aucun résultat"
: "Aucun parent"
}
description={
search
? "Aucun parent ne correspond à votre recherche."
: "Commencez par ajouter un parent."
}
button={
!search
? "Ajouter un parent"
: null
}
onButton={() =>
setShowModal(true)
}
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Parent</th>
<th>Téléphone</th>
<th>Email</th>
<th>Statut</th>
</tr>
</thead>

<tbody>

{filtered.map(
(parent) => (
<tr
key={parent.id}
>

<td>
<div className="ec-person">

<div className="ec-avatar parent">
{getInitial(
parent.full_name,
"P"
)}
</div>

<div>
<strong>
{
parent.full_name
}
</strong>

<span>
Parent / Responsable
</span>
</div>

</div>
</td>

<td>
{parent.phone ||
"-"}
</td>

<td>
{parent.email ||
"-"}
</td>

<td>
<span
className={
parent.active
? "ec-badge success"
: "ec-badge danger"
}
>
{parent.active
? "Actif"
: "Inactif"}
</span>
</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<ParentFormModal
schoolId={schoolId}
students={students}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE PARENT
========================================================= */

function ParentFormModal({
schoolId,
students,
onClose,
onSuccess,
}) {
const [name, setName] =
useState("");

const [phone, setPhone] =
useState("");

const [email, setEmail] =
useState("");

const [address, setAddress] =
useState("");

const [password, setPassword] =
useState("");

const [selectedStudent, setSelectedStudent] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

if (name.trim().length < 2) {
setError(
"Le nom du parent est obligatoire."
);
return;
}

if (
!email.includes("@")
) {
setError(
"Veuillez saisir un email valide."
);
return;
}

if (password.length < 6) {
setError(
"Le mot de passe doit contenir au moins 6 caractères."
);
return;
}

if (!selectedStudent) {
setError(
"Veuillez sélectionner l'élève concerné."
);
return;
}

setSaving(true);

try {
const {
data: { session },
} =
await supabase.auth.getSession();

if (!session) {
throw new Error(
"Session expirée."
);
}

const {
data,
error: functionError,
} =
await supabase.functions.invoke(
"create-parent",
{
body: {
fullName: name.trim(),
phone: phone.trim(),
email: email.trim().toLowerCase(),
address: address.trim(),
password,
studentIds: selectedStudent ? [selectedStudent] : [],
},
headers: {
Authorization: `Bearer ${session.access_token}`,
},
}
);

if (functionError) {
throw functionError;
}

if (data?.error) {
throw new Error(
data.error
);
}

alert(
"Parent créé avec succès !"
);

await onSuccess();

} catch (error) {
setError(
error.message ||
"Impossible de créer le parent."
);
} finally {
setSaving(false);
}
}

return (
<Modal
title="Ajouter un parent"
eyebrow="NOUVEAU PARENT"
description="Créez le compte et rattachez-le à un élève."
onClose={onClose}
>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Nom complet"
value={name}
onChange={setName}
disabled={saving}
/>

<FormInput
label="Téléphone"
value={phone}
onChange={setPhone}
disabled={saving}
/>

<FormInput
label="Email"
type="email"
value={email}
onChange={setEmail}
disabled={saving}
/>

<FormInput
label="Adresse"
value={address}
onChange={setAddress}
disabled={saving}
/>

<FormInput
label="Code / mot de passe"
type="password"
value={password}
onChange={setPassword}
disabled={saving}
/>

<SelectInput
label="Élève"
value={selectedStudent}
onChange={setSelectedStudent}
options={students
.filter((student) => student.school_id === schoolId)
.map((student) => ({
value: student.id,
label: `${student.first_name} ${student.last_name}`,
}))}
placeholder="Choisir un élève"
disabled={saving}
/>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer le parent"
/>

</form>

</Modal>
);
}

/* =========================================================
CLASSES
========================================================= */

function ClassesPage({
classes,
schoolId,
onRefresh,
}) {
const [showModal, setShowModal] =
useState(false);

const [search, setSearch] =
useState("");

const filtered =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return classes;

return classes.filter(
(item) =>
normalizeSearch(
item.name
).includes(query) ||
normalizeSearch(
item.level
).includes(query)
);
}, [classes, search]);

async function deleteClass(
item
) {
const confirmed =
window.confirm(
`Voulez-vous supprimer la classe "${item.name}" ?`
);

if (!confirmed) return;

const { error } =
await supabase
.from("classes")
.delete()
.eq("id", item.id)
.eq("school_id", schoolId);

if (error) {
alert(
"Impossible de supprimer cette classe."
);
console.error(error);
return;
}

await onRefresh();
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
ORGANISATION
</span>

<h2>
Classes
</h2>

<p>
Créez et gérez les classes de votre établissement.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter une classe
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
placeholder="Rechercher une classe..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filtered.length} classe
{filtered.length !== 1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filtered.length === 0 ? (
<EmptyState
icon="🏫"
title={
search
? "Aucun résultat"
: "Aucune classe"
}
description="Créez la première classe de votre établissement."
button="Ajouter une classe"
onButton={() =>
setShowModal(true)
}
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Classe</th>
<th>Niveau</th>
<th>Création</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filtered.map(
(item) => (
<tr
key={item.id}
>

<td>
<strong>
{item.name}
</strong>
</td>

<td>
{item.level ||
"-"}
</td>

<td>
{formatDate(
item.created_at
)}
</td>

<td>
<button
className="ec-action-btn danger"
onClick={() =>
deleteClass(
item
)
}
>
🗑️
</button>
</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<ClassFormModal
schoolId={schoolId}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE CLASSE
========================================================= */

function ClassFormModal({
schoolId,
onClose,
onSuccess,
}) {
const [name, setName] =
useState("");

const [level, setLevel] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

if (name.trim().length < 1) {
setError(
"Le nom de la classe est obligatoire."
);
return;
}

setSaving(true);

try {
const { error } =
await supabase
.from("classes")
.insert({
school_id:
schoolId,
name: name.trim(),
level:
level.trim() ||
null,
});

if (error) {
throw error;
}

alert(
"Classe créée avec succès !"
);

await onSuccess();

} catch (error) {
console.error(
"Erreur création classe:",
error
);

setError(
error.message ||
"Impossible de créer la classe."
);
} finally {
setSaving(false);
}
}

return (
<Modal
title="Ajouter une classe"
eyebrow="NOUVELLE CLASSE"
description="Ajoutez une classe à votre établissement."
onClose={onClose}
>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Nom de la classe"
placeholder="Ex : 6ème A"
value={name}
onChange={setName}
disabled={saving}
/>

<FormInput
label="Niveau"
placeholder="Ex : Collège"
value={level}
onChange={setLevel}
disabled={saving}
/>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer la classe"
/>

</form>

</Modal>
);
}

/* =========================================================
MATIÈRES
========================================================= */

function SubjectsPage({
subjects,
onRefresh,
}) {
const [showModal, setShowModal] =
useState(false);

const [search, setSearch] =
useState("");

const filtered =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query) return subjects;

return subjects.filter(
(item) =>
normalizeSearch(
item.name
).includes(query)
);
}, [subjects, search]);

async function deleteSubject(
subject
) {
const confirmed =
window.confirm(
`Voulez-vous supprimer la matière "${subject.name}" ?`
);

if (!confirmed) return;

const { error } =
await supabase
.from("subjects")
.delete()
.eq("id", subject.id);

if (error) {
alert(
"Impossible de supprimer cette matière."
);
console.error(error);
return;
}

await onRefresh();
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
PÉDAGOGIE
</span>

<h2>
Matières
</h2>

<p>
Gérez les matières enseignées dans votre établissement.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter une matière
</button>

</div>

<div className="ec-toolbar">

<div className="ec-search">

<span>🔎</span>

<input
placeholder="Rechercher une matière..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

<div className="ec-count">
{filtered.length} matière
{filtered.length !== 1
? "s"
: ""}
</div>

</div>

<div className="ec-panel">

{filtered.length === 0 ? (
<EmptyState
icon="📚"
title={
search
? "Aucun résultat"
: "Aucune matière"
}
description="Ajoutez les matières enseignées dans votre école."
button="Ajouter une matière"
onButton={() =>
setShowModal(true)
}
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Matière</th>
<th>Création</th>
<th>Actions</th>
</tr>
</thead>

<tbody>

{filtered.map(
(subject) => (
<tr
key={subject.id}
>

<td>
<div className="ec-person">

<div className="ec-avatar subject">
📚
</div>

<div>
<strong>
{
subject.name
}
</strong>

<span>
Matière
</span>
</div>

</div>
</td>

<td>
{formatDate(
subject.created_at
)}
</td>

<td>
<button
className="ec-action-btn danger"
onClick={() =>
deleteSubject(
subject
)
}
>
🗑️
</button>
</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{showModal && (
<SubjectFormModal
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await onRefresh();
}}
/>
)}

</div>
);
}

/* =========================================================
FORMULAIRE MATIÈRE
========================================================= */

function SubjectFormModal({
onClose,
onSuccess,
}) {
const [name, setName] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

if (name.trim().length < 2) {
setError(
"Le nom de la matière est obligatoire."
);
return;
}

setSaving(true);

try {
const { error } =
await supabase
.from("subjects")
.insert({
name: name.trim(),
});

if (error) {
throw error;
}

alert(
"Matière créée avec succès !"
);

await onSuccess();

} catch (error) {
console.error(
"Erreur création matière:",
error
);

setError(
error.message ||
"Impossible de créer la matière."
);
} finally {
setSaving(false);
}
}

return (
<Modal
title="Ajouter une matière"
eyebrow="NOUVELLE MATIÈRE"
description="Ajoutez une matière au catalogue de l'établissement."
onClose={onClose}
>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Nom de la matière"
placeholder="Ex : Mathématiques"
value={name}
onChange={setName}
disabled={saving}
/>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Créer la matière"
/>

</form>

</Modal>
);
}

/* =========================================================
AFFECTATIONS
========================================================= */

function AssignmentsPage({
teachers,
classes,
subjects,
}) {
const [selectedTeacher, setSelectedTeacher] =
useState("");

const [selectedClass, setSelectedClass] =
useState("");

const [selectedSubject, setSelectedSubject] =
useState("");

const [message, setMessage] =
useState("");

async function assignClass() {
setMessage("");

if (
!selectedTeacher ||
!selectedClass
) {
setMessage(
"Sélectionnez un enseignant et une classe."
);
return;
}

const { error } =
await supabase
.from("teacher_classes")
.upsert(
{
teacher_id:
selectedTeacher,
class_id:
selectedClass,
},
{
onConflict:
"teacher_id,class_id",
}
);

if (error) {
console.error(error);

setMessage(
"Impossible d'effectuer l'affectation."
);

return;
}

setMessage(
"Classe affectée avec succès."
);
}

async function assignSubject() {
setMessage("");

if (
!selectedTeacher ||
!selectedSubject
) {
setMessage(
"Sélectionnez un enseignant et une matière."
);
return;
}

const { error } =
await supabase
.from("teacher_subjects")
.upsert(
{
teacher_id:
selectedTeacher,
subject_id:
Number(selectedSubject),
},
{
onConflict:
"teacher_id,subject_id",
}
);

if (error) {
console.error(error);

setMessage(
"Impossible d'affecter la matière."
);

return;
}

setMessage(
"Matière affectée avec succès."
);
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
ORGANISATION
</span>

<h2>
Affectations
</h2>

<p>
Affectez les enseignants aux classes et aux matières.
</p>
</div>

</div>

<div className="ec-panel">

<div className="ec-form assignment-form">

{message && (
<div className="ec-form-info">
<span>ℹ️</span>
<p>{message}</p>
</div>
)}

<SelectInput
label="Enseignant"
value={selectedTeacher}
onChange={
setSelectedTeacher
}
options={teachers.map(
(item) => ({
value: item.id,
label:
item.display_name,
})
)}
placeholder="Choisir un enseignant"
/>

<SelectInput
label="Classe"
value={selectedClass}
onChange={
setSelectedClass
}
options={classes.map(
(item) => ({
value: item.id,
label: item.name,
})
)}
placeholder="Choisir une classe"
/>

<button
className="ec-btn ec-btn-primary"
onClick={assignClass}
>
🔗 Affecter à la classe
</button>

<div className="ec-divider" />

<SelectInput
label="Matière"
value={selectedSubject}
onChange={
setSelectedSubject
}
options={subjects.map(
(item) => ({
value: String(item.id),
label: item.name,
})
)}
placeholder="Choisir une matière"
/>

<button
className="ec-btn ec-btn-primary"
onClick={assignSubject}
>
📚 Affecter la matière
</button>

</div>

</div>

</div>
);
}

/* =========================================================
PRÉSENCES
========================================================= */

function AttendancePage({
schoolId,
}) {
const [classes, setClasses] =
useState([]);

const [students, setStudents] =
useState([]);

const [attendance, setAttendance] =
useState({});

const [selectedClass, setSelectedClass] =
useState("");

const [selectedDate, setSelectedDate] =
useState(
new Date()
.toISOString()
.slice(0, 10)
);

const [search, setSearch] =
useState("");

const [loading, setLoading] =
useState(false);

const [savingId, setSavingId] =
useState(null);

useEffect(() => {
if (!schoolId) return;
loadClasses();
}, [schoolId]);

useEffect(() => {
if (!selectedClass) {
setStudents([]);
setAttendance({});
return;
}

loadStudentsAndAttendance();
}, [
selectedClass,
selectedDate,
]);

async function loadClasses() {
const { data, error } =
await supabase
.from("classes")
.select(
"id, name, level"
)
.eq(
"school_id",
schoolId
)
.order("name");

if (error) {
console.error(error);
return;
}

setClasses(data || []);

if (
data?.length &&
!selectedClass
) {
setSelectedClass(
data[0].id
);
}
}

async function loadStudentsAndAttendance() {
setLoading(true);

const {
data: studentData,
error: studentError,
} = await supabase
.from("students")
.select(
"id, first_name, last_name, student_code, active"
)
.eq(
"school_id",
schoolId
)
.eq(
"class_id",
selectedClass
)
.order("last_name");

if (studentError) {
console.error(studentError);
setLoading(false);
return;
}

setStudents(
studentData || []
);

const {
data: attendanceData,
error: attendanceError,
} = await supabase
.from("attendance")
.select(
"id, student_id, status, justification, justified"
)
.eq(
"class_id",
selectedClass
)
.eq(
"attendance_date",
selectedDate
);

if (attendanceError) {
console.error(
attendanceError
);
setLoading(false);
return;
}

const mapped = {};

(
attendanceData || []
).forEach((item) => {
mapped[item.student_id] =
item;
});

setAttendance(mapped);
setLoading(false);
}

async function updateAttendance(
student,
status
) {
setSavingId(student.id);

const current =
attendance[student.id];

const payload = {
student_id:
student.id,
class_id:
selectedClass,
attendance_date:
selectedDate,
status,
justification:
current?.justification ||
null,
justified:
current?.justified ||
false,
};

const {
data,
error,
} = await supabase
.from("attendance")
.upsert(payload, {
onConflict:
"student_id,attendance_date",
})
.select()
.single();

if (error) {
console.error(error);

alert(
"Impossible d'enregistrer cette présence."
);

setSavingId(null);
return;
}

setAttendance(
(previous) => ({
...previous,
[student.id]:
data,
})
);

setSavingId(null);
}

const filteredStudents =
useMemo(() => {
const query =
normalizeSearch(search);

if (!query)
return students;

return students.filter(
(student) =>
normalizeSearch(
`${student.first_name} ${student.last_name} ${student.student_code}`
).includes(query)
);
}, [students, search]);

const counts = {
present: 0,
absent: 0,
late: 0,
};

students.forEach(
(student) => {
const status =
attendance[
student.id
]?.status;

if (
status === "present"
)
counts.present++;

if (
status === "absent"
)
counts.absent++;

if (
status === "late"
)
counts.late++;
}
);

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
SUIVI SCOLAIRE
</span>

<h2>
Présences
</h2>

<p>
Suivez les présences et absences des élèves.
</p>
</div>

</div>

<div className="ec-attendance-controls">

<div className="ec-form-group">

<label>
Classe
</label>

<select
value={selectedClass}
onChange={(event) =>
setSelectedClass(
event.target.value
)
}
>

{!classes.length && (
<option value="">
Aucune classe
</option>
)}

{classes.map(
(item) => (
<option
key={item.id}
value={item.id}
>
{item.name}
{item.level
? ` — ${item.level}`
: ""}
</option>
)
)}

</select>

</div>

<div className="ec-form-group">

<label>
Date
</label>

<input
type="date"
value={selectedDate}
onChange={(event) =>
setSelectedDate(
event.target.value
)
}
/>

</div>

<div className="ec-form-group">

<label>
Recherche
</label>

<input
placeholder="Nom ou matricule..."
value={search}
onChange={(event) =>
setSearch(
event.target.value
)
}
/>

</div>

</div>

<div className="ec-attendance-summary">

<SummaryCard
label="Présents"
value={counts.present}
/>

<SummaryCard
label="Absents"
value={counts.absent}
/>

<SummaryCard
label="Retards"
value={counts.late}
/>

<SummaryCard
label="Total"
value={students.length}
/>

</div>

<div className="ec-panel">

{loading ? (
<div className="ec-empty-large">
<div className="ec-spinner small" />
<p>
Chargement des élèves...
</p>
</div>
) : filteredStudents.length ===
0 ? (
<EmptyState
icon="🎓"
title="Aucun élève"
description="Aucun élève n'est disponible pour cette classe."
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Élève</th>
<th>Matricule</th>
<th>Présence</th>
</tr>
</thead>

<tbody>

{filteredStudents.map(
(student) => {
const current =
attendance[
student.id
];

return (
<tr
key={student.id}
>

<td>
<div className="ec-person">

<div className="ec-avatar student">
{getInitial(
student.first_name
)}
</div>

<div>
<strong>
{
student.first_name
}{" "}
{
student.last_name
}
</strong>

<span>
Élève
</span>
</div>

</div>
</td>

<td>
{
student.student_code ||
"-"
}
</td>

<td>

<div className="attendance-buttons">

<AttendanceButton
active={
current?.status ===
"present"
}
disabled={
savingId ===
student.id
}
onClick={() =>
updateAttendance(
student,
"present"
)
}
label="✓ Présent"
type="present"
/>

<AttendanceButton
active={
current?.status ===
"late"
}
disabled={
savingId ===
student.id
}
onClick={() =>
updateAttendance(
student,
"late"
)
}
label="⏱ Retard"
type="late"
/>

<AttendanceButton
active={
current?.status ===
"absent"
}
disabled={
savingId ===
student.id
}
onClick={() =>
updateAttendance(
student,
"absent"
)
}
label="× Absent"
type="absent"
/>

</div>

</td>

</tr>
);
}
)}

</tbody>

</table>

</div>
)}

</div>

</div>
);
}

/* =========================================================
CADRE DE PAGE PARTAGE
========================================================= */

function PageShell({ title, description, action, children }) {
return (
<div className="ec-page">
  <div className="ec-page-heading">
    <div>
      <span className="ec-eyebrow">ADMINISTRATION</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
  {children}
</div>
);
}

/* =========================================================
NOTES
========================================================= */


function GradesPage({ schoolId, teachers, classes, subjects, students, assessments, grades, onRefresh }) {
const [assessmentId, setAssessmentId] = useState("");
const [studentId, setStudentId] = useState("");
const [score, setScore] = useState("");
const [appreciation, setAppreciation] = useState("");
const [form, setForm] = useState({ teacherId: "", classId: "", subjectId: "", title: "", type: "devoir", maxScore: "20", date: new Date().toISOString().slice(0,10), coefficient: "1" });
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);
const safeTeachers = Array.isArray(teachers) ? teachers : [];
const safeClasses = Array.isArray(classes) ? classes : [];
const safeSubjects = Array.isArray(subjects) ? subjects : [];
const safeStudents = Array.isArray(students) ? students : [];
const safeAssessments = Array.isArray(assessments) ? assessments : [];
const safeGrades = Array.isArray(grades) ? grades : [];
const selectedAssessment = safeAssessments.find(a => a.id === assessmentId);
const eligibleTeachers = teachers.filter(t => !form.classId || true);
const classStudents = safeStudents.filter(s => !form.classId || s.class_id === form.classId);

async function createAssessment(e) {
e.preventDefault(); setError(""); setMessage("");
if (!form.teacherId || !form.classId || !form.subjectId || !form.title.trim()) { setError("Sélectionnez l'enseignant, la classe, la matière et saisissez le titre."); return; }
setSaving(true);
const { data, error: e1 } = await supabase.from("assessments").insert({ school_id: schoolId, teacher_id: form.teacherId, class_id: form.classId, subject_id: Number(form.subjectId), title: form.title.trim(), assessment_type: form.type, max_score: Number(form.maxScore), evaluation_date: form.date, coefficient: Number(form.coefficient || 1), published: true }).select().single();
setSaving(false);
if (e1) { setError(e1.message); return; }
setAssessmentId(data.id); setMessage("Évaluation créée. Vous pouvez maintenant saisir une note."); await onRefresh();
}

async function saveGrade(e) {
e.preventDefault(); setError(""); setMessage("");
if (!assessmentId || !studentId || score === "") { setError("Sélectionnez une évaluation, un élève et saisissez une note."); return; }
const n = Number(score);
if (!Number.isFinite(n) || n < 0 || n > Number(selectedAssessment?.max_score ?? 20)) { setError("La note dépasse le barème de l'évaluation."); return; }
setSaving(true);
const { error: e2 } = await supabase.from("grades").upsert({ assessment_id: assessmentId, student_id: studentId, teacher_id: selectedAssessment.teacher_id, school_id: schoolId, score: n, appreciation: appreciation.trim() || null }, { onConflict: "assessment_id,student_id" });
setSaving(false);
if (e2) { setError(e2.message); return; }
setMessage("Note enregistrée avec succès."); setScore(""); setAppreciation(""); await onRefresh();
}

return <PageShell title="Notes" description="Créez les évaluations et rattachez chaque note à son enseignant, sa matière, sa classe et son élève." action={<button className="ec-btn ec-btn-secondary" onClick={onRefresh}>↻ Actualiser</button>}>
<div className="ec-grid-2">
<section className="ec-card"><div className="ec-card-head"><h3>Nouvelle évaluation</h3></div>
<form className="ec-form" onSubmit={createAssessment}>
<SelectInput label="Enseignant" value={form.teacherId} onChange={v=>setForm({...form,teacherId:v})} options={safeTeachers.map(t=>({value:t.id,label:t.display_name}))} placeholder="Choisir un enseignant" />
<SelectInput label="Classe" value={form.classId} onChange={v=>setForm({...form,classId:v,studentId:""})} options={safeClasses.map(c=>({value:c.id,label:`${c.name}${c.level?` — ${c.level}`:""}`}))} placeholder="Choisir une classe" />
<SelectInput label="Matière" value={form.subjectId} onChange={v=>setForm({...form,subjectId:v})} options={safeSubjects.map(x=>({value:String(x.id),label:x.name}))} placeholder="Choisir une matière" />
<TextInput label="Titre" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="Ex. Devoir de mathématiques" />
<div className="ec-form-row"><SelectInput label="Type" value={form.type} onChange={v=>setForm({...form,type:v})} options={["devoir","interrogation","examen","controle"].map(x=>({value:x,label:x}))}/><TextInput label="Barème" type="number" value={form.maxScore} onChange={v=>setForm({...form,maxScore:v})}/></div>
<div className="ec-form-row"><TextInput label="Date" type="date" value={form.date} onChange={v=>setForm({...form,date:v})}/><TextInput label="Coefficient" type="number" step="0.5" value={form.coefficient} onChange={v=>setForm({...form,coefficient:v})}/></div>
<button className="ec-btn ec-btn-primary" disabled={saving}>{saving?"Enregistrement…":"Créer l'évaluation"}</button>
</form></section>
<section className="ec-card"><div className="ec-card-head"><h3>Saisir une note</h3></div>
<form className="ec-form" onSubmit={saveGrade}>
<SelectInput label="Évaluation" value={assessmentId} onChange={v=>setAssessmentId(v)} options={safeAssessments.map(a=>({value:a.id,label:`${a.title} — ${formatDate(a.evaluation_date)}`}))} placeholder="Choisir une évaluation" />
<SelectInput label="Élève" value={studentId} onChange={setStudentId} options={classStudents.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}`}))} placeholder="Choisir un élève" />
<TextInput label={`Note / ${selectedAssessment?.max_score ?? 20}`} type="number" step="0.01" value={score} onChange={setScore} />
<TextAreaInput label="Appréciation" value={appreciation} onChange={setAppreciation} placeholder="Appréciation du professeur" />
<button className="ec-btn ec-btn-primary" disabled={saving}>{saving?"Enregistrement…":"Enregistrer la note"}</button>
</form></section></div>
{message && <div className="ec-alert ec-alert-success">{message}</div>}{error && <div className="ec-alert ec-alert-error">{error}</div>}
<section className="ec-card"><div className="ec-card-head"><h3>Notes enregistrées</h3></div><div className="ec-table-wrap"><table className="ec-table"><thead><tr><th>Élève</th><th>Matière</th><th>Professeur</th><th>Évaluation</th><th>Note</th><th>Date</th></tr></thead><tbody>{safeGrades.length ? safeGrades.map(g=><tr key={g.id}><td>{g.student_first_name} {g.student_last_name}</td><td>{g.subject_name || "-"}</td><td>{safeTeachers.find(t=>t.id===g.teacher_id)?.display_name || "-"}</td><td>{g.assessment_title}</td><td><strong>{g.score}/{g.max_score}</strong></td><td>{formatDate(g.evaluation_date)}</td></tr>) : <tr><td colSpan="6"><EmptyState title="Aucune note" description="Les notes saisies apparaîtront ici." /></td></tr>}</tbody></table></div></section>
</PageShell>
}

function ReportCardsPage({ school, students, teachers, grades }) {
const [studentId, setStudentId] = useState("");
const safeStudents = Array.isArray(students) ? students : [];
const safeTeachers = Array.isArray(teachers) ? teachers : [];
const safeGrades = Array.isArray(grades) ? grades : [];
const student = safeStudents.find(s=>s.id===studentId);
const rows = safeGrades.filter(g=>g.student_id===studentId);
const bySubject = Object.values(rows.reduce((acc,g)=>{ const key=g.subject_id||`x-${g.assessment_id}`; if(!acc[key]) acc[key]={subject:g.subject_name||"Matière", scores:[], teachers:new Set()}; acc[key].scores.push(Number(g.score)/Number(g.max_score)*20); if(g.teacher_id) acc[key].teachers.add(g.teacher_id); return acc; },{}));
const average = rows.length ? rows.reduce((a,g)=>a+(Number(g.score)/Number(g.max_score)*20)*Number(g.coefficient||1),0)/rows.reduce((a,g)=>a+Number(g.coefficient||1),0) : 0;
function printBulletin(){ window.print(); }
return <PageShell title="Bulletins" description="Bulletin scolaire calculé à partir des notes réellement saisies par les enseignants." action={<button className="ec-btn ec-btn-primary" onClick={printBulletin} disabled={!student}>🖨 Imprimer / PDF</button>}>
<div className="ec-card"><SelectInput label="Élève" value={studentId} onChange={setStudentId} options={safeStudents.map(s=>({value:s.id,label:`${s.first_name} ${s.last_name}${s.student_code?` — ${s.student_code}`:""}`}))} placeholder="Choisir un élève" /></div>
{student && <section className="ec-card bulletin-print"><div className="bulletin-header"><div><h2>{school?.name || "Établissement scolaire"}</h2><p>{school?.address || ""} {school?.city ? `— ${school.city}` : ""}</p></div><div><strong>BULLETIN SCOLAIRE</strong><p>{student.first_name} {student.last_name}</p><p>Code : {student.student_code || "-"}</p></div></div><div className="ec-stat-grid"><div className="ec-stat-card"><span>Moyenne générale</span><strong>{average.toFixed(2)}/20</strong></div><div className="ec-stat-card"><span>Évaluations</span><strong>{rows.length}</strong></div></div><div className="ec-table-wrap"><table className="ec-table"><thead><tr><th>Matière</th><th>Professeur</th><th>Moyenne</th></tr></thead><tbody>{bySubject.map((r,i)=><tr key={i}><td>{r.subject}</td><td>{[...r.teachers].map(id=>safeTeachers.find(t=>t.id===id)?.display_name).filter(Boolean).join(", ") || "-"}</td><td><strong>{(r.scores.reduce((a,b)=>a+b,0)/r.scores.length).toFixed(2)}/20</strong></td></tr>)}{!bySubject.length&&<tr><td colSpan="3">Aucune note disponible.</td></tr>}</tbody></table></div><div className="bulletin-footer"><p>Signature / cachet de l'établissement</p><p>Signature du responsable</p></div></section>}
</PageShell>
}
function CommunicationPage({
  schoolId,
  secretaries,
  currentProfile,
}) {
  const safeSecretaries = Array.isArray(secretaries)
    ? secretaries
    : [];

  const activeSecretaries =
    safeSecretaries.filter(
      (item) => item.active !== false
    );

  const [messages, setMessages] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // CHARGER LES MESSAGES
  // =========================================================

  async function loadMessages() {
    if (!schoolId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const {
      data,
      error: loadError,
    } = await supabase
      .from("school_messages")
      .select(
        "id, school_id, sender_id, recipient_role, subject, message, read_at, created_at"
      )
      .eq("school_id", schoolId)
      .order("created_at", {
        ascending: true,
      });

    if (loadError) {
      console.error(
        "Erreur chargement messages :",
        loadError
      );

      setError(
        "Impossible de charger les messages : " +
          loadError.message
      );

      setMessages([]);
    } else {
      setMessages(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, [schoolId]);

  // =========================================================
  // ENVOYER UN MESSAGE
  // =========================================================

  async function sendMessage(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanMessage = message.trim();

    const cleanSubject =
      subject.trim() ||
      "Conversation avec le secrétariat";

    if (!cleanMessage) {
      setError(
        "Veuillez écrire un message avant de l'envoyer."
      );
      return;
    }

    if (!activeSecretaries.length) {
      setError(
        "Aucun secrétaire actif n'est actuellement enregistré dans cette école."
      );
      return;
    }

    setSending(true);

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const user = userData?.user;

      if (!user?.id) {
        throw new Error(
          "Utilisateur non connecté."
        );
      }

      const {
        error: sendError,
      } = await supabase
        .from("school_messages")
        .insert({
          school_id: schoolId,
          sender_id: user.id,
          recipient_role: "secretary",
          subject: cleanSubject,
          message: cleanMessage,
        });

      if (sendError) {
        throw sendError;
      }

      // On vide uniquement le message.
      // Le sujet reste disponible pour la conversation.
      setMessage("");

      setSuccess(
        "Message envoyé au secrétariat."
      );

      await loadMessages();

    } catch (sendError) {
      console.error(
        "Erreur envoi message :",
        sendError
      );

      setError(
        sendError?.message ||
          "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }

  // =========================================================
  // MARQUER UN MESSAGE COMME LU
  // =========================================================

  async function markAsRead(id) {
    if (!id || !schoolId) {
      return;
    }

    const {
      error: updateError,
    } = await supabase
      .from("school_messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", schoolId);

    if (updateError) {
      console.error(
        "Erreur marquage message :",
        updateError
      );

      setError(
        "Impossible de marquer le message comme lu."
      );

      return;
    }

    await loadMessages();
  }

  // =========================================================
  // MESSAGES NON LUS
  // =========================================================

  const unread = messages.filter(
    (item) =>
      item.sender_id !== currentProfile?.id &&
      !item.read_at
  ).length;

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <PageShell
      title="Communication"
      description="Échangez directement avec le secrétariat de votre établissement."
      action={
        <button
          type="button"
          className="ec-btn ec-btn-secondary"
          onClick={loadMessages}
          disabled={loading}
        >
          {loading
            ? "Chargement…"
            : "↻ Actualiser"}
        </button>
      }
    >
      <section className="ec-card">
        {/* ===================================================
            EN-TÊTE
        =================================================== */}

        <div className="ec-card-head">
          <div>
            <h3>
              💬 Conversation avec le secrétariat
            </h3>

            <p>
              Échangez directement avec le
              secrétariat de votre école.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span className="ec-badge">
              👥 {activeSecretaries.length} secrétaire
              {activeSecretaries.length > 1
                ? "s"
                : ""}
            </span>

            {unread > 0 && (
              <span className="ec-badge warning">
                🔔 {unread} non lu
                {unread > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ===================================================
            ALERTES
        =================================================== */}

        {error && (
          <div
            className="ec-alert ec-alert-error"
            style={{
              marginBottom: "12px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            className="ec-alert ec-alert-success"
            style={{
              marginBottom: "12px",
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* ===================================================
            CONVERSATION
        =================================================== */}

        {loading ? (
          <div className="ec-empty-large">
            <div className="ec-spinner small" />

            <p>
              Chargement de la conversation…
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              minHeight: "280px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="💬"
              title="Aucun message"
              description="Commencez la conversation avec le secrétariat."
            />
          </div>
        ) : (
          <div
            style={{
              maxHeight: "520px",
              overflowY: "auto",
              padding: "18px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((item) => {
              const isMine =
                item.sender_id ===
                currentProfile?.id;

              const isUnread =
                !isMine && !item.read_at;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine
                      ? "flex-end"
                      : "flex-start",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "78%",
                      minWidth: "180px",
                      padding: "12px 14px",
                      borderRadius: isMine
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      background: isMine
                        ? "#2563eb"
                        : "#ffffff",
                      color: isMine
                        ? "#ffffff"
                        : "#0f172a",
                      border: isMine
                        ? "none"
                        : "1px solid #e2e8f0",
                      boxShadow:
                        "0 2px 8px rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    {/* EXPÉDITEUR */}

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        marginBottom: "5px",
                        color: isMine
                          ? "#ffffff"
                          : "#2563eb",
                        opacity: 0.95,
                      }}
                    >
                      {isMine
                        ? "Vous"
                        : "Secrétariat"}
                    </div>

                    {/* SUJET */}

                    {item.subject && (
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          marginBottom: "6px",
                          color: isMine
                            ? "#ffffff"
                            : "#0f172a",
                        }}
                      >
                        {item.subject}
                      </div>
                    )}

                    {/* MESSAGE */}

                    <div
                      style={{
                        fontSize: "14px",
                        lineHeight: "1.55",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: isMine
                          ? "#ffffff"
                          : "#0f172a",
                      }}
                    >
                      {item.message}
                    </div>

                    {/* DATE / HEURE */}

                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: "8px",
                        flexWrap: "wrap",
                        fontSize: "11px",
                        color: isMine
                          ? "rgba(255,255,255,0.82)"
                          : "#64748b",
                      }}
                    >
                      <span>
                        {formatDateTime(
                          item.created_at
                        )}
                      </span>

                      {isUnread && (
                        <span
                          style={{
                            fontWeight: "700",
                            color: "#dc2626",
                          }}
                        >
                          ● Nouveau
                        </span>
                      )}
                    </div>

                    {/* MARQUER COMME LU */}

                    {isUnread && (
                      <button
                        type="button"
                        onClick={() =>
                          markAsRead(item.id)
                        }
                        style={{
                          marginTop: "8px",
                          border: "none",
                          background:
                            "transparent",
                          padding: "0",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          color: "#2563eb",
                        }}
                      >
                        ✓ Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================================================
            COMPOSITEUR DE MESSAGE
        =================================================== */}

        <form
          onSubmit={sendMessage}
          style={{
            marginTop: "16px",
            padding: "14px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
          }}
        >
          {/* SUJET */}

          <div
            style={{
              marginBottom: "10px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "700",
                color: "#334155",
                marginBottom: "6px",
              }}
            >
              Sujet
              <span
                style={{
                  fontWeight: "400",
                  color: "#64748b",
                  marginLeft: "5px",
                }}
              >
                (optionnel)
              </span>
            </label>

            <input
              type="text"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              placeholder="Ex. Réunion avec les parents"
              disabled={sending}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          {/* MESSAGE + BOUTON */}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                flex: "1",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Message
              </label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Écrire un message…"
                disabled={sending}
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  minHeight: "76px",
                  padding: "11px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "9px",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              className="ec-btn ec-btn-primary"
              disabled={
                sending ||
                !activeSecretaries.length ||
                !message.trim()
              }
              style={{
                minHeight: "76px",
                whiteSpace: "nowrap",
              }}
            >
              {sending
                ? "Envoi…"
                : "📨 Envoyer"}
            </button>
          </div>

          {/* INFO */}

          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            🔐 Cette conversation est limitée à
            votre établissement.
          </div>
        </form>
      </section>
    </PageShell>
  );
}

/* =========================================================
DOCUMENTS ADMINISTRATIFS
========================================================= */


function AdministrativeDocumentsPage({
schoolId,
school,
students,
parents,
teachers,
}) {
const [documents, setDocuments] =
useState([]);

const [loading, setLoading] =
useState(true);

const [showModal, setShowModal] =
useState(false);

const [previewDocument, setPreviewDocument] =
useState(null);

const safeStudents = Array.isArray(students) ? students : [];
const safeParents = Array.isArray(parents) ? parents : [];
const safeTeachers = Array.isArray(teachers) ? teachers : [];

async function loadDocuments() {
setLoading(true);

const { data, error } =
await supabase
.from(
"administrative_documents"
)
.select("*")
.eq(
"school_id",
schoolId
)
.order("created_at", {
ascending: false,
});

if (error) {
console.error(
"Erreur documents administratifs:",
error
);
setLoading(false);
return;
}

setDocuments(
data || []
);

setLoading(false);
}

useEffect(() => {
if (schoolId) {
loadDocuments();
}
}, [schoolId]);

async function deleteDocument(
document
) {
const confirmed =
window.confirm(
`Supprimer "${document.title}" ?`
);

if (!confirmed) return;

const { error } =
await supabase
.from(
"administrative_documents"
)
.delete()
.eq(
"id",
document.id
)
.eq(
"school_id",
schoolId
);

if (error) {
alert(
"Impossible de supprimer le document."
);
console.error(error);
return;
}

await loadDocuments();
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
ADMINISTRATION
</span>

<h2>
Documents administratifs
</h2>

<p>
Gérez les documents administratifs de l'établissement.
</p>
</div>

<button
className="ec-btn ec-btn-primary"
onClick={() =>
setShowModal(true)
}
>
+ Ajouter un document
</button>

</div>

<div className="ec-panel">

{loading ? (
<div className="ec-empty-large">
<div className="ec-spinner small" />
<p>
Chargement...
</p>
</div>
) : documents.length ===
0 ? (
<EmptyState
icon="📁"
title="Aucun document"
description="Ajoutez les documents administratifs de votre établissement."
button="Ajouter un document"
onButton={() =>
setShowModal(true)
}
/>
) : (
<div className="ec-table-wrapper">

<table className="ec-table">

<thead>
<tr>
<th>Document</th>
<th>Type</th>
<th>Création</th>
<th>Actions</th>
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
{
document.title
}
</strong>

{document.description && (
<span className="ec-cell-description">
{
document.description
}
</span>
)}
</td>

<td>
{
DOCUMENT_TYPES.find(
(type) =>
type.value ===
document.document_type
)?.label ||
document.document_type
}
</td>

<td>
{formatDate(
document.created_at
)}
</td>

<td>
<button
className="ec-action-btn"
title="Prévisualiser / imprimer"
onClick={() => setPreviewDocument(document)}
>
🖨️
</button>

<button
className="ec-action-btn danger"
title="Supprimer"
onClick={() =>
deleteDocument(
document
)
}
>
🗑️
</button>
</td>

</tr>
)
)}

</tbody>

</table>

</div>
)}

</div>

{previewDocument && (
<AdministrativeDocumentPreview
document={previewDocument}
school={school}
students={safeStudents}
parents={safeParents}
teachers={safeTeachers}
onClose={() => setPreviewDocument(null)}
/>
)}

{showModal && (
<AdministrativeDocumentModal
schoolId={schoolId}
students={safeStudents}
parents={safeParents}
teachers={safeTeachers}
onClose={() =>
setShowModal(false)
}
onSuccess={async () => {
setShowModal(false);
await loadDocuments();
}}
/>
)}

</div>
);
}

/* =========================================================
PRÉVISUALISATION DES DOCUMENTS ADMINISTRATIFS
========================================================= */

function AdministrativeDocumentPreview({ document, students, parents, teachers, onClose }) {
const student = students.find(item => item.id === document.student_id);
const parent = parents.find(item => item.id === document.parent_id);
const teacher = teachers.find(item => item.id === document.teacher_id);

const templateLabel = DOCUMENT_TYPES.find(item => item.value === document.document_type)?.label || document.document_type;

function printDocument() {
window.print();
}

return (
<Modal
title={templateLabel}
eyebrow="DOCUMENT PROFESSIONNEL"
description="Prévisualisez et imprimez le document administratif."
onClose={onClose}
>
<div className="document-preview">
  <div className="document-preview-header">
    <div>
      <div className="document-logo">EC</div>
      <h2>ÉCOLE CONNECTÉE</h2>
      <p>Document administratif officiel</p>
    </div>
    <div className="document-ref">
      <strong>{templateLabel.toUpperCase()}</strong>
      <span>{formatDate(document.created_at)}</span>
    </div>
  </div>

  <div className="document-preview-body">
    <h1>{templateLabel}</h1>
    <p>
      Nous certifions par la présente que
      {student ? ` ${student.first_name} ${student.last_name}` : " l'élève concerné"}
      {student?.student_code ? `, matricule ${student.student_code},` : ""}
      est inscrit(e) dans notre établissement.
    </p>

    {student && (
      <div className="document-info-grid">
        <div><span>Élève</span><strong>{student.first_name} {student.last_name}</strong></div>
        <div><span>Matricule</span><strong>{student.student_code || "-"}</strong></div>
        <div><span>Parent / responsable</span><strong>{parent?.full_name || "-"}</strong></div>
        <div><span>Enseignant</span><strong>{teacher?.display_name || "-"}</strong></div>
      </div>
    )}

    {document.description && (
      <p className="document-description">{document.description}</p>
    )}

    <p className="document-place">
      Fait pour servir et valoir ce que de droit.
    </p>
  </div>

  <div className="document-signatures">
    <div>Signature du responsable</div>
    <div>Cachet de l'établissement</div>
  </div>
</div>

<div className="ec-form-actions">
  <button className="ec-btn ec-btn-secondary" onClick={onClose}>Fermer</button>
  <button className="ec-btn ec-btn-primary" onClick={printDocument}>🖨 Imprimer / PDF</button>
</div>
</Modal>
);
}

/* =========================================================
DOCUMENT MODAL
========================================================= */

function AdministrativeDocumentModal({
schoolId,
students,
parents,
teachers,
onClose,
onSuccess,
}) {
const [title, setTitle] =
useState("");

const [type, setType] =
useState(
"certificat_scolarite"
);

const [description, setDescription] =
useState("");

const [studentId, setStudentId] =
useState("");

const [parentId, setParentId] =
useState("");

const [teacherId, setTeacherId] =
useState("");

const [saving, setSaving] =
useState(false);

const [error, setError] =
useState("");

async function handleSubmit(
event
) {
event.preventDefault();

setError("");

if (title.trim().length < 2) {
setError(
"Le titre du document est obligatoire."
);
return;
}

setSaving(true);

try {
const {
data: {
user,
},
} =
await supabase.auth.getUser();

const { error } =
await supabase
.from(
"administrative_documents"
)
.insert({
school_id:
schoolId,
student_id:
studentId ||
null,
parent_id:
parentId ||
null,
teacher_id:
teacherId ||
null,
title:
title.trim(),
document_type:
type,
description:
description.trim() ||
null,
created_by:
user?.id ||
null,
active: true,
});

if (error) {
throw error;
}

alert(
"Document enregistré avec succès !"
);

await onSuccess();

} catch (error) {
console.error(error);

setError(
error.message ||
"Impossible d'enregistrer le document."
);
} finally {
setSaving(false);
}
}

return (
<Modal
title="Ajouter un document administratif"
eyebrow="NOUVEAU DOCUMENT"
description="Enregistrez un document administratif dans votre établissement."
onClose={onClose}
>

<form
className="ec-form"
onSubmit={handleSubmit}
>

{error && (
<div className="ec-form-error">
⚠️ {error}
</div>
)}

<FormInput
label="Titre"
placeholder="Ex : Certificat de scolarité"
value={title}
onChange={setTitle}
disabled={saving}
/>

<SelectInput
label="Type de document"
value={type}
onChange={setType}
options={DOCUMENT_TYPES.map(
(item) => ({
value: item.value,
label: item.label,
})
)}
disabled={saving}
/>

<SelectInput
label="Élève concerné"
value={studentId}
onChange={setStudentId}
options={students.map(
(item) => ({
value: item.id,
label: `${item.first_name} ${item.last_name}`,
})
)}
placeholder="Aucun / choisir"
disabled={saving}
/>

<SelectInput
label="Parent concerné"
value={parentId}
onChange={setParentId}
options={parents.map(
(item) => ({
value: item.id,
label: item.full_name,
})
)}
placeholder="Aucun / choisir"
disabled={saving}
/>

<SelectInput
label="Enseignant concerné"
value={teacherId}
onChange={setTeacherId}
options={teachers.map(
(item) => ({
value: item.id,
label: item.display_name,
})
)}
placeholder="Aucun / choisir"
disabled={saving}
/>

<div className="ec-form-group">

<label>
Description
</label>

<textarea
value={description}
onChange={(event) =>
setDescription(
event.target.value
)
}
placeholder="Description du document..."
disabled={saving}
/>

</div>

<div className="ec-form-info">
<span>📁</span>

<p>
Le document est enregistré dans l'espace administratif de votre établissement.
</p>
</div>

<ModalActions
onClose={onClose}
saving={saving}
submitText="Enregistrer"
/>

</form>

</Modal>
);
}

/* =========================================================
PARAMÈTRES
========================================================= */

function SettingsPage({
school,
onRefresh,
}) {
const [name, setName] =
useState(school?.name || "");

const [address, setAddress] =
useState(
school?.address || ""
);

const [city, setCity] =
useState(school?.city || "");

const [phone, setPhone] =
useState(school?.phone || "");

const [email, setEmail] =
useState(school?.email || "");

const [saving, setSaving] =
useState(false);

const [message, setMessage] =
useState("");

async function saveSchool() {
setSaving(true);
setMessage("");

const { error } =
await supabase
.from("schools")
.update({
name: name.trim(),
address:
address.trim() ||
null,
city:
city.trim() ||
null,
phone:
phone.trim() ||
null,
email:
email.trim() ||
null,
})
.eq("id", school.id);

if (error) {
console.error(error);

setMessage(
"Impossible de modifier les informations."
);

setSaving(false);
return;
}

setMessage(
"Informations de l'établissement mises à jour."
);

await onRefresh();

setSaving(false);
}

return (
<div className="ec-page">

<div className="ec-page-heading">

<div>
<span className="ec-eyebrow">
CONFIGURATION
</span>

<h2>
Paramètres
</h2>

<p>
Configurez les informations de votre établissement.
</p>
</div>

</div>

<div className="ec-panel">

<div className="ec-panel-header">

<div>
<h3>
Informations de l'école
</h3>

<p>
Ces informations sont utilisées dans École Connectée.
</p>
</div>

</div>

<div className="ec-form settings-form">

{message && (
<div className="ec-form-info">
<span>✓</span>
<p>
{message}
</p>
</div>
)}

<FormInput
label="Nom de l'établissement"
value={name}
onChange={setName}
disabled={saving}
/>

<FormInput
label="Adresse"
value={address}
onChange={setAddress}
disabled={saving}
/>

<FormInput
label="Ville"
value={city}
onChange={setCity}
disabled={saving}
/>

<FormInput
label="Téléphone"
value={phone}
onChange={setPhone}
disabled={saving}
/>

<FormInput
label="Email"
type="email"
value={email}
onChange={setEmail}
disabled={saving}
/>

<button
className="ec-btn ec-btn-primary"
onClick={saveSchool}
disabled={saving}
>
{saving
? "Enregistrement..."
: "💾 Enregistrer les modifications"}
</button>

</div>

</div>

</div>
);
}

/* =========================================================
COMPOSANTS UTILITAIRES
========================================================= */

function FormInput({
label,
type = "text",
placeholder = "",
value,
onChange,
disabled = false,
}) {
return (
<div className="ec-form-group">

<label>
{label}
</label>

<input
type={type}
placeholder={placeholder}
value={value}
onChange={(event) =>
onChange(
event.target.value
)
}
disabled={disabled}
/>

</div>
);
}

function TextInput(props) {
return <FormInput {...props} />;
}

function TextAreaInput({
label,
placeholder = "",
value,
onChange,
disabled = false,
}) {
return (
<div className="ec-form-group">
<label>{label}</label>
<textarea
placeholder={placeholder}
value={value}
onChange={(event) => onChange(event.target.value)}
disabled={disabled}
/>
</div>
);
}

function SelectInput({
label,
value,
onChange,
options,
placeholder = "Choisir",
disabled = false,
}) {
return (
<div className="ec-form-group">

<label>
{label}
</label>

<select
value={value}
onChange={(event) =>
onChange(
event.target.value
)
}
disabled={disabled}
>

<option value="">
{placeholder}
</option>

{options.map(
(option) => (
<option
key={option.value}
value={option.value}
>
{option.label}
</option>
)
)}

</select>

</div>
);
}

function MultiSelectBox({
label,
items,
selected,
onToggle,
getId,
getLabel,
emptyText,
}) {
return (
<div className="ec-form-group">

<label>
{label}
</label>

<div className="ec-multi-select">

{items.length === 0 ? (
<span className="ec-muted">
{emptyText}
</span>
) : (
items.map((item) => {
const id =
getId(item);

const checked =
selected.includes(id);

return (
<label
className={
checked
? "ec-check-item selected"
: "ec-check-item"
}
key={String(id)}
>

<input
type="checkbox"
checked={checked}
onChange={() =>
onToggle(id)
}
/>

<span>
{getLabel(item)}
</span>

</label>
);
})
)}

</div>

</div>
);
}

function ModalActions({
onClose,
saving,
submitText,
}) {
return (
<div className="ec-modal-actions">

<button
type="button"
className="ec-btn ec-btn-secondary"
onClick={onClose}
disabled={saving}
>
Annuler
</button>

<button
type="submit"
className="ec-btn ec-btn-primary"
disabled={saving}
>
{saving
? "Création..."
: submitText}
</button>

</div>
);
}

function Modal({
title,
eyebrow,
description,
onClose,
children,
}) {
return (
<div
className="ec-modal-overlay"
onMouseDown={(event) => {
if (
event.target ===
event.currentTarget
) {
onClose();
}
}}
>

<div className="ec-modal">

<div className="ec-modal-header">

<div>
<span className="ec-eyebrow">
{eyebrow}
</span>

<h2>
{title}
</h2>

<p>
{description}
</p>
</div>

<button
className="ec-modal-close"
onClick={onClose}
>
×
</button>

</div>

{children}

</div>

</div>
);
}

function EmptyState({
icon,
title,
description,
button,
onButton,
}) {
return (
<div className="ec-empty-large">

<div className="ec-empty-icon">
{icon}
</div>

<h3>
{title}
</h3>

<p>
{description}
</p>

{button && (
<button
className="ec-btn ec-btn-primary"
onClick={onButton}
>
+ {button}
</button>
)}

</div>
);
}

function SummaryCard({
label,
value,
}) {
return (
<div className="attendance-summary-card">
<span>{label}</span>
<strong>{value}</strong>
</div>
);
}

function AttendanceButton({
active,
disabled,
onClick,
label,
type,
}) {
return (
<button
className={
active
? `attendance-btn active ${type}`
: `attendance-btn ${type}`
}
disabled={disabled}
onClick={onClick}
>
{label}
</button>
);
}

/* =========================================================
COMING SOON
========================================================= */

function ComingSoonPage({
icon,
title,
description,
}) {
return (
<div className="ec-page">

<div className="ec-panel">

<div className="ec-coming-soon">

<div className="ec-coming-icon">
{icon}
</div>

<span className="ec-eyebrow">
MODULE
</span>

<h2>
{title}
</h2>

<p>
{description}
</p>

<div className="ec-coming-badge">
🚀 Module en cours d'activation
</div>

</div>

</div>

</div>
);
}

/* =========================================================
STYLES
========================================================= */

const styles = `
* {
box-sizing: border-box;
}

body {
margin: 0;
font-family:
Inter,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif;
background: #f5f7fb;
color: #172033;
}

button,
input,
select,
textarea {
font: inherit;
}

button {
cursor: pointer;
}

.ec-app {
min-height: 100vh;
display: flex;
background: #f5f7fb;
}

.ec-sidebar {
width: 270px;
min-height: 100vh;
background: #111827;
color: white;
position: fixed;
left: 0;
top: 0;
bottom: 0;
display: flex;
flex-direction: column;
z-index: 20;
}

.ec-brand {
display: flex;
align-items: center;
gap: 12px;
padding: 25px 22px;
border-bottom: 1px solid rgba(255,255,255,.08);
}

.ec-brand-logo {
width: 42px;
height: 42px;
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
background: #2563eb;
font-weight: 800;
font-size: 14px;
}

.ec-brand strong {
display: block;
font-size: 15px;
}

.ec-brand span {
display: block;
margin-top: 3px;
font-size: 11px;
color: #9ca3af;
}

.ec-school-mini {
display: flex;
align-items: center;
gap: 11px;
padding: 20px;
margin: 10px;
border-radius: 14px;
background: rgba(255,255,255,.06);
}

.ec-school-avatar {
width: 40px;
height: 40px;
border-radius: 11px;
background: #1d4ed8;
display: flex;
align-items: center;
justify-content: center;
font-weight: 800;
}

.ec-school-mini strong {
display: block;
font-size: 12px;
max-width: 155px;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

.ec-school-mini span {
display: block;
color: #9ca3af;
font-size: 11px;
margin-top: 3px;
}

.ec-menu {
flex: 1;
padding: 8px 12px;
overflow-y: auto;
}

.ec-menu-item {
width: 100%;
border: none;
background: transparent;
color: #9ca3af;
padding: 11px 13px;
margin-bottom: 4px;
border-radius: 10px;
display: flex;
align-items: center;
gap: 11px;
text-align: left;
transition: .2s;
font-size: 13px;
}

.ec-menu-item:hover {
background: rgba(255,255,255,.06);
color: white;
}

.ec-menu-item.active {
background: #2563eb;
color: white;
box-shadow: 0 7px 18px rgba(37,99,235,.25);
}

.ec-menu-icon {
width: 22px;
text-align: center;
font-size: 16px;
}

.ec-sidebar-bottom {
padding: 15px;
border-top: 1px solid rgba(255,255,255,.08);
}

.ec-logout {
width: 100%;
border: none;
background: rgba(255,255,255,.06);
color: #d1d5db;
padding: 11px;
border-radius: 10px;
}

.ec-main {
width: calc(100% - 270px);
margin-left: 270px;
min-height: 100vh;
}

.ec-topbar {
min-height: 82px;
background: white;
border-bottom: 1px solid #e5e7eb;
display: flex;
align-items: center;
justify-content: space-between;
padding: 18px 34px;
position: sticky;
top: 0;
z-index: 10;
}

.ec-topbar h1 {
margin: 0;
font-size: 22px;
}

.ec-topbar p {
margin: 4px 0 0;
color: #6b7280;
font-size: 12px;
}

.ec-user {
display: flex;
align-items: center;
gap: 10px;
}

.ec-user-avatar {
width: 40px;
height: 40px;
border-radius: 50%;
background: #dbeafe;
color: #1d4ed8;
display: flex;
align-items: center;
justify-content: center;
font-weight: 800;
}

.ec-user strong {
display: block;
font-size: 12px;
}

.ec-user span {
display: block;
color: #6b7280;
font-size: 11px;
}

.ec-content {
padding: 30px;
}

.ec-page {
max-width: 1500px;
margin: auto;
}

.ec-welcome,
.ec-page-heading {
display: flex;
justify-content: space-between;
align-items: flex-start;
gap: 20px;
margin-bottom: 25px;
}

.ec-welcome h2,
.ec-page-heading h2 {
margin: 6px 0 5px;
font-size: 25px;
}

.ec-welcome p,
.ec-page-heading p {
margin: 0;
color: #6b7280;
font-size: 13px;
}

.ec-eyebrow {
color: #2563eb;
font-size: 10px;
font-weight: 800;
letter-spacing: 1.2px;
}

.ec-date-card {
padding: 13px 17px;
border: 1px solid #e5e7eb;
border-radius: 12px;
background: white;
}

.ec-date-card span,
.ec-date-card strong {
display: block;
}

.ec-date-card span {
color: #6b7280;
font-size: 10px;
}

.ec-date-card strong {
margin-top: 3px;
font-size: 13px;
}

.ec-stats-grid {
display: grid;
grid-template-columns: repeat(6, 1fr);
gap: 15px;
margin-bottom: 22px;
}

.ec-stat-card {
background: white;
border: 1px solid #e5e7eb;
border-radius: 15px;
padding: 17px;
display: flex;
align-items: center;
gap: 12px;
}

.ec-stat-icon {
width: 43px;
height: 43px;
border-radius: 12px;
background: #eff6ff;
display: flex;
align-items: center;
justify-content: center;
font-size: 19px;
}

.ec-stat-card span {
display: block;
color: #6b7280;
font-size: 11px;
}

.ec-stat-card strong {
display: block;
font-size: 23px;
margin-top: 2px;
}

.ec-dashboard-grid {
display: grid;
grid-template-columns: 1.1fr .9fr;
gap: 20px;
}

.ec-panel {
background: white;
border: 1px solid #e5e7eb;
border-radius: 16px;
overflow: hidden;
}

.ec-panel-header {
padding: 20px 22px;
display: flex;
justify-content: space-between;
align-items: flex-start;
border-bottom: 1px solid #eef0f4;
}

.ec-panel-header h3 {
margin: 0;
font-size: 15px;
}

.ec-panel-header p {
margin: 4px 0 0;
color: #6b7280;
font-size: 11px;
}

.ec-status {
color: #059669;
font-size: 11px;
font-weight: 700;
}

.ec-school-info {
display: flex;
gap: 17px;
padding: 25px;
align-items: center;
}

.ec-school-large {
min-width: 65px;
height: 65px;
border-radius: 17px;
background: #eff6ff;
color: #2563eb;
display: flex;
align-items: center;
justify-content: center;
font-size: 25px;
font-weight: 800;
}

.ec-school-info h3 {
margin: 0 0 8px;
}

.ec-school-info p {
margin: 4px 0;
color: #6b7280;
font-size: 12px;
}

.ec-team-list {
padding: 10px 20px 20px;
}

.ec-team-row {
display: flex;
align-items: center;
gap: 11px;
padding: 11px 0;
border-bottom: 1px solid #f0f1f4;
}

.ec-team-row:last-child {
border-bottom: none;
}

.ec-team-row > div:nth-child(2) {
flex: 1;
}

.ec-team-row strong {
display: block;
font-size: 12px;
}

.ec-team-row span:not(.ec-badge) {
display: block;
color: #6b7280;
font-size: 10px;
margin-top: 2px;
}

.ec-avatar {
width: 37px;
height: 37px;
min-width: 37px;
border-radius: 11px;
display: flex;
align-items: center;
justify-content: center;
font-weight: 800;
font-size: 13px;
}

.ec-avatar.teacher {
background: #eff6ff;
color: #2563eb;
}

.ec-avatar.secretary {
background: #f5f3ff;
color: #7c3aed;
}

.ec-avatar.student {
background: #ecfdf5;
color: #059669;
}

.ec-avatar.parent {
background: #fff7ed;
color: #ea580c;
}

.ec-avatar.subject {
background: #f8fafc;
}

.ec-toolbar {
display: flex;
justify-content: space-between;
gap: 15px;
margin-bottom: 17px;
}

.ec-search {
display: flex;
align-items: center;
gap: 9px;
background: white;
border: 1px solid #dfe3e8;
border-radius: 11px;
padding: 0 13px;
max-width: 500px;
width: 100%;
}

.ec-search input {
width: 100%;
border: none;
outline: none;
padding: 11px 0;
font-size: 12px;
}

.ec-count {
color: #6b7280;
font-size: 12px;
display: flex;
align-items: center;
}

.ec-table-wrapper {
width: 100%;
overflow-x: auto;
}

.ec-table {
width: 100%;
border-collapse: collapse;
min-width: 700px;
}

.ec-table th {
background: #f8fafc;
text-align: left;
padding: 13px 18px;
color: #64748b;
font-size: 10px;
text-transform: uppercase;
letter-spacing: .5px;
}

.ec-table td {
padding: 15px 18px;
border-top: 1px solid #eef0f4;
font-size: 12px;
color: #374151;
}

.ec-person {
display: flex;
align-items: center;
gap: 11px;
}

.ec-person strong {
display: block;
font-size: 12px;
}

.ec-person span {
display: block;
color: #6b7280;
font-size: 10px;
margin-top: 2px;
}

.ec-badge {
display: inline-flex;
padding: 5px 8px;
border-radius: 20px;
font-size: 10px;
font-weight: 700;
}

.ec-badge.success {
background: #ecfdf5;
color: #047857;
}

.ec-badge.danger {
background: #fef2f2;
color: #b91c1c;
}

.ec-actions {
display: flex;
gap: 6px;
}

.ec-action-btn {
border: 1px solid #e5e7eb;
background: white;
width: 33px;
height: 33px;
border-radius: 8px;
}

.ec-action-btn:hover {
background: #f8fafc;
}

.ec-action-btn.danger:hover {
background: #fef2f2;
}

.ec-btn {
border: none;
border-radius: 10px;
padding: 11px 16px;
font-weight: 700;
font-size: 12px;
}

.ec-btn:disabled {
opacity: .6;
cursor: not-allowed;
}

.ec-btn-primary {
color: white;
background: #2563eb;
box-shadow: 0 6px 14px rgba(37,99,235,.2);
}

.ec-btn-primary:hover:not(:disabled) {
background: #1d4ed8;
}

.ec-btn-secondary {
background: #f1f5f9;
color: #334155;
}

.ec-empty {
padding: 25px;
text-align: center;
color: #6b7280;
font-size: 12px;
}

.ec-empty-large {
padding: 60px 25px;
text-align: center;
color: #6b7280;
}

.ec-empty-icon,
.ec-coming-icon {
width: 65px;
height: 65px;
border-radius: 18px;
background: #eff6ff;
margin: 0 auto 15px;
display: flex;
align-items: center;
justify-content: center;
font-size: 28px;
}

.ec-empty-large h3 {
margin: 0 0 7px;
font-size: 16px;
color: #172033;
}

.ec-empty-large p {
margin: 0 0 18px;
font-size: 12px;
}

.ec-modal-overlay {
position: fixed;
inset: 0;
background: rgba(15,23,42,.55);
display: flex;
align-items: center;
justify-content: center;
padding: 20px;
z-index: 100;
}

.ec-modal {
width: 100%;
max-width: 580px;
max-height: 92vh;
overflow-y: auto;
background: white;
border-radius: 18px;
box-shadow: 0 25px 70px rgba(0,0,0,.2);
}

.ec-modal-header {
display: flex;
justify-content: space-between;
padding: 25px;
border-bottom: 1px solid #eef0f4;
}

.ec-modal-header h2 {
margin: 5px 0;
font-size: 20px;
}

.ec-modal-header p {
margin: 0;
color: #6b7280;
font-size: 11px;
}

.ec-modal-close {
width: 35px;
height: 35px;
border: none;
background: #f1f5f9;
border-radius: 9px;
font-size: 22px;
color: #64748b;
}

.ec-form {
padding: 22px 25px 25px;
}

.ec-form-group {
margin-bottom: 17px;
}

.ec-form-group label {
display: block;
margin-bottom: 7px;
color: #374151;
font-size: 11px;
font-weight: 700;
}

.ec-form-group input,
.ec-form-group select,
.ec-form-group textarea {
width: 100%;
border: 1px solid #dfe3e8;
border-radius: 10px;
padding: 11px 12px;
outline: none;
background: white;
font-size: 12px;
}

.ec-form-group textarea {
min-height: 100px;
resize: vertical;
}

.ec-form-group input:focus,
.ec-form-group select:focus,
.ec-form-group textarea:focus {
border-color: #2563eb;
box-shadow: 0 0 0 3px rgba(37,99,235,.08);
}

.ec-form-error {
background: #fef2f2;
border: 1px solid #fecaca;
color: #b91c1c;
border-radius: 10px;
padding: 11px;
margin-bottom: 16px;
font-size: 11px;
}

.ec-form-info {
display: flex;
gap: 10px;
padding: 13px;
background: #eff6ff;
border-radius: 11px;
margin-bottom: 20px;
}

.ec-form-info p {
margin: 0;
color: #475569;
font-size: 10px;
line-height: 1.5;
}

.ec-modal-actions {
display: flex;
justify-content: flex-end;
gap: 9px;
}

.ec-multi-select {
border: 1px solid #dfe3e8;
border-radius: 10px;
padding: 8px;
max-height: 170px;
overflow-y: auto;
}

.ec-check-item {
display: flex;
align-items: center;
gap: 8px;
padding: 9px;
border-radius: 8px;
cursor: pointer;
font-size: 11px;
}

.ec-check-item:hover,
.ec-check-item.selected {
background: #eff6ff;
}

.ec-check-item input {
width: auto;
}

.ec-muted {
color: #94a3b8;
font-size: 11px;
}

.ec-divider {
height: 1px;
background: #e5e7eb;
margin: 20px 0;
}

.assignment-form,
.settings-form {
max-width: 700px;
}

.ec-cell-description {
display: block;
color: #6b7280;
margin-top: 3px;
font-size: 10px;
}

.ec-attendance-controls {
display: grid;
grid-template-columns: 1fr 1fr 1.5fr;
gap: 15px;
background: white;
border: 1px solid #e5e7eb;
border-radius: 15px;
padding: 18px;
margin-bottom: 17px;
}

.ec-attendance-controls .ec-form-group {
margin-bottom: 0;
}

.ec-attendance-summary {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 12px;
margin-bottom: 17px;
}

.attendance-summary-card {
background: white;
border: 1px solid #e5e7eb;
border-radius: 13px;
padding: 15px;
}

.attendance-summary-card span {
display: block;
color: #6b7280;
font-size: 10px;
}

.attendance-summary-card strong {
display: block;
font-size: 22px;
margin-top: 3px;
}

.attendance-buttons {
display: flex;
gap: 6px;
flex-wrap: wrap;
}

.attendance-btn {
border: 1px solid #e5e7eb;
background: white;
border-radius: 8px;
padding: 7px 9px;
font-size: 10px;
font-weight: 700;
}

.attendance-btn.present.active {
background: #ecfdf5;
color: #047857;
border-color: #a7f3d0;
}

.attendance-btn.late.active {
background: #fffbeb;
color: #b45309;
border-color: #fde68a;
}

.attendance-btn.absent.active {
background: #fef2f2;
color: #b91c1c;
border-color: #fecaca;
}

.ec-coming-soon {
text-align: center;
padding: 90px 30px;
}

.ec-coming-soon h2 {
margin: 7px 0;
font-size: 23px;
color: #172033;
}

.ec-coming-soon p {
color: #6b7280;
font-size: 12px;
max-width: 500px;
margin: 0 auto 18px;
}

.ec-coming-badge {
display: inline-block;
padding: 8px 12px;
background: #eff6ff;
color: #2563eb;
border-radius: 20px;
font-size: 10px;
font-weight: 700;
}

.ec-loading,
.ec-error-screen {
min-height: 100vh;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
padding: 30px;
text-align: center;
}

.ec-loading h2,
.ec-error-card h2 {
margin: 18px 0 5px;
}

.ec-loading p,
.ec-error-card p {
color: #6b7280;
font-size: 13px;
}

.ec-spinner {
width: 38px;
height: 38px;
border: 4px solid #dbeafe;
border-top-color: #2563eb;
border-radius: 50%;
animation: ecspin .8s linear infinite;
}

.ec-spinner.small {
width: 27px;
height: 27px;
margin: 0 auto 15px;
}

@keyframes ecspin {
to {
transform: rotate(360deg);
}
}

.ec-error-card {
max-width: 480px;
background: white;
border: 1px solid #e5e7eb;
border-radius: 18px;
padding: 40px;
}

.ec-error-icon {
font-size: 40px;
}

@media (max-width: 1200px) {
.ec-stats-grid {
grid-template-columns: repeat(3, 1fr);
}

.ec-dashboard-grid {
grid-template-columns: 1fr;
}
}

@media (max-width: 900px) {
.ec-sidebar {
width: 80px;
}

.ec-brand {
justify-content: center;
padding: 18px 10px;
}

.ec-brand > div:last-child,
.ec-school-mini > div:last-child,
.ec-menu-item span:last-child {
display: none;
}

.ec-school-mini {
justify-content: center;
padding: 12px;
}

.ec-menu {
padding: 8px;
}

.ec-menu-item {
justify-content: center;
padding: 13px 8px;
}

.ec-main {
width: calc(100% - 80px);
margin-left: 80px;
}

.ec-content {
padding: 22px;
}

.ec-topbar {
padding: 15px 22px;
}

.ec-attendance-controls {
grid-template-columns: 1fr;
}
}

@media (max-width: 650px) {
.ec-app {
display: block;
}

.ec-sidebar {
width: 100%;
height: auto;
min-height: auto;
position: fixed;
top: auto;
bottom: 0;
left: 0;
right: 0;
flex-direction: row;
}

.ec-brand,
.ec-school-mini,
.ec-sidebar-bottom {
display: none;
}

.ec-menu {
width: 100%;
display: flex;
overflow-x: auto;
padding: 6px;
}

.ec-menu-item {
min-width: 70px;
flex-direction: column;
gap: 3px;
margin: 0 2px;
padding: 7px 4px;
font-size: 8px;
}

.ec-menu-item span:last-child {
display: block;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
max-width: 65px;
}

.ec-main {
width: 100%;
margin-left: 0;
padding-bottom: 75px;
}

.ec-topbar {
padding: 14px 16px;
}

.ec-topbar h1 {
font-size: 18px;
}

.ec-user > div:last-child {
display: none;
}

.ec-content {
padding: 16px;
}

.ec-welcome,
.ec-page-heading {
flex-direction: column;
}

.ec-welcome h2,
.ec-page-heading h2 {
font-size: 21px;
}

.ec-date-card {
width: 100%;
}

.ec-stats-grid {
grid-template-columns: repeat(2, 1fr);
}

.ec-toolbar {
flex-direction: column;
}

.ec-search {
max-width: none;
}

.ec-modal {
max-height: 95vh;
}

.ec-modal-header,
.ec-form {
padding-left: 18px;
padding-right: 18px;
}

.ec-modal-actions {
flex-direction: column-reverse;
}

.ec-modal-actions .ec-btn {
width: 100%;
}

.ec-attendance-summary {
grid-template-columns: repeat(2, 1fr);
}

.attendance-buttons {
flex-direction: column;
}

.attendance-btn {
width: 100%;
}
}


/* ---------------------------------------------------------
   SUIVI SECRÉTAIRE + FORMULAIRES
--------------------------------------------------------- */

.ec-form-group input,
.ec-form-group select,
.ec-form-group textarea,
.ec-search input,
.secretary-filter-select {
  color: #111827;
}

.ec-form-group input::placeholder,
.ec-form-group textarea::placeholder,
.ec-search input::placeholder {
  color: #6b7280;
  opacity: 1;
}

.secretary-tracking-stats {
  grid-template-columns: repeat(4, 1fr);
}

.secretary-tracking-toolbar {
  align-items: center;
}

.secretary-filter-select {
  min-height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 0 12px;
  outline: none;
}

.secretary-filter-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,.10);
}

.ec-badge.neutral {
  background: #f3f4f6;
  color: #374151;
}

.ec-badge.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.secretary-last-activity {
  font-size: 13px !important;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .secretary-tracking-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .secretary-tracking-stats {
    grid-template-columns: 1fr;
  }

  .secretary-tracking-toolbar {
    align-items: stretch;
  }

  .secretary-filter-select {
    width: 100%;
  }
}


.ec-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.ec-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ec-alert{padding:12px 14px;border-radius:12px;margin:14px 0}.ec-alert-success{background:#ecfdf5;color:#065f46}.ec-alert-error{background:#fef2f2;color:#991b1b}.bulletin-header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;margin-bottom:20px}.bulletin-header h2{margin:0 0 6px}.bulletin-footer{display:flex;justify-content:space-between;margin-top:50px}.ec-form input,.ec-form select,.ec-form textarea,.ec-search input,.ec-search select{color:#111827!important}.ec-form input::placeholder,.ec-form textarea::placeholder{color:#6b7280!important}@media(max-width:900px){.ec-grid-2{grid-template-columns:1fr}.bulletin-header{flex-direction:column}.ec-form-row{grid-template-columns:1fr}}

.ec-message-list{display:flex;flex-direction:column;gap:12px}.ec-message-card{border:1px solid #e5e7eb;border-radius:14px;padding:15px;background:#fff}.ec-message-card.unread{border-color:#93c5fd;background:#eff6ff}.ec-message-top{display:flex;justify-content:space-between;gap:15px;align-items:center}.ec-message-top span{font-size:12px;color:#6b7280}.ec-message-card p{margin:10px 0;color:#374151;white-space:pre-wrap}.student-photo-preview{display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb}.student-photo-preview img{width:70px;height:70px;border-radius:12px;object-fit:cover}.student-photo-preview span{display:block;color:#6b7280;font-size:12px;margin-top:3px}.ec-avatar.student-photo{object-fit:cover;border-radius:50%;width:42px;height:42px}.document-preview{background:#fff;color:#111827;border:1px solid #d1d5db;border-radius:4px;padding:34px;min-height:620px}.document-preview-header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111827;padding-bottom:20px}.document-logo{width:48px;height:48px;border-radius:12px;background:#111827;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}.document-preview-header h2{margin:10px 0 2px}.document-preview-header p{margin:0;color:#6b7280}.document-ref{text-align:right}.document-ref span{display:block;margin-top:6px;color:#6b7280;font-size:12px}.document-preview-body{text-align:center;padding:60px 20px 30px;line-height:1.8}.document-preview-body h1{text-transform:uppercase;font-size:25px;margin-bottom:30px}.document-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left;margin:30px 0}.document-info-grid div{padding:12px;border:1px solid #e5e7eb;border-radius:10px}.document-info-grid span{display:block;color:#6b7280;font-size:12px}.document-info-grid strong{display:block;margin-top:3px}.document-description{text-align:left;background:#f9fafb;padding:15px;border-radius:10px}.document-place{margin-top:45px}.document-signatures{display:flex;justify-content:space-between;margin-top:60px;padding-top:15px}.document-signatures div{width:40%;border-top:1px solid #111827;text-align:center;padding-top:8px}@media(max-width:700px){.document-preview{padding:20px}.document-preview-header{flex-direction:column}.document-ref{text-align:left}.document-info-grid{grid-template-columns:1fr}.document-signatures{gap:20px}.document-signatures div{width:50%}}@media print{body *{visibility:hidden}.bulletin-print,.bulletin-print *,.document-preview,.document-preview *{visibility:visible}.bulletin-print,.document-preview{position:absolute;left:0;top:0;width:100%;border:0;box-shadow:none}.ec-modal-overlay{position:static;background:#fff}.document-preview{min-height:0}}
`;
