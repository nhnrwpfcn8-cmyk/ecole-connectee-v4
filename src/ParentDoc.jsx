import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function ParentDoc({
  schoolId,
  parentId,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState("administrative");
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId || !parentId) {
      setLoading(false);
      return;
    }

    loadDocuments();
  }, [schoolId, parentId]);

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const [
        administrativeResult,
        invoicesResult,
        parentStudentsResult,
      ] = await Promise.all([
        supabase
          .from("administrative_documents")
          .select(`
            id,
            school_id,
            student_id,
            parent_id,
            title,
            document_type,
            description,
            file_url,
            file_name,
            active,
            created_at
          `)
          .eq("school_id", schoolId)
          .eq("parent_id", parentId)
          .eq("active", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("student_invoices")
          .select(`
            id,
            school_id,
            student_id,
            parent_id,
            invoice_number,
            title,
            description,
            amount,
            due_date,
            status,
            sent_at,
            created_at,
            fee_type,
            academic_year,
            class_id
          `)
          .eq("school_id", schoolId)
          .eq("parent_id", parentId)
          .order("created_at", { ascending: false }),

        supabase
          .from("parent_students")
          .select(`
            student_id
          `)
          .eq("parent_id", parentId),
      ]);

      if (administrativeResult.error) {
        throw administrativeResult.error;
      }

      if (invoicesResult.error) {
        throw invoicesResult.error;
      }

      if (parentStudentsResult.error) {
        throw parentStudentsResult.error;
      }

      const studentIds = (
        parentStudentsResult.data || []
      ).map((item) => item.student_id);

      let bulletinsData = [];

      if (studentIds.length > 0) {
        const bulletinsResult = await supabase
          .from("bulletins")
          .select(`
            id,
            school_id,
            student_id,
            trimester,
            status,
            pdf_url,
            generated_at,
            validated_at,
            sent_at,
            created_at
          `)
          .eq("school_id", schoolId)
          .in("student_id", studentIds)
          .in("status", ["validated", "sent"])
          .order("created_at", { ascending: false });

        if (bulletinsResult.error) {
          throw bulletinsResult.error;
        }

        bulletinsData = bulletinsResult.data || [];
      }

      setDocuments(administrativeResult.data || []);
      setInvoices(invoicesResult.data || []);
      setBulletins(bulletinsData);
    } catch (err) {
      console.error(
        "Erreur lors du chargement des documents parent :",
        err
      );

      setError(
        "Impossible de charger vos documents pour le moment."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatAmount(value) {
    return new Intl.NumberFormat("fr-FR").format(
      Number(value || 0)
    );
  }

  function getInvoiceStatusLabel(status) {
    const labels = {
      draft: "Brouillon",
      sent: "Envoyée",
      partial: "Partiellement payée",
      paid: "Payée",
      overdue: "En retard",
    };

    return labels[status] || status || "—";
  }

  function getInvoiceStatusClass(status) {
    if (status === "paid") {
      return "parent-doc-status parent-doc-status-success";
    }

    if (status === "overdue") {
      return "parent-doc-status parent-doc-status-danger";
    }

    if (status === "partial") {
      return "parent-doc-status parent-doc-status-warning";
    }

    return "parent-doc-status";
  }

  function getDocumentIcon(type) {
    const normalized = String(type || "").toLowerCase();

    if (
      normalized.includes("facture") ||
      normalized.includes("invoice")
    ) {
      return "💰";
    }

    if (
      normalized.includes("bulletin") ||
      normalized.includes("releve")
    ) {
      return "📊";
    }

    if (
      normalized.includes("certificat") ||
      normalized.includes("administratif")
    ) {
      return "🏢";
    }

    return "📄";
  }

  function openAdministrativeDocument(document) {
    if (!document?.file_url) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=1200"
    );

    if (!printWindow) {
      return;
    }

    try {
      if (
        document.file_url.startsWith(
          "data:text/html"
        )
      ) {
        const separatorIndex =
          document.file_url.indexOf(",");

        if (separatorIndex !== -1) {
          const html = decodeURIComponent(
            document.file_url.substring(
              separatorIndex + 1
            )
          );

          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          return;
        }
      }

      printWindow.location.href =
        document.file_url;
    } catch (error) {
      console.error(
        "Erreur lors de l'ouverture du document administratif :",
        error
      );

      printWindow.close();

      window.open(
        document.file_url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  function openBulletin(bulletin) {
    const url = bulletin?.pdf_url;

    if (!url) {
      return;
    }

    try {
      if (
        typeof url === "string" &&
        url.startsWith("data:text/html")
      ) {
        const printWindow =
          window.open("", "_blank");

        if (!printWindow) {
          window.alert(
            "Impossible d'ouvrir le bulletin. Autorisez les fenêtres contextuelles pour ce site."
          );
          return;
        }

        const commaIndex = url.indexOf(",");

        if (commaIndex === -1) {
          printWindow.close();
          window.location.href = url;
          return;
        }

        const encodedHtml =
          url.slice(commaIndex + 1);

        const html =
          decodeURIComponent(encodedHtml);

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'ouverture du bulletin :",
        error
      );

      try {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      } catch (fallbackError) {
        console.error(
          "Erreur ouverture bulletin secours :",
          fallbackError
        );
      }
    }
  }

  function printInvoice(invoice) {
    const printWindow = window.open(
      "",
      "_blank",
      "width=800,height=900"
    );

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <title>Facture ${invoice.invoice_number || ""}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111827;
            }

            h1 {
              margin-bottom: 8px;
            }

            .invoice {
              max-width: 700px;
              margin: 0 auto;
            }

            .line {
              border-bottom: 1px solid #e5e7eb;
              padding: 14px 0;
            }

            .amount {
              font-size: 28px;
              font-weight: bold;
              margin-top: 30px;
            }

            .footer {
              margin-top: 50px;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>

        <body>
          <div class="invoice">
            <h1>Facture scolaire</h1>

            <div class="line">
              <strong>Numéro :</strong>
              ${invoice.invoice_number || "—"}
            </div>

            <div class="line">
              <strong>Titre :</strong>
              ${invoice.title || "Facture scolaire"}
            </div>

            <div class="line">
              <strong>Description :</strong>
              ${invoice.description || "—"}
            </div>

            <div class="line">
              <strong>Type :</strong>
              ${invoice.fee_type || "—"}
            </div>

            <div class="line">
              <strong>Année scolaire :</strong>
              ${invoice.academic_year || "—"}
            </div>

            <div class="line">
              <strong>Date d'échéance :</strong>
              ${formatDate(invoice.due_date)}
            </div>

            <div class="line">
              <strong>Statut :</strong>
              ${getInvoiceStatusLabel(invoice.status)}
            </div>

            <div class="amount">
              Montant : ${formatAmount(invoice.amount)} FCFA
            </div>

            <div class="footer">
              Document généré depuis École Connectée.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  if (loading) {
    return (
      <div className="parent-doc-page">
        <div className="parent-doc-loading">
          Chargement de vos documents...
        </div>
      </div>
    );
  }

  return (
    <div className="parent-doc-page">
      <div className="parent-doc-header">
        <div>
          <button
            type="button"
            className="parent-doc-back"
            onClick={onBack}
          >
            ← Retour
          </button>

          <h1>Mes documents</h1>

          <p>
            Retrouvez ici vos documents administratifs,
            factures et bulletins scolaires.
          </p>
        </div>
      </div>

      {error && (
        <div className="parent-doc-error">
          {error}
        </div>
      )}

      <div className="parent-doc-tabs">
        <button
          type="button"
          className={
            activeTab === "administrative"
              ? "parent-doc-tab active"
              : "parent-doc-tab"
          }
          onClick={() => setActiveTab("administrative")}
        >
          🏢 Documents administratifs
          <span>{documents.length}</span>
        </button>

        <button
          type="button"
          className={
            activeTab === "invoices"
              ? "parent-doc-tab active"
              : "parent-doc-tab"
          }
          onClick={() => setActiveTab("invoices")}
        >
          💰 Factures
          <span>{invoices.length}</span>
        </button>

        <button
          type="button"
          className={
            activeTab === "bulletins"
              ? "parent-doc-tab active"
              : "parent-doc-tab"
          }
          onClick={() => setActiveTab("bulletins")}
        >
          📊 Bulletins
          <span>{bulletins.length}</span>
        </button>
      </div>

      {activeTab === "administrative" && (
        <section className="parent-doc-section">
          <h2>Documents administratifs</h2>

          {documents.length === 0 ? (
            <div className="parent-doc-empty">
              <div className="parent-doc-empty-icon">
                📄
              </div>

              <h3>Aucun document</h3>

              <p>
                Aucun document administratif ne vous a encore
                été transmis.
              </p>
            </div>
          ) : (
            <div className="parent-doc-grid">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="parent-doc-card"
                >
                  <div className="parent-doc-card-icon">
                    {getDocumentIcon(
                      document.document_type
                    )}
                  </div>

                  <div className="parent-doc-card-content">
                    <h3>
                      {document.title || "Document administratif"}
                    </h3>

                    <p className="parent-doc-type">
                      {document.document_type || "Document"}
                    </p>

                    {document.description && (
                      <p className="parent-doc-description">
                        {document.description}
                      </p>
                    )}

                    <p className="parent-doc-date">
                      Reçu le {formatDate(document.created_at)}
                    </p>

                    {document.file_url && (
                      <button
                        type="button"
                        className="parent-doc-button"
                        onClick={() =>
                          openAdministrativeDocument(
                            document
                          )
                        }
                      >
                        📄 Ouvrir le PDF
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "invoices" && (
        <section className="parent-doc-section">
          <h2>Mes factures</h2>

          {invoices.length === 0 ? (
            <div className="parent-doc-empty">
              <div className="parent-doc-empty-icon">
                💰
              </div>

              <h3>Aucune facture</h3>

              <p>
                Aucune facture scolaire ne vous a encore
                été transmise.
              </p>
            </div>
          ) : (
            <div className="parent-doc-grid">
              {invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="parent-doc-card"
                >
                  <div className="parent-doc-card-icon">
                    💰
                  </div>

                  <div className="parent-doc-card-content">
                    <h3>
                      {invoice.title || "Facture scolaire"}
                    </h3>

                    <p className="parent-doc-invoice-number">
                      N° {invoice.invoice_number || "—"}
                    </p>

                    {invoice.description && (
                      <p className="parent-doc-description">
                        {invoice.description}
                      </p>
                    )}

                    <div className="parent-doc-invoice-info">
                      <strong>
                        {formatAmount(invoice.amount)} FCFA
                      </strong>

                      <span
                        className={getInvoiceStatusClass(
                          invoice.status
                        )}
                      >
                        {getInvoiceStatusLabel(
                          invoice.status
                        )}
                      </span>
                    </div>

                    <p className="parent-doc-date">
                      Échéance :{" "}
                      {formatDate(invoice.due_date)}
                    </p>

                    <button
                      type="button"
                      className="parent-doc-button"
                      onClick={() =>
                        printInvoice(invoice)
                      }
                    >
                      🖨️ Imprimer / Enregistrer en PDF
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "bulletins" && (
        <section className="parent-doc-section">
          <h2>Mes bulletins scolaires</h2>

          {bulletins.length === 0 ? (
            <div className="parent-doc-empty">
              <div className="parent-doc-empty-icon">
                📊
              </div>

              <h3>Aucun bulletin</h3>

              <p>
                Aucun bulletin validé ou envoyé n'est
                actuellement disponible.
              </p>
            </div>
          ) : (
            <div className="parent-doc-grid">
              {bulletins.map((bulletin) => (
                <article
                  key={bulletin.id}
                  className="parent-doc-card"
                >
                  <div className="parent-doc-card-icon">
                    📊
                  </div>

                  <div className="parent-doc-card-content">
                    <h3>
                      Bulletin scolaire
                    </h3>

                    <p className="parent-doc-type">
                      {bulletin.trimester
                        ?.replace("trimestre_", "Trimestre ")
                        || "Bulletin"}
                    </p>

                    <p className="parent-doc-date">
                      Créé le{" "}
                      {formatDate(
                        bulletin.created_at
                      )}
                    </p>

                    <p className="parent-doc-status parent-doc-status-success">
                      {bulletin.status === "sent"
                        ? "Envoyé"
                        : "Validé"}
                    </p>

                    {bulletin.pdf_url && (
                      <button
                        type="button"
                        className="parent-doc-button"
                        onClick={() =>
                          openBulletin(bulletin)
                        }
                      >
                        📄 Ouvrir le bulletin PDF
                      </button>
                    )}

                    {!bulletin.pdf_url && (
                      <p className="parent-doc-no-file">
                        Le PDF n'est pas encore disponible.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <style>{`
        .parent-doc-page {
          min-height: 100%;
          padding: 24px;
          background: #f8fafc;
          color: #0f172a;
        }

        .parent-doc-header {
          margin-bottom: 24px;
        }

        .parent-doc-back {
          border: none;
          background: transparent;
          padding: 0;
          margin-bottom: 14px;
          color: #2563eb;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .parent-doc-header h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }

        .parent-doc-header p {
          margin: 0;
          color: #64748b;
        }

        .parent-doc-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .parent-doc-tab {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          border-radius: 12px;
          padding: 12px 15px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .parent-doc-tab span {
          min-width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-size: 12px;
        }

        .parent-doc-tab.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .parent-doc-tab.active span {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .parent-doc-section h2 {
          margin: 0 0 18px;
          font-size: 21px;
        }

        .parent-doc-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(280px, 1fr)
          );
          gap: 16px;
        }

        .parent-doc-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 18px;
          display: flex;
          gap: 15px;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.04);
        }

        .parent-doc-card-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          border-radius: 14px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
        }

        .parent-doc-card-content {
          min-width: 0;
          flex: 1;
        }

        .parent-doc-card h3 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .parent-doc-type,
        .parent-doc-invoice-number,
        .parent-doc-date,
        .parent-doc-description {
          margin: 5px 0;
          color: #64748b;
          font-size: 13px;
        }

        .parent-doc-description {
          line-height: 1.5;
        }

        .parent-doc-invoice-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 14px 0;
        }

        .parent-doc-invoice-info strong {
          font-size: 20px;
        }

        .parent-doc-status {
          display: inline-flex;
          width: fit-content;
          margin-top: 8px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        .parent-doc-status-success {
          background: #dcfce7;
          color: #166534;
        }

        .parent-doc-status-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .parent-doc-status-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .parent-doc-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 14px;
          padding: 10px 13px;
          border: none;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .parent-doc-button:hover {
          opacity: 0.92;
        }

        .parent-doc-empty {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          padding: 45px 20px;
          text-align: center;
        }

        .parent-doc-empty-icon {
          font-size: 40px;
          margin-bottom: 10px;
        }

        .parent-doc-empty h3 {
          margin: 0 0 6px;
        }

        .parent-doc-empty p {
          margin: 0;
          color: #64748b;
        }

        .parent-doc-loading {
          padding: 50px 20px;
          text-align: center;
          color: #64748b;
        }

        .parent-doc-error {
          margin-bottom: 20px;
          padding: 13px 15px;
          border-radius: 12px;
          background: #fee2e2;
          color: #991b1b;
        }

        .parent-doc-no-file {
          margin-top: 12px;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .parent-doc-page {
            padding: 16px;
          }

          .parent-doc-header h1 {
            font-size: 24px;
          }

          .parent-doc-card {
            padding: 15px;
          }

          .parent-doc-tabs {
            flex-direction: column;
          }

          .parent-doc-tab {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
