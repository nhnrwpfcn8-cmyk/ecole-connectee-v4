import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function AdminEcoleCertificats({
  schoolId,
  onBack,
}) {
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [documentType, setDocumentType] = useState(
    "Certificat de scolarité"
  );

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [place, setPlace] = useState("");
  const [customText, setCustomText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      setError("Aucune école sélectionnée.");
      return;
    }

    loadData();
  }, [schoolId]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        schoolResult,
        studentsResult,
        classesResult,
      ] = await Promise.all([
        supabase
          .from("schools")
          .select(`
            id,
            name,
            address,
            city,
            phone,
            email,
            logo_url,
            stamp_url,
            signature_url
          `)
          .eq("id", schoolId)
          .single(),

        supabase
          .from("students")
          .select(`
            id,
            school_id,
            first_name,
            last_name,
            student_code,
            date_of_birth,
            birth_place,
            class_id
          `)
          .eq("school_id", schoolId)
          .eq("active", true)
          .order("last_name", {
            ascending: true,
          }),

        supabase
          .from("classes")
          .select(`
            id,
            school_id,
            name,
            level
          `)
          .eq("school_id", schoolId)
          .order("name", {
            ascending: true,
          }),
      ]);

      if (schoolResult.error) {
        throw schoolResult.error;
      }

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      if (classesResult.error) {
        throw classesResult.error;
      }

      setSchool(schoolResult.data);
      setStudents(studentsResult.data || []);
      setClasses(classesResult.data || []);

      if (schoolResult.data?.city) {
        setPlace(schoolResult.data.city);
      }
    } catch (err) {
      console.error(
        "Erreur chargement certificats :",
        err
      );

      setError(
        err?.message ||
          "Impossible de charger les données de l'école."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedStudent = useMemo(() => {
    return students.find(
      (student) =>
        String(student.id) ===
        String(selectedStudentId)
    );
  }, [students, selectedStudentId]);

  const selectedClass = useMemo(() => {
    if (!selectedStudent?.class_id) {
      return null;
    }

    return classes.find(
      (classe) =>
        String(classe.id) ===
        String(selectedStudent.class_id)
    );
  }, [classes, selectedStudent]);

  const studentFullName = selectedStudent
    ? `${selectedStudent.first_name || ""} ${
        selectedStudent.last_name || ""
      }`.trim()
    : "Nom de l'élève";

  const currentDate = new Date().toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );

  function formatBirthDate(date) {
    if (!date) {
      return "__________";
    }

    return new Date(date).toLocaleDateString(
      "fr-FR"
    );
  }

  function generateCertificateText() {
    if (!selectedStudent) {
      return "";
    }

    if (
      documentType ===
      "Certificat de scolarité"
    ) {
      return `Nous soussignés, responsables de ${
        school?.name || "l'établissement"
      }, certifions que l'élève ${studentFullName}, né(e) le ${formatBirthDate(
        selectedStudent.date_of_birth
      )}${
        selectedStudent.birth_place
          ? ` à ${selectedStudent.birth_place}`
          : ""
      }, est régulièrement inscrit(e) dans notre établissement pour l'année scolaire ${academicYear}.`;
    }

    if (
      documentType ===
      "Attestation de scolarité"
    ) {
      return `Nous attestons que l'élève ${studentFullName}, ${
        selectedClass?.name
          ? `inscrit(e) en classe de ${selectedClass.name}, `
          : ""
      }est régulièrement scolarisé(e) au sein de ${
        school?.name || "notre établissement"
      } au titre de l'année scolaire ${academicYear}.`;
    }

    if (
      documentType ===
      "Attestation de fréquentation"
    ) {
      return `Nous attestons que l'élève ${studentFullName} fréquente régulièrement ${
        school?.name || "notre établissement"
      } durant l'année scolaire ${academicYear}.`;
    }

    if (
      documentType ===
      "Certificat de fréquentation"
    ) {
      return `Le présent certificat est délivré à ${studentFullName} afin d'attester sa fréquentation régulière de ${
        school?.name || "notre établissement"
      } pendant l'année scolaire ${academicYear}.`;
    }

    return customText.trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildCertificateHtml() {
    const certificateText =
      generateCertificateText();

    const logo = school?.logo_url
      ? `<img src="${escapeHtml(
          school.logo_url
        )}" class="school-logo" alt="Logo de l'école" />`
      : "";

    const stamp = school?.stamp_url
      ? `<img src="${escapeHtml(
          school.stamp_url
        )}" class="stamp-image" alt="Cachet de l'école" />`
      : `<div class="empty-stamp"></div>`;

    const signature = school?.signature_url
      ? `<img src="${escapeHtml(
          school.signature_url
        )}" class="signature-image" alt="Signature de l'école" />`
      : `<div class="empty-signature"></div>`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${escapeHtml(
      documentType
    )} - ${escapeHtml(studentFullName)}</title>

<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
    font-family: Arial, Helvetica, sans-serif;
  }

  body {
    width: 210mm;
    min-height: 297mm;
  }

  .certificate {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    background: #ffffff;
    color: #000000;
    border: 2px solid #000000;
    padding: 15mm 17mm 12mm;
    position: relative;
  }

  .school-logo {
    width: 24mm;
    height: 24mm;
    object-fit: contain;
    display: block;
    margin: 0 auto 3mm;
  }

  .school-name {
    text-align: center;
    font-size: 19px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000000;
    margin-bottom: 2mm;
  }

  .school-info {
    text-align: center;
    font-size: 10px;
    line-height: 1.35;
    color: #000000;
  }

  .separator {
    width: 100%;
    border-top: 1.5px solid #000000;
    margin: 5mm 0 7mm;
  }

  .document-title {
    text-align: center;
    font-size: 19px;
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 8mm;
    color: #000000;
  }

  .document-number {
    text-align: right;
    font-size: 9px;
    margin-bottom: 5mm;
    color: #000000;
  }

  .student-box {
    border: 1px solid #000000;
    padding: 5mm;
    margin-bottom: 7mm;
    color: #000000;
  }

  .student-name {
    font-size: 17px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 4mm;
    color: #000000;
  }

  .student-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm 8mm;
    font-size: 10px;
    line-height: 1.4;
    color: #000000;
  }

  .certificate-body {
    font-size: 12.5px;
    line-height: 1.65;
    text-align: justify;
    color: #000000;
    min-height: 58mm;
    max-height: 64mm;
    overflow: hidden;
  }

  .certificate-body p {
    margin: 0;
  }

  .certificate-date {
    text-align: right;
    margin-top: 5mm;
    font-size: 10px;
    color: #000000;
  }

  .certificate-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25mm;
    margin-top: 12mm;
    color: #000000;
  }

  .signature-area {
    text-align: center;
    min-height: 38mm;
    color: #000000;
  }

  .signature-title {
    font-weight: 700;
    font-size: 10px;
    margin-bottom: 2mm;
    color: #000000;
  }

  .signature-image {
    max-width: 38mm;
    max-height: 20mm;
    object-fit: contain;
    margin: 1mm auto;
  }

  .stamp-image {
    max-width: 30mm;
    max-height: 30mm;
    object-fit: contain;
    margin: 0 auto;
  }

  .empty-stamp,
  .empty-signature {
    height: 24mm;
  }

  .signature-line {
    margin: 2mm auto 0;
    border-top: 1px solid #000000;
    width: 45mm;
  }

  .signature-label {
    margin-top: 1.5mm;
    font-size: 8px;
    color: #000000;
  }

  .footer-note {
    position: absolute;
    bottom: 7mm;
    left: 17mm;
    right: 17mm;
    text-align: center;
    font-size: 7.5px;
    color: #000000;
    border-top: 1px solid #000000;
    padding-top: 2mm;
  }

  @media print {
    html,
    body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
    }

    .certificate {
      page-break-after: avoid;
      page-break-before: avoid;
      page-break-inside: avoid;
    }
  }
