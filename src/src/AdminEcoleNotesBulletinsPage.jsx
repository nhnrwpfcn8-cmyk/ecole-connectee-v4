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
  if (value === null || value === undefined) return "-";

  return Number(value).toFixed(2).replace(".", ",");
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

  /* =========================================================
     DONNÉES FILTRÉES
  ========================================================= */

  const activeStudents = useMemo(
    () =>
      students.filter(
        (student) => student.active !== false
      ),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = normalize(search);

    return activeStudents.filter((student) => {
      const matchesClass =
        !classId || student.class_id === classId;

      const haystack = normalize(
        `${fullStudentName(student)} ${
          student.student_code || ""
        }`
      );

      return (
        matchesClass &&
        (!query || haystack.includes(query))
      );
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
      activeStudents.find(
        (student) => student.id === studentId
      ) || null,
    [activeStudents, studentId]
  );

  const classMap = useMemo(
    () =>
      Object.fromEntries(
        classes.map((item) => [item.id, item])
      ),
    [classes]
  );

  const subjectMap = useMemo(
    () =>
      Object.fromEntries(
        subjects.map((item) => [item.id, item])
      ),
    [subjects]
  );

  const gradeRows = useMemo(() => {
    return grades
      .filter(
        (grade) => grade.trimester === trimester
      )
      .filter(
        (grade) =>
          !classId || grade.class_id === classId
      )
      .filter(
        (grade) =>
          !studentId ||
          grade.student_id === studentId
      )
      .filter(
        (grade) =>
          !assessmentId ||
          grade.assessment_id === assessmentId
      );
  }, [
    grades,
    trimester,
    classId,
    studentId,
    assessmentId,
  ]);

  /* =========================================================
     CALCUL DES BULLETINS
  ========================================================= */

  const bulletinRows = useMemo(() => {
    const sourceStudents = studentId
      ? activeStudents.filter(
          (student) => student.id === studentId
        )
      : filteredStudents;

    return sourceStudents.map((student) => {
      const studentGrades = grades.filter(
        (grade) =>
          grade.student_id === student.id &&
          grade.trimester === trimester
      );

      const bySubject = {};

      studentGrades.forEach((grade) => {
        const key = String(
          grade.subject_id || "unknown"
        );

        if (!bySubject[key]) {
          bySubject[key] = [];
        }

        bySubject[key].push(grade);
      });

      const subjectsRows = Object.entries(
        bySubject
      ).map(([subjectKey, rows]) => {
        const weighted = rows.reduce(
          (sum, row) => {
            const score = Number(row.score);
            const max =
              Number(row.max_score) || 20;
            const coefficient =
              Number(row.coefficient) || 1;

            if (!Number.isFinite(score)) {
              return sum;
            }

            return (
              sum +
              (score / max) *
                20 *
                coefficient
            );
          },
          0
        );

        const coefficients = rows.reduce(
          (sum, row) =>
            sum +
            (Number(row.coefficient) || 1),
          0
        );

        return {
          subjectId:
            subjectKey === "unknown"
              ? null
              : subjectKey,

          subjectName:
            subjectMap[subjectKey]?.name ||
            "Matière",

          average: coefficients
            ? weighted / coefficients
            : null,

          coefficient: coefficients || 1,
        };
      });

      const allScores = subjectsRows
        .filter(
          (row) => row.average !== null
        )
        .map((row) => row.average);

      return {
        student,

        className:
          classMap[student.class_id]?.name ||
          "-",

        subjects: subjectsRows,

        generalAverage:
          average(allScores),
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
  ]);

  /* =========================================================
     STORAGE : CACHEt / SIGNATURE
  ========================================================= */

  async function createSignedBrandingUrl(path) {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const { data, error: storageError } =
      await supabase.storage
        .from("school-branding")
        .createSignedUrl(
          path,
          60 * 60
        );

    if (storageError) {
      console.error(
        "Erreur URL branding :",
        storageError
      );

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
        .order("last_name", {
          ascending: true,
        }),

      supabase
        .from("classes")
        .select(
          "id, school_id, name, level"
        )
        .eq("school_id", schoolId)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("subjects")
        .select("id, name")
        .order("name", {
          ascending: true,
        }),

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
          trimester,
          max_score,
          evaluation_date,
          coefficient,
          published,
          created_at
        `
        )
        .eq("school_id", schoolId)
        .order("evaluation_date", {
          ascending: false,
        }),

      supabase
        .from("grades")
        .select(
          `
          id,
          school_id,
          student_id,
          teacher_id,
          assessment_id,
          class_id,
          subject_id,
          score,
          stars,
          appreciation,
          comment,
          created_at,
          updated_at
        `
        )
        .eq("school_id", schoolId)
        .order("updated_at", {
          ascending: false,
        }),

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
        .order("created_at", {
          ascending: false,
        }),
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
      console.error(
        "Erreur Notes/Bulletins :",
        firstError
      );

      setError(
        firstError.message ||
          "Impossible de charger les données."
      );
    }

    const loadedSchool =
      schoolResult.data || null;

    setSchool(loadedSchool);

    setStudents(
      studentsResult.data || []
    );

    setClasses(
      classesResult.data || []
    );

    setSubjects(
      subjectsResult.data || []
    );

    setAssessments(
      assessmentsResult.data || []
    );

    setGrades(
      gradesResult.data || []
    );

    setBulletins(
      bulletinsResult.data || []
    );

    if (loadedSchool) {
      const [stamp, signature] =
        await Promise.all([
          createSignedBrandingUrl(
            loadedSchool.stamp_url
          ),

          createSignedBrandingUrl(
            loadedSchool.signature_url
          ),
        ]);

      setStampUrl(stamp);
      setSignatureUrl(signature);
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
          generated_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
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
          created_by:
            profile?.id || null,
          generated_at:
            new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error(
        "Erreur création bulletin :",
        result.error
      );

      setError(
        result.error.message ||
          "Impossible de créer le bulletin."
      );
    } else {
      setMessage(
        "Bulletin préparé avec succès."
      );

      await loadAll();

      setSelectedBulletin(
        result.data
      );
    }

    setSaving(false);
  }

  async function validateBulletin(
    bulletin
  ) {
    if (!bulletin?.id) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("bulletins")
        .update({
          status: "validated",

          validated_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", bulletin.id)
        .eq("school_id", schoolId);

    if (updateError) {
      setError(
        updateError.message ||
          "Impossible de valider le bulletin."
      );
    } else {
      setMessage(
        "Bulletin validé avec succès."
      );

      await loadAll();
    }

    setSaving(false);
  }

  /* =========================================================
     IMPRESSION
  ========================================================= */

  function printBulletin(row) {
    setSelectedBulletin({
      ...row,
      printMode: true,
    });

    setTimeout(() => {
      window.print();
    }, 200);
  }

  /* =========================================================
     CHARGEMENT
  ========================================================= */

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="ec-card">
          <h2>
            Notes & Bulletins
          </h2>

          <p>
            Chargement des données
            de l'établissement...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     INTERFACE
  ========================================================= */

  return (
    <div style={{ padding: 24 }}>
      <style>
        {`
          @media print {
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
              background: white;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* EN-TÊTE */}

      <div
        className="ec-card"
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              📝 Notes & Bulletins
            </h2>

            <p
              style={{
                marginTop: 6,
              }}
            >
              Gestion académique de{" "}
              {school?.name ||
                "l'établissement"}
            </p>
          </div>

          <select
            value={trimester}
            onChange={(event) => {
              setTrimester(
                event.target.value
              );

              setAssessmentId("");
            }}
            style={{
              padding: 10,
              borderRadius: 8,
              border:
                "1px solid #cbd5e1",
            }}
          >
            {TRIMESTERS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* MESSAGES */}

      {error && (
        <div
          className="ec-error-card"
          style={{
            marginBottom: 16,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div
          className="ec-success-card"
          style={{
            marginBottom: 16,
          }}
        >
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
          onClick={() =>
            setActiveTab("notes")
          }
        >
          📝 Notes
        </button>

        <button
          className="ec-btn"
          onClick={() =>
            setActiveTab("bulletins")
          }
        >
          📄 Bulletins
        </button>
      </div>

      {/* =====================================================
          NOTES
      ===================================================== */}

      {activeTab === "notes" && (
        <div className="ec-card">
          <h3>
            Notes des élèves
          </h3>

          <div
            className="no-print"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {/* CLASSE */}

            <select
              value={classId}
              onChange={(event) => {
                setClassId(
                  event.target.value
                );

                setStudentId("");
              }}
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            >
              <option value="">
                Toutes les classes
              </option>

              {classes.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>

            {/* ÉVALUATION */}

            <select
              value={assessmentId}
              onChange={(event) =>
                setAssessmentId(
                  event.target.value
                )
              }
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            >
              <option value="">
                Toutes les évaluations
              </option>

              {trimesterAssessments.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.title}
                  </option>
                )
              )}
            </select>

            {/* RECHERCHE */}

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Rechercher un élève..."
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            />
          </div>

          {gradeRows.length === 0 ? (
            <p>
              Aucune note enregistrée
              pour les filtres sélectionnés.
            </p>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign:
                          "left",
                        padding: 10,
                      }}
                    >
                      Élève
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding: 10,
                      }}
                    >
                      Évaluation
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding: 10,
                      }}
                    >
                      Matière
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding: 10,
                      }}
                    >
                      Note
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding: 10,
                      }}
                    >
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {gradeRows.map(
                    (grade) => {
                      const student =
                        activeStudents.find(
                          (item) =>
                            item.id ===
                            grade.student_id
                        );

                      const assessment =
                        assessments.find(
                          (item) =>
                            item.id ===
                            grade.assessment_id
                        );

                      return (
                        <tr
                          key={grade.id}
                        >
                          <td
                            style={{
                              padding: 10,
                            }}
                          >
                            {fullStudentName(
                              student
                            )}
                          </td>

                          <td
                            style={{
                              padding: 10,
                            }}
                          >
                            {assessment?.title ||
                              "-"}
                          </td>

                          <td
                            style={{
                              padding: 10,
                            }}
                          >
                            {subjectMap[
                              grade.subject_id
                            ]?.name || "-"}
                          </td>

                          <td
                            style={{
                              padding: 10,
                              fontWeight: 700,
                            }}
                          >
                            {grade.score ??
                              "-"}{" "}
                            /{" "}
                            {assessment?.max_score ||
                              20}
                          </td>

                          <td
                            style={{
                              padding: 10,
                            }}
                          >
                            {formatDate(
                              assessment?.evaluation_date
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
      )}

      {/* =====================================================
          BULLETINS
      ===================================================== */}

      {activeTab === "bulletins" && (
        <div className="ec-card">
          <div
            className="no-print"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {/* CLASSE */}

            <select
              value={classId}
              onChange={(event) => {
                setClassId(
                  event.target.value
                );

                setStudentId("");
              }}
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            >
              <option value="">
                Toutes les classes
              </option>

              {classes.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}
            </select>

            {/* ÉLÈVE */}

            <select
              value={studentId}
              onChange={(event) =>
                setStudentId(
                  event.target.value
                )
              }
              style={{
                padding: 10,
                borderRadius: 8,
                border:
                  "1px solid #cbd5e1",
              }}
            >
              <option value="">
                Tous les élèves
              </option>

              {filteredStudents.map(
                (student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {fullStudentName(
                      student
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <h3>
            Préparation des bulletins —{" "}
            {
              TRIMESTERS.find(
                (item) =>
                  item.value ===
                  trimester
              )?.label
            }
          </h3>

          {bulletinRows.length === 0 ? (
            <p>
              Aucun élève disponible.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {bulletinRows.map(
                (row) => {
                  const existing =
                    bulletins.find(
                      (bulletin) =>
                        bulletin.student_id ===
                          row.student.id &&
                        bulletin.trimester ===
                          trimester
                    );

                  return (
                    <div
                      key={row.student.id}
                      style={{
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            {fullStudentName(
                              row.student
                            )}
                          </strong>

                          <div
                            style={{
                              color:
                                "#64748b",
                              marginTop: 4,
                            }}
                          >
                            {row.className} ·
                            Moyenne :{" "}
                            <strong>
                              {formatAverage(
                                row.generalAverage
                              )}{" "}
                              / 20
                            </strong>
                          </div>
                        </div>

                        <div
                          className="no-print"
                          style={{
                            display:
                              "flex",
                            gap: 8,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            className="ec-btn"
                            disabled={saving}
                            onClick={() =>
                              createBulletin(
                                row.student
                              )
                            }
                          >
                            Générer
                          </button>

                          {existing && (
                            <button
                              className="ec-btn"
                              disabled={saving}
                              onClick={() =>
                                validateBulletin(
                                  existing
                                )
                              }
                            >
                              Valider
                            </button>
                          )}

                          <button
                            className="ec-btn"
                            onClick={() => {
                              setStudentId(
                                row.student.id
                              );

                              setSelectedBulletin(
                                existing || {
                                  student_id:
                                    row.student.id,
                                  trimester,
                                }
                              );

                              setTimeout(
                                () =>
                                  window.print(),
                                200
                              );
                            }}
                          >
                            Imprimer
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          overflowX:
                            "auto",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse:
                              "collapse",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  textAlign:
                                    "left",
                                  padding: 8,
                                }}
                              >
                                Matière
                              </th>

                              <th
                                style={{
                                  textAlign:
                                    "left",
                                  padding: 8,
                                }}
                              >
                                Moyenne
                              </th>

                              <th
                                style={{
                                  textAlign:
                                    "left",
                                  padding: 8,
                                }}
                              >
                                Coefficient
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {row.subjects.map(
                              (subject) => (
                                <tr
                                  key={`${row.student.id}-${subject.subjectId || subject.subjectName}`}
                                >
                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {
                                      subject.subjectName
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {formatAverage(
                                      subject.average
                                    )}{" "}
                                    / 20
                                  </td>

                                  <td
                                    style={{
                                      padding: 8,
                                    }}
                                  >
                                    {
                                      subject.coefficient
                                    }
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                      {existing && (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 13,
                            color:
                              "#475569",
                          }}
                        >
                          Statut :{" "}
                          <strong>
                            {existing.status}
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          APERÇU BULLETIN
      ===================================================== */}

      {selectedBulletin &&
        studentId && (
          <div
            className="ec-bulletin-print"
            style={{
              background: "white",
              padding: 36,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: 20,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                  }}
                >
                  {school?.name ||
                    "Établissement"}
                </h1>

                <div>
                  {school?.address ||
                    ""}
                </div>

                <div>
                  {school?.city ||
                    ""}
                </div>

                <div>
                  {school?.phone ||
                    ""}
                </div>
              </div>

              {stampUrl && (
                <img
                  src={stampUrl}
                  alt="Cachet de l'école"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit:
                      "contain",
                  }}
                />
              )}
            </div>

            <hr />

            <h2
              style={{
                textAlign:
                  "center",
              }}
            >
              BULLETIN SCOLAIRE
            </h2>

            <p>
              <strong>
                Élève :
              </strong>{" "}
              {fullStudentName(
                selectedStudent
              )}
            </p>

            <p>
              <strong>
                Classe :
              </strong>{" "}
              {
                classMap[
                  selectedStudent.class_id
                ]?.name || "-"
              }
            </p>

            <p>
              <strong>
                Période :
              </strong>{" "}
              {
                TRIMESTERS.find(
                  (item) =>
                    item.value ===
                    trimester
                )?.label
              }
            </p>

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                marginTop: 20,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border:
                        "1px solid #111",
                      padding: 8,
                    }}
                  >
                    Matière
                  </th>

                  <th
                    style={{
                      border:
                        "1px solid #111",
                      padding: 8,
                    }}
                  >
                    Moyenne
                  </th>

                  <th
                    style={{
                      border:
                        "1px solid #111",
                      padding: 8,
                    }}
                  >
                    Coefficient
                  </th>
                </tr>
              </thead>

              <tbody>
                {bulletinRows
                  .find(
                    (row) =>
                      row.student.id ===
                      selectedStudent.id
                  )
                  ?.subjects.map(
                    (subject) => (
                      <tr
                        key={
                          subject.subjectName
                        }
                      >
                        <td
                          style={{
                            border:
                              "1px solid #111",
                            padding: 8,
                          }}
                        >
                          {
                            subject.subjectName
                          }
                        </td>

                        <td
                          style={{
                            border:
                              "1px solid #111",
                            padding: 8,
                          }}
                        >
                          {formatAverage(
                            subject.average
                          )}{" "}
                          / 20
                        </td>

                        <td
                          style={{
                            border:
                              "1px solid #111",
                            padding: 8,
                          }}
                        >
                          {
                            subject.coefficient
                          }
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginTop: 50,
                gap: 30,
              }}
            >
              <div>
                <strong>
                  Le cachet
                </strong>

                {stampUrl && (
                  <img
                    src={stampUrl}
                    alt="Cachet"
                    style={{
                      display: "block",
                      width: 120,
                      height: 120,
                      objectFit:
                        "contain",
                    }}
                  />
                )}
              </div>

              <div>
                <strong>
                  Signature
                </strong>

                {signatureUrl && (
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    style={{
                      display: "block",
                      width: 180,
                      height: 80,
                      objectFit:
                        "contain",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
