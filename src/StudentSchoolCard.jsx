import React from "react";

export default function StudentSchoolCard({
  student,
  schoolName = "École Connectée",
  className = "",
  schoolYear = "2026 - 2027",
  onClose,
}) {
  if (!student) {
    return null;
  }

  const fullName = `${student.first_name || ""} ${
    student.last_name || ""
  }`.trim();

  const birthDate = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString(
        "fr-FR"
      )
    : "Non renseignée";

  const studentCode =
    student.student_code || "Non renseigné";

  /*
   * Données non sensibles utilisées par le QR Code.
   *
   * Plus tard, ce contenu pourra être remplacé par
   * une URL sécurisée permettant de contrôler
   * l'entrée et la sortie de l'élève.
   */
  const qrData = student.qr_token || "";

  const qrCodeUrl =
    "https://api.qrserver.com/v1/create-qr-code/?" +
    new URLSearchParams({
      size: "180x180",
      margin: "0",
      data: qrData,
    }).toString();

  const photoUrl =
    student.photo_url ||
    "https://placehold.co/180x220?text=Photo";

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>
        {`
          .ec-school-card-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(15, 23, 42, 0.72);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
          }

          .ec-school-card-container {
            width: 100%;
            max-width: 760px;
          }

          .ec-school-card-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }

          .ec-school-card-button {
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
          }

          .ec-school-card-close {
            background: #ffffff;
            color: #111827;
          }

          .ec-school-card-print {
            background: #111827;
            color: #ffffff;
          }

          .ec-school-card {
            position: relative;
            width: 100%;
            aspect-ratio: 1.586 / 1;
            min-height: 400px;
            overflow: hidden;
            border-radius: 20px;
            background:
              radial-gradient(
                circle at 90% 15%,
                rgba(59, 130, 246, 0.10) 0,
                rgba(59, 130, 246, 0.10) 10%,
                transparent 11%
              ),
              radial-gradient(
                circle at 75% 65%,
                rgba(16, 185, 129, 0.08) 0,
                rgba(16, 185, 129, 0.08) 14%,
                transparent 15%
              ),
              #ffffff;
            border: 2px solid #1f2937;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            color: #111827;
          }

          .ec-school-card::before {
            content: "";
            position: absolute;
            width: 230px;
            height: 230px;
            right: -70px;
            bottom: -90px;
            border-radius: 50%;
            border: 35px solid rgba(16, 185, 129, 0.06);
          }

          .ec-school-card-header {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 22px 28px 10px;
          }

          .ec-school-card-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .ec-school-card-logo {
            width: 58px;
            height: 58px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111827;
            color: #ffffff;
            font-weight: 800;
            font-size: 18px;
          }

          .ec-school-card-brand-title {
            font-size: 20px;
            font-weight: 800;
            line-height: 1.1;
          }

          .ec-school-card-brand-subtitle {
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }

          .ec-school-card-qr {
            width: 105px;
            height: 105px;
            object-fit: contain;
            background: #ffffff;
            padding: 5px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          .ec-school-card-content {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 24px;
            padding: 14px 28px 24px;
          }

          .ec-school-card-photo-container {
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }

          .ec-school-card-photo {
            width: 135px;
            height: 165px;
            object-fit: cover;
            border-radius: 12px;
            border: 3px solid #ffffff;
            box-shadow:
              0 0 0 1px #cbd5e1,
              0 8px 20px rgba(15, 23, 42, 0.12);
            background: #f1f5f9;
          }

          .ec-school-card-student {
            min-width: 0;
          }

          .ec-school-card-type {
            display: inline-block;
            font-size: 16px;
            font-weight: 800;
            margin-bottom: 12px;
          }

          .ec-school-card-name {
            font-size: 24px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 14px;
            word-break: break-word;
          }

          .ec-school-card-info {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 24px;
          }

          .ec-school-card-info-item {
            min-width: 0;
          }

          .ec-school-card-info-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 2px;
          }

          .ec-school-card-info-value {
            font-size: 13px;
            font-weight: 700;
            color: #111827;
            word-break: break-word;
          }

          .ec-school-card-footer {
            position: absolute;
            left: 28px;
            right: 28px;
            bottom: 12px;
            z-index: 3;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #64748b;
            font-weight: 600;
          }

          @media (max-width: 650px) {
            .ec-school-card {
              aspect-ratio: auto;
              min-height: 0;
            }

            .ec-school-card-header {
              padding: 16px;
            }

            .ec-school-card-logo {
              width: 45px;
              height: 45px;
              font-size: 14px;
            }

            .ec-school-card-brand-title {
              font-size: 15px;
            }

            .ec-school-card-qr {
              width: 80px;
              height: 80px;
            }

            .ec-school-card-content {
              grid-template-columns: 95px 1fr;
              gap: 14px;
              padding: 10px 16px 50px;
            }

            .ec-school-card-photo {
              width: 90px;
              height: 115px;
            }

            .ec-school-card-type {
              font-size: 13px;
            }

            .ec-school-card-name {
              font-size: 17px;
            }

            .ec-school-card-info {
              grid-template-columns: 1fr;
              gap: 7px;
            }

            .ec-school-card-footer {
              left: 16px;
              right: 16px;
            }
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            .ec-school-card,
            .ec-school-card * {
              visibility: visible !important;
            }

            .ec-school-card-overlay {
              position: static !important;
              background: #ffffff !important;
              padding: 0 !important;
              display: block !important;
            }

            .ec-school-card-container {
              max-width: none !important;
            }

            .ec-school-card-actions {
              display: none !important;
            }

            .ec-school-card {
              width: 85.6mm !important;
              height: 54mm !important;
              min-height: 0 !important;
              aspect-ratio: auto !important;
              margin: 20mm auto !important;
              border-radius: 4mm !important;
              box-shadow: none !important;
              border: 0.4mm solid #111827 !important;
              page-break-inside: avoid !important;
            }

            .ec-school-card-header {
              padding: 3mm 4mm 1mm !important;
            }

            .ec-school-card-logo {
              width: 11mm !important;
              height: 11mm !important;
              border-radius: 2mm !important;
              font-size: 3.5mm !important;
            }

            .ec-school-card-brand-title {
              font-size: 4mm !important;
            }

            .ec-school-card-brand-subtitle {
              font-size: 2mm !important;
            }

            .ec-school-card-qr {
              width: 18mm !important;
              height: 18mm !important;
            }

            .ec-school-card-content {
              grid-template-columns: 25mm 1fr !important;
              gap: 3mm !important;
              padding: 1mm 4mm 4mm !important;
            }

            .ec-school-card-photo {
              width: 23mm !important;
              height: 28mm !important;
              border-radius: 2mm !important;
            }

            .ec-school-card-type {
              font-size: 3mm !important;
              margin-bottom: 2mm !important;
            }

            .ec-school-card-name {
              font-size: 5mm !important;
              margin-bottom: 2mm !important;
            }

            .ec-school-card-info {
              gap: 1.5mm 5mm !important;
            }

            .ec-school-card-info-label {
              font-size: 1.7mm !important;
            }

            .ec-school-card-info-value {
              font-size: 2.5mm !important;
            }

            .ec-school-card-footer {
              left: 4mm !important;
              right: 4mm !important;
              bottom: 2mm !important;
              font-size: 1.7mm !important;
            }
          }
        `}
      </style>

      <div className="ec-school-card-overlay">
        <div className="ec-school-card-container">
          <div className="ec-school-card-actions">
            {onClose && (
              <button
                type="button"
                className="ec-school-card-button ec-school-card-close"
                onClick={onClose}
              >
                ← Fermer
              </button>
            )}

            <button
              type="button"
              className="ec-school-card-button ec-school-card-print"
              onClick={handlePrint}
            >
              🖨️ Imprimer la carte
            </button>
          </div>

          <div className="ec-school-card">
            <div className="ec-school-card-header">
              <div className="ec-school-card-brand">
                <div className="ec-school-card-logo">
                  EC
                </div>

                <div>
                  <div className="ec-school-card-brand-title">
                    {schoolName}
                  </div>

                  <div className="ec-school-card-brand-subtitle">
                    CARTE D'IDENTITÉ SCOLAIRE
                  </div>
                </div>
              </div>

              <img
                src={qrCodeUrl}
                alt="QR Code de l'élève"
                className="ec-school-card-qr"
              />
            </div>

            <div className="ec-school-card-content">
              <div className="ec-school-card-photo-container">
                <img
                  src={photoUrl}
                  alt={`Photo de ${fullName}`}
                  className="ec-school-card-photo"
                  onError={(event) => {
                    event.currentTarget.src =
                      "https://placehold.co/180x220?text=Photo";
                  }}
                />
              </div>

              <div className="ec-school-card-student">
                <div className="ec-school-card-type">
                  Élève / Élève
                </div>

                <div className="ec-school-card-name">
                  {fullName || "Nom de l'élève"}
                </div>

                <div className="ec-school-card-info">
                  <div className="ec-school-card-info-item">
                    <div className="ec-school-card-info-label">
                      Date de naissance
                    </div>

                    <div className="ec-school-card-info-value">
                      {birthDate}
                    </div>
                  </div>

                  <div className="ec-school-card-info-item">
                    <div className="ec-school-card-info-label">
                      Matricule
                    </div>

                    <div className="ec-school-card-info-value">
                      {studentCode}
                    </div>
                  </div>

                  <div className="ec-school-card-info-item">
                    <div className="ec-school-card-info-label">
                      Classe
                    </div>

                    <div className="ec-school-card-info-value">
                      {className || "Non renseignée"}
                    </div>
                  </div>

                  <div className="ec-school-card-info-item">
                    <div className="ec-school-card-info-label">
                      Année scolaire
                    </div>

                    <div className="ec-school-card-info-value">
                      {schoolYear}
                    </div>
                  </div>

                  <div className="ec-school-card-info-item">
                    <div className="ec-school-card-info-label">
                      Établissement
                    </div>

                    <div className="ec-school-card-info-value">
                      {schoolName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ec-school-card-footer">
              <span>
                École Connectée • Document officiel
              </span>

              <span>
                QR • Identification élève
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
