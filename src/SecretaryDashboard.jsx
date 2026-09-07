import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/*
  ============================================================
  ÉCOLE CONNECTÉE V4
  TABLEAU DE BORD SECRÉTAIRE
  ============================================================

  Le secrétaire travaille uniquement sur son école :
  - Élèves
  - Parents
  - Classes
  - Enseignants
  - Présences
  - Inscriptions
  - Communication avec Admin École
  - Notifications
  - Profil

  IMPORTANT :
  Aucun accès aux autres écoles n'est demandé ici.
*/

const MENU = [
  { id: "overview", label: "Tableau de bord", icon: "🏠" },
  { id: "students", label: "Élèves", icon: "🎓" },
  { id: "parents", label: "Parents", icon: "👨‍👩‍👧" },
  { id: "classes", label: "Classes", icon: "🏫" },
  { id: "attendance", label: "Présences", icon: "📋" },
  { id: "enrollments", label: "Inscriptions", icon: "📝" },
  { id: "communication", label: "Communication", icon: "📢" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "profile", label: "Mon profil", icon: "👤" },
];

const STATUS_LABELS = {
  present: "Présent",
  absent: "Absent",
  late: "En retard",
  excused: "Justifié",
};

const STATUS_ICONS = {
  present: "✅",
  absent: "❌",
  late: "⏰",
  excused: "📄",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function studentName(student) {
  if (!student) return "Élève";

  return `${student.first_name || ""} ${student.last_name || ""}`
    .trim()
    .replace(/\s+/g, " ") || "Élève";
}

function classNameFor(student, classes) {
  if (!student?.class_id) return "Non affecté";

  return (
    classes.find((item) => item.id === student.class_id)?.name ||
    "Classe inconnue"
  );
}

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */

function Button({
  children,
  onClick,
  type = "button",
  secondary = false,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        ...(secondary ? styles.buttonSecondary : {}),
        ...(danger ? styles.buttonDanger : {}),
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose, width = 650 }) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: width }}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>

          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.statCard,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div style={styles.statIcon}>{icon}</div>

      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </button>
  );
}

