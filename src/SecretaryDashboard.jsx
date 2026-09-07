import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

/* =========================================================
   ÉCOLE CONNECTÉE V4
   TABLEAU DE BORD SECRÉTAIRE
   ========================================================= */

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

function safeName(student) {
  if (!student) return "Élève";
  return `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Élève";
}

function getClassName(student, classes) {
  if (!student?.class_id) return "Non affecté";
  return classes.find((c) => c.id === student.class_id)?.name || "Classe inconnue";
}

/* =========================================================
   COMPOSANTS UI
   ========================================================= */

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

function Modal({ title, children, onClose, width = 650 }) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: width }}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
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

function Button({ children, onClick, type = "button", secondary = false, danger = false, disabled = false }) {
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

/* =========================================================
   DASHBOARD PRINCIPAL
   ========================================================= */

export default function SecretaryDashboard({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");

  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [secretary, setSecretary] = useState(null);

  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [parentStudents, setParentStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activities, setActivities] = useState([]);
  const [schoolAdmins, setSchoolAdmins] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showParentChildrenModal, setShowParentChildrenModal] = useState(false);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);

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

  const [messageForm, setMessageForm] = useState({
    recipient_id: "",
    subject: "",
    message: "",
  });

  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceStudent, setAttendanceStudent] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    username: "",
  });

  /* =======================================================
     CHARGEMENT INITIAL
     ======================================================= */

  useEffect(() => {
    loadAll();
  }, [session?.user?.id]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function loadAll() {
    if (!session?.user?.id) return;

    setLoading(true);
    setError("");

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, username, role, school_id, active")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error("Profil utilisateur introuvable.");
      }

      if (profileData.role !== "secretary") {
        throw new Error("Ce compte n'a pas le rôle Secrétaire.");
      }

      if (!profileData.active) {
        throw new Error("Ce compte Secrétaire est désactivé.");
      }

      if (!profileData.school_id) {
        throw new Error("Aucune école n'est associée à ce compte.");
      }

      setProfile(profileData);

      setProfileForm({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
        username: profileData.username || "",
      });

      const schoolId = profileData.school_id;

      const results = await Promise.all([
        supabase
          .from("schools")
          .select("id, name, address, city, phone, email, logo_url, active")
          .eq("id", schoolId)
          .maybeSingle(),

        supabase
          .from("secretaries")
          .select("id, school_id, display_name, email, active, created_at, updated_at")
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
          .from("attendance")
          .select(
            "id, student_id, class_id, attendance_date, status, justification, justified, created_at"
          )
          .eq("class_id", "00000000-0000-0000-0000-000000000000")
          .limit(1),

        supabase
          .from("admin_secretary_messages")
          .select(
            "id, school_id, sender_id, recipient_id, subject, message, read_at, created_at"
          )
          .eq("school_id", schoolId)
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
          .from("profiles")
          .select("id, full_name, email, phone, role, school_id, active")
          .eq("school_id", schoolId)
          .eq("role", "school_admin")
          .eq("active", true),
      ]);

      const [
        schoolResult,
        secretaryResult,
        classesResult,
        studentsResult,
        parentsResult,
        parentStudentsResult,
        ,
        messagesResult,
        activitiesResult,
        adminsResult,
      ] = results;

      if (schoolResult.error) throw schoolResult.error;
      if (classesResult.error) throw classesResult.error;
      if (studentsResult.error) throw studentsResult.error;
      if (parentsResult.error) throw parentsResult.error;
      if (parentStudentsResult.error) throw parentStudentsResult.error;
      if (messagesResult.error) throw messagesResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      setSchool(schoolResult.data || null);
      setSecretary(secretaryResult.data || null);
      setClasses(classesResult.data || []);
      setStudents(studentsResult.data || []);
      setParents(parentsResult.data || []);
      setParentStudents(
        (parentStudentsResult.data || []).filter((item) =>
          (studentsResult.data || []).some((student) => student.id === item.student_id)
        )
      );
      setMessages(messagesResult.data || []);
      setActivities(activitiesResult.data || []);
      setSchoolAdmins(adminsResult.data || []);

      await loadAttendance(
        schoolId,
        todayISO(),
        "",
        ""
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     PRÉSENCES
     ======================================================= */

  async function loadAttendance(
    schoolId = profile?.school_id,
    date = attendanceDate,
    classId = attendanceClass,
    studentId = attendanceStudent
  ) {
    if (!schoolId) return;

    let query = supabase
      .from("attendance")
      .select(
        "id, student_id, class_id, attendance_date, status, justification, justified, created_at"
      )
      .eq("attendance_date", date)
      .in(
        "student_id",
        students.length
          ? students.map((student) => student.id)
          : ["00000000-0000-0000-0000-000000000000"]
      )
      .order("created_at", { ascending: false });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data, error: attendanceError } = await query;

    if (attendanceError) {
      setError(attendanceError.message);
      return;
    }

    setAttendance(data || []);
  }

  async function refreshAttendance() {
    await loadAttendance(
      profile?.school_id,
      attendanceDate,
      attendanceClass,
      attendanceStudent
    );
  }

  async function saveAttendance(student, status) {
    if (!profile?.school_id || !student?.id) return;

    try {
      const existing = attendance.find(
        (item) =>
          item.student_id === student.id &&
          item.attendance_date === attendanceDate
      );

      let result;

      if (existing) {
        result = await supabase
          .from("attendance")
          .update({
            status,
            justified: status === "excused",
          })
          .eq("id", existing.id)
          .eq("student_id", student.id)
          .eq("class_id", student.class_id);
      } else {
        if (!student.class_id) {
          setError("Cet élève n'est affecté à aucune classe.");
          return;
        }

        result = await supabase.from("attendance").insert({
          student_id: student.id,
          class_id: student.class_id,
          attendance_date: attendanceDate,
          status,
          justified: status === "excused",
        });
      }

      if (result.error) throw result.error;

      await logActivity(
        "Présences",
        existing ? "modification" : "création",
        `${status === "present" ? "Présence" : "Statut"} enregistré pour ${safeName(student)}`,
        "student",
        student.id
      );

      setSuccess("Présence enregistrée.");

      await loadAttendance(
        profile.school_id,
        attendanceDate,
        attendanceClass,
        attendanceStudent
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de l'enregistrement.");
    }
  }

  /* =======================================================
     JOURNAL D'ACTIVITÉ
     ======================================================= */

  async function logActivity(
    module,
    actionType,
    description,
    targetType = null,
    targetId = null
  ) {
    if (!profile?.school_id || !session?.user?.id) return;

    try {
      const { error: logError } = await supabase
        .from("secretary_activity_logs")
        .insert({
          school_id: profile.school_id,
          secretary_id: session.user.id,
          module,
          action_type: actionType,
          description,
          target_type: targetType,
          target_id: targetId,
          metadata: {},
        });

      if (logError) {
        console.warn("Journal activité:", logError.message);
      }
    } catch (err) {
      console.warn("Journal activité:", err);
    }
  }

  /* =======================================================
     ÉLÈVES
     ======================================================= */

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

  function openStudentDetail(student) {
    setSelectedStudent(student);
    setShowStudentDetailModal(true);
  }

  async function saveStudent(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    if (!studentForm.first_name.trim() || !studentForm.last_name.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }

    try {
      if (editingStudent) {
        const oldClassId = editingStudent.class_id;

        const { data, error: updateError } = await supabase
          .from("students")
          .update({
            first_name: studentForm.first_name.trim(),
            last_name: studentForm.last_name.trim(),
            student_code: studentForm.student_code.trim() || null,
            class_id: studentForm.class_id || null,
            active: studentForm.active,
          })
          .eq("id", editingStudent.id)
          .eq("school_id", profile.school_id)
          .select()
          .single();

        if (updateError) throw updateError;

        setStudents((prev) =>
          prev.map((item) => (item.id === editingStudent.id ? data : item))
        );

        await logActivity(
          "Élèves",
          oldClassId !== studentForm.class_id
            ? "changement_classe"
            : "modification",
          oldClassId !== studentForm.class_id
            ? `Changement de classe pour ${safeName(data)}`
            : `Modification de la fiche de ${safeName(data)}`,
          "student",
          data.id
        );

        setSuccess("Fiche élève mise à jour.");
      } else {
        const { data, error: insertError } = await supabase
          .from("students")
          .insert({
            school_id: profile.school_id,
            first_name: studentForm.first_name.trim(),
            last_name: studentForm.last_name.trim(),
            student_code: studentForm.student_code.trim() || null,
            class_id: studentForm.class_id || null,
            active: studentForm.active,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setStudents((prev) =>
          [...prev, data].sort((a, b) =>
            `${a.last_name} ${a.first_name}`.localeCompare(
              `${b.last_name} ${b.first_name}`
            )
          )
        );

        await logActivity(
          "Élèves",
          "inscription",
          `Nouvelle inscription de ${safeName(data)}`,
          "student",
          data.id
        );

        setSuccess("Élève ajouté avec succès.");
      }

      setShowStudentModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible d'enregistrer l'élève.");
    }
  }

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();

    if (!search) return students;

    return students.filter((student) => {
      const text = [
        student.first_name,
        student.last_name,
        student.student_code,
        getClassName(student, classes),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [students, studentSearch, classes]);

  /* =======================================================
     PARENTS
     ======================================================= */

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

  function openParentChildren(parent) {
    setSelectedParent(parent);
    setShowParentChildrenModal(true);
  }

  async function saveParent(event) {
    event.preventDefault();

    if (!profile?.school_id) return;

    if (!parentForm.full_name.trim()) {
      setError("Le nom du parent est obligatoire.");
      return;
    }

    try {
      if (editingParent) {
        const { data, error: updateError } = await supabase
          .from("parents")
          .update({
            full_name: parentForm.full_name.trim(),
            phone: parentForm.phone.trim() || null,
            email: parentForm.email.trim() || null,
            address: parentForm.address.trim() || null,
            active: parentForm.active,
          })
          .eq("id", editingParent.id)
          .eq("school_id", profile.school_id)
          .select()
          .single();

        if (updateError) throw updateError;

        setParents((prev) =>
          prev.map((item) => (item.id === editingParent.id ? data : item))
        );

        await logActivity(
          "Parents",
          "modification",
          `Modification de la fiche parent ${data.full_name}`,
          "parent",
          data.id
        );

        setSuccess("Parent mis à jour.");
      } else {
        const { data, error: insertError } = await supabase
          .from("parents")
          .insert({
            school_id: profile.school_id,
            full_name: parentForm.full_name.trim(),
            phone: parentForm.phone.trim() || null,
            email: parentForm.email.trim() || null,
            address: parentForm.address.trim() || null,
            active: parentForm.active,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setParents((prev) =>
          [...prev, data].sort((a, b) =>
            a.full_name.localeCompare(b.full_name)
          )
        );

        await logActivity(
          "Parents",
          "création",
          `Nouveau parent ajouté : ${data.full_name}`,
          "parent",
          data.id
        );

        setSuccess("Parent ajouté avec succès.");
      }

      setShowParentModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible d'enregistrer le parent.");
    }
  }

  async function associateParentStudent(parentId, studentId, relationship) {
    if (!parentId || !studentId) return;

    try {
      const alreadyExists = parentStudents.some(
        (item) =>
          item.parent_id === parentId &&
          item.student_id === studentId
      );

      if (alreadyExists) {
        setError("Ce parent est déjà associé à cet élève.");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("parent_students")
        .insert({
          parent_id: parentId,
          student_id: studentId,
          relationship: relationship || "Parent",
          is_primary: parentStudents.filter(
            (item) => item.student_id === studentId
          ).length === 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setParentStudents((prev) => [...prev, data]);

      await logActivity(
        "Parents",
        "association",
        `Association d'un parent à un élève`,
        "parent",
        parentId
      );

      setSuccess("Parent et élève associés.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible d'associer le parent.");
    }
  }

  async function removeParentStudent(link) {
    if (!link?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from("parent_students")
        .delete()
        .eq("id", link.id)
        .eq("parent_id", link.parent_id)
        .eq("student_id", link.student_id);

      if (deleteError) throw deleteError;

      setParentStudents((prev) =>
        prev.filter((item) => item.id !== link.id)
      );

      await logActivity(
        "Parents",
        "dissociation",
        "Dissociation parent-élève",
        "parent",
        link.parent_id
      );

      setSuccess("Association supprimée.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de supprimer l'association.");
    }
  }

  const filteredParents = useMemo(() => {
    const search = parentSearch.trim().toLowerCase();

    if (!search) return parents;

    return parents.filter((parent) => {
      const childNames = parentStudents
        .filter((item) => item.parent_id === parent.id)
        .map((item) => students.find((s) => s.id === item.student_id))
        .filter(Boolean)
        .map(safeName)
        .join(" ");

      return `${parent.full_name} ${parent.phone || ""} ${
        parent.email || ""
      } ${childNames}`
        .toLowerCase()
        .includes(search);
    });
  }, [parents, parentSearch, parentStudents, students]);

  /* =======================================================
     CLASSES
     ======================================================= */

  const filteredClasses = useMemo(() => {
    const search = classSearch.trim().toLowerCase();

    if (!search) return classes;

    return classes.filter((item) =>
      `${item.name} ${item.level || ""}`.toLowerCase().includes(search)
    );
  }, [classes, classSearch]);

  function getClassStudents(classId) {
    return students.filter((student) => student.class_id === classId);
  }

  /* =======================================================
     INSCRIPTIONS
     ======================================================= */

  function openEnrollment() {
    openNewStudent();
  }

  /* =======================================================
     COMMUNICATION
     ======================================================= */

  async function sendMessage(event) {
    event.preventDefault();

    if (!profile?.school_id || !session?.user?.id) return;

    if (!messageForm.recipient_id) {
      setError("Sélectionnez un administrateur.");
      return;
    }

    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      setError("L'objet et le message sont obligatoires.");
      return;
    }

    try {
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

      setMessages((prev) => [data, ...prev]);

      await logActivity(
        "Communication",
        "message",
        `Message envoyé : ${data.subject}`,
        "message",
        data.id
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
      setError(err.message || "Impossible d'envoyer le message.");
    }
  }

  async function markMessageRead(message) {
    if (!message?.id || message.read_at) return;

    try {
      const { error: updateError } = await supabase
        .from("admin_secretary_messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .eq("id", message.id)
        .eq("school_id", profile.school_id);

      if (updateError) throw updateError;

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  /* =======================================================
     PROFIL
     ======================================================= */

  async function saveProfile(event) {
    event.preventDefault();

    if (!profile?.id) return;

    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
          username: profileForm.username.trim() || null,
        })
        .eq("id", profile.id)
        .eq("role", "secretary")
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);

      await logActivity(
        "Profil",
        "modification",
        "Modification du profil secrétaire",
        "profile",
        profile.id
      );

      setSuccess("Profil mis à jour.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Impossible de modifier le profil.");
    }
  }

  /* =======================================================
     STATISTIQUES
     ======================================================= */

  const activeStudents = students.filter((student) => student.active !== false);

  const todayAttendance = attendance;

  const presentToday = todayAttendance.filter(
    (item) => item.status === "present"
  ).length;

  const absentToday = todayAttendance.filter(
    (item) => item.status === "absent"
  ).length;

  const lateToday = todayAttendance.filter(
    (item) => item.status === "late"
  ).length;

  const unreadMessages = messages.filter(
    (message) =>
      !message.read_at && message.recipient_id === session?.user?.id
  ).length;

  const recentActivities = activities.slice(0, 8);

  /* =======================================================
     RENDU
     ======================================================= */

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingLogo}>🎓</div>
        <h2>École Connectée</h2>
        <p>Chargement de votre espace Secrétaire...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ fontSize: 50 }}>⚠️</div>
        <h2>Accès impossible</h2>
        <p style={{ color: "#b91c1c", maxWidth: 500 }}>{error}</p>

        <Button onClick={loadAll}>Réessayer</Button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              marginTop: 10,
            }}
          >
            Déconnexion
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandLogo}>🎓</div>
          <div>
            <div style={styles.brandTitle}>École Connectée</div>
            <div style={styles.brandSubtitle}>Secrétaire</div>
          </div>
        </div>

        <div style={styles.schoolMini}>
          <div style={styles.schoolMiniIcon}>🏫</div>
          <div>
            <strong>{school?.name || "Mon école"}</strong>
            <span>{school?.city || ""}</span>
          </div>
        </div>

        <nav style={styles.menu}>
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              style={{
                ...styles.menuItem,
                ...(activeSection === item.id
                  ? styles.menuItemActive
                  : {}),
              }}
            >
              <span style={{ fontSize: 19 }}>{item.icon}</span>
              <span>{item.label}</span>

              {item.id === "notifications" && unreadMessages > 0 && (
                <span style={styles.badge}>{unreadMessages}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userMini}>
            <div style={styles.avatar}>
              {(profile?.full_name || "S").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={styles.userName}>
                {profile?.full_name || "Secrétaire"}
              </strong>
              <span style={styles.userRole}>Secrétaire</span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={styles.logoutButton}
            >
              🚪 Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ===================================================
          CONTENU PRINCIPAL
          =================================================== */}

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>
              {MENU.find((item) => item.id === activeSection)?.label ||
                "Tableau de bord"}
            </h1>

            <p style={styles.pageSubtitle}>
              {school?.name || "École Connectée"}
            </p>
          </div>

          <div style={styles.topbarRight}>
            <div style={styles.dateBox}>
              📅 {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveSection("notifications")}
              style={styles.notificationButton}
            >
              🔔
              {unreadMessages > 0 && (
                <span style={styles.notificationDot}>{unreadMessages}</span>
              )}
            </button>
          </div>
        </header>

        {error && (
          <div style={styles.alertError}>
            <span>⚠️</span>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              style={styles.alertClose}
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div style={styles.alertSuccess}>
            <span>✅</span>
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              style={styles.alertClose}
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            OVERVIEW
            ================================================= */}

        {activeSection === "overview" && (
          <section>
            <div style={styles.welcomeCard}>
              <div>
                <div style={styles.welcomeEyebrow}>ESPACE SECRÉTAIRE</div>

                <h2 style={{ margin: "5px 0 8px", fontSize: 25 }}>
                  Bonjour {profile?.full_name || "Secrétaire"} 👋
                </h2>

                <p style={{ margin: 0, color: "#475569" }}>
                  Gérez quotidiennement les élèves, parents, classes,
                  inscriptions et présences de votre établissement.
                </p>
              </div>

              <div style={styles.welcomeEmoji}>🗂️</div>
            </div>

            <div style={styles.statsGrid}>
              <StatCard
                icon="🎓"
                label="Élèves actifs"
                value={activeStudents.length}
                onClick={() => setActiveSection("students")}
              />

              <StatCard
                icon="👨‍👩‍👧"
                label="Parents"
                value={parents.length}
                onClick={() => setActiveSection("parents")}
              />

              <StatCard
                icon="🏫"
                label="Classes"
                value={classes.length}
                onClick={() => setActiveSection("classes")}
              />

              <StatCard
                icon="📋"
                label="Présences aujourd'hui"
                value={todayAttendance.length}
                onClick={() => setActiveSection("attendance")}
              />
            </div>

            <div style={styles.dashboardColumns}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>Présences du jour</h3>
                    <p style={styles.cardSubtitle}>
                      {formatDate(todayISO())}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection("attendance")}
                    style={styles.linkButton}
                  >
                    Voir les présences →
                  </button>
                </div>

                <div style={styles.attendanceSummary}>
                  <div style={styles.attendanceBox}>
                    <strong>{presentToday}</strong>
                    <span>Présents</span>
                  </div>

                  <div style={styles.attendanceBox}>
                    <strong>{absentToday}</strong>
                    <span>Absents</span>
                  </div>

                  <div style={styles.attendanceBox}>
                    <strong>{lateToday}</strong>
                    <span>En retard</span>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>Activité récente</h3>
                    <p style={styles.cardSubtitle}>
                      Vos dernières opérations
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection("notifications")}
                    style={styles.linkButton}
                  >
                    Tout voir →
                  </button>
                </div>

                {recentActivities.length === 0 ? (
                  <EmptyState
                    icon="📋"
                    title="Aucune activité"
                    text="Vos opérations apparaîtront ici."
                  />
                ) : (
                  <div>
                    {recentActivities.map((activity) => (
                      <div key={activity.id} style={styles.activityRow}>
                        <div style={styles.activityIcon}>✓</div>
                        <div style={{ flex: 1 }}>
                          <strong>
                            {activity.description ||
                              `${activity.module} — ${activity.action_type}`}
                          </strong>
                          <div style={styles.smallText}>
                            {formatDateTime(activity.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.quickActions}>
              <h3 style={{ marginTop: 0 }}>Actions rapides</h3>

              <div style={styles.quickGrid}>
                <button
                  type="button"
                  style={styles.quickButton}
                  onClick={openNewStudent}
                >
                  <span>🎓</span>
                  <strong>Ajouter un élève</strong>
                  <small>Créer une nouvelle fiche</small>
                </button>

                <button
                  type="button"
                  style={styles.quickButton}
                  onClick={openNewParent}
                >
                  <span>👨‍👩‍👧</span>
                  <strong>Ajouter un parent</strong>
                  <small>Créer une fiche parent</small>
                </button>

                <button
                  type="button"
                  style={styles.quickButton}
                  onClick={() => setActiveSection("attendance")}
                >
                  <span>📋</span>
                  <strong>Gérer les présences</strong>
                  <small>Présents, absents, retards</small>
                </button>

                <button
                  type="button"
                  style={styles.quickButton}
                  onClick={() => setShowMessageModal(true)}
                >
                  <span>📢</span>
                  <strong>Écrire à l'Admin</strong>
                  <small>Envoyer une information</small>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            ÉLÈVES
            ================================================= */}

        {activeSection === "students" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Élèves</h2>
                <p style={styles.sectionSubtitle}>
                  Gestion des dossiers élèves de votre école.
                </p>
              </div>

              <Button onClick={openNewStudent}>
                ＋ Ajouter un élève
              </Button>
            </div>

            <div style={styles.card}>
              <div style={styles.searchRow}>
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="🔎 Rechercher un élève, matricule ou classe..."
                  style={styles.searchInput}
                />

                <div style={styles.resultCount}>
                  {filteredStudents.length} élève
                  {filteredStudents.length !== 1 ? "s" : ""}
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState
                  icon="🎓"
                  title="Aucun élève trouvé"
                  text="Aucun élève ne correspond à votre recherche."
                />
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table} className="ec-secretary-table">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Matricule</th>
                        <th>Classe</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div style={styles.personCell}>
                              <div style={styles.personAvatar}>
                                {(student.first_name || "?").charAt(0)}
                              </div>

                              <div>
                                <strong>{safeName(student)}</strong>
                                <span>
                                  {formatDate(student.created_at)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>{student.student_code || "—"}</td>

                          <td>
                            <span style={styles.classPill}>
                              {getClassName(student, classes)}
                            </span>
                          </td>

                          <td>
                            {student.active !== false ? (
                              <span style={styles.statusActive}>
                                Actif
                              </span>
                            ) : (
                              <span style={styles.statusInactive}>
                                Inactif
                              </span>
                            )}
                          </td>

                          <td>
                            <div style={styles.actionRow}>
                              <button
                                type="button"
                                onClick={() => openStudentDetail(student)}
                                style={styles.iconAction}
                                title="Voir"
                              >
                                👁️
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditStudent(student)}
                                style={styles.iconAction}
                                title="Modifier"
                              >
                                ✏️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            PARENTS
            ================================================= */}

        {activeSection === "parents" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Parents</h2>
                <p style={styles.sectionSubtitle}>
                  Gestion des parents et associations avec les élèves.
                </p>
              </div>

              <Button onClick={openNewParent}>
                ＋ Ajouter un parent
              </Button>
            </div>

            <div style={styles.card}>
              <div style={styles.searchRow}>
                <input
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  placeholder="🔎 Rechercher un parent, téléphone ou enfant..."
                  style={styles.searchInput}
                />

                <div style={styles.resultCount}>
                  {filteredParents.length} parent
                  {filteredParents.length !== 1 ? "s" : ""}
                </div>
              </div>

              {filteredParents.length === 0 ? (
                <EmptyState
                  icon="👨‍👩‍👧"
                  title="Aucun parent trouvé"
                  text="Aucun parent ne correspond à votre recherche."
                />
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Parent</th>
                        <th>Téléphone</th>
                        <th>Email</th>
                        <th>Enfants</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredParents.map((parent) => {
                        const childrenLinks = parentStudents.filter(
                          (item) => item.parent_id === parent.id
                        );

                        return (
                          <tr key={parent.id}>
                            <td>
                              <div style={styles.personCell}>
                                <div style={styles.personAvatar}>
                                  {(parent.full_name || "?").charAt(0)}
                                </div>

                                <div>
                                  <strong>{parent.full_name}</strong>
                                  <span>
                                    {parent.active ? "Actif" : "Inactif"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>{parent.phone || "—"}</td>
                            <td>{parent.email || "—"}</td>

                            <td>
                              <button
                                type="button"
                                style={styles.childrenButton}
                                onClick={() => openParentChildren(parent)}
                              >
                                {childrenLinks.length} enfant
                                {childrenLinks.length !== 1 ? "s" : ""}
                              </button>
                            </td>

                            <td>
                              <div style={styles.actionRow}>
                                <button
                                  type="button"
                                  onClick={() => openParentChildren(parent)}
                                  style={styles.iconAction}
                                  title="Enfants"
                                >
                                  👨‍👩‍👧
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditParent(parent)}
                                  style={styles.iconAction}
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            CLASSES
            ================================================= */}

        {activeSection === "classes" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Classes</h2>
                <p style={styles.sectionSubtitle}>
                  Consultez les classes et leurs effectifs.
                </p>
              </div>
            </div>

            <div style={styles.searchRow}>
              <input
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="🔎 Rechercher une classe..."
                style={styles.searchInput}
              />
            </div>

            {filteredClasses.length === 0 ? (
              <EmptyState
                icon="🏫"
                title="Aucune classe"
                text="Aucune classe n'est disponible pour votre école."
              />
            ) : (
              <div style={styles.classGrid}>
                {filteredClasses.map((classItem) => {
                  const classStudents = getClassStudents(classItem.id);

                  return (
                    <div key={classItem.id} style={styles.classCard}>
                      <div style={styles.classCardIcon}>🏫</div>

                      <h3>{classItem.name}</h3>

                      <p>
                        {classItem.level || "Niveau non renseigné"}
                      </p>

                      <div style={styles.classEffectif}>
                        <strong>{classStudents.length}</strong>
                        <span>
                          élève
                          {classStudents.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {classStudents.length > 0 && (
                        <div style={styles.classStudentList}>
                          {classStudents.slice(0, 5).map((student) => (
                            <button
                              type="button"
                              key={student.id}
                              onClick={() => openStudentDetail(student)}
                              style={styles.miniStudent}
                            >
                              <span>
                                {(student.first_name || "?").charAt(0)}
                              </span>
                              {safeName(student)}
                            </button>
                          ))}

                          {classStudents.length > 5 && (
                            <small>
                              + {classStudents.length - 5} autre
                              {classStudents.length - 5 !== 1 ? "s" : ""}
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* =================================================
            PRÉSENCES
            ================================================= */}

        {activeSection === "attendance" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Présences</h2>
                <p style={styles.sectionSubtitle}>
                  Gérez les présences, absences et retards.
                </p>
              </div>
            </div>

            <div style={styles.filterCard}>
              <Field label="Date">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={styles.input}
                />
              </Field>

              <Field label="Classe">
                <select
                  value={attendanceClass}
                  onChange={(e) => {
                    setAttendanceClass(e.target.value);
                    setAttendanceStudent("");
                  }}
                  style={styles.input}
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Élève">
                <select
                  value={attendanceStudent}
                  onChange={(e) =>
                    setAttendanceStudent(e.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">Tous les élèves</option>

                  {students
                    .filter(
                      (student) =>
                        !attendanceClass ||
                        student.class_id === attendanceClass
                    )
                    .map((student) => (
                      <option key={student.id} value={student.id}>
                        {safeName(student)}
                      </option>
                    ))}
                </select>
              </Field>

              <Button onClick={refreshAttendance}>
                🔎 Rechercher
              </Button>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    Feuille de présence
                  </h3>

                  <p style={styles.cardSubtitle}>
                    {formatDate(attendanceDate)}
                  </p>
                </div>

                <div style={styles.attendanceLegend}>
                  <span>✅ Présent</span>
                  <span>❌ Absent</span>
                  <span>⏰ Retard</span>
                </div>
              </div>

              <input
                value={attendanceSearch}
                onChange={(e) =>
                  setAttendanceSearch(e.target.value)
                }
                placeholder="🔎 Rechercher un élève..."
                style={{ ...styles.searchInput, marginBottom: 18 }}
              />

              {students.filter((student) => {
                if (
                  attendanceClass &&
                  student.class_id !== attendanceClass
                ) {
                  return false;
                }

                if (attendanceStudent && student.id !== attendanceStudent) {
                  return false;
                }

                if (!attendanceSearch.trim()) return true;

                return safeName(student)
                  .toLowerCase()
                  .includes(attendanceSearch.toLowerCase());
              }).length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="Aucun élève"
                  text="Aucun élève ne correspond aux filtres."
                />
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Statut actuel</th>
                        <th>Présence</th>
                      </tr>
                    </thead>

                    <tbody>
                      {students
                        .filter((student) => {
                          if (
                            attendanceClass &&
                            student.class_id !== attendanceClass
                          ) {
                            return false;
                          }

                          if (
                            attendanceStudent &&
                            student.id !== attendanceStudent
                          ) {
                            return false;
                          }

                          if (!attendanceSearch.trim()) return true;

                          return safeName(student)
                            .toLowerCase()
                            .includes(
                              attendanceSearch.toLowerCase()
                            );
                        })
                        .map((student) => {
                          const record = attendance.find(
                            (item) => item.student_id === student.id
                          );

                          return (
                            <tr key={student.id}>
                              <td>
                                <strong>{safeName(student)}</strong>
                              </td>

                              <td>
                                {getClassName(student, classes)}
                              </td>

                              <td>
                                {record ? (
                                  <span>
                                    {STATUS_ICONS[record.status] || "📋"}{" "}
                                    {STATUS_LABELS[record.status] ||
                                      record.status}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>
                                    Non renseigné
                                  </span>
                                )}
                              </td>

                              <td>
                                <div style={styles.attendanceButtons}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveAttendance(
                                        student,
                                        "present"
                                      )
                                    }
                                    style={{
                                      ...styles.attendanceButton,
                                      ...(record?.status === "present"
                                        ? styles.attendanceSelected
                                        : {}),
                                    }}
                                  >
                                    ✅ Présent
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveAttendance(
                                        student,
                                        "absent"
                                      )
                                    }
                                    style={{
                                      ...styles.attendanceButton,
                                      ...(record?.status === "absent"
                                        ? styles.attendanceSelected
                                        : {}),
                                    }}
                                  >
                                    ❌ Absent
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveAttendance(
                                        student,
                                        "late"
                                      )
                                    }
                                    style={{
                                      ...styles.attendanceButton,
                                      ...(record?.status === "late"
                                        ? styles.attendanceSelected
                                        : {}),
                                    }}
                                  >
                                    ⏰ Retard
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveAttendance(
                                        student,
                                        "excused"
                                      )
                                    }
                                    style={{
                                      ...styles.attendanceButton,
                                      ...(record?.status === "excused"
                                        ? styles.attendanceSelected
                                        : {}),
                                    }}
                                  >
                                    📄 Justifié
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            INSCRIPTIONS
            ================================================= */}

        {activeSection === "enrollments" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Inscriptions</h2>
                <p style={styles.sectionSubtitle}>
                  Enregistrez les nouveaux élèves et gérez leur affectation.
                </p>
              </div>

              <Button onClick={openEnrollment}>
                ＋ Nouvelle inscription
              </Button>
            </div>

            <div style={styles.infoCard}>
              <div style={{ fontSize: 34 }}>📝</div>
              <div>
                <h3 style={{ margin: 0 }}>
                  Gestion des inscriptions
                </h3>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                  Une nouvelle inscription crée la fiche de l'élève
                  directement dans votre école. Vous pouvez ensuite
                  l'affecter à une classe et modifier sa fiche.
                </p>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <StatCard
                icon="📝"
                label="Élèves enregistrés"
                value={students.length}
              />

              <StatCard
                icon="✅"
                label="Élèves actifs"
                value={activeStudents.length}
              />

              <StatCard
                icon="⛔"
                label="Élèves inactifs"
                value={
                  students.filter((student) => !student.active).length
                }
              />

              <StatCard
                icon="🏫"
                label="Classes disponibles"
                value={classes.length}
              />
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    Derniers élèves inscrits
                  </h3>
                  <p style={styles.cardSubtitle}>
                    Les élèves récemment ajoutés
                  </p>
                </div>
              </div>

              {students.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="Aucune inscription"
                  text="Commencez par ajouter un élève."
                />
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...students]
                        .sort(
                          (a, b) =>
                            new Date(b.created_at) -
                            new Date(a.created_at)
                        )
                        .slice(0, 10)
                        .map((student) => (
                          <tr key={student.id}>
                            <td>
                              <strong>{safeName(student)}</strong>
                            </td>

                            <td>
                              {getClassName(student, classes)}
                            </td>

                            <td>
                              {formatDate(student.created_at)}
                            </td>

                            <td>
                              {student.active ? (
                                <span style={styles.statusActive}>
                                  Actif
                                </span>
                              ) : (
                                <span style={styles.statusInactive}>
                                  Inactif
                                </span>
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                onClick={() =>
                                  openStudentDetail(student)
                                }
                                style={styles.iconAction}
                              >
                                👁️
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            COMMUNICATION
            ================================================= */}

        {activeSection === "communication" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Communication</h2>
                <p style={styles.sectionSubtitle}>
                  Échangez directement avec l'Admin École.
                </p>
              </div>

              <Button onClick={() => setShowMessageModal(true)}>
                ✉️ Nouveau message
              </Button>
            </div>

            <div style={styles.infoCard}>
              <div style={{ fontSize: 34 }}>📢</div>

              <div>
                <h3 style={{ margin: 0 }}>
                  Communication avec l'administration
                </h3>

                <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                  Utilisez cet espace pour transmettre les informations
                  importantes à l'Admin École.
                </p>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>Messages</h3>
                  <p style={styles.cardSubtitle}>
                    Historique de vos échanges
                  </p>
                </div>
              </div>

              {messages.length === 0 ? (
                <EmptyState
                  icon="📭"
                  title="Aucun message"
                  text="Vous n'avez encore aucun échange."
                />
              ) : (
                <div>
                  {messages.map((message) => {
                    const isMine =
                      message.sender_id === session?.user?.id;

                    const sender = schoolAdmins.find(
                      (admin) => admin.id === message.sender_id
                    );

                    return (
                      <button
                        type="button"
                        key={message.id}
                        onClick={() => markMessageRead(message)}
                        style={{
                          ...styles.messageRow,
                          background: message.read_at
                            ? "#fff"
                            : "#f0f9ff",
                        }}
                      >
                        <div style={styles.messageIcon}>
                          {isMine ? "📤" : "📥"}
                        </div>

                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={styles.messageTop}>
                            <strong>{message.subject}</strong>

                            {!message.read_at && !isMine && (
                              <span style={styles.unreadPill}>
                                Nouveau
                              </span>
                            )}
                          </div>

                          <div style={styles.messageMeta}>
                            {isMine
                              ? "Vous"
                              : sender?.full_name || "Admin École"}{" "}
                            · {formatDateTime(message.created_at)}
                          </div>

                          <p style={styles.messagePreview}>
                            {message.message}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            NOTIFICATIONS
            ================================================= */}

        {activeSection === "notifications" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Notifications</h2>
                <p style={styles.sectionSubtitle}>
                  Informations et activité de votre espace.
                </p>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    Messages non lus
                  </h3>
                </div>
              </div>

              {messages.filter(
                (message) =>
                  !message.read_at &&
                  message.recipient_id === session?.user?.id
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
                        !message.read_at &&
                        message.recipient_id ===
                          session?.user?.id
                    )
                    .map((message) => (
                      <div
                        key={message.id}
                        style={styles.notificationRow}
                      >
                        <div style={styles.notificationIcon}>
                          📢
                        </div>

                        <div style={{ flex: 1 }}>
                          <strong>{message.subject}</strong>

                          <p style={{ margin: "5px 0" }}>
                            {message.message}
                          </p>

                          <small style={{ color: "#64748b" }}>
                            {formatDateTime(message.created_at)}
                          </small>
                        </div>

                        <Button
                          secondary
                          onClick={() => markMessageRead(message)}
                        >
                          Lu
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    Mes dernières opérations
                  </h3>
                  <p style={styles.cardSubtitle}>
                    Historique des actions effectuées
                  </p>
                </div>
              </div>

              {activities.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="Aucune activité"
                  text="Votre historique apparaîtra ici."
                />
              ) : (
                <div>
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      style={styles.activityRow}
                    >
                      <div style={styles.activityIcon}>✓</div>

                      <div style={{ flex: 1 }}>
                        <strong>
                          {activity.description ||
                            activity.action_type}
                        </strong>

                        <div style={styles.smallText}>
                          {activity.module} ·{" "}
                          {formatDateTime(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            PROFIL
            ================================================= */}

        {activeSection === "profile" && (
          <section>
            <div style={styles.sectionToolbar}>
              <div>
                <h2 style={styles.sectionTitle}>Mon profil</h2>
                <p style={styles.sectionSubtitle}>
                  Gérez vos informations personnelles.
                </p>
              </div>
            </div>

            <div style={styles.profileGrid}>
              <div style={styles.profileCard}>
                <div style={styles.bigAvatar}>
                  {(profile?.full_name || "S").charAt(0).toUpperCase()}
                </div>

                <h2>{profile?.full_name || "Secrétaire"}</h2>

                <span style={styles.rolePill}>
                  🗂️ Secrétaire
                </span>

                <p style={{ color: "#64748b" }}>
                  {session?.user?.email || secretary?.email || "—"}
                </p>

                <div style={styles.profileSchool}>
                  🏫
                  <span>{school?.name || "Mon école"}</span>
                </div>
              </div>

              <form
                onSubmit={saveProfile}
                style={styles.card}
              >
                <h3 style={styles.cardTitle}>
                  Informations personnelles
                </h3>

                <div style={styles.formGrid}>
                  <Field label="Nom complet">
                    <input
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Téléphone">
                    <input
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      style={styles.input}
                      placeholder="+221..."
                    />
                  </Field>

                  <Field label="Nom d'utilisateur">
                    <input
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      value={session?.user?.email || ""}
                      readOnly
                      style={{
                        ...styles.input,
                        background: "#f8fafc",
                      }}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 20 }}>
                  <Button type="submit">
                    💾 Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* ===================================================
          MODAL ÉLÈVE
          =================================================== */}

      {showStudentModal && (
        <Modal
          title={
            editingStudent
              ? "Modifier la fiche élève"
              : "Nouvelle inscription"
          }
          onClose={() => setShowStudentModal(false)}
        >
          <form onSubmit={saveStudent}>
            <div style={styles.formGrid}>
              <Field label="Prénom *">
                <input
                  value={studentForm.first_name}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  style={styles.input}
                  required
                />
              </Field>

              <Field label="Nom *">
                <input
                  value={studentForm.last_name}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  style={styles.input}
                  required
                />
              </Field>

              <Field label="Matricule / code élève">
                <input
                  value={studentForm.student_code}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      student_code: e.target.value,
                    }))
                  }
                  style={styles.input}
                  placeholder="Ex : EC-2026-001"
                />
              </Field>

              <Field label="Classe">
                <select
                  value={studentForm.class_id}
                  onChange={(e) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      class_id: e.target.value,
                    }))
                  }
                  style={styles.input}
                >
                  <option value="">Non affecté</option>

                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                      {classItem.level
                        ? ` — ${classItem.level}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={studentForm.active}
                onChange={(e) =>
                  setStudentForm((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
              />
              Élève actif
            </label>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() => setShowStudentModal(false)}
              >
                Annuler
              </Button>

              <Button type="submit">
                {editingStudent
                  ? "💾 Enregistrer"
                  : "📝 Inscrire l'élève"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================
          MODAL PARENT
          =================================================== */}

      {showParentModal && (
        <Modal
          title={
            editingParent
              ? "Modifier le parent"
              : "Ajouter un parent"
          }
          onClose={() => setShowParentModal(false)}
        >
          <form onSubmit={saveParent}>
            <div style={styles.formGrid}>
              <Field label="Nom complet *">
                <input
                  value={parentForm.full_name}
                  onChange={(e) =>
                    setParentForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  style={styles.input}
                  required
                />
              </Field>

              <Field label="Téléphone">
                <input
                  value={parentForm.phone}
                  onChange={(e) =>
                    setParentForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  style={styles.input}
                  placeholder="+221..."
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={parentForm.email}
                  onChange={(e) =>
                    setParentForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  style={styles.input}
                />
              </Field>

              <Field label="Adresse">
                <input
                  value={parentForm.address}
                  onChange={(e) =>
                    setParentForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  style={styles.input}
                />
              </Field>
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={parentForm.active}
                onChange={(e) =>
                  setParentForm((prev) => ({
                    ...prev,
                    active: e.target.checked,
                  }))
                }
              />
              Parent actif
            </label>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() => setShowParentModal(false)}
              >
                Annuler
              </Button>

              <Button type="submit">
                💾 Enregistrer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================
          MODAL ENFANTS DU PARENT
          =================================================== */}

      {showParentChildrenModal && selectedParent && (
        <Modal
          title={`Enfants de ${selectedParent.full_name}`}
          onClose={() => setShowParentChildrenModal(false)}
        >
          <div>
            {parentStudents.filter(
              (item) => item.parent_id === selectedParent.id
            ).length === 0 ? (
              <EmptyState
                icon="👨‍👩‍👧"
                title="Aucun enfant associé"
                text="Vous pouvez associer un élève à ce parent ci-dessous."
              />
            ) : (
              <div>
                {parentStudents
                  .filter(
                    (item) => item.parent_id === selectedParent.id
                  )
                  .map((link) => {
                    const student = students.find(
                      (item) => item.id === link.student_id
                    );

                    if (!student) return null;

                    return (
                      <div
                        key={link.id}
                        style={styles.childRow}
                      >
                        <div style={styles.personAvatar}>
                          {(student.first_name || "?").charAt(0)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <strong>{safeName(student)}</strong>

                          <div style={styles.smallText}>
                            {getClassName(student, classes)} ·{" "}
                            {link.relationship}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeParentStudent(link)}
                          style={styles.deleteButton}
                        >
                          Supprimer
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            <div style={styles.associationBox}>
              <h4 style={{ marginTop: 0 }}>
                Associer un nouvel élève
              </h4>

              <div style={styles.formGrid}>
                <Field label="Élève">
                  <select
                    id="associate-student"
                    style={styles.input}
                    defaultValue=""
                  >
                    <option value="">Choisir un élève</option>

                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {safeName(student)} —{" "}
                        {getClassName(student, classes)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Lien">
                  <select
                    id="associate-relationship"
                    style={styles.input}
                    defaultValue="Parent"
                  >
                    <option value="Père">Père</option>
                    <option value="Mère">Mère</option>
                    <option value="Tuteur">Tuteur</option>
                    <option value="Tutrice">Tutrice</option>
                    <option value="Parent">Parent</option>
                  </select>
                </Field>
              </div>

              <Button
                onClick={() => {
                  const studentId =
                    document.getElementById(
                      "associate-student"
                    )?.value;

                  const relationship =
                    document.getElementById(
                      "associate-relationship"
                    )?.value;

                  if (!studentId) {
                    setError("Choisissez un élève.");
                    return;
                  }

                  associateParentStudent(
                    selectedParent.id,
                    studentId,
                    relationship
                  );
                }}
              >
                ＋ Associer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================
          MODAL DÉTAIL ÉLÈVE
          =================================================== */}

      {showStudentDetailModal && selectedStudent && (
        <Modal
          title="Dossier élève"
          onClose={() => setShowStudentDetailModal(false)}
        >
          <div style={styles.studentDetail}>
            <div style={styles.detailHero}>
              <div style={styles.detailAvatar}>
                {(selectedStudent.first_name || "?").charAt(0)}
              </div>

              <div>
                <h2 style={{ margin: 0 }}>
                  {safeName(selectedStudent)}
                </h2>

                <p style={{ margin: "5px 0", color: "#64748b" }}>
                  {selectedStudent.student_code ||
                    "Matricule non renseigné"}
                </p>
              </div>
            </div>

            <div style={styles.detailGrid}>
              <div>
                <span>Classe</span>
                <strong>
                  {getClassName(selectedStudent, classes)}
                </strong>
              </div>

              <div>
                <span>Statut</span>
                <strong>
                  {selectedStudent.active
                    ? "Actif"
                    : "Inactif"}
                </strong>
              </div>

              <div>
                <span>Inscription</span>
                <strong>
                  {formatDate(selectedStudent.created_at)}
                </strong>
              </div>

              <div>
                <span>Parents associés</span>
                <strong>
                  {
                    parentStudents.filter(
                      (item) =>
                        item.student_id === selectedStudent.id
                    ).length
                  }
                </strong>
              </div>
            </div>

            <div style={styles.detailSection}>
              <h3>Parents / responsables</h3>

              {parentStudents.filter(
                (item) => item.student_id === selectedStudent.id
              ).length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  Aucun parent associé.
                </p>
              ) : (
                parentStudents
                  .filter(
                    (item) =>
                      item.student_id === selectedStudent.id
                  )
                  .map((link) => {
                    const parent = parents.find(
                      (item) => item.id === link.parent_id
                    );

                    if (!parent) return null;

                    return (
                      <div
                        key={link.id}
                        style={styles.childRow}
                      >
                        <div style={styles.personAvatar}>
                          {(parent.full_name || "?").charAt(0)}
                        </div>

                        <div>
                          <strong>{parent.full_name}</strong>
                          <div style={styles.smallText}>
                            {link.relationship} ·{" "}
                            {parent.phone || "Téléphone non renseigné"}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() => {
                  setShowStudentDetailModal(false);
                  openEditStudent(selectedStudent);
                }}
              >
                ✏️ Modifier
              </Button>

              <Button
                onClick={() =>
                  setShowStudentDetailModal(false)
                }
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================
          MODAL MESSAGE
          =================================================== */}

      {showMessageModal && (
        <Modal
          title="Nouveau message à l'Admin École"
          onClose={() => setShowMessageModal(false)}
        >
          <form onSubmit={sendMessage}>
            <Field label="Destinataire *">
              <select
                value={messageForm.recipient_id}
                onChange={(e) =>
                  setMessageForm((prev) => ({
                    ...prev,
                    recipient_id: e.target.value,
                  }))
                }
                style={styles.input}
                required
              >
                <option value="">
                  Choisir un Admin École
                </option>

                {schoolAdmins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name || admin.email}
                  </option>
                ))}
              </select>
            </Field>

            {schoolAdmins.length === 0 && (
              <div style={styles.warningBox}>
                ⚠️ Aucun Admin École actif n'a été trouvé
                dans votre école.
              </div>
            )}

            <Field label="Objet *">
              <input
                value={messageForm.subject}
                onChange={(e) =>
                  setMessageForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                style={styles.input}
                required
                placeholder="Ex : Information concernant une inscription"
              />
            </Field>

            <Field label="Message *">
              <textarea
                value={messageForm.message}
                onChange={(e) =>
                  setMessageForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                style={{
                  ...styles.input,
                  minHeight: 150,
                  resize: "vertical",
                }}
                required
                placeholder="Écrivez votre message..."
              />
            </Field>

            <div style={styles.modalActions}>
              <Button
                secondary
                onClick={() => setShowMessageModal(false)}
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={schoolAdmins.length === 0}
              >
                📤 Envoyer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  sidebar: {
    width: 265,
    minWidth: 265,
    minHeight: "100vh",
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    zIndex: 10,
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "22px 18px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },

  brandLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 23,
  },

  brandTitle: {
    fontWeight: 800,
    fontSize: 15,
  },

  brandSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },

  schoolMini: {
    margin: 14,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,.06)",
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  schoolMiniIcon: {
    fontSize: 23,
  },

  menu: {
    flex: 1,
    padding: "4px 10px",
    overflowY: "auto",
  },

  menuItem: {
    width: "100%",
    border: 0,
    background: "transparent",
    color: "#cbd5e1",
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "11px 12px",
    marginBottom: 4,
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    textAlign: "left",
    position: "relative",
  },

  menuItemActive: {
    background: "#2563eb",
    color: "#fff",
  },

  badge: {
    marginLeft: "auto",
    background: "#ef4444",
    color: "#fff",
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
  },

  sidebarBottom: {
    padding: 12,
    borderTop: "1px solid rgba(255,255,255,.08)",
  },

  userMini: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  userName: {
    display: "block",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userRole: {
    display: "block",
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },

  logoutButton: {
    width: "100%",
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    borderRadius: 9,
    padding: 10,
    cursor: "pointer",
    fontWeight: 600,
  },

  main: {
    flex: 1,
    minWidth: 0,
    padding: "0 28px 40px",
  },

  topbar: {
    minHeight: 78,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    marginBottom: 25,
  },

  pageTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },

  pageSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 13,
  },

  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  dateBox: {
    color: "#64748b",
    fontSize: 13,
  },

  notificationButton: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontSize: 18,
  },

  notificationDot: {
    position: "absolute",
    top: -5,
    right: -5,
    background: "#ef4444",
    color: "#fff",
    borderRadius: 999,
    minWidth: 19,
    height: 19,
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
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

  loadingLogo: {
    fontSize: 50,
  },

  alertError: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 13,
    marginBottom: 20,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: 10,
  },

  alertSuccess: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 13,
    marginBottom: 20,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: 10,
  },

  alertClose: {
    marginLeft: "auto",
    border: 0,
    background: "transparent",
    cursor: "pointer",
    fontSize: 20,
  },

  welcomeCard: {
    background:
      "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 25,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  welcomeEyebrow: {
    color: "#2563eb",
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: ".08em",
  },

  welcomeEmoji: {
    fontSize: 60,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 15,
    marginBottom: 20,
  },

  statCard: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 15,
    padding: 18,
    display: "flex",
    gap: 13,
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(15,23,42,.04)",
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 23,
  },

  statValue: {
    fontSize: 25,
    fontWeight: 800,
  },

  statLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },

  dashboardColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 20,
    boxShadow: "0 2px 8px rgba(15,23,42,.04)",
    marginBottom: 20,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    alignItems: "center",
    marginBottom: 18,
  },

  cardTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 750,
  },

  cardSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
  },

  linkButton: {
    border: 0,
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: 650,
  },

  attendanceSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },

  attendanceBox: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: 15,
    textAlign: "center",
  },

  attendanceBoxStrong: {
    fontSize: 24,
  },

  attendanceBoxSpan: {
    display: "block",
  },

  quickActions: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 20,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },

  quickButton: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 13,
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  sectionToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 20,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 24,
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
  },

  button: {
    border: 0,
    background: "#2563eb",
    color: "#fff",
    borderRadius: 9,
    padding: "10px 15px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },

  buttonSecondary: {
    background: "#f1f5f9",
    color: "#334155",
  },

  buttonDanger: {
    background: "#dc2626",
    color: "#fff",
  },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "11px 13px",
    outline: "none",
    fontSize: 13,
  },

  resultCount: {
    color: "#64748b",
    whiteSpace: "nowrap",
    fontSize: 13,
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },

  personCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    flexShrink: 0,
  },

  classPill: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 700,
  },

  statusActive: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 11,
    fontWeight: 700,
  },

  statusInactive: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
  },

  actionRow: {
    display: "flex",
    gap: 6,
  },

  iconAction: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 7,
    width: 34,
    height: 34,
    cursor: "pointer",
  },

  childrenButton: {
    border: 0,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },

  emptyState: {
    padding: "45px 20px",
    textAlign: "center",
    color: "#334155",
  },

  classGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 15,
  },

  classCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 19,
  },

  classCardIcon: {
    fontSize: 32,
  },

  classCardH3: {
    margin: 0,
  },

  classEffectif: {
    display: "flex",
    alignItems: "baseline",
    gap: 5,
    margin: "15px 0",
  },

  classStudentList: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 12,
  },

  miniStudent: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: 0,
    background: "transparent",
    padding: "5px 0",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  },

  filterCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    alignItems: "end",
    marginBottom: 20,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 15,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "10px 11px",
    background: "#fff",
    fontSize: 13,
    outline: "none",
  },

  attendanceLegend: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: 11,
  },

  attendanceButtons: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },

  attendanceButton: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 7,
    padding: "7px 8px",
    cursor: "pointer",
    fontSize: 11,
  },

  attendanceSelected: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 700,
  },

  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    padding: 20,
    borderRadius: 15,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    marginBottom: 20,
  },

  activityRow: {
    display: "flex",
    gap: 11,
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
  },

  activityIcon: {
    width: 29,
    height: 29,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#166534",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },

  smallText: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 3,
  },

  messageRow: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    border: 0,
    borderBottom: "1px solid #e2e8f0",
    padding: "15px 8px",
    cursor: "pointer",
    textAlign: "left",
  },

  messageIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  messageTop: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  unreadPill: {
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "3px 7px",
    fontSize: 10,
    fontWeight: 800,
  },

  messageMeta: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 3,
  },

  messagePreview: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.5,
  },

  notificationRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    padding: 15,
    borderBottom: "1px solid #e2e8f0",
  },

  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  profileGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, .7fr) minmax(350px, 1.5fr)",
    gap: 20,
  },

  profileCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    padding: 25,
    textAlign: "center",
  },

  bigAvatar: {
    width: 85,
    height: 85,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    fontWeight: 800,
    margin: "0 auto 15px",
  },

  rolePill: {
    display: "inline-block",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  profileSchool: {
    marginTop: 20,
    padding: 12,
    background: "#f8fafc",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 13,
  },

  checkboxLabel: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginTop: 5,
    color: "#334155",
    fontSize: 13,
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1px solid #e2e8f0",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 1000,
    overflowY: "auto",
  },

  modal: {
    width: "100%",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 25px 70px rgba(15,23,42,.25)",
    maxHeight: "92vh",
    overflowY: "auto",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    borderBottom: "1px solid #e2e8f0",
  },

  modalBody: {
    padding: 20,
  },

  closeButton: {
    border: 0,
    background: "#f1f5f9",
    width: 34,
    height: 34,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 22,
    color: "#334155",
  },

  childRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },

  deleteButton: {
    border: 0,
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "6px 8px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 11,
  },

  associationBox: {
    marginTop: 20,
    padding: 15,
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },

  studentDetail: {},

  detailHero: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    paddingBottom: 18,
    borderBottom: "1px solid #e2e8f0",
  },

  detailAvatar: {
    width: 62,
    height: 62,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 25,
    fontWeight: 800,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
    marginTop: 18,
  },

  detailSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
  },

  warningBox: {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
    padding: 11,
    borderRadius: 9,
    marginBottom: 15,
    fontSize: 12,
  },
};

/* =========================================================
   TABLE STYLES — injectés une seule fois
   ========================================================= */

if (typeof document !== "undefined") {
  const styleId = "ec-secretary-dashboard-table-styles";

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;

    style.innerHTML = `
      .ec-secretary-table th {
        text-align: left;
        padding: 11px;
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .04em;
        border-bottom: 1px solid #e2e8f0;
      }

      .ec-secretary-table td {
        padding: 13px 11px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }

      .ec-secretary-table tr:hover td {
        background: #f8fafc;
      }

      @media (max-width: 850px) {
        .ec-secretary-app {
          display: block !important;
        }
      }

      @media (max-width: 700px) {
        .ec-secretary-sidebar {
          width: 100% !important;
          min-width: 100% !important;
          height: auto !important;
          min-height: auto !important;
          position: relative !important;
        }

        .ec-secretary-main {
          padding: 0 12px 30px !important;
        }

        .ec-secretary-topbar {
          flex-direction: column !important;
          align-items: flex-start !important;
          padding: 15px 0 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }
}