</style>
</head>

<body>
  <div class="certificate">

    ${logo}

    <div class="school-name">
      ${escapeHtml(
        school?.name ||
          "Nom de l'établissement"
      )}
    </div>

    <div class="school-info">
      ${
        school?.address
          ? `<div>${escapeHtml(
              school.address
            )}</div>`
          : ""
      }

      ${
        school?.city
          ? `<div>${escapeHtml(
              school.city
            )}</div>`
          : ""
      }

      ${
        school?.phone
          ? `<div>Tél. : ${escapeHtml(
              school.phone
            )}</div>`
          : ""
      }

      ${
        school?.email
          ? `<div>Email : ${escapeHtml(
              school.email
            )}</div>`
          : ""
      }
    </div>

    <div class="separator"></div>

    <div class="document-title">
      ${escapeHtml(documentType)}
    </div>

    <div class="document-number">
      N° : EC-${new Date()
        .getFullYear()
        .toString()}-${escapeHtml(
      selectedStudent?.student_code ||
        "0000"
    )}
    </div>

    <div class="student-box">

      <div class="student-name">
        ${escapeHtml(studentFullName)}
      </div>

      <div class="student-details">

        <div>
          <strong>Date de naissance :</strong>
          ${escapeHtml(
            formatBirthDate(
              selectedStudent?.date_of_birth
            )
          )}
        </div>

        <div>
          <strong>Lieu de naissance :</strong>
          ${escapeHtml(
            selectedStudent?.birth_place ||
              "Non renseigné"
          )}
        </div>

        <div>
          <strong>Classe :</strong>
          ${escapeHtml(
            selectedClass?.name ||
              "Non renseignée"
          )}
        </div>

        <div>
          <strong>Matricule :</strong>
          ${escapeHtml(
            selectedStudent?.student_code ||
              "Non renseigné"
          )}
        </div>

      </div>
    </div>

    <div class="certificate-body">
      ${escapeHtml(certificateText)}
    </div>

    <div class="certificate-date">
      Fait à ${escapeHtml(
        place || "____________"
      )}, le ${escapeHtml(currentDate)}
    </div>

    <div class="certificate-footer">

      <div class="signature-area">
        <div class="signature-title">
          Cachet de l'établissement
        </div>

        ${stamp}

        <div class="signature-line"></div>

        <div class="signature-label">
          Cachet de l'école
        </div>
      </div>

      <div class="signature-area">
        <div class="signature-title">
          Signature de l'établissement
        </div>

        ${signature}

        <div class="signature-line"></div>

        <div class="signature-label">
          Signature
        </div>
      </div>

    </div>

    <div class="footer-note">
      Document officiel délivré par
      ${escapeHtml(
        school?.name ||
          "l'établissement scolaire"
      )}
      — Année scolaire
      ${escapeHtml(academicYear)}
    </div>

  </div>
