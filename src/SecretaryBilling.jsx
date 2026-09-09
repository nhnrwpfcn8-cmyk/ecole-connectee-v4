import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function SecretaryBilling({ schoolId, students = [], parents = [] }) {
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [title, setTitle] = useState("Facture scolaire");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const studentName = (student) =>
    student?.full_name ||
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Élève";

  const parentName = (parent) =>
    parent?.full_name ||
    `${parent?.first_name || ""} ${parent?.last_name || ""}`.trim() ||
    "Parent";

  const loadInvoices = async () => {
    if (!schoolId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("student_invoices")
      .select(`
        *,
        students (
          id,
          full_name,
          student_code
        ),
        parents (
          id,
          full_name,
          phone,
          email
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement factures :", error);
      setMessage("Impossible de charger les factures.");
    } else {
      setInvoices(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadInvoices();
    }
  }, [open, schoolId]);

  const generateInvoiceNumber = () => {
    const today = new Date();
    const date = today.toISOString().slice(0, 10).replaceAll("-", "");

    const random = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    return `FAC-${date}-${random}`;
  };

  const sendInvoice = async () => {
    setMessage("");

    if (!schoolId) {
      setMessage("École introuvable.");
      return;
    }

    if (!studentId) {
      setMessage("Veuillez sélectionner un élève.");
      return;
    }

    if (!parentId) {
      setMessage("Veuillez sélectionner un parent.");
      return;
    }

    if (!amount || Number(amount) < 0) {
      setMessage("Veuillez saisir un montant valide.");
      return;
    }

    const selectedParent = parents.find(
      (parent) => String(parent.id) === String(parentId)
    );

    if (!selectedParent) {
      setMessage("Parent introuvable.");
      return;
    }

    if (!selectedParent.profile_id) {
      setMessage(
        "Ce parent n'a pas encore de compte École Connectée. La facture ne peut pas être envoyée dans son espace."
      );
      return;
    }

    setSending(true);

    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();

      const invoiceNumber = generateInvoiceNumber();

      const { data: invoice, error: invoiceError } = await supabase
        .from("student_invoices")
        .insert({
          school_id: schoolId,
          student_id: studentId,
          parent_id: parentId,
          invoice_number: invoiceNumber,
          title: title || "Facture scolaire",
          description: description || null,
          amount: Number(amount),
          due_date: dueDate || null,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_by: user?.id || null
        })
        .select()
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      const selectedStudent = students.find(
        (student) => String(student.id) === String(studentId)
      );

      const studentLabel = selectedStudent
        ? studentName(selectedStudent)
        : "votre enfant";

      const notificationMessage =
        `Une nouvelle facture scolaire concernant ${studentLabel} ` +
        `a été envoyée. Montant : ${Number(amount).toLocaleString("fr-FR")} FCFA.` +
        (dueDate ? ` Échéance : ${dueDate}.` : "");

      const { error: notificationError } = await supabase
        .from("parent_notifications")
        .insert({
          school_id: schoolId,
          parent_id: parentId,
          title: "🧾 Nouvelle facture scolaire",
          message: notificationMessage,
          type: "invoice",
          reference_id: invoice.id
        });

      if (notificationError) {
        await supabase
          .from("student_invoices")
          .delete()
          .eq("id", invoice.id)
          .eq("school_id", schoolId);

        throw notificationError;
      }

      setMessage("✅ Facture créée et envoyée au parent.");

      setStudentId("");
      setParentId("");
      setTitle("Facture scolaire");
      setAmount("");
      setDueDate("");
      setDescription("");

      await loadInvoices();
    } catch (error) {
      console.error("Erreur création facture :", error);
      setMessage(
        error?.message ||
          "Une erreur est survenue lors de l'envoi de la facture."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1000,
          border: "none",
          borderRadius: 14,
          padding: "14px 20px",
          background: "#111827",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
        }}
      >
        🧾 Facturation élève
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              height: "100%",
              background: "#fff",
              overflowY: "auto",
              padding: 24,
              boxSizing: "border-box"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>🧾 Factures des élèves</h2>
                <p style={{ marginTop: 6, color: "#6b7280" }}>
                  Envoyer une facture directement au parent.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "#f3f4f6",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 18
                }}
              >
                ✕
              </button>
            </div>

            {message && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#f3f4f6",
                  marginBottom: 16
                }}
              >
                {message}
              </div>
            )}

            <div style={{ display: "grid", gap: 14 }}>
              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Élève
                </div>

                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db"
                  }}
                >
                  <option value="">Choisir un élève</option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentName(student)}
                      {student.student_code
                        ? ` — ${student.student_code}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Parent
                </div>

                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db"
                  }}
                >
                  <option value="">Choisir un parent</option>

                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parentName(parent)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Objet de la facture
                </div>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Frais de scolarité"
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box"
                  }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Montant (FCFA)
                </div>

                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex : 50000"
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box"
                  }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Date d'échéance
                </div>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box"
                  }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Description
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails de la facture..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                />
              </label>

              <button
                type="button"
                onClick={sendInvoice}
                disabled={sending}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  background: sending ? "#9ca3af" : "#111827",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: sending ? "not-allowed" : "pointer"
                }}
              >
                {sending
                  ? "Envoi en cours..."
                  : "📤 Créer et envoyer au parent"}
              </button>
            </div>

            <div style={{ marginTop: 30 }}>
              <h3>Factures récentes</h3>

              {loading ? (
                <p>Chargement...</p>
              ) : invoices.length === 0 ? (
                <p style={{ color: "#6b7280" }}>
                  Aucune facture pour le moment.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 14
                      }}
                    >
                      <strong>{invoice.invoice_number}</strong>

                      <div style={{ marginTop: 6 }}>
                        {invoice.title}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontWeight: 700
                        }}
                      >
                        {Number(invoice.amount).toLocaleString("fr-FR")} FCFA
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color: "#6b7280",
                          fontSize: 14
                        }}
                      >
                        Statut : {invoice.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}