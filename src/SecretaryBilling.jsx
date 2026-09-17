import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

export default function SecretaryBilling({
  schoolId,
  students = [],
  parents = []
}) {
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentParents, setStudentParents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  // NOUVEAU : recherche des factures par élève
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [classId, setClassId] = useState("");

  const [title, setTitle] = useState("Facture scolaire");
  const [feeType, setFeeType] = useState("tuition");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [items, setItems] = useState([
    {
      description: "",
      quantity: 1,
      unit_amount: ""
    }
  ]);

  const studentName = (student) =>
    student?.full_name ||
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Élève";

  const parentName = (parent) =>
    parent?.full_name ||
    `${parent?.first_name || ""} ${parent?.last_name || ""}`.trim() ||
    "Parent";

  const formatAmount = (amount) =>
    Number(amount || 0).toLocaleString("fr-FR");

  const getFeeTypeLabel = (type) => {
    const labels = {
      registration: "Inscription",
      tuition: "Scolarité",
      canteen: "Cantine",
      transport: "Transport",
      supplies: "Fournitures",
      other: "Autre"
    };

    return labels[type] || type;
  };

  const getFinancialStatusLabel = (status) => {
    const labels = {
      paid: "Payée",
      partial: "Paiement partiel",
      overdue: "En retard",
      unpaid: "Impayée"
    };

    return labels[status] || status;
  };

  const getFinancialStatusStyle = (status) => {
    if (status === "paid") {
      return {
        background: "#dcfce7",
        color: "#000000"
      };
    }

    if (status === "partial") {
      return {
        background: "#fef3c7",
        color: "#000000"
      };
    }

    if (status === "overdue") {
      return {
        background: "#fee2e2",
        color: "#000000"
      };
    }

    return {
      background: "#f3f4f6",
      color: "#000000"
    };
  };

  const totalAmount = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity || 0);
      const unitAmount = Number(item.unit_amount || 0);

      return total + quantity * unitAmount;
    }, 0);
  }, [items]);

  const selectedStudent = students.find(
    (student) => String(student.id) === String(studentId)
  );

  const selectedClass = classes.find(
    (item) => String(item.id) === String(classId)
  );

  // NOUVEAU : factures filtrées par nom d'élève
  const filteredInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();

    if (!search) {
      return [];
    }

    return invoices.filter((invoice) => {
      const student = students.find(
        (item) =>
          String(item.id) === String(invoice.student_id)
      );

      if (!student) {
        return false;
      }

      return studentName(student)
        .toLowerCase()
        .includes(search);
    });
  }, [invoices, students, invoiceSearch]);

  const loadClasses = async () => {
    if (!schoolId) return;

    const { data, error } = await supabase
      .from("classes")
      .select("id, name, level")
      .eq("school_id", schoolId)
      .order("level", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur chargement classes :", error);
      return;
    }

    setClasses(data || []);
  };

  const loadInvoices = async () => {
    if (!schoolId) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("school_invoice_summary")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement factures :", error);
      setMessage("Impossible de charger les factures.");
      setInvoices([]);
    } else {
      setInvoices(data || []);
    }

    setLoading(false);
  };

  const loadStudentParents = async (selectedStudentId) => {
    if (!selectedStudentId || !schoolId) {
      setStudentParents([]);
      setParentId("");
      return;
    }

    setLoadingParents(true);
    setParentId("");

    const { data, error } = await supabase
      .from("parent_students")
      .select(`
        parent_id,
        is_primary,
        parents (
          id,
          profile_id,
          full_name,
          phone,
          email,
          school_id,
          active
        )
      `)
      .eq("student_id", selectedStudentId);

    if (error) {
      console.error("Erreur chargement parents de l'élève :", error);
      setStudentParents([]);
      setMessage("Impossible de charger les parents de cet élève.");
      setLoadingParents(false);
      return;
    }

    const linkedParents = (data || [])
      .filter(
        (item) =>
          item.parents &&
          String(item.parents.school_id) === String(schoolId) &&
          item.parents.active !== false
      )
      .sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return parentName(a.parents).localeCompare(
          parentName(b.parents),
          "fr"
        );
      });

    setStudentParents(linkedParents);

    const primaryParent = linkedParents.find(
      (item) => item.is_primary
    );

    if (primaryParent) {
      setParentId(String(primaryParent.parent_id));
    } else if (linkedParents.length === 1) {
      setParentId(String(linkedParents[0].parent_id));
    }

    setLoadingParents(false);
  };

  useEffect(() => {
    if (!open) return;

    loadInvoices();
    loadClasses();
  }, [open, schoolId]);

  useEffect(() => {
    if (!studentId) {
      setClassId("");
      setStudentParents([]);
      setParentId("");
      return;
    }

    const student = students.find(
      (item) => String(item.id) === String(studentId)
    );

    if (student?.class_id) {
      setClassId(String(student.class_id));
    } else {
      setClassId("");
    }

    loadStudentParents(studentId);
  }, [studentId, students]);

  const generateInvoiceNumber = () => {
    const today = new Date();
    const date = today.toISOString().slice(0, 10).replaceAll("-", "");

    const random = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    return `FAC-${date}-${random}`;
  };

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      {
        description: "",
        quantity: 1,
        unit_amount: ""
      }
    ]);
  };

  const removeItem = (index) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  };

  const resetForm = () => {
    setStudentId("");
    setParentId("");
    setClassId("");

    setTitle("Facture scolaire");
    setFeeType("tuition");
    setAcademicYear("2026-2027");
    setDueDate("");
    setDescription("");

    setItems([
      {
        description: "",
        quantity: 1,
        unit_amount: ""
      }
    ]);

    setStudentParents([]);
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
      setMessage("Veuillez sélectionner un parent lié à cet élève.");
      return;
    }

    if (!classId) {
      setMessage("La classe de l'élève est obligatoire.");
      return;
    }

    if (!academicYear.trim()) {
      setMessage("Veuillez saisir l'année scolaire.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unit_amount) >= 0
    );

    if (validItems.length === 0) {
      setMessage(
        "Veuillez ajouter au moins une ligne de frais avec une description et un montant."
      );
      return;
    }

    const calculatedTotal = validItems.reduce((total, item) => {
      return (
        total +
        Number(item.quantity) * Number(item.unit_amount)
      );
    }, 0);

    if (calculatedTotal <= 0) {
      setMessage(
        "Le montant total de la facture doit être supérieur à 0."
      );
      return;
    }

    const linkedParent = studentParents.find(
      (item) => String(item.parent_id) === String(parentId)
    );

    if (!linkedParent?.parents) {
      setMessage(
        "Le parent sélectionné n'est pas lié à cet élève."
      );
      return;
    }

    const selectedParent = linkedParent.parents;

    if (String(selectedParent.school_id) !== String(schoolId)) {
      setMessage("Ce parent appartient à une autre école.");
      return;
    }

    if (!selectedParent.profile_id) {
      setMessage(
        "Ce parent n'a pas encore de compte École Connectée. La facture ne peut pas être envoyée dans son espace."
      );
      return;
    }

    setSending(true);

    let createdInvoiceId = null;

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const invoiceNumber = generateInvoiceNumber();

      const { data: invoice, error: invoiceError } =
        await supabase
          .from("student_invoices")
          .insert({
            school_id: schoolId,
            student_id: studentId,
            parent_id: parentId,
            class_id: classId,
            invoice_number: invoiceNumber,
            title: title || "Facture scolaire",
            description: description || null,
            amount: calculatedTotal,
            due_date: dueDate || null,
            status: "sent",
            sent_at: new Date().toISOString(),
            created_by: user?.id || null,
            fee_type: feeType,
            academic_year: academicYear.trim()
          })
          .select()
          .single();

      if (invoiceError) {
        throw invoiceError;
      }

      createdInvoiceId = invoice.id;

      const invoiceItems = validItems.map((item) => ({
        school_id: schoolId,
        invoice_id: invoice.id,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_amount: Number(item.unit_amount),
        total_amount:
          Number(item.quantity) * Number(item.unit_amount)
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) {
        throw itemsError;
      }

      const studentLabel = selectedStudent
        ? studentName(selectedStudent)
        : "votre enfant";

      const notificationMessage =
        `Une nouvelle facture scolaire concernant ${studentLabel} ` +
        `a été envoyée. ` +
        `Type : ${getFeeTypeLabel(feeType)}. ` +
        `Année scolaire : ${academicYear.trim()}. ` +
        `Montant : ${formatAmount(calculatedTotal)} FCFA.` +
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
        throw notificationError;
      }

      setMessage("✅ Facture créée et envoyée au parent.");

      resetForm();

      await loadInvoices();
    } catch (error) {
      console.error("Erreur création facture :", error);

      if (createdInvoiceId) {
        await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", createdInvoiceId)
          .eq("school_id", schoolId);

        await supabase
          .from("parent_notifications")
          .delete()
          .eq("reference_id", createdInvoiceId)
          .eq("school_id", schoolId);

        await supabase
          .from("student_invoices")
          .delete()
          .eq("id", createdInvoiceId)
          .eq("school_id", schoolId);
      }

      setMessage(
        error?.message ||
          "Une erreur est survenue lors de la création de la facture."
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
              width: "min(620px, 100%)",
              height: "100%",
              background: "#fff",
              overflowY: "auto",
              padding: 24,
              boxSizing: "border-box",
              color: "#000000"
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
                <h2
                  style={{
                    margin: 0,
                    color: "#000000"
                  }}
                >
                  🧾 Facturation scolaire
                </h2>

                <p
                  style={{
                    marginTop: 6,
                    color: "#000000"
                  }}
                >
                  Créer et envoyer une vraie facture scolaire au parent.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "#f3f4f6",
                  color: "#000000",
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
                  marginBottom: 16,
                  color: "#000000"
                }}
              >
                {message}
              </div>
            )}

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Élève
                </div>

                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    color: "#000000"
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

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Parent responsable
                </div>

                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={!studentId || loadingParents}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    background:
                      !studentId || loadingParents
                        ? "#f3f4f6"
                        : "#fff",
                    color: "#000000"
                  }}
                >
                  <option value="">
                    {!studentId
                      ? "Sélectionnez d'abord un élève"
                      : loadingParents
                      ? "Chargement des parents..."
                      : "Choisir un parent"}
                  </option>

                  {studentParents.map((item) => (
                    <option
                      key={item.parent_id}
                      value={item.parent_id}
                    >
                      {parentName(item.parents)}
                      {item.is_primary ? " — Principal" : ""}
                    </option>
                  ))}
                </select>

                {studentId &&
                  !loadingParents &&
                  studentParents.length === 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        color: "#000000",
                        fontSize: 13
                      }}
                    >
                      Aucun parent n'est lié à cet élève.
                    </div>
                  )}
              </label>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Classe
                </div>

                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  disabled={!studentId}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    background: !studentId
                      ? "#f3f4f6"
                      : "#fff",
                    color: "#000000"
                  }}
                >
                  <option value="">Choisir une classe</option>

                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.level ? ` — ${item.level}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Année scolaire
                </div>

                <input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Ex : 2026-2027"
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    color: "#000000"
                  }}
                />
              </label>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Type de frais
                </div>

                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    color: "#000000"
                  }}
                >
                  <option value="registration">Inscription</option>
                  <option value="tuition">Scolarité</option>
                  <option value="canteen">Cantine</option>
                  <option value="transport">Transport</option>
                  <option value="supplies">Fournitures</option>
                  <option value="other">Autre</option>
                </select>
              </label>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
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
                    boxSizing: "border-box",
                    color: "#000000"
                  }}
                />
              </label>

              <div style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 10,
                    color: "#000000"
                  }}
                >
                  📋 Détail des frais
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10
                  }}
                >
                  {items.map((item, index) => {
                    const lineTotal =
                      Number(item.quantity || 0) *
                      Number(item.unit_amount || 0);

                    return (
                      <div
                        key={index}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          background: "#f9fafb",
                          color: "#000000"
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gap: 10
                          }}
                        >
                          <input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Ex : Frais de scolarité"
                            style={{
                              width: "100%",
                              padding: 10,
                              borderRadius: 8,
                              border: "1px solid #d1d5db",
                              boxSizing: "border-box",
                              color: "#000000"
                            }}
                          />

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "1fr 1fr auto",
                              gap: 8,
                              alignItems: "center"
                            }}
                          >
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="Quantité"
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 8,
                                border:
                                  "1px solid #d1d5db",
                                boxSizing: "border-box",
                                color: "#000000"
                              }}
                            />

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unit_amount}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "unit_amount",
                                  e.target.value
                                )
                              }
                              placeholder="Prix unitaire"
                              style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 8,
                                border:
                                  "1px solid #d1d5db",
                                boxSizing: "border-box",
                                color: "#000000"
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeItem(index)
                              }
                              disabled={items.length === 1}
                              style={{
                                border: "none",
                                borderRadius: 8,
                                padding: "9px 11px",
                                background:
                                  items.length === 1
                                    ? "#e5e7eb"
                                    : "#fee2e2",
                                color:
                                  items.length === 1
                                    ? "#000000"
                                    : "#000000",
                                cursor:
                                  items.length === 1
                                    ? "not-allowed"
                                    : "pointer"
                              }}
                            >
                              🗑️
                            </button>
                          </div>

                          <div
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#000000"
                            }}
                          >
                            Total ligne :{" "}
                            {formatAmount(lineTotal)} FCFA
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  style={{
                    marginTop: 10,
                    border: "1px solid #d1d5db",
                    borderRadius: 9,
                    padding: "10px 14px",
                    background: "#fff",
                    color: "#000000",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  ➕ Ajouter une ligne
                </button>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 10,
                    background: "#111827",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <strong>Total de la facture</strong>

                  <strong>
                    {formatAmount(totalAmount)} FCFA
                  </strong>
                </div>
              </div>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
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
                    boxSizing: "border-box",
                    color: "#000000"
                  }}
                />
              </label>

              <label style={{ color: "#000000" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#000000"
                  }}
                >
                  Description
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails ou informations complémentaires..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 9,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    resize: "vertical",
                    color: "#000000"
                  }}
                />
              </label>

              {selectedClass && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "#f3f4f6",
                    fontSize: 14,
                    color: "#000000"
                  }}
                >
                  <strong>Classe :</strong>{" "}
                  {selectedClass.name}
                  {selectedClass.level
                    ? ` — ${selectedClass.level}`
                    : ""}
                </div>
              )}

              <button
                type="button"
                onClick={sendInvoice}
                disabled={sending}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  background: sending
                    ? "#9ca3af"
                    : "#111827",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: sending
                    ? "not-allowed"
                    : "pointer"
                }}
              >
                {sending
                  ? "Création en cours..."
                  : "📤 Créer et envoyer au parent"}
              </button>
            </div>

            <div
              style={{
                marginTop: 30,
                color: "#000000"
              }}
            >
              <h3
                style={{
                  color: "#000000"
                }}
              >
                Factures délivrées
              </h3>

              {/* NOUVEAU : barre de recherche */}
              <div
                style={{
                  marginBottom: 16
                }}
              >
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) =>
                    setInvoiceSearch(e.target.value)
                  }
                  placeholder="🔎 Rechercher un élève par nom..."
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    boxSizing: "border-box",
                    color: "#000000"
                  }}
                />
              </div>

              {loading ? (
                <p style={{ color: "#000000" }}>
                  Chargement...
                </p>
              ) : !invoiceSearch.trim() ? (
                <p
                  style={{
                    color: "#000000"
                  }}
                >
                  Recherchez un élève pour afficher ses factures.
                </p>
              ) : filteredInvoices.length === 0 ? (
                <p
                  style={{
                    color: "#000000"
                  }}
                >
                  Aucune facture trouvée pour cet élève.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12
                  }}
                >
                  {filteredInvoices.map((invoice) => {
                    const statusStyle =
                      getFinancialStatusStyle(
                        invoice.financial_status
                      );

                    const invoiceStudent =
                      students.find(
                        (student) =>
                          String(student.id) ===
                          String(invoice.student_id)
                      );

                    return (
                      <div
                        key={invoice.invoice_id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 14,
                          color: "#000000"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 10,
                            alignItems: "flex-start"
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                color: "#000000"
                              }}
                            >
                              {invoiceStudent
                                ? studentName(invoiceStudent)
                                : "Élève"}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: "#000000"
                              }}
                            >
                              {invoice.invoice_number}
                            </div>

                            <div
                              style={{
                                marginTop: 6,
                                color: "#000000"
                              }}
                            >
                              {invoice.title}
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                                color: "#000000",
                                fontSize: 14
                              }}
                            >
                              {getFeeTypeLabel(
                                invoice.fee_type
                              )}{" "}
                              —{" "}
                              {invoice.academic_year}
                            </div>
                          </div>

                          <span
                            style={{
                              ...statusStyle,
                              padding: "5px 9px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              whiteSpace: "nowrap"
                            }}
                          >
                            {getFinancialStatusLabel(
                              invoice.financial_status
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            display: "grid",
                            gap: 5,
                            fontSize: 14,
                            color: "#000000"
                          }}
                        >
                          <div>
                            Total :{" "}
                            <strong
                              style={{
                                color: "#000000"
                              }}
                            >
                              {formatAmount(
                                invoice.total_billed
                              )}{" "}
                              FCFA
                            </strong>
                          </div>

                          <div>
                            Payé :{" "}
                            <strong
                              style={{
                                color: "#000000"
                              }}
                            >
                              {formatAmount(
                                invoice.total_paid
                              )}{" "}
                              FCFA
                            </strong>
                          </div>

                          <div>
                            Reste :{" "}
                            <strong
                              style={{
                                color: "#000000"
                              }}
                            >
                              {formatAmount(
                                invoice.remaining_amount
                              )}{" "}
                              FCFA
                            </strong>
                          </div>
                        </div>

                        {invoice.due_date && (
                          <div
                            style={{
                              marginTop: 8,
                              color: "#000000",
                              fontSize: 13
                            }}
                          >
                            Échéance :{" "}
                            {invoice.due_date}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