</body>
</html>
    `.trim();
  }

  async function sendCertificateToParent() {
    if (!selectedStudent) {
      setError("Veuillez sélectionner un élève.");
      return;
    }

    setSending(true);
    setError("");
    setSuccessMessage("");

    try {
      /*
       * On retrouve d'abord le parent lié
       * à l'élève sélectionné.
       */
      const {
        data: parentLinks,
        error: parentLinksError,
      } = await supabase
        .from("parent_students")
        .select(`
          parent_id
        `)
        .eq(
          "student_id",
          selectedStudent.id
        );

      if (parentLinksError) {
        throw parentLinksError;
      }

      const parentIds = (
        parentLinks || []
      )
        .map((item) => item.parent_id)
        .filter(Boolean);

      if (parentIds.length === 0) {
        throw new Error(
          "Aucun parent n'est lié à cet élève."
        );
      }

      /*
       * On vérifie que le parent appartient bien
       * à la même école.
       */
      const {
        data: parents,
        error: parentsError,
      } = await supabase
        .from("parents")
        .select(`
          id,
          school_id
        `)
        .in("id", parentIds)
        .eq("school_id", schoolId)
        .eq("active", true);

      if (parentsError) {
        throw parentsError;
      }

      if (!parents || parents.length === 0) {
        throw new Error(
          "Aucun parent actif de cette école n'est lié à cet élève."
        );
      }

      /*
       * Un certificat est créé pour chaque parent
       * actif lié à l'élève.
       */
      const certificateHtml =
        buildCertificateHtml();

      const fileUrl =
        `data:text/html;charset=utf-8,` +
        encodeURIComponent(
          certificateHtml
        );

      const documents = parents.map(
        (parent) => ({
          school_id: schoolId,
          student_id: selectedStudent.id,
          parent_id: parent.id,
          teacher_id: null,
          title: `${documentType} - ${studentFullName}`,
          document_type: documentType,
          description: `Document officiel transmis au parent pour l'année scolaire ${academicYear}.`,
          file_url: fileUrl,
          file_name: `${documentType
            .replace(/\s+/g, "_")
            .replace(/[^\w-]/g, "")}_${selectedStudent.student_code || selectedStudent.id}.html`,
          created_by: null,
          active: true,
        })
      );

      const {
        error: insertError,
      } = await supabase
        .from("administrative_documents")
        .insert(documents);

      if (insertError) {
        throw insertError;
      }

      setSuccessMessage(
        "Certificat envoyé au parent avec succès."
      );
    } catch (err) {
      console.error(
        "Erreur envoi certificat au parent :",
        err
      );

      setError(
        err?.message ||
          "Impossible d'envoyer le certificat au parent."
      );
    } finally {
      setSending(false);
    }
  }

  function handlePrint() {
    if (!selectedStudent) {
      alert("Veuillez sélectionner un élève.");
      return;
    }

    window.print();
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "#ffffff",
          color: "#000000",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <p style={{ color: "#000000" }}>
          Chargement...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "#ffffff",
          color: "#000000",
          fontFamily:
            "Arial, Helvetica, sans-serif",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            marginBottom: 20,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #000000",
            background: "#ffffff",
            color: "#000000",
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>

        <div
          style={{
            border: "1px solid #000000",
            borderRadius: 10,
            padding: 20,
            color: "#000000",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const certificateText =
    generateCertificateText();

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          color: #000000 !important;
        }

        input,
        select,
        textarea,
        button {
          color: #000000 !important;
        }

        input::placeholder,
        textarea::placeholder {
          color: #000000 !important;
          opacity: 0.6;
        }

        .cert-page {
          min-height: 100vh;
          background: #f5f5f5;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          padding: 24px;
        }

        .cert-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .cert-header {
          background: #ffffff;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .cert-title {
          margin: 0;
          color: #000000;
          font-size: 26px;
        }

        .cert-subtitle {
          margin: 8px 0 0;
          color: #000000;
        }

        .cert-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          align-items: start;
        }

        .cert-panel {
          background: #ffffff;
          border: 1px solid #000000;
          border-radius: 12px;
          padding: 20px;
          color: #000000;
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          margin-bottom: 7px;
          font-weight: 700;
          color: #000000;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid #000000;
          border-radius: 8px;
          background: #ffffff;
          color: #000000;
          font-size: 14px;
        }

        .field textarea {
          min-height: 150px;
          resize: vertical;
        }

        .button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          border: 1px solid #000000;
          border-radius: 8px;
          padding: 11px 15px;
          cursor: pointer;
          font-weight: 700;
          color: #000000 !important;
          background: #ffffff;
        }

        .btn-primary {
          background: #000000;
          color: #ffffff !important;
        }

        .btn-send {
          background: #ffffff;
          color: #000000 !important;
          border: 2px solid #000000;
        }

        .success-message {
          margin-top: 14px;
          padding: 12px;
          border: 1px solid #000000;
          border-radius: 8px;
          background: #ffffff;
          color: #000000;
          font-weight: 700;
        }

        .preview-wrapper {
          overflow-x: auto;
        }

        .certificate {
          width: 794px;
          height: 1123px;
          min-height: 1123px;
          max-height: 1123px;
          margin: 0 auto;
          background: #ffffff;
          color: #000000;
          border: 2px solid #000000;
          padding: 45px 55px;
          position: relative;
          overflow: hidden;
        }

        .school-logo {
          width: 85px;
          height: 85px;
          object-fit: contain;
          display: block;
          margin: 0 auto 8px;
        }

        .school-name {
          text-align: center;
          font-size: 23px;
          font-weight: 800;
          text-transform: uppercase;
          color: #000000;
        }

        .school-info {
          text-align: center;
          font-size: 12px;
          line-height: 1.45;
          color: #000000;
        }

        .separator {
          width: 100%;
          border-top: 2px solid #000000;
          margin: 18px 0 28px;
        }

        .document-title {
          text-align: center;
          font-size: 23px;
          font-weight: 800;
          text-transform: uppercase;
          text-decoration: underline;
          margin-bottom: 34px;
          color: #000000;
        }

        .document-number {
          text-align: right;
          font-size: 12px;
          margin-bottom: 22px;
          color: #000000;
        }

        .student-box {
          border: 1px solid #000000;
          padding: 16px;
          margin-bottom: 24px;
          color: #000000;
        }

        .student-name {
          font-size: 20px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 12px;
          color: #000000;
        }

        .student-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px 20px;
          font-size: 13px;
          color: #000000;
        }

        .certificate-body {
          font-size: 16px;
          line-height: 1.8;
          text-align: justify;
          color: #000000;
          min-height: 200px;
          max-height: 220px;
          overflow: hidden;
        }

        .certificate-body p {
          margin: 0;
        }

        .certificate-footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-top: 45px;
          color: #000000;
        }

        .signature-area {
          text-align: center;
          min-height: 150px;
          color: #000000;
        }

        .signature-title {
          font-weight: 700;
          margin-bottom: 8px;
          color: #000000;
        }

        .signature-image {
          max-width: 180px;
          max-height: 90px;
          object-fit: contain;
          margin: 10px auto;
        }

        .stamp-image {
          max-width: 130px;
          max-height: 130px;
          object-fit: contain;
          margin: 5px auto;
        }

        .signature-line {
          margin-top: 20px;
          border-top: 1px solid #000000;
          width: 180px;
          margin-left: auto;
          margin-right: auto;
        }

        .certificate-date {
          text-align: right;
          margin-top: 25px;
          font-size: 13px;
          color: #000000;
        }

        .footer-note {
          position: absolute;
          bottom: 25px;
          left: 55px;
          right: 55px;
          text-align: center;
          font-size: 10px;
          color: #000000;
          border-top: 1px solid #000000;
          padding-top: 7px;
        }

        @media (max-width: 900px) {
          .cert-layout {
            grid-template-columns: 1fr;
          }

          .certificate {
            transform-origin: top left;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .cert-page {
            padding: 0 !important;
            background: #ffffff !important;
            min-height: 0 !important;
          }

          .cert-container {
            max-width: none !important;
          }

          .preview-wrapper {
            overflow: visible !important;
          }

          .certificate {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            border: none;
            margin: 0;
            padding: 15mm 17mm 12mm;
            overflow: hidden !important;
            page-break-after: avoid;
            page-break-before: avoid;
            page-break-inside: avoid;
          }

          .certificate * {
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="cert-page">
        <div className="cert-container">

          <div className="cert-header no-print">
            <button
              type="button"
              onClick={onBack}
              className="btn"
              style={{ marginBottom: 15 }}
            >
              ← Retour
            </button>

            <h1 className="cert-title">
              Certificats et attestations scolaires
            </h1>

            <p className="cert-subtitle">
              Création de documents officiels pour
              les élèves de cette école.
            </p>
          </div>

          <div className="cert-layout">

            <div className="cert-panel no-print">

              <div className="field">
                <label>
                  Élève
                </label>

                <select
                  value={selectedStudentId}
                  onChange={(event) => {
                    setSelectedStudentId(
                      event.target.value
                    );
                    setSuccessMessage("");
                    setError("");
                  }}
                >
                  <option value="">
                    Choisir un élève
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.first_name}{" "}
                      {student.last_name}
                      {student.student_code
                        ? ` — ${student.student_code}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>
                  Type de document
                </label>

                <select
                  value={documentType}
                  onChange={(event) => {
                    setDocumentType(
                      event.target.value
                    );
                    setSuccessMessage("");
                    setError("");
                  }}
                >
                  <option>
                    Certificat de scolarité
                  </option>

                  <option>
                    Attestation de scolarité
                  </option>

                  <option>
                    Attestation de fréquentation
                  </option>

                  <option>
                    Certificat de fréquentation
                  </option>

                  <option>
                    Autre document
                  </option>
                </select>
              </div>

              <div className="field">
                <label>
                  Année scolaire
                </label>

                <input
                  type="text"
                  value={academicYear}
                  onChange={(event) =>
                    setAcademicYear(
                      event.target.value
                    )
                  }
                  placeholder="2026-2027"
                />
              </div>

              <div className="field">
                <label>
                  Lieu de délivrance
                </label>

                <input
                  type="text"
                  value={place}
                  onChange={(event) =>
                    setPlace(event.target.value)
                  }
                  placeholder="Dakar"
                />
              </div>

              {documentType ===
                "Autre document" && (
                <div className="field">
                  <label>
                    Texte du document
                  </label>

                  <textarea
                    value={customText}
                    onChange={(event) =>
                      setCustomText(
                        event.target.value
                      )
                    }
                    placeholder="Saisissez le contenu du document..."
                  />
                </div>
              )}

              <div
                style={{
                  borderTop:
                    "1px solid #000000",
                  paddingTop: 15,
                  marginTop: 15,
                  marginBottom: 15,
                }}
              >
                <strong
                  style={{
                    color: "#000000",
                  }}
                >
                  Élève sélectionné
                </strong>

                <p
                  style={{
                    color: "#000000",
                    marginBottom: 4,
                  }}
                >
                  {selectedStudent
                    ? studentFullName
                    : "Aucun élève"}
                </p>

                {selectedClass && (
                  <p
                    style={{
                      color: "#000000",
                      marginTop: 4,
                    }}
                  >
                    Classe :{" "}
                    {selectedClass.name}
                  </p>
                )}
              </div>

              <div className="button-row">

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePrint}
                >
                  🖨️ Imprimer / PDF
                </button>

                <button
                  type="button"
                  className="btn btn-send"
                  onClick={
                    sendCertificateToParent
                  }
                  disabled={
                    sending ||
                    !selectedStudent
                  }
                >
                  {sending
                    ? "Envoi en cours..."
                    : "📨 Envoyer au parent"}
                </button>

              </div>

              {successMessage && (
                <div className="success-message">
                  {successMessage}
                </div>
              )}

              <p
                style={{
                  color: "#000000",
                  fontSize: 12,
                  lineHeight: 1.5,
                  marginTop: 15,
                }}
              >
                Le certificat est préparé sur
                une seule page A4. Le bouton
                « Envoyer au parent » transmet le
                document au parent lié à l'élève.
              </p>
            </div>

            <div className="preview-wrapper">
              <div className="certificate">

                {school?.logo_url && (
                  <img
                    src={school.logo_url}
                    alt="Logo de l'école"
                    className="school-logo"
                  />
                )}

                <div className="school-name">
                  {school?.name ||
                    "Nom de l'établissement"}
                </div>

                <div className="school-info">
                  {school?.address && (
                    <div>
                      {school.address}
                    </div>
                  )}

                  {school?.city && (
                    <div>
                      {school.city}
                    </div>
                  )}

                  {school?.phone && (
                    <div>
                      Tél. : {school.phone}
                    </div>
                  )}

                  {school?.email && (
                    <div>
                      Email : {school.email}
                    </div>
                  )}
                </div>

                <div className="separator" />

                <div className="document-title">
                  {documentType}
                </div>

                <div className="document-number">
                  N° : EC-
                  {new Date()
                    .getFullYear()
                    .toString()}
                  -
                  {selectedStudent?.student_code ||
                    "0000"}
                </div>

                <div className="student-box">

                  <div className="student-name">
                    {studentFullName}
                  </div>

                  {selectedStudent ? (
                    <div className="student-details">

                      <div>
                        <strong>
                          Date de naissance :
                        </strong>{" "}
                        {formatBirthDate(
                          selectedStudent.date_of_birth
                        )}
                      </div>

                      <div>
                        <strong>
                          Lieu de naissance :
                        </strong>{" "}
                        {selectedStudent.birth_place ||
                          "Non renseigné"}
                      </div>

                      <div>
                        <strong>
                          Classe :
                        </strong>{" "}
                        {selectedClass?.name ||
                          "Non renseignée"}
                      </div>

                      <div>
                        <strong>
                          Matricule :
                        </strong>{" "}
                        {selectedStudent.student_code ||
                          "Non renseigné"}
                      </div>

                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#000000",
                      }}
                    >
                      Veuillez sélectionner un
                      élève.
                    </div>
                  )}

                </div>

                <div className="certificate-body">
                  {certificateText ? (
                    <p>
                      {certificateText}
                    </p>
                  ) : (
                    <p>
                      Le contenu du document
                      apparaîtra ici après
                      sélection de l'élève.
                    </p>
                  )}
                </div>

                <div className="certificate-date">
                  Fait à{" "}
                  {place || "____________"}, le{" "}
                  {currentDate}
                </div>

                <div className="certificate-footer">

                  <div className="signature-area">
                    <div className="signature-title">
                      Cachet de l'établissement
                    </div>

                    {school?.stamp_url ? (
                      <img
                        src={school.stamp_url}
                        alt="Cachet de l'école"
                        className="stamp-image"
                      />
                    ) : (
                      <>
                        <div
                          style={{
                            height: 100,
                            color: "#000000",
                          }}
                        />

                        <div className="signature-line" />

                        <div
                          style={{
                            marginTop: 8,
                            color: "#000000",
                            fontSize: 12,
                          }}
                        >
                          Cachet de l'école
                        </div>
                      </>
                    )}
                  </div>

                  <div className="signature-area">
                    <div className="signature-title">
                      Signature de l'établissement
                    </div>

                    {school?.signature_url ? (
                      <img
                        src={school.signature_url}
                        alt="Signature de l'école"
                        className="signature-image"
                      />
                    ) : (
                      <div
                        style={{
                          height: 100,
                          color: "#000000",
                        }}
                      />
                    )}

                    <div className="signature-line" />

                    <div
                      style={{
                        marginTop: 8,
                        color: "#000000",
                        fontSize: 12,
                      }}
                    >
                      Signature
                    </div>
                  </div>

                </div>

                <div className="footer-note">
                  Document officiel délivré par{" "}
                  {school?.name ||
                    "l'établissement scolaire"}{" "}
                  — Année scolaire{" "}
                  {academicYear}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
