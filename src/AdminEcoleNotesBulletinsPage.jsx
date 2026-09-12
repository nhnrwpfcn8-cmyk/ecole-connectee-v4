import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const TRIMESTERS = [
  { value: "trimestre_1", label: "Trimestre 1" },
  { value: "trimestre_2", label: "Trimestre 2" },
  { value: "trimestre_3", label: "Trimestre 3" },
];

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const fullStudentName = (student) =>
  `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
  "Élève";

function average(values) {
  const valid = values.filter((value) =>
    Number.isFinite(Number(value))
  );

  if (!valid.length) return null;

  return (
    valid.reduce((sum, value) => sum + Number(value), 0) /
    valid.length
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("fr-FR");
}

function formatAverage(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-";
  }

  return Number(value).toFixed(2).replace(".", ",");
}

function formatCoefficient(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-";
  }

  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(".", ",");
}

export default function AdminEcoleNotesBulletinsPage({
  schoolId,
  profile,
}) {
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [bulletins, setBulletins] = useState([]);

  const [trimester, setTrimester] = useState("trimestre_1");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");

  const [activeTab, setActiveTab] = useState("notes");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedBulletin, setSelectedBulletin] = useState(null);
  const [stampUrl, setStampUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const activeStudents = useMemo(
    () => students.filter((student) => student.active !== false),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = normalize(search);

    return activeStudents.filter((student) => {
      const matchesClass = !classId || student.class_id === classId;
      const haystack = normalize(
        `${fullStudentName(student)} ${student.student_code || ""}`
      );

      return matchesClass && (!query || haystack.includes(query));
    });
  }, [activeStudents, classId, search]);

  const trimesterAssessments = useMemo(
    () =>
      assessments.filter(
        (assessment) =>
          assessment.trimester === trimester &&
          assessment.published !== false
      ),
    [assessments, trimester]
  );

  const selectedStudent = useMemo(
    () =>
      activeStudents.find((student) => student.id === studentId) || null,
    [activeStudents, studentId]
  );

  const classMap = useMemo(
    () => Object.fromEntries(classes.map((item) => [item.id, item])),
    [classes]
  );

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((item) => [item.id, item])),
    [subjects]
  );

  const gradeRows = useMemo(() => {
    return grades
      .filter((grade) => grade.trimester === trimester)
      .filter((grade) => !classId || grade.class_id === classId)
      .filter((grade) => !studentId || grade.student_id === studentId)
      .filter((grade) => !assessmentId || grade.assessment_id === assessmentId);
  }, [grades, trimester, classId, studentId, assessmentId]);

  /* =========================================================
     CALCUL DES BULLETINS
     Devoir = moyenne des Devoir 1 et Devoir 2 normalisés sur 20.
     Composition = note de composition normalisée sur 20.
     Moy /20 = moyenne pondérée de toutes les notes du sujet.
  ========================================================= */
  const bulletinRows = useMemo(() => {
    const sourceStudents = studentId
      ? activeStudents.filter((student) => student.id === studentId)
      : filteredStudents;

    return sourceStudents.map((student) => {
      const studentGrades = grades.filter(
        (grade) =>
          grade.student_id === student.id &&
          grade.trimester === trimester
      );

      const bySubject = {};

      studentGrades.forEach((grade) => {
        const key = String(grade.subject_id || "unknown");
        if (!bySubject[key]) bySubject[key] = [];
        bySubject[key].push(grade);
      });

      const subjectsRows = Object.entries(bySubject).map(
        ([subjectKey, rows]) => {
          const devoirRows = rows.filter(
  (row) =>
    row.assessment_slot === "devoir_1" ||
    row.assessment_slot === "devoir_2"
);

          const compositionRow = rows.find((row) => {
            const assessment = assessments.find(
              (item) => item.id === row.assessment_id
            );

            return assessment?.assessment_slot === "composition";
          });

          const devoirScores = devoirRows
            .map((row) => {
              const score = Number(row.score);
              const max = Number(row.max_score) || 20;

              if (!Number.isFinite(score) || max <= 0) return null;
              return (score / max) * 20;
            })
            .filter((value) => value !== null);

          const devoir = devoirScores.length
            ? devoirScores.reduce((sum, value) => sum + value, 0) /
              devoirScores.length
            : null;

          const comp =
            compositionRow && Number.isFinite(Number(compositionRow.score))
              ? (Number(compositionRow.score) /
                  (Number(compositionRow.max_score) || 20)) *
                20
              : null;

          const weighted = rows.reduce((sum, row) => {
            const score = Number(row.score);
            const max = Number(row.max_score) || 20;
            const coefficient = Number(row.coefficient) || 1;

            if (!Number.isFinite(score) || max <= 0) return sum;

            return sum + (score / max) * 20 * coefficient;
          }, 0);

          const coefficients = rows.reduce(
            (sum, row) => sum + (Number(row.coefficient) || 1),
            0
          );

          const subjectAverage =
            coefficients > 0 ? weighted / coefficients : null;

          return {
            subjectId: subjectKey === "unknown" ? null : subjectKey,
            subjectName: subjectMap[subjectKey]?.name || "Matière",
            devoir,
            comp,
            average: subjectAverage,
            coefficient: coefficients || 1,
            weighted,
            appreciation: rows
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.updated_at || b.created_at || 0) -
                  new Date(a.updated_at || a.created_at || 0)
              )
              .find((row) => row.appreciation)?.appreciation || "",
          };
        }
      );

      const allScores = subjectsRows
        .filter((row) => row.average !== null)
        .map((row) => row.average);

      return {
        student,
        className: classMap[student.class_id]?.name || "-",
        subjects: subjectsRows,
        generalAverage: average(allScores),
      };
    });
  }, [
    activeStudents,
    filteredStudents,
    studentId,
    grades,
    trimester,
    subjectMap,
    classMap,
    assessments,
  ]);

  /* =========================================================
     CLASSEMENT
     Le rang est calculé sur tous les élèves actifs de la même classe.
  ========================================================= */
  const classRankMap = useMemo(() => {
    const byClass = {};

    activeStudents.forEach((student) => {
      const studentGrades = grades.filter(
        (grade) =>
          grade.student_id === student.id &&
          grade.trimester === trimester
      );

      const bySubject = {};
      studentGrades.forEach((grade) => {
        const key = String(grade.subject_id || "unknown");
        if (!bySubject[key]) bySubject[key] = [];
        bySubject[key].push(grade);
      });

      const averages = Object.values(bySubject)
        .map((rows) => {
          const weighted = rows.reduce((sum, row) => {
            const score = Number(row.score);
            const max = Number(row.max_score) || 20;
            const coefficient = Number(row.coefficient) || 1;
            if (!Number.isFinite(score) || max <= 0) return sum;
            return sum + (score / max) * 20 * coefficient;
          }, 0);

          const coefficients = rows.reduce(
            (sum, row) => sum + (Number(row.coefficient) || 1),
            0
          );

          return coefficients > 0 ? weighted / coefficients : null;
        })
        .filter((value) => value !== null);

      const generalAverage = average(averages);
      const classKey = student.class_id || "unknown";
      if (!byClass[classKey]) byClass[classKey] = [];
      byClass[classKey].push({ id: student.id, generalAverage });
    });

    const result = {};

    Object.entries(byClass).forEach(([classKey, rows]) => {
      const ranked = rows
        .filter((row) => row.generalAverage !== null)
        .sort((a, b) => b.generalAverage - a.generalAverage);

      ranked.forEach((row, index) => {
        result[row.id] = `${index + 1}/${rows.length}`;
      });
    });

    return result;
  }, [activeStudents, grades, trimester]);

  /* =========================================================
     STORAGE : CACHET / SIGNATURE
  ========================================================= */
  async function createSignedBrandingUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const { data, error: storageError } = await supabase.storage
      .from("school-branding")
      .createSignedUrl(path, 60 * 60);

    if (storageError) {
      console.error("Erreur URL branding :", storageError);
      return "";
    }

    return data?.signedUrl || "";
  }

  /* =========================================================
     CHARGEMENT
  ========================================================= */
  async function loadAll() {
    if (!schoolId) return;

    setLoading(true);
    setError("");

    const [
      schoolResult,
      studentsResult,
      classesResult,
      subjectsResult,
      assessmentsResult,
      gradesResult,
      bulletinsResult,
    ] = await Promise.all([
      supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .maybeSingle(),

      supabase
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
          active
        `
        )
        .eq("school_id", schoolId)
        .order("last_name", { ascending: true }),

      supabase
        .from("classes")
        .select("id, school_id, name, level")
        .eq("school_id", schoolId)
        .order("name", { ascending: true }),

      supabase
        .from("subjects")
        .select("id, name")
        .order("name", { ascending: true }),

      supabase
        .from("assessments")
        .select(
          `
          id,
          school_id,
          teacher_id,
          class_id,
          subject_id,
          title,
          description,
          assessment_type,
          assessment_slot,
          trimester,
          max_score,
          evaluation_date,
          coefficient,
          published,
          created_at
        `
        )
        .eq("school_id", schoolId)
        .order("evaluation_date", { ascending: false }),

      supabase
        .from("grades")
        .select(
          `
          id,
          school_id,
          student_id,
          teacher_id,
          assessment_id,
          score,
          stars,
          appreciation,
          comment,
          created_at,
          updated_at,
          assessments!inner(
          class_id,
          subject_id,
          trimester,
          max_score,
          coefficient,
          assessment_slot
          )
          `
        )
        .eq("school_id", schoolId)
        .order("updated_at", { ascending: false }),

      supabase
        .from("bulletins")
        .select(
          `
          id,
          school_id,
          student_id,
          trimester,
          status,
          pdf_url,
          created_by,
          generated_at,
          validated_at,
          sent_at,
          created_at,
          updated_at
        `
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ]);

    const firstError = [
      schoolResult.error,
      studentsResult.error,
      classesResult.error,
      subjectsResult.error,
      assessmentsResult.error,
      gradesResult.error,
      bulletinsResult.error,
    ].find(Boolean);

    if (firstError) {
      console.error("Erreur Notes/Bulletins :", firstError);
      setError(
        firstError.message || "Impossible de charger les données."
      );
    }

    const loadedSchool = schoolResult.data || null;
    setSchool(loadedSchool);
    setStudents(studentsResult.data || []);
    setClasses(classesResult.data || []);
    setSubjects(subjectsResult.data || []);
    setAssessments(assessmentsResult.data || []);

    const normalizedGrades = (gradesResult.data || []).map((grade) => {
      const assessment = grade.assessments || null;

      return {
  ...grade,
  class_id: assessment?.class_id || null,
  subject_id: assessment?.subject_id || null,
  trimester: assessment?.trimester || null,
  max_score: assessment?.max_score || null,
  coefficient: assessment?.coefficient || null,
  assessment_slot: assessment?.assessment_slot || null,
};
    });

    setGrades(normalizedGrades);
    setBulletins(bulletinsResult.data || []);

    if (loadedSchool) {
      const [stamp, signature] = await Promise.all([
        createSignedBrandingUrl(loadedSchool.stamp_url),
        createSignedBrandingUrl(loadedSchool.signature_url),
      ]);

      setStampUrl(stamp);
      setSignatureUrl(signature);
    } else {
      setStampUrl("");
      setSignatureUrl("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [schoolId]);

  /* =========================================================
     BULLETIN
  ========================================================= */
  async function createBulletin(student) {
    if (!student?.id) return;

    setSaving(true);
    setError("");
    setMessage("");

    const existing = bulletins.find(
      (bulletin) =>
        bulletin.student_id === student.id &&
        bulletin.trimester === trimester
    );

    let result;

    if (existing) {
      result = await supabase
        .from("bulletins")
        .update({
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("school_id", schoolId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("bulletins")
        .insert({
          school_id: schoolId,
          student_id: student.id,
          trimester,
          status: "draft",
          created_by: profile?.id || null,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Erreur création bulletin :", result.error);
      setError(
        result.error.message || "Impossible de créer le bulletin."
      );
    } else {
      setMessage("Bulletin préparé avec succès.");
      await loadAll();
      setSelectedBulletin(result.data);
    }

    setSaving(false);
  }

  async function validateBulletin(bulletin) {
    if (!bulletin?.id) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("bulletins")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bulletin.id)
      .eq("school_id", schoolId);

    if (updateError) {
      setError(
        updateError.message || "Impossible de valider le bulletin."
      );
    } else {
      setMessage("Bulletin validé avec succès.");
      await loadAll();
    }

    setSaving(false);
  }

  function printBulletin(row) {
    if (!row?.student?.id) return;

    setStudentId(row.student.id);
    setSelectedBulletin(
      bulletins.find(
        (bulletin) =>
          bulletin.student_id === row.student.id &&
          bulletin.trimester === trimester
      ) || {
        student_id: row.student.id,
        trimester,
      }
    );

    setTimeout(() => window.print(), 250);
  }

  const selectedBulletinRow = useMemo(() => {
    if (!selectedStudent) return null;
    return (
      bulletinRows.find((row) => row.student.id === selectedStudent.id) ||
      null
    );
  }, [bulletinRows, selectedStudent]);

  const trimesterLabel =
    TRIMESTERS.find((item) => item.value === trimester)?.label || trimester;

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="ec-card">
          <h2>Notes & Bulletins</h2>
          <p>Chargement des données de l'établissement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <style>
        {`
          .ec-bulletin-print {
            width: 100%;
            max-width: 1120px;
            margin: 24px auto 0;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
            box-sizing: border-box;
          }

          .ec-bulletin-paper {
            border: 1px solid #111827;
            padding: 28px;
            background: #fff;
          }

          .ec-bulletin-header {
            display: grid;
            grid-template-columns: 1fr 1.2fr 1fr;
            gap: 18px;
            align-items: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 14px;
          }

          .ec-bulletin-title {
            text-align: center;
            font-weight: 800;
            letter-spacing: .5px;
          }

          .ec-bulletin-title h1 {
            margin: 0;
            font-size: 24px;
          }

          .ec-bulletin-title h2 {
            margin: 8px 0 0;
            font-size: 19px;
          }

          .ec-bulletin-school-name {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .ec-bulletin-school-meta {
            margin-top: 5px;
            font-size: 12px;
            line-height: 1.45;
          }

          .ec-bulletin-year {
            text-align: right;
            font-size: 13px;
            line-height: 1.55;
          }

          .ec-bulletin-student-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border: 1px solid #111827;
            margin-top: 14px;
          }

          .ec-bulletin-info-cell {
            padding: 7px 9px;
            min-height: 38px;
            border-right: 1px solid #111827;
            border-bottom: 1px solid #111827;
            font-size: 12px;
            box-sizing: border-box;
          }

          .ec-bulletin-info-cell:nth-child(3n) {
            border-right: 0;
          }

          .ec-bulletin-info-cell:nth-last-child(-n+3) {
            border-bottom: 0;
          }

          .ec-bulletin-info-label {
            display: inline-block;
            min-width: 110px;
            font-weight: 800;
          }

          .ec-bulletin-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 11px;
          }

          .ec-bulletin-table th,
          .ec-bulletin-table td {
            border: 1px solid #111827;
            padding: 6px 5px;
            text-align: center;
            vertical-align: middle;
          }

          .ec-bulletin-table th {
            background: #f1f5f9;
            font-weight: 800;
            text-transform: uppercase;
          }

          .ec-bulletin-table .discipline {
            text-align: left;
            font-weight: 700;
            min-width: 160px;
          }

          .ec-bulletin-table .appreciation {
            text-align: left;
            min-width: 170px;
          }

          .ec-bulletin-total {
            font-weight: 800;
            background: #f8fafc;
          }

          .ec-bulletin-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border: 1px solid #111827;
            border-top: 0;
          }

          .ec-bulletin-summary-cell {
            padding: 9px;
            border-right: 1px solid #111827;
            font-size: 12px;
          }

          .ec-bulletin-summary-cell:last-child {
            border-right: 0;
          }

          .ec-bulletin-bottom {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 16px;
          }

          .ec-bulletin-box {
            border: 1px solid #111827;
            min-height: 95px;
            padding: 10px;
            box-sizing: border-box;
          }

          .ec-bulletin-box-title {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 12px;
            margin-bottom: 9px;
          }

          .ec-bulletin-decision {
            border: 1px solid #111827;
            padding: 10px;
            margin-top: 16px;
            font-size: 12px;
          }

          .ec-bulletin-distinction {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 7px;
            margin-top: 10px;
          }

          .ec-bulletin-distinction span {
            border: 1px solid #111827;
            padding: 7px 4px;
            text-align: center;
            font-size: 10px;
          }

          .ec-bulletin-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 28px;
          }

          .ec-bulletin-signature-box {
            min-height: 145px;
            text-align: center;
            font-size: 12px;
          }

          .ec-bulletin-signature-box img {
            display: block;
            margin: 12px auto 0;
            object-fit: contain;
          }

          @media (max-width: 850px) {
            .ec-bulletin-header,
            .ec-bulletin-student-info,
            .ec-bulletin-bottom,
            .ec-bulletin-signatures {
              grid-template-columns: 1fr;
            }

            .ec-bulletin-info-cell,
            .ec-bulletin-summary-cell {
              border-right: 0;
            }

            .ec-bulletin-info-cell:nth-last-child(-n+3) {
              border-bottom: 1px solid #111827;
            }

            .ec-bulletin-info-cell:last-child {
              border-bottom: 0;
            }

            .ec-bulletin-year {
              text-align: left;
            }

            .ec-bulletin-summary {
              grid-template-columns: 1fr 1fr;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            body * {
              visibility: hidden !important;
            }

            .ec-bulletin-print,
            .ec-bulletin-print * {
              visibility: visible !important;
            }

            .ec-bulletin-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 0;
            }

            .ec-bulletin-paper {
              border: 1px solid #111827;
              padding: 14px;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* EN-TÊTE */}
      <div className="ec-card no-print" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>📝 Notes & Bulletins</h2>
            <p style={{ marginTop: 6 }}>
              Gestion académique de {school?.name || "l'établissement"}
            </p>
          </div>

          <select
            value={trimester}
            onChange={(event) => {
              setTrimester(event.target.value);
              setAssessmentId("");
              setStudentId("");
            }}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            {TRIMESTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="ec-error-card no-print" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="ec-success-card no-print" style={{ marginBottom: 16 }}>
          ✅ {message}
        </div>
      )}

      {/* ONGLETS */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <button
          className="ec-btn ec-btn-primary"
          onClick={() => setActiveTab("notes")}
        >
          📝 Notes
        </button>

        <button
          className="ec-btn"
          onClick={() => setActiveTab("bulletins")}
        >
          📄 Bulletins
        </button>
      </div>

      {/* =====================================================
          NOTES
      ===================================================== */}
      {activeTab === "notes" && (
        <div className="ec-card no-print">
          <h3>Notes des élèves</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setStudentId("");
              }}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Toutes les classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={assessmentId}
              onChange={(event) => setAssessmentId(event.target.value)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Toutes les évaluations</option>
              {trimesterAssessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un élève..."
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            />
          </div>

          {gradeRows.length === 0 ? (
            <p>Aucune note enregistrée pour les filtres sélectionnés.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Élève",
                      "Évaluation",
                      "Matière",
                      "Note",
                      "Coefficient",
                      "Date",
                    ].map((header) => (
                      <th key={header} style={{ textAlign: "left", padding: 10 }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((grade) => {
                    const student = activeStudents.find(
                      (item) => item.id === grade.student_id
                    );
                    const assessment = assessments.find(
                      (item) => item.id === grade.assessment_id
                    );

                    return (
                      <tr key={grade.id}>
                        <td style={{ padding: 10 }}>
                          {fullStudentName(student)}
                        </td>
                        <td style={{ padding: 10 }}>
                          {assessment?.title || "-"}
                        </td>
                        <td style={{ padding: 10 }}>
                          {subjectMap[grade.subject_id]?.name || "-"}
                        </td>
                        <td style={{ padding: 10, fontWeight: 700 }}>
                          {grade.score ?? "-"} / {assessment?.max_score || 20}
                        </td>
                        <td style={{ padding: 10 }}>
                          {formatCoefficient(grade.coefficient)}
                        </td>
                        <td style={{ padding: 10 }}>
                          {formatDate(assessment?.evaluation_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          BULLETINS
      ===================================================== */}
      {activeTab === "bulletins" && (
        <div className="ec-card no-print">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setStudentId("");
              }}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Toutes les classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="">Tous les élèves</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {fullStudentName(student)}
                </option>
              ))}
            </select>
          </div>

          <h3>Préparation des bulletins — {trimesterLabel}</h3>

          {bulletinRows.length === 0 ? (
            <p>Aucun élève disponible.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {bulletinRows.map((row) => {
                const existing = bulletins.find(
                  (bulletin) =>
                    bulletin.student_id === row.student.id &&
                    bulletin.trimester === trimester
                );

                return (
                  <div
                    key={row.student.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong>{fullStudentName(row.student)}</strong>
                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {row.className} · Moyenne :{" "}
                          <strong>
                            {formatAverage(row.generalAverage)} / 20
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="ec-btn"
                          disabled={saving}
                          onClick={() => createBulletin(row.student)}
                        >
                          Générer
                        </button>

                        {existing && (
                          <button
                            className="ec-btn"
                            disabled={saving}
                            onClick={() => validateBulletin(existing)}
                          >
                            Valider
                          </button>
                        )}

                        <button
                          className="ec-btn"
                          onClick={() => printBulletin(row)}
                        >
                          Imprimer
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: 8 }}>
                              Discipline
                            </th>
                            <th style={{ padding: 8 }}>Devoir</th>
                            <th style={{ padding: 8 }}>Comp</th>
                            <th style={{ padding: 8 }}>Moy /20</th>
                            <th style={{ padding: 8 }}>Coef</th>
                            <th style={{ padding: 8 }}>Moy × Coef</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.subjects.map((subject) => (
                            <tr
                              key={`${row.student.id}-${subject.subjectId || subject.subjectName}`}
                            >
                              <td style={{ padding: 8 }}>
                                {subject.subjectName}
                              </td>
                              <td style={{ padding: 8, textAlign: "center" }}>
                                {formatAverage(subject.devoir)}
                              </td>
                              <td style={{ padding: 8, textAlign: "center" }}>
                                {formatAverage(subject.comp)}
                              </td>
                              <td style={{ padding: 8, textAlign: "center", fontWeight: 700 }}>
                                {formatAverage(subject.average)}
                              </td>
                              <td style={{ padding: 8, textAlign: "center" }}>
                                {formatCoefficient(subject.coefficient)}
                              </td>
                              <td style={{ padding: 8, textAlign: "center" }}>
                                {formatAverage(subject.weighted)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {existing && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
                        Statut : <strong>{existing.status}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          BULLETIN IMPRIMABLE — STYLE OFFICIEL
      ===================================================== */}
      {selectedStudent && selectedBulletinRow && (
        <div className="ec-bulletin-print">
          <div className="ec-bulletin-paper">
            <div className="ec-bulletin-header">
              <div>
                <div className="ec-bulletin-school-name">
                  {school?.name || "Établissement"}
                </div>
                <div className="ec-bulletin-school-meta">
                  {school?.address || ""}
                  {school?.city ? <><br />{school.city}</> : null}
                  {school?.phone ? <><br />Tél. : {school.phone}</> : null}
                </div>
              </div>

              <div className="ec-bulletin-title">
                <h1>BULLETIN DE NOTES</h1>
                <h2>{trimesterLabel}</h2>
              </div>

              <div className="ec-bulletin-year">
                <strong>ANNÉE SCOLAIRE</strong>
                <br />
                {school?.academic_year || school?.school_year || "2026 - 2027"}
                <br />
                <span>Document scolaire officiel</span>
              </div>
            </div>

            <div className="ec-bulletin-student-info">
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Prénoms :</span>
                {selectedStudent.first_name || "—"}
              </div>
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Nom :</span>
                {selectedStudent.last_name || "—"}
              </div>
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Date de naissance :</span>
                —
              </div>
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Classe :</span>
                {selectedBulletinRow.className || "—"}
              </div>
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Matricule :</span>
                {selectedStudent.student_code || "—"}
              </div>
              <div className="ec-bulletin-info-cell">
                <span className="ec-bulletin-info-label">Nbre d'élèves :</span>
                {classId
                  ? activeStudents.filter((student) => student.class_id === classId).length || "—"
                  : activeStudents.filter(
                      (student) => student.class_id === selectedStudent.class_id
                    ).length || "—"}
              </div>
            </div>

            <table className="ec-bulletin-table">
              <thead>
                <tr>
                  <th>Disciplines</th>
                  <th>Devoir</th>
                  <th>Comp</th>
                  <th>Moy /20</th>
                  <th>Coef</th>
                  <th>Moy × Coef</th>
                  <th>T.H</th>
                  <th>Rang</th>
                  <th>Appréciations</th>
                </tr>
              </thead>
              <tbody>
                {selectedBulletinRow.subjects.map((subject) => (
                  <tr key={subject.subjectId || subject.subjectName}>
                    <td className="discipline">{subject.subjectName}</td>
                    <td>{formatAverage(subject.devoir)}</td>
                    <td>{formatAverage(subject.comp)}</td>
                    <td><strong>{formatAverage(subject.average)}</strong></td>
                    <td>{formatCoefficient(subject.coefficient)}</td>
                    <td>{formatAverage(subject.weighted)}</td>
                    <td>—</td>
                    <td>—</td>
                    <td className="appreciation">
                      {subject.appreciation || "—"}
                    </td>
                  </tr>
                ))}

                <tr className="ec-bulletin-total">
                  <td className="discipline">TOTAL / MOYENNE GÉNÉRALE</td>
                  <td colSpan={2}>—</td>
                  <td>{formatAverage(selectedBulletinRow.generalAverage)}</td>
                  <td>
                    {formatCoefficient(
                      selectedBulletinRow.subjects.reduce(
                        (sum, subject) => sum + (Number(subject.coefficient) || 0),
                        0
                      )
                    )}
                  </td>
                  <td>
                    {formatAverage(
                      selectedBulletinRow.subjects.reduce(
                        (sum, subject) => sum + (Number(subject.weighted) || 0),
                        0
                      )
                    )}
                  </td>
                  <td>—</td>
                  <td>{classRankMap[selectedStudent.id] || "—"}</td>
                  <td className="appreciation">
                    {selectedBulletinRow.generalAverage === null
                      ? "—"
                      : selectedBulletinRow.generalAverage >= 16
                      ? "Très bon travail"
                      : selectedBulletinRow.generalAverage >= 14
                      ? "Bon travail"
                      : selectedBulletinRow.generalAverage >= 10
                      ? "Travail satisfaisant"
                      : "Doit poursuivre ses efforts"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="ec-bulletin-summary">
              <div className="ec-bulletin-summary-cell">
                <strong>Moyenne :</strong><br />
                {formatAverage(selectedBulletinRow.generalAverage)} / 20
              </div>
              <div className="ec-bulletin-summary-cell">
                <strong>Rang :</strong><br />
                {classRankMap[selectedStudent.id] || "—"}
              </div>
              <div className="ec-bulletin-summary-cell">
                <strong>Retards :</strong><br />
                —
              </div>
              <div className="ec-bulletin-summary-cell">
                <strong>Absences :</strong><br />
                —
              </div>
            </div>

            <div className="ec-bulletin-decision">
              <div className="ec-bulletin-box-title">Décision du conseil</div>
              <span>— Décision à renseigner par l'établissement.</span>

              <div className="ec-bulletin-distinction">
                <span>□ Félicitations</span>
                <span>□ Encouragement</span>
                <span>□ Tableau d'honneur</span>
                <span>□ Avertissement</span>
                <span>□ Blâme</span>
              </div>
            </div>

            <div className="ec-bulletin-bottom">
              <div className="ec-bulletin-box">
                <div className="ec-bulletin-box-title">
                  Observations du conseil des professeurs
                </div>
                <div>—</div>
              </div>

              <div className="ec-bulletin-box">
                <div className="ec-bulletin-box-title">Appréciation générale</div>
                <div>
                  {selectedBulletinRow.generalAverage === null
                    ? "—"
                    : selectedBulletinRow.generalAverage >= 16
                    ? "Excellent ensemble."
                    : selectedBulletinRow.generalAverage >= 14
                    ? "Très bon ensemble."
                    : selectedBulletinRow.generalAverage >= 10
                    ? "Ensemble satisfaisant."
                    : "Des efforts supplémentaires sont nécessaires."}
                </div>
              </div>
            </div>

            <div className="ec-bulletin-signatures">
              <div className="ec-bulletin-signature-box">
                <strong>LE CACHET DE L'ÉTABLISSEMENT</strong>
                {stampUrl ? (
                  <img
                    src={stampUrl}
                    alt="Cachet de l'école"
                    style={{ width: 120, height: 100 }}
                  />
                ) : (
                  <div style={{ marginTop: 55 }}>—</div>
                )}
              </div>

              <div className="ec-bulletin-signature-box">
                <strong>LE CHEF D'ÉTABLISSEMENT</strong>
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Signature du chef d'établissement"
                    style={{ width: 200, height: 90 }}
                  />
                ) : (
                  <div style={{ marginTop: 55 }}>Signature : __________________</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