function EmptyState({ icon = "📭", title, text }) {
  return (
    <div style={styles.emptyState}>
      <div style={{ fontSize: 42 }}>{icon}</div>

      <h3 style={{ margin: "10px 0 6px" }}>{title}</h3>

      <p style={{ margin: 0, color: "#64748b" }}>{text}</p>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

export default function SecretaryDashboard({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");

  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [secretary, setSecretary] = useState(null);

  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [parentStudents, setParentStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [messages, setMessages] = useState([]);
  const [schoolAdmins, setSchoolAdmins] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showStudentDetail, setShowStudentDetail] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editingParent, setEditingParent] = useState(null);

  const [studentForm, setStudentForm] = useState({
    first_name: "",
    last_name: "",
    student_code: "",
    class_id: "",
    active: true,
  });

  const [parentForm, setParentForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    active: true,
  });

  const [linkForm, setLinkForm] = useState({
    parent_id: "",
    student_id: "",
    relationship: "Parent",
    is_primary: true,
  });

  const [messageForm, setMessageForm] = useState({
    recipient_id: "",
    subject: "",
    message: "",
  });

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    username: "",
  });

  /* ============================================================
     CHARGEMENT
     ============================================================ */

  useEffect(() => {
    loadDashboard();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      setSuccess("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [success]);

  async function loadDashboard() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError("");

    try {
      /* --------------------------------------------------------
         PROFIL DU SECRÉTAIRE
      -------------------------------------------------------- */

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, username, role, school_id, active"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error("Profil Secrétaire introuvable.");
      }

      if (profileData.role !== "secretary") {
        throw new Error(
          "Ce compte n'est pas configuré comme Secrétaire."
        );
      }

      if (!profileData.active) {
        throw new Error("Ce compte Secrétaire est désactivé.");
      }

      if (!profileData.school_id) {
        throw new Error(
          "Aucune école n'est associée à ce compte Secrétaire."
        );
      }

      setProfile(profileData);

      setProfileForm({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        username: profileData.username || "",
      });

      const schoolId = profileData.school_id;

      /* --------------------------------------------------------
         CHARGEMENT DES DONNÉES DE L'ÉCOLE
      -------------------------------------------------------- */

      const [
        schoolResult,
        secretaryResult,
        classesResult,
        studentsResult,
        parentsResult,
        parentStudentsResult,
        teachersResult,
        messagesResult,
        activitiesResult,
        schoolAdminsResult,
      ] = await Promise.all([
        supabase
          .from("schools")
          .select(
            "id, name, address, city, phone, email, logo_url, active"
          )
          .eq("id", schoolId)
          .maybeSingle(),

        supabase
          .from("secretaries")
          .select(
            "id, school_id, display_name, email, active, created_at, updated_at"
          )
          .eq("school_id", schoolId)
          .eq("active", true)
          .eq("email", session.user.email || "")
          .maybeSingle(),

        supabase
          .from("classes")
          .select("id, school_id, name, level, created_at")
          .eq("school_id", schoolId)
          .order("name", { ascending: true }),

        supabase
          .from("students")
          .select(
            "id, profile_id, school_id, class_id, first_name, last_name, student_code, photo_url, active, created_at"
          )
          .eq("school_id", schoolId)
          .order("last_name", { ascending: true }),

        supabase
          .from("parents")
          .select(
            "id, profile_id, school_id, full_name, phone, email, address, active, created_at"
          )
          .eq("school_id", schoolId)
          .order("full_name", { ascending: true }),

        supabase
          .from("parent_students")
          .select(
            "id, parent_id, student_id, relationship, is_primary, created_at"
          )
          .order("created_at", { ascending: true }),

        supabase
          .from("teachers")
          .select("id, school_id, display_name, active, created_at")
          .eq("school_id", schoolId)
          .eq("active", true)
          .order("display_name", { ascending: true }),

        supabase
          .from("admin_secretary_messages")
          .select(
            "id, school_id, sender_id, recipient_id, subject, message, read_at, created_at"
          )
          .eq("school_id", schoolId)
          .or(
            `sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("secretary_activity_logs")
          .select(
            "id, school_id, secretary_id, module, action_type, description, target_type, target_id, metadata, created_at"
          )
          .eq("school_id", schoolId)
          .eq("secretary_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("school_admins")
          .select("id, profile_id, school_id, created_at")
          .eq("school_id", schoolId),
      ]);

      const results = [
        schoolResult,
        secretaryResult,
        classesResult,
        studentsResult,
        parentsResult,
        parentStudentsResult,
        teachersResult,
        messagesResult,
        activitiesResult,
        schoolAdminsResult,
      ];

      for (const result of results) {
        if (result.error) {
          console.error("Erreur Supabase:", result.error);
        }
      }

      setSchool(schoolResult.data || null);
      setSecretary(secretaryResult.data || null);
      setClasses(classesResult.data || []);
      setStudents(studentsResult.data || []);
      setParents(parentsResult.data || []);
      setTeachers(teachersResult.data || []);
      setMessages(messagesResult.data || []);
      setActivities(activitiesResult.data || []);

      /* --------------------------------------------------------
         RELATIONS PARENT / ÉLÈVE

         IMPORTANT :
         On ne conserve que les relations concernant les élèves
         et parents de CETTE école.
      -------------------------------------------------------- */

      const schoolStudents = studentsResult.data || [];
      const schoolParents = parentsResult.data || [];

      const validStudentIds = new Set(
        schoolStudents.map((student) => student.id)
      );

      const validParentIds = new Set(
        schoolParents.map((parent) => parent.id)
      );

      const safeParentStudents = (
        parentStudentsResult.data || []
      ).filter(
        (relation) =>
          validStudentIds.has(relation.student_id) &&
          validParentIds.has(relation.parent_id)
      );

      setParentStudents(safeParentStudents);

      /* --------------------------------------------------------
         ADMIN ÉCOLE

         school_admins contient le profile_id de l'admin.
         On récupère ensuite son profil.
      -------------------------------------------------------- */

      const adminProfileIds = (schoolAdminsResult.data || [])
        .map((item) => item.profile_id)
        .filter(Boolean);

      let admins = [];

      if (adminProfileIds.length > 0) {
        const { data: adminProfiles, error: adminProfilesError } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, phone, username, role, school_id, active"
            )
            .in("id", adminProfileIds)
            .eq("school_id", schoolId)
            .eq("role", "school_admin")
            .eq("active", true);

        if (adminProfilesError) {
          console.error(
            "Erreur chargement Admin École:",
            adminProfilesError
          );
        } else {
          admins = adminProfiles || [];
        }
      }

      /*
        Dans certains projets, l'Admin École peut exister dans
        profiles sans entrée school_admins.

        On tente donc aussi la recherche directe.
      */
      if (admins.length === 0) {
        const { data: directAdmins, error: directAdminsError } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name, phone, username, role, school_id, active"
            )
            .eq("school_id", schoolId)
            .eq("role", "school_admin")
            .eq("active", true);

        if (!directAdminsError) {
          admins = directAdmins || [];
        }
      }

      setSchoolAdmins(admins);

      /* --------------------------------------------------------
         PRÉSENCES DU JOUR
      -------------------------------------------------------- */

      await loadAttendanceForDate(
        todayISO(),
        "",
        schoolStudents
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Impossible de charger le tableau de bord Secrétaire."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     ACTIVITÉ SECRÉTAIRE
     ============================================================ */

  async function logActivity(
    module,
    actionType,
    description,
    targetType = null,
    targetId = null,
    metadata = {}
  ) {
    if (!profile?.school_id || !session?.user?.id) return;

    try {
      await supabase.from("secretary_activity_logs").insert({
        school_id: profile.school_id,
        secretary_id: session.user.id,
        module,
        action_type: actionType,
        description,
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
    } catch (err) {
      console.error("Erreur journal activité:", err);
    }
  }

  /* ============================================================
     ÉLÈVES
     ============================================================ */

  function openNewStudent() {
    setEditingStudent(null);

    setStudentForm({
      first_name: "",
      last_name: "",
      student_code: "",
      class_id: "",
      active: true,
    });

    setShowStudentModal(true);
  }

  function openEditStudent(student) {
    setEditingStudent(student);

    setStudentForm({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      student_code: student.student_code || "",
      class_id: student.class_id || "",
      active: student.active !== false,
    });

    setShowStudentModal(true);
  }

  async function saveStudent(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    setError("");

    try {
      const payload = {
        first_name: studentForm.first_name.trim(),
        last_name: studentForm.last_name.trim(),
        student_code: studentForm.student_code.trim() || null,
        class_id: studentForm.class_id || null,
        active: Boolean(studentForm.active),
        school_id: profile.school_id,
      };

      if (!payload.first_name || !payload.last_name) {
        throw new Error(
          "Le prénom et le nom de l'élève sont obligatoires."
        );
      }

      if (editingStudent) {
        const { data, error: updateError } = await supabase
          .from("students")
          .update(payload)
          .eq("id", editingStudent.id)
          .eq("school_id", profile.school_id)
          .select()
          .single();

        if (updateError) throw updateError;

        setStudents((current) =>
          current.map((student) =>
            student.id === editingStudent.id ? data : student
          )
        );

        await logActivity(
          "students",
          "update",
          `Modification de l'élève ${studentName(data)}`,
          "student",
          data.id
        );

        setSuccess("Élève modifié avec succès.");
      } else {
        const { data, error: insertError } = await supabase
          .from("students")
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        setStudents((current) =>
          [...current, data].sort((a, b) =>
            `${a.last_name} ${a.first_name}`.localeCompare(
              `${b.last_name} ${b.first_name}`,
              "fr"
            )
          )
        );

        await logActivity(
          "students",
          "create",
          `Inscription de l'élève ${studentName(data)}`,
          "student",
          data.id
        );

        setSuccess("Élève inscrit avec succès.");
      }

      setShowStudentModal(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Impossible d'enregistrer l'élève.");
    }
  }

  /* ============================================================
     PARENTS
     ============================================================ */

  function openNewParent() {
    setEditingParent(null);

    setParentForm({
      full_name: "",
      phone: "",
      email: "",
      address: "",
      active: true,
    });

    setShowParentModal(true);
  }

  function openEditParent(parent) {
    setEditingParent(parent);

    setParentForm({
      full_name: parent.full_name || "",
      phone: parent.phone || "",
      email: parent.email || "",
      address: parent.address || "",
      active: parent.active !== false,
    });

    setShowParentModal(true);
  }

  async function saveParent(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    try {
      const payload = {
        full_name: parentForm.full_name.trim(),
        phone: parentForm.phone.trim() || null,
        email: parentForm.email.trim() || null,
        address: parentForm.address.trim() || null,
        active: Boolean(parentForm.active),
        school_id: profile.school_id,
      };

      if (!payload.full_name) {
        throw new Error("Le nom du parent est obligatoire.");
      }

      if (editingParent) {
        const { data, error: updateError } = await supabase
          .from("parents")
          .update(payload)
          .eq("id", editingParent.id)
          .eq("school_id", profile.school_id)
          .select()
          .single();

        if (updateError) throw updateError;

        setParents((current) =>
          current.map((parent) =>
            parent.id === editingParent.id ? data : parent
          )
        );

        await logActivity(
          "parents",
          "update",
          `Modification du parent ${data.full_name}`,
          "parent",
          data.id
        );

        setSuccess("Parent modifié avec succès.");
      } else {
        const { data, error: insertError } = await supabase
          .from("parents")
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        setParents((current) =>
          [...current, data].sort((a, b) =>
            a.full_name.localeCompare(b.full_name, "fr")
          )
        );

        await logActivity(
          "parents",
          "create",
          `Ajout du parent ${data.full_name}`,
          "parent",
          data.id
        );

        setSuccess("Parent ajouté avec succès.");
      }

      setShowParentModal(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Impossible d'enregistrer le parent.");
    }
  }

  /* ============================================================
     ASSOCIATION PARENT / ÉLÈVE
     ============================================================ */

  function openLinkParent(parent = null, student = null) {
    setSelectedParent(parent);
    setSelectedStudent(student);

    setLinkForm({
      parent_id: parent?.id || "",
      student_id: student?.id || "",
      relationship: "Parent",
      is_primary: true,
    });

    setShowLinkParentModal(true);
  }

  async function saveParentStudent(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    try {
      if (!linkForm.parent_id || !linkForm.student_id) {
        throw new Error(
          "Sélectionnez un parent et un élève."
        );
      }

      const parentExists = parents.some(
        (parent) => parent.id === linkForm.parent_id
      );

      const studentExists = students.some(
        (student) => student.id === linkForm.student_id
      );

      if (!parentExists || !studentExists) {
        throw new Error(
          "Le parent ou l'élève n'appartient pas à cette école."
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("parent_students")
        .select("id")
        .eq("parent_id", linkForm.parent_id)
        .eq("student_id", linkForm.student_id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        throw new Error(
          "Ce parent est déjà associé à cet élève."
        );
      }

      const { data, error: insertError } = await supabase
        .from("parent_students")
        .insert({
          parent_id: linkForm.parent_id,
          student_id: linkForm.student_id,
          relationship:
            linkForm.relationship.trim() || "Parent",
          is_primary: Boolean(linkForm.is_primary),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setParentStudents((current) => [...current, data]);

      const parent = parents.find(
        (item) => item.id === linkForm.parent_id
      );

      const student = students.find(
        (item) => item.id === linkForm.student_id
      );

      await logActivity(
        "parents",
        "link",
        `Association de ${parent?.full_name || "parent"} avec ${studentName(
          student
        )}`,
        "parent_student",
        data.id
      );

      setSuccess("Parent et élève associés avec succès.");
      setShowLinkParentModal(false);
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Impossible d'associer le parent à l'élève."
      );
    }
  }

  /* ============================================================
     PRÉSENCES
     ============================================================ */

  async function loadAttendanceForDate(
    date,
    classId = "",
    studentList = students
  ) {
    if (!studentList?.length) {
      setAttendance([]);
      return;
    }

    const studentIds = studentList.map(
      (student) => student.id
    );

    let query = supabase
      .from("attendance")
      .select(
        "id, student_id, class_id, attendance_date, status, justification, justified, created_at"
      )
      .eq("attendance_date", date)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error: attendanceError } =
      await query;

    if (attendanceError) {
      console.error(attendanceError);
      setError(attendanceError.message);
      return;
    }

    setAttendance(data || []);
  }

  async function refreshAttendance() {
    await loadAttendanceForDate(
      attendanceDate,
      attendanceClass,
      students
    );
  }

  function attendanceForStudent(studentId) {
    return attendance.find(
      (item) =>
        item.student_id === studentId &&
        item.attendance_date === attendanceDate
    );
  }

  async function saveAttendance(student, status) {
    if (!student?.id || !profile?.school_id) return;

    try {
      const existing = attendanceForStudent(student.id);

      if (existing) {
        const { data, error: updateError } = await supabase
          .from("attendance")
          .update({
            status,
            justified: status === "excused",
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setAttendance((current) =>
          current.map((item) =>
            item.id === existing.id ? data : item
          )
        );
      } else {
        if (!student.class_id) {
          throw new Error(
            "Cet élève n'est affecté à aucune classe."
          );
        }

        const { data, error: insertError } = await supabase
          .from("attendance")
          .insert({
            student_id: student.id,
            class_id: student.class_id,
            attendance_date: attendanceDate,
            status,
            justified: status === "excused",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setAttendance((current) => [
          data,
          ...current,
        ]);
      }

      await logActivity(
        "attendance",
        "update",
        `${studentName(student)} : ${
          STATUS_LABELS[status] || status
        }`,
        "student",
        student.id,
        {
          date: attendanceDate,
          status,
        }
      );

      setSuccess("Présence enregistrée.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Impossible d'enregistrer la présence."
      );
    }
  }

  /* ============================================================
     COMMUNICATION ADMIN ÉCOLE
     ============================================================ */

  async function sendMessage(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    try {
      if (!messageForm.recipient_id) {
        throw new Error(
          "Sélectionnez un Admin École."
        );
      }

      if (!messageForm.subject.trim()) {
        throw new Error("Le sujet est obligatoire.");
      }

      if (!messageForm.message.trim()) {
        throw new Error("Le message est obligatoire.");
      }

      const isAdmin = schoolAdmins.some(
        (admin) => admin.id === messageForm.recipient_id
      );

      if (!isAdmin) {
        throw new Error(
          "Le destinataire n'appartient pas à votre école."
        );
      }

      const { data, error: insertError } = await supabase
        .from("admin_secretary_messages")
        .insert({
          school_id: profile.school_id,
          sender_id: session.user.id,
          recipient_id: messageForm.recipient_id,
          subject: messageForm.subject.trim(),
          message: messageForm.message.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setMessages((current) => [
        data,
        ...current,
      ]);

      await logActivity(
        "communication",
        "message_sent",
        `Message envoyé à l'Admin École`,
        "profile",
        messageForm.recipient_id
      );

      setMessageForm({
        recipient_id: "",
        subject: "",
        message: "",
      });

      setShowMessageModal(false);

      setSuccess("Message envoyé à l'Admin École.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Impossible d'envoyer le message."
      );
    }
  }

  async function markMessageRead(message) {
    if (!message?.id) return;

    if (message.read_at) return;

    const { data, error: updateError } = await supabase
      .from("admin_secretary_messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("id", message.id)
      .eq("recipient_id", session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? data : item
      )
    );
  }

  /* ============================================================
     PROFIL
     ============================================================ */

  async function saveProfile(event) {
    event.preventDefault();

    try {
      const payload = {
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || null,
        username: profileForm.username.trim() || null,
      };

      if (!payload.full_name) {
        throw new Error("Le nom est obligatoire.");
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile((current) => ({
        ...current,
        ...data,
      }));

      await logActivity(
        "profile",
        "update",
        "Modification du profil Secrétaire",
        "profile",
        session.user.id
      );

      setSuccess("Profil mis à jour.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Impossible de modifier le profil."
      );
    }
  }

  /* ============================================================
     DÉCONNEXION
     ============================================================ */

  async function handleLogout() {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* ============================================================
     FILTRES
     ============================================================ */

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();

    if (!search) return students;

    return students.filter((student) => {
      const fullName = studentName(student).toLowerCase();
      const code = (student.student_code || "").toLowerCase();

      return (
        fullName.includes(search) ||
        code.includes(search)
      );
    });
  }, [students, studentSearch]);

  const filteredParents = useMemo(() => {
    const search = parentSearch.trim().toLowerCase();

    if (!search) return parents;

    return parents.filter((parent) => {
      return (
        (parent.full_name || "")
          .toLowerCase()
          .includes(search) ||
        (parent.phone || "")
          .toLowerCase()
          .includes(search) ||
        (parent.email || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [parents, parentSearch]);

  const filteredClasses = useMemo(() => {
    const search = classSearch.trim().toLowerCase();

    if (!search) return classes;

    return classes.filter((item) => {
      return (
        (item.name || "")
          .toLowerCase()
          .includes(search) ||
        (item.level || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [classes, classSearch]);

  const filteredTeachers = useMemo(() => {
    const search = teacherSearch.trim().toLowerCase();

    if (!search) return teachers;

    return teachers.filter((teacher) =>
      (teacher.display_name || "")
        .toLowerCase()
        .includes(search)
    );
  }, [teachers, teacherSearch]);

  const attendanceStudents = useMemo(() => {
    const search = attendanceSearch.trim().toLowerCase();

    return students.filter((student) => {
      const matchesClass =
        !attendanceClass ||
        student.class_id === attendanceClass;

      const matchesSearch =
        !search ||
        studentName(student)
          .toLowerCase()
          .includes(search) ||
        (student.student_code || "")
          .toLowerCase()
          .includes(search);

      return matchesClass && matchesSearch;
    });
  }, [
    students,
    attendanceClass,
    attendanceSearch,
  ]);

  const activeStudents = students.filter(
    (student) => student.active
  ).length;

  const inactiveStudents = students.filter(
    (student) => !student.active
  ).length;

  const activeParents = parents.filter(
    (parent) => parent.active
  ).length;

  const unreadMessages = messages.filter(
    (message) =>
      message.recipient_id === session?.user?.id &&
      !message.read_at
  ).length;

  const attendanceToday = attendance.filter(
    (item) =>
      item.attendance_date === attendanceDate
  );

  /* ============================================================
     RENDU : EN-TÊTE
     ============================================================ */

  function renderHeader() {
    return (
      <header style={styles.header}>
        <div>
          <div style={styles.headerEyebrow}>
            ESPACE SECRÉTAIRE
          </div>

          <h1 style={styles.headerTitle}>
            {MENU.find(
              (item) => item.id === activeSection
            )?.label || "Tableau de bord"}
          </h1>

          <div style={styles.headerSubtitle}>
            {school?.name || "École"}
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.schoolBadge}>
            🏫{" "}
            <span>
              {school?.name || "École non chargée"}
            </span>
          </div>

          <div style={styles.userBadge}>
            👤 {profile?.full_name || "Secrétaire"}
          </div>
        </div>
      </header>
    );
  }

  /* ============================================================
     TABLEAU DE BORD
     ============================================================ */

  function renderOverview() {
    return (
      <>
        <div style={styles.welcomeCard}>
          <div>
            <div style={styles.welcomeSmall}>
              BIENVENUE
            </div>

            <h2 style={styles.welcomeTitle}>
              Bonjour{" "}
              {profile?.full_name || "Secrétaire"} 👋
            </h2>

            <p style={styles.welcomeText}>
              Gérez les élèves, parents, classes,
              présences et communications de votre école
              depuis cet espace.
            </p>
          </div>

          <div style={styles.schoolLarge}>
            🏫
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard
            icon="🎓"
            label="Élèves actifs"
            value={activeStudents}
            onClick={() =>
              setActiveSection("students")
            }
          />

          <StatCard
            icon="👨‍👩‍👧"
            label="Parents"
            value={activeParents}
            onClick={() =>
              setActiveSection("parents")
            }
          />

          <StatCard
            icon="🏫"
            label="Classes"
            value={classes.length}
            onClick={() =>
              setActiveSection("classes")
            }
          />

          <StatCard
            icon="👨‍🏫"
            label="Enseignants"
            value={teachers.length}
          />

          <StatCard
            icon="📋"
            label="Présences"
            value={attendanceToday.length}
            onClick={() =>
              setActiveSection("attendance")
            }
          />

          <StatCard
            icon="📨"
            label="Messages non lus"
            value={unreadMessages}
            onClick={() =>
              setActiveSection("communication")
            }
          />
        </div>

        <div style={styles.twoColumns}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>
                  Informations de l'école
                </h3>

                <p style={styles.cardSubtitle}>
                  Votre école de rattachement
                </p>
              </div>
            </div>

            <div style={styles.infoList}>
              <div style={styles.infoRow}>
                <strong>École</strong>
                <span>
                  {school?.name || "—"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <strong>Adresse</strong>
                <span>
                  {school?.address || "—"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <strong>Ville</strong>
                <span>
                  {school?.city || "—"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <strong>Téléphone</strong>
                <span>
                  {school?.phone || "—"}
                </span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>
                  Activité récente
                </h3>

                <p style={styles.cardSubtitle}>
                  Vos dernières opérations
                </p>
              </div>
            </div>

            {activities.length === 0 ? (
              <EmptyState
                icon="📝"
                title="Aucune activité"
                text="Vos opérations apparaîtront ici."
              />
            ) : (
              <div>
                {activities.slice(0, 6).map((activity) => (
                  <div
                    key={activity.id}
                    style={styles.activityItem}
                  >
                    <div style={styles.activityIcon}>
                      ✓
                    </div>

                    <div>
                      <strong>
                        {activity.description ||
                          activity.action_type}
                      </strong>

                      <div style={styles.muted}>
                        {formatDateTime(
                          activity.created_at
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  /* ============================================================
     ÉLÈVES
     ============================================================ */

  function renderStudents() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                🎓 Élèves
              </h2>

              <p style={styles.sectionSubtitle}>
                Gestion des élèves de votre école.
              </p>
            </div>

            <Button onClick={openNewStudent}>
              + Nouvel élève
            </Button>
          </div>

          <div style={styles.toolbar}>
            <input
              value={studentSearch}
              onChange={(event) =>
                setStudentSearch(event.target.value)
              }
              placeholder="Rechercher un élève..."
              style={styles.searchInput}
            />
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState
              icon="🎓"
              title="Aucun élève"
              text="Aucun élève ne correspond à votre recherche."
            />
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Élève</th>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Classe</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td style={styles.td}>
                        <strong>
                          {studentName(student)}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {student.student_code || "—"}
                      </td>

                      <td style={styles.td}>
                        {classNameFor(
                          student,
                          classes
                        )}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.status,
                            ...(student.active
                              ? styles.statusGreen
                              : styles.statusGray),
                          }}
                        >
                          {student.active
                            ? "Actif"
                            : "Inactif"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            type="button"
                            style={styles.smallButton}
                            onClick={() => {
                              setSelectedStudent(
                                student
                              );
                              setShowStudentDetail(true);
                            }}
                          >
                            Voir
                          </button>

                          <button
                            type="button"
                            style={styles.smallButton}
                            onClick={() =>
                              openEditStudent(student)
                            }
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            style={styles.smallButton}
                            onClick={() =>
                              openLinkParent(
                                null,
                                student
                              )
                            }
                          >
                            Parent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  /* ============================================================
     PARENTS
     ============================================================ */

  function renderParents() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍👩‍👧 Parents
              </h2>

              <p style={styles.sectionSubtitle}>
                Gestion des parents et responsables.
              </p>
            </div>

            <Button onClick={openNewParent}>
              + Nouveau parent
            </Button>
          </div>

          <div style={styles.toolbar}>
            <input
              value={parentSearch}
              onChange={(event) =>
                setParentSearch(event.target.value)
              }
              placeholder="Rechercher un parent..."
              style={styles.searchInput}
            />
          </div>

          {filteredParents.length === 0 ? (
            <EmptyState
              icon="👨‍👩‍👧"
              title="Aucun parent"
              text="Aucun parent ne correspond à votre recherche."
            />
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nom</th>
                    <th style={styles.th}>Téléphone</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Enfants</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredParents.map((parent) => {
                    const children = parentStudents.filter(
                      (relation) =>
                        relation.parent_id ===
                        parent.id
                    );

                    return (
                      <tr key={parent.id}>
                        <td style={styles.td}>
                          <strong>
                            {parent.full_name}
                          </strong>
                        </td>

                        <td style={styles.td}>
                          {parent.phone || "—"}
                        </td>

                        <td style={styles.td}>
                          {parent.email || "—"}
                        </td>

                        <td style={styles.td}>
                          {children.length}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() => {
                                setSelectedParent(
                                  parent
                                );
                              }}
                            >
                              Enfants
                            </button>

                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() =>
                                openEditParent(parent)
                              }
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              style={styles.smallButton}
                              onClick={() =>
                                openLinkParent(
                                  parent,
                                  null
                                )
                              }
                            >
                              Associer
                            </button>
                          </div>

                          {selectedParent?.id ===
                            parent.id && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: 10,
                                borderRadius: 10,
                                background:
                                  "#f8fafc",
                              }}
                            >
                              {children.length ===
                              0 ? (
                                <span style={styles.muted}>
                                  Aucun enfant associé.
                                </span>
                              ) : (
                                children.map(
                                  (relation) => {
                                    const child =
                                      students.find(
                                        (student) =>
                                          student.id ===
                                          relation.student_id
                                      );

                                    return (
                                      <div
                                        key={
                                          relation.id
                                        }
                                        style={{
                                          marginBottom: 5,
                                        }}
                                      >
                                        🎓{" "}
                                        {studentName(
                                          child
                                        )}{" "}
                                        —{" "}
                                        {
                                          relation.relationship
                                        }
                                      </div>
                                    );
                                  }
                                )
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  /* ============================================================
     CLASSES
     ============================================================ */

  function renderClasses() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                🏫 Classes
              </h2>

              <p style={styles.sectionSubtitle}>
                Consultez les élèves de chaque classe.
              </p>
            </div>
          </div>

          <div style={styles.toolbar}>
            <input
              value={classSearch}
              onChange={(event) =>
                setClassSearch(event.target.value)
              }
              placeholder="Rechercher une classe..."
              style={styles.searchInput}
            />
          </div>

          {filteredClasses.length === 0 ? (
            <EmptyState
              icon="🏫"
              title="Aucune classe"
              text="Aucune classe n'est disponible pour cette école."
            />
          ) : (
            <div style={styles.classGrid}>
              {filteredClasses.map((item) => {
                const classStudents =
                  students.filter(
                    (student) =>
                      student.class_id === item.id
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    style={styles.classCard}
                    onClick={() =>
                      setSelectedClass(
                        selectedClass?.id === item.id
                          ? null
                          : item
                      )
                    }
                  >
                    <div style={styles.classIcon}>
                      🏫
                    </div>

                    <strong>{item.name}</strong>

                    <span style={styles.muted}>
                      {item.level || "Niveau non précisé"}
                    </span>

                    <span style={styles.classCount}>
                      {classStudents.length} élève
                      {classStudents.length > 1
                        ? "s"
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedClass && (
            <div style={styles.classDetail}>
              <h3 style={{ marginTop: 0 }}>
                Élèves de {selectedClass.name}
              </h3>

              {students.filter(
                (student) =>
                  student.class_id ===
                  selectedClass.id
              ).length === 0 ? (
                <EmptyState
                  icon="🎓"
                  title="Classe vide"
                  text="Aucun élève n'est affecté à cette classe."
                />
              ) : (
                <div style={styles.simpleList}>
                  {students
                    .filter(
                      (student) =>
                        student.class_id ===
                        selectedClass.id
                    )
                    .map((student) => (
                      <div
                        key={student.id}
                        style={styles.listItem}
                      >
                        <span>
                          🎓{" "}
                          <strong>
                            {studentName(student)}
                          </strong>
                        </span>

                        <span style={styles.muted}>
                          {student.student_code ||
                            "Sans code"}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                👨‍🏫 Enseignants
              </h2>

              <p style={styles.sectionSubtitle}>
                Enseignants actifs de votre école.
              </p>
            </div>
          </div>

          <div style={styles.toolbar}>
            <input
              value={teacherSearch}
              onChange={(event) =>
                setTeacherSearch(event.target.value)
              }
              placeholder="Rechercher un enseignant..."
              style={styles.searchInput}
            />
          </div>

          {filteredTeachers.length === 0 ? (
            <EmptyState
              icon="👨‍🏫"
              title="Aucun enseignant"
              text="Aucun enseignant actif trouvé."
            />
          ) : (
            <div style={styles.simpleList}>
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  style={styles.listItem}
                >
                  <span>
                    👨‍🏫{" "}
                    <strong>
                      {teacher.display_name}
                    </strong>
                  </span>

                  <span style={styles.statusGreenText}>
                    Actif
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  /* ============================================================
     PRÉSENCES
     ============================================================ */

  function renderAttendance() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                📋 Présences
              </h2>

              <p style={styles.sectionSubtitle}>
                Enregistrez les présences des élèves.
              </p>
            </div>

            <Button
              secondary
              onClick={refreshAttendance}
            >
              Actualiser
            </Button>
          </div>

          <div style={styles.filtersGrid}>
            <Field label="Date">
              <input
                type="date"
                value={attendanceDate}
                onChange={async (event) => {
                  const value =
                    event.target.value;

                  setAttendanceDate(value);

                  await loadAttendanceForDate(
                    value,
                    attendanceClass,
                    students
                  );
                }}
                style={styles.input}
              />
            </Field>

            <Field label="Classe">
              <select
                value={attendanceClass}
                onChange={async (event) => {
                  const value =
                    event.target.value;

                  setAttendanceClass(value);

                  await loadAttendanceForDate(
                    attendanceDate,
                    value,
                    students
                  );
                }}
                style={styles.input}
              >
                <option value="">
                  Toutes les classes
                </option>

                {classes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Recherche">
              <input
                value={attendanceSearch}
                onChange={(event) =>
                  setAttendanceSearch(
                    event.target.value
                  )
                }
                placeholder="Nom de l'élève..."
                style={styles.input}
              />
            </Field>
          </div>

          {attendanceStudents.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucun élève"
              text="Aucun élève ne correspond aux filtres."
            />
          ) : (
            <div style={styles.attendanceGrid}>
              {attendanceStudents.map((student) => {
                const record =
                  attendanceForStudent(
                    student.id
                  );

                return (
                  <div
                    key={student.id}
                    style={styles.attendanceCard}
                  >
                    <div>
                      <strong>
                        {studentName(student)}
                      </strong>

                      <div style={styles.muted}>
                        {classNameFor(
                          student,
                          classes
                        )}
                      </div>
                    </div>

                    <div style={styles.attendanceButtons}>
                      {[
                        "present",
                        "absent",
                        "late",
                        "excused",
                      ].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            saveAttendance(
                              student,
                              status
                            )
                          }
                          style={{
                            ...styles.attendanceButton,
                            ...(record?.status ===
                            status
                              ? styles.attendanceSelected
                              : {}),
                          }}
                        >
                          {STATUS_ICONS[status]}
                          <span>
                            {STATUS_LABELS[status]}
                          </span>
                        </button>
                      ))}
                    </div>

                    {record && (
                      <div style={styles.attendanceCurrent}>
                        Statut actuel :{" "}
                        <strong>
                          {STATUS_ICONS[
                            record.status
                          ] || "•"}{" "}
                          {STATUS_LABELS[
                            record.status
                          ] || record.status}
                        </strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
    );
  }

  /* ============================================================
     INSCRIPTIONS
     ============================================================ */

  function renderEnrollments() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                📝 Inscriptions
              </h2>

              <p style={styles.sectionSubtitle}>
                Gestion des inscriptions et dossiers
                élèves.
              </p>
            </div>

            <Button onClick={openNewStudent}>
              + Nouvelle inscription
            </Button>
          </div>

          <div style={styles.statsGridSmall}>
            <div style={styles.miniCard}>
              <strong>{activeStudents}</strong>
              <span>Élèves actifs</span>
            </div>

            <div style={styles.miniCard}>
              <strong>{inactiveStudents}</strong>
              <span>Élèves inactifs</span>
            </div>

            <div style={styles.miniCard}>
              <strong>{students.length}</strong>
              <span>Dossiers élèves</span>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Élève</th>
                  <th style={styles.th}>
                    Date d'inscription
                  </th>
                  <th style={styles.th}>Classe</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.slice(0, 20).map(
                  (student) => (
                    <tr key={student.id}>
                      <td style={styles.td}>
                        {studentName(student)}
                      </td>

                      <td style={styles.td}>
                        {formatDate(
                          student.created_at?.slice(
                            0,
                            10
                          )
                        )}
                      </td>

                      <td style={styles.td}>
                        {classNameFor(
                          student,
                          classes
                        )}
                      </td>

                      <td style={styles.td}>
                        {student.active
                          ? "Actif"
                          : "Inactif"}
                      </td>

                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.smallButton}
                          onClick={() =>
                            openEditStudent(student)
                          }
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  /* ============================================================
     COMMUNICATION
     ============================================================ */

  function renderCommunication() {
    return (
      <>
        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.sectionTitle}>
                📢 Communication
              </h2>

              <p style={styles.sectionSubtitle}>
                Échangez directement avec l'Admin École.
              </p>
            </div>

            <Button
              onClick={() =>
                setShowMessageModal(true)
              }
            >
              + Nouveau message
            </Button>
          </div>

          {schoolAdmins.length === 0 ? (
            <EmptyState
              icon="👤"
              title="Aucun Admin École trouvé"
              text="Aucun administrateur actif n'a été trouvé dans votre école."
            />
          ) : (
            <div style={styles.adminGrid}>
              {schoolAdmins.map((admin) => (
                <div
                  key={admin.id}
                  style={styles.adminCard}
                >
                  <div style={styles.adminIcon}>
                    👤
                  </div>

                  <div>
                    <strong>
                      {admin.full_name ||
                        "Admin École"}
                    </strong>

                    <div style={styles.muted}>
                      Administrateur de l'école
                    </div>

                    {admin.phone && (
                      <div style={styles.muted}>
                        📞 {admin.phone}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    style={styles.smallButton}
                    onClick={() => {
                      setMessageForm({
                        recipient_id: admin.id,
                        subject: "",
                        message: "",
                      });

                      setShowMessageModal(true);
                    }}
                  >
                    Écrire
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.sectionTop}>
            <div>
              <h2 style={styles.cardTitle}>
                💬 Messages
              </h2>

              <p style={styles.cardSubtitle}>
                Historique de vos échanges.
              </p>
            </div>
          </div>

          {messages.length === 0 ? (
            <EmptyState
              icon="📨"
              title="Aucun message"
              text="Votre communication avec l'Admin École apparaîtra ici."
            />
          ) : (
            <div>
              {messages.map((message) => {
                const received =
                  message.recipient_id ===
                  session.user.id;

                return (
                  <button
                    key={message.id}
                    type="button"
                    style={{
                      ...styles.messageItem,
                      background:
                        received &&
                        !message.read_at
                          ? "#eff6ff"
                          : "#ffffff",
                    }}
                    onClick={() =>
                      markMessageRead(message)
                    }
                  >
                    <div style={styles.messageIcon}>
                      {received ? "📥" : "📤"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong>
                        {message.subject}
                      </strong>

                      <p style={styles.messagePreview}>
                        {message.message}
                      </p>

                      <div style={styles.muted}>
                        {received
                          ? "Reçu"
                          : "Envoyé"}{" "}
                        •{" "}
                        {formatDateTime(
                          message.created_at
                        )}
                      </div>
                    </div>

                    {received &&
                      !message.read_at && (
                        <span
                          style={styles.unreadBadge}
                        >
                          Nouveau
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </>
    );
  }

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */

  function renderNotifications() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTop}>
          <div>
            <h2 style={styles.sectionTitle}>
              🔔 Notifications
            </h2>

            <p style={styles.sectionSubtitle}>
              Informations importantes pour votre
              activité.
            </p>
          </div>
        </div>

        {messages.filter(
          (message) =>
            message.recipient_id ===
              session.user.id &&
            !message.read_at
        ).length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Aucune nouvelle notification"
            text="Vous êtes à jour."
          />
        ) : (
          <div>
            {messages
              .filter(
                (message) =>
                  message.recipient_id ===
                    session.user.id &&
                  !message.read_at
              )
              .map((message) => (
                <div
                  key={message.id}
                  style={styles.notificationItem}
                >
                  <div style={styles.notificationIcon}>
                    🔔
                  </div>

                  <div>
                    <strong>
                      {message.subject}
                    </strong>

                    <p
                      style={{
                        margin:
                          "5px 0 0",
                        color:
                          "#475569",
                      }}
                    >
                      {message.message}
                    </p>

                    <div style={styles.muted}>
                      {formatDateTime(
                        message.created_at
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    );
  }

  /* ============================================================
     PROFIL
     ============================================================ */

  function renderProfile() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTop}>
          <div>
            <h2 style={styles.sectionTitle}>
              👤 Mon profil
            </h2>

            <p style={styles.sectionSubtitle}>
              Gérez vos informations personnelles.
            </p>
          </div>
        </div>

        <form
          onSubmit={saveProfile}
          style={styles.formGrid}
        >
          <Field label="Nom complet">
            <input
              value={profileForm.full_name}
              onChange={(event) =>
                setProfileForm({
                  ...profileForm,
                  full_name:
                    event.target.value,
                })
              }
              style={styles.input}
            />
          </Field>

          <Field label="Téléphone">
            <input
              value={profileForm.phone}
              onChange={(event) =>
                setProfileForm({
                  ...profileForm,
                  phone:
                    event.target.value,
                })
              }
              style={styles.input}
            />
          </Field>

          <Field label="Nom d'utilisateur">
            <input
              value={profileForm.username}
              onChange={(event) =>
                setProfileForm({
                  ...profileForm,
                  username:
                    event.target.value,
                })
              }
              style={styles.input}
            />
          </Field>

          <Field label="Rôle">
            <input
              value="Secrétaire"
              disabled
              style={styles.input}
            />
          </Field>

          <Field label="École">
            <input
              value={school?.name || ""}
              disabled
              style={styles.input}
            />
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "end",
            }}
          >
            <Button type="submit">
              Enregistrer
            </Button>
          </div>
        </form>
      </section>
    );
  }

  /* ============================================================
     CONTENU
     ============================================================ */

  function renderContent() {
    switch (activeSection) {
      case "students":
        return renderStudents();

      case "parents":
        return renderParents();

      case "classes":
        return renderClasses();

      case "attendance":
        return renderAttendance();

      case "enrollments":
        return renderEnrollments();

      case "communication":
        return renderCommunication();

      case "notifications":
        return renderNotifications();

      case "profile":
        return renderProfile();

      case "overview":
      default:
        return renderOverview();
    }
  }

  /* ============================================================
     CHARGEMENT
     ============================================================ */

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingIcon}>🏫</div>

        <h2>
          Chargement du tableau de bord...
        </h2>

        <p>
          Préparation de vos données Secrétaire.
        </p>
      </div>
    );
  }

  /* ============================================================
     PAGE PRINCIPALE
     ============================================================ */

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🏫</div>

          <div>
            <strong>École Connectée</strong>

            <span>Secrétaire</span>
          </div>
        </div>

        <div style={styles.schoolMini}>
          <div style={styles.schoolMiniIcon}>
            🏫
          </div>

          <div>
            <strong>
              {school?.name ||
                "École"}
            </strong>

            <span>
              {school?.city ||
                "—"}
            </span>
          </div>
        </div>

        <nav style={styles.menu}>
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveSection(item.id)
              }
              style={{
                ...styles.menuItem,
                ...(activeSection === item.id
                  ? styles.menuItemActive
                  : {}),
              }}
            >
              <span style={styles.menuIcon}>
                {item.icon}
              </span>

              <span>{item.label}</span>

              {item.id ===
                "notifications" &&
                unreadMessages > 0 && (
                  <span
                    style={styles.menuBadge}
                  >
                    {unreadMessages}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        {renderHeader()}

        <div style={styles.content}>
          {error && (
            <div style={styles.error}>
              <strong>⚠️ Erreur :</strong>{" "}
              {error}

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                style={styles.alertClose}
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div style={styles.success}>
              <strong>✅</strong>{" "}
              {success}
            </div>
          )}

          {renderContent()}
        </div>
      </main>

      {/* ========================================================
          MODAL ÉLÈVE
      ======================================================== */}

      {showStudentModal && (
        <Modal
          title={
            editingStudent
              ? "Modifier l'élève"
              : "Nouvelle inscription"
          }
          onClose={() =>
            setShowStudentModal(false)
          }
        >
          <form
            onSubmit={saveStudent}
            style={styles.formGrid}
          >
            <Field label="Prénom *">
              <input
                required
                value={studentForm.first_name}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    first_name:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Nom *">
              <input
                required
                value={studentForm.last_name}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    last_name:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Code élève">
              <input
                value={
                  studentForm.student_code
                }
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    student_code:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Classe">
              <select
                value={
                  studentForm.class_id
                }
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    class_id:
                      event.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="">
                  Non affecté
                </option>

                {classes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Statut">
              <select
                value={
                  studentForm.active
                    ? "active"
                    : "inactive"
                }
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    active:
                      event.target.value ===
                      "active",
                  })
                }
                style={styles.input}
              >
                <option value="active">
                  Actif
                </option>

                <option value="inactive">
                  Inactif
                </option>
              </select>
            </Field>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() =>
                  setShowStudentModal(
                    false
                  )
                }
              >
                Annuler
              </Button>

              <Button type="submit">
                {editingStudent
                  ? "Enregistrer"
                  : "Inscrire l'élève"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL PARENT
      ======================================================== */}

      {showParentModal && (
        <Modal
          title={
            editingParent
              ? "Modifier le parent"
              : "Nouveau parent"
          }
          onClose={() =>
            setShowParentModal(false)
          }
        >
          <form
            onSubmit={saveParent}
            style={styles.formGrid}
          >
            <Field label="Nom complet *">
              <input
                required
                value={
                  parentForm.full_name
                }
                onChange={(event) =>
                  setParentForm({
                    ...parentForm,
                    full_name:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Téléphone">
              <input
                value={
                  parentForm.phone
                }
                onChange={(event) =>
                  setParentForm({
                    ...parentForm,
                    phone:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={
                  parentForm.email
                }
                onChange={(event) =>
                  setParentForm({
                    ...parentForm,
                    email:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Adresse">
              <textarea
                value={
                  parentForm.address
                }
                onChange={(event) =>
                  setParentForm({
                    ...parentForm,
                    address:
                      event.target.value,
                  })
                }
                style={{
                  ...styles.input,
                  minHeight: 90,
                }}
              />
            </Field>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() =>
                  setShowParentModal(
                    false
                  )
                }
              >
                Annuler
              </Button>

              <Button type="submit">
                Enregistrer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL ASSOCIATION PARENT
      ======================================================== */}

      {showLinkParentModal && (
        <Modal
          title="Associer parent et élève"
          onClose={() =>
            setShowLinkParentModal(
              false
            )
          }
        >
          <form
            onSubmit={saveParentStudent}
            style={styles.formGrid}
          >
            <Field label="Parent *">
              <select
                required
                value={
                  linkForm.parent_id
                }
                onChange={(event) =>
                  setLinkForm({
                    ...linkForm,
                    parent_id:
                      event.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="">
                  Choisir un parent
                </option>

                {parents
                  .filter(
                    (parent) =>
                      parent.active
                  )
                  .map((parent) => (
                    <option
                      key={parent.id}
                      value={parent.id}
                    >
                      {parent.full_name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Élève *">
              <select
                required
                value={
                  linkForm.student_id
                }
                onChange={(event) =>
                  setLinkForm({
                    ...linkForm,
                    student_id:
                      event.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="">
                  Choisir un élève
                </option>

                {students
                  .filter(
                    (student) =>
                      student.active
                  )
                  .map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {studentName(
                        student
                      )}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Relation">
              <select
                value={
                  linkForm.relationship
                }
                onChange={(event) =>
                  setLinkForm({
                    ...linkForm,
                    relationship:
                      event.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="Parent">
                  Parent
                </option>

                <option value="Père">
                  Père
                </option>

                <option value="Mère">
                  Mère
                </option>

                <option value="Tuteur">
                  Tuteur
                </option>

                <option value="Tutrice">
                  Tutrice
                </option>
              </select>
            </Field>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() =>
                  setShowLinkParentModal(
                    false
                  )
                }
              >
                Annuler
              </Button>

              <Button type="submit">
                Associer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL MESSAGE
      ======================================================== */}

      {showMessageModal && (
        <Modal
          title="Nouveau message"
          onClose={() =>
            setShowMessageModal(
              false
            )
          }
        >
          <form
            onSubmit={sendMessage}
            style={styles.formGrid}
          >
            <Field label="Admin École *">
              <select
                required
                value={
                  messageForm.recipient_id
                }
                onChange={(event) =>
                  setMessageForm({
                    ...messageForm,
                    recipient_id:
                      event.target.value,
                  })
                }
                style={styles.input}
              >
                <option value="">
                  Choisir un administrateur
                </option>

                {schoolAdmins.map(
                  (admin) => (
                    <option
                      key={admin.id}
                      value={admin.id}
                    >
                      {admin.full_name ||
                        "Admin École"}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Sujet *">
              <input
                required
                value={
                  messageForm.subject
                }
                onChange={(event) =>
                  setMessageForm({
                    ...messageForm,
                    subject:
                      event.target.value,
                  })
                }
                style={styles.input}
              />
            </Field>

            <Field label="Message *">
              <textarea
                required
                value={
                  messageForm.message
                }
                onChange={(event) =>
                  setMessageForm({
                    ...messageForm,
                    message:
                      event.target.value,
                  })
                }
                style={{
                  ...styles.input,
                  minHeight: 150,
                }}
              />
            </Field>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() =>
                  setShowMessageModal(
                    false
                  )
                }
              >
                Annuler
              </Button>

              <Button type="submit">
                📤 Envoyer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL DÉTAIL ÉLÈVE
      ======================================================== */}

      {showStudentDetail &&
        selectedStudent && (
          <Modal
            title={`Dossier — ${studentName(
              selectedStudent
            )}`}
            onClose={() =>
              setShowStudentDetail(false)
            }
          >
            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span>Prénom</span>
                <strong>
                  {selectedStudent.first_name}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Nom</span>
                <strong>
                  {selectedStudent.last_name}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Code élève</span>
                <strong>
                  {selectedStudent.student_code ||
                    "—"}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Classe</span>
                <strong>
                  {classNameFor(
                    selectedStudent,
                    classes
                  )}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Statut</span>
                <strong>
                  {selectedStudent.active
                    ? "Actif"
                    : "Inactif"}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Inscription</span>
                <strong>
                  {formatDate(
                    selectedStudent.created_at?.slice(
                      0,
                      10
                    )
                  )}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 25 }}>
              <h3>Parents associés</h3>

              {parentStudents.filter(
                (relation) =>
                  relation.student_id ===
                  selectedStudent.id
              ).length === 0 ? (
                <p style={styles.muted}>
                  Aucun parent associé.
                </p>
              ) : (
                parentStudents
                  .filter(
                    (relation) =>
                      relation.student_id ===
                      selectedStudent.id
                  )
                  .map((relation) => {
                    const parent =
                      parents.find(
                        (item) =>
                          item.id ===
                          relation.parent_id
                      );

                    return (
                      <div
                        key={relation.id}
                        style={
                          styles.listItem
                        }
                      >
                        <strong>
                          {parent?.full_name ||
                            "Parent"}
                        </strong>

                        <span
                          style={
                            styles.muted
                          }
                        >
                          {
                            relation.relationship
                          }
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </Modal>
        )}
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f1f5f9",
    color: "#0f172a",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  sidebar: {
    width: 270,
    minHeight: "100vh",
    background: "#0f172a",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 22,
    borderBottom:
      "1px solid rgba(255,255,255,0.08)",
  },

  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    fontSize: 21,
  },

  brand span: {
    display: "block",
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },

  schoolMini: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 16,
    margin: 14,
    borderRadius: 12,
    background:
      "rgba(255,255,255,0.06)",
  },

  schoolMiniIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background:
      "rgba(37,99,235,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  schoolMini span: {
    display: "block",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 3,
  },

  menu: {
    flex: 1,
    padding: "4px 12px",
    overflowY: "auto",
  },

  menuItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    padding: "12px 13px",
    marginBottom: 5,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
    position: "relative",
  },

  menuItemActive: {
    background: "#2563eb",
    color: "#ffffff",
  },

  menuIcon: {
    width: 25,
    textAlign: "center",
    fontSize: 17,
  },

  menuBadge: {
    marginLeft: "auto",
    minWidth: 21,
    height: 21,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ef4444",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
  },

  sidebarBottom: {
    padding: 14,
    borderTop:
      "1px solid rgba(255,255,255,0.08)",
  },

  logoutButton: {
    width: "100%",
    border: "none",
    background:
      "rgba(239,68,68,0.12)",
    color: "#fecaca",
    padding: 12,
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  header: {
    minHeight: 90,
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "20px 30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },

  headerEyebrow: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
  },

  headerTitle: {
    margin: "4px 0 2px",
    fontSize: 25,
  },

  headerSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  schoolBadge: {
    padding: "9px 12px",
    background: "#eff6ff",
    borderRadius: 10,
    color: "#1d4ed8",
    fontWeight: 600,
    fontSize: 13,
  },

  userBadge: {
    padding: "9px 12px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: 10,
    color: "#334155",
    fontWeight: 600,
    fontSize: 13,
  },

  content: {
    padding: 28,
    maxWidth: 1500,
    margin: "0 auto",
  },

  welcomeCard: {
    background:
      "linear-gradient(135deg,#1d4ed8,#2563eb)",
    color: "#ffffff",
    borderRadius: 18,
    padding: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 24,
    boxShadow:
      "0 12px 30px rgba(37,99,235,0.20)",
  },

  welcomeSmall: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    opacity: 0.8,
  },

  welcomeTitle: {
    margin: "8px 0",
    fontSize: 28,
  },

  welcomeText: {
    margin: 0,
    maxWidth: 700,
    lineHeight: 1.6,
    color: "#dbeafe",
  },

  schoolLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background:
      "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 15,
    marginBottom: 24,
  },

  statCard: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: 15,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 13,
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.04)",
  },

  statIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 21,
  },

  statValue: {
    fontSize: 24,
    fontWeight: 800,
  },

  statLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(320px,1fr))",
    gap: 20,
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.035)",
  },

  cardHeader: {
    marginBottom: 15,
  },

  cardTitle: {
    margin: 0,
    fontSize: 18,
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  sectionTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: 21,
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  toolbar: {
    marginBottom: 18,
  },

  searchInput: {
    width: "100%",
    maxWidth: 500,
    padding: "11px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 10,
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  },

  button: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 15px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },

  buttonSecondary: {
    background: "#e2e8f0",
    color: "#334155",
  },

  buttonDanger: {
    background: "#dc2626",
  },

  smallButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "7px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 700,
  },

  th: {
    textAlign: "left",
    padding: 12,
    background: "#f8fafc",
    borderBottom:
      "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 12,
  },

  td: {
    padding: 12,
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: 13,
    verticalAlign: "top",
  },

  status: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },

  statusGreen: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusGray: {
    background: "#e2e8f0",
    color: "#475569",
  },

  statusGreenText: {
    color: "#16a34a",
    fontWeight: 700,
    fontSize: 12,
  },

  muted: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },

  infoList: {
    display: "grid",
    gap: 11,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    paddingBottom: 10,
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: 13,
  },

  activityItem: {
    display: "flex",
    gap: 10,
    padding: "10px 0",
    borderBottom:
      "1px solid #f1f5f9",
  },

  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  emptyState: {
    textAlign: "center",
    padding: 40,
    color: "#334155",
  },

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(190px,1fr))",
    gap: 14,
  },

  classCard: {
    border:
      "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: 14,
    padding: 18,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  classIcon: {
    fontSize: 28,
    marginBottom: 5,
  },

  classCount: {
    marginTop: 7,
    color: "#2563eb",
    fontWeight: 700,
    fontSize: 12,
  },

  classDetail: {
    marginTop: 22,
    padding: 18,
    borderRadius: 13,
    background: "#f8fafc",
  },

  simpleList: {
    display: "grid",
    gap: 8,
  },

  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    padding: 12,
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: 10,
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: 15,
    marginBottom: 22,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 9,
    outline: "none",
    fontSize: 13,
    background: "#ffffff",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
  },

  modalActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 3000,
    overflowY: "auto",
  },

  modal: {
    width: "100%",
    background: "#ffffff",
    borderRadius: 17,
    boxShadow:
      "0 25px 70px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    padding: "18px 20px",
    borderBottom:
      "1px solid #e2e8f0",
  },

  modalBody: {
    padding: 20,
    maxHeight: "80vh",
    overflowY: "auto",
  },

  closeButton: {
    border: "none",
    background: "#f1f5f9",
    width: 34,
    height: 34,
    borderRadius: 9,
    cursor: "pointer",
    fontSize: 23,
    color: "#334155",
  },

  attendanceGrid: {
    display: "grid",
    gap: 12,
  },

  attendanceCard: {
    border:
      "1px solid #e2e8f0",
    borderRadius: 13,
    padding: 15,
    background: "#ffffff",
  },

  attendanceButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },

  attendanceButton: {
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "7px 9px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
  },

  attendanceSelected: {
    background: "#dbeafe",
    borderColor: "#2563eb",
    color: "#1d4ed8",
    fontWeight: 700,
  },

  attendanceCurrent: {
    marginTop: 10,
    fontSize: 12,
    color: "#475569",
  },

  statsGridSmall: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(160px,1fr))",
    gap: 12,
    marginBottom: 20,
  },

  miniCard: {
    padding: 18,
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  adminGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: 13,
  },

  adminCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 15,
    border:
      "1px solid #e2e8f0",
    borderRadius: 12,
  },

  adminIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  messageItem: {
    width: "100%",
    border: "none",
    borderBottom:
      "1px solid #e2e8f0",
    padding: 15,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    textAlign: "left",
    cursor: "pointer",
  },

  messageIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  messagePreview: {
    margin: "5px 0",
    color: "#475569",
    fontSize: 13,
  },

  unreadBadge: {
    background: "#2563eb",
    color: "#ffffff",
    padding: "5px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
  },

  notificationItem: {
    display: "flex",
    gap: 12,
    padding: 15,
    borderRadius: 12,
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    marginBottom: 10,
  },

  notificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },

  detailItem: {
    padding: 14,
    borderRadius: 10,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    color: "#0f172a",
  },

  loadingIcon: {
    fontSize: 55,
    marginBottom: 10,
  },

  error: {
    position: "relative",
    background: "#fef2f2",
    color: "#991b1b",
    border:
      "1px solid #fecaca",
    borderRadius: 11,
    padding: "12px 42px 12px 14px",
    marginBottom: 18,
  },

  success: {
    background: "#f0fdf4",
    color: "#166534",
    border:
      "1px solid #bbf7d0",
    borderRadius: 11,
    padding: "12px 14px",
    marginBottom: 18,
  },

  alertClose: {
    position: "absolute",
    right: 10,
    top: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 20,
    color: "#991b1b",
  },
};