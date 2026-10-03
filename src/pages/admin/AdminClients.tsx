import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { User, Loan, GLASS, PURPLE, STATUS } from "./adminTypes";

interface Props {
  users: User[];
  usersLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  filtered: User[];
  selUser: User | null;
  setSelUser: (u: User | null) => void;
  loans: Loan[];
  loansLoading: boolean;
  clientView: "loans" | "offer" | "addloan" | "addclient" | "edit" | "docs";
  setClientView: (v: "loans" | "offer" | "addloan" | "addclient" | "edit" | "docs") => void;
  offer: { amount: string; days: string; rate: string };
  setOffer: (v: { amount: string; days: string; rate: string }) => void;
  newLoan: { amount: string; days: string; rate: string };
  setNewLoan: (v: { amount: string; days: string; rate: string }) => void;
  newClient: { phone: string; fullName: string; password: string };
  setNewClient: (v: { phone: string; fullName: string; password: string }) => void;
  actionMsg: string;
  actionErr: string;
  setActionMsg: (v: string) => void;
  setActionErr: (v: string) => void;
  onLoadLoans: (userId: number) => void;
  onSendOffer: (e: React.FormEvent) => void;
  onAddLoan: (e: React.FormEvent) => void;
  onAddClient: (e: React.SyntheticEvent) => void;
  onChangeStatus: (loanId: number, status: string) => void;
  onUpdateUser: (userId: number, data: Record<string, string>) => Promise<void>;
  onLoadProfile: (userId: number) => Promise<Record<string, string | boolean>>;
  onUploadDocs: (userId: number, files: Record<string, string>) => Promise<void>;
  onCreditDoctor: (userId: number, data: { amount: number; days: number; rate: number }) => Promise<void>;
  onWaivePenalty: (loanId: number, mode: "full" | "amount", amount?: number) => Promise<unknown>;
}

interface ProfileField { key: string; label: string; placeholder?: string; type?: string; wide?: boolean }
const PROFILE_SECTIONS: { title: string; fields: ProfileField[] }[] = [
  { title: "Личные данные", fields: [
    { key: "fullName", label: "ФИО", placeholder: "Иванов Иван Иванович", wide: true },
    { key: "birthDate", label: "Дата рождения", placeholder: "01.01.1990" },
    { key: "birthPlace", label: "Место рождения" },
    { key: "snils", label: "СНИЛС" },
  ] },
  { title: "Контакты и вход", fields: [
    { key: "phone", label: "Телефон", placeholder: "+7 (999) 000-00-00" },
    { key: "email", label: "Email", type: "email" },
    { key: "telegramId", label: "Telegram" },
    { key: "password", label: "Новый пароль", type: "password", placeholder: "Оставьте пустым" },
  ] },
  { title: "Паспорт", fields: [
    { key: "passportSeries", label: "Серия" },
    { key: "passportNumber", label: "Номер" },
    { key: "passportDate", label: "Дата выдачи" },
    { key: "passportCode", label: "Код подразделения" },
    { key: "passportBy", label: "Кем выдан", wide: true },
  ] },
  { title: "Работа и доходы", fields: [
    { key: "workplace", label: "Место работы" },
    { key: "position", label: "Должность" },
    { key: "workPhone", label: "Рабочий телефон" },
    { key: "salary", label: "Зарплата, ₽" },
    { key: "contactPerson", label: "Контактное лицо", wide: true },
  ] },
  { title: "Банковская карта", fields: [
    { key: "cardNumber", label: "Карта / СБП для выплаты" },
    { key: "cardNumberTransfer", label: "Карта для перевода" },
  ] },
];

const INPUT = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, padding: "10px 12px", color: "#022c22", fontSize: 15, width: "100%", boxSizing: "border-box" as const, outline: "none" };

export default function AdminClients({
  users, usersLoading, search, setSearch, filtered,
  selUser, setSelUser, loans, loansLoading,
  clientView, setClientView,
  offer, setOffer, newLoan, setNewLoan, newClient, setNewClient,
  actionMsg, actionErr, setActionMsg, setActionErr,
  onLoadLoans, onSendOffer, onAddLoan, onAddClient, onChangeStatus, onUpdateUser, onLoadProfile, onUploadDocs, onCreditDoctor, onWaivePenalty,
}: Props) {
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editHasApp, setEditHasApp] = useState(true);

  const [waiveOpenId, setWaiveOpenId] = useState<number | null>(null);
  const [waiveAmount, setWaiveAmount] = useState("");
  const [waiveSaving, setWaiveSaving] = useState(false);
  const [waiveErr, setWaiveErr] = useState("");

  async function handleWaive(loanId: number, mode: "full" | "amount") {
    setWaiveSaving(true); setWaiveErr("");
    try {
      if (mode === "amount") {
        const amt = parseFloat(waiveAmount);
        if (!amt || amt <= 0) { setWaiveErr("Укажите сумму больше нуля"); setWaiveSaving(false); return; }
        await onWaivePenalty(loanId, "amount", amt);
      } else {
        await onWaivePenalty(loanId, "full");
      }
      setWaiveOpenId(null); setWaiveAmount("");
    } catch (e) {
      setWaiveErr(e instanceof Error ? e.message : "Ошибка при списании пени");
    } finally {
      setWaiveSaving(false);
    }
  }

  const [cdForm, setCdForm] = useState({ amount: "5000", days: "30", rate: "1.0" });
  const [cdSaving, setCdSaving] = useState(false);

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({ passportMain: null, registration: null, selfie: null, previousPassports: null });
  const [docUploading, setDocUploading] = useState(false);

  const DOC_LABELS: { key: string; label: string }[] = [
    { key: "passportMain",      label: "Паспорт — главная страница" },
    { key: "registration",      label: "Прописка" },
    { key: "selfie",            label: "Селфи с паспортом" },
    { key: "previousPassports", label: "О ранее выданных паспортах" },
  ];

  const compressDoc = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 600;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.5).split(",")[1]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  async function handleDocsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selUser) return;
    const hasAny = Object.values(docFiles).some(f => f);
    if (!hasAny) { setActionErr("Выберите хотя бы один файл"); return; }
    setDocUploading(true); setActionMsg(""); setActionErr("");
    try {
      const encoded: Record<string, string> = {};
      for (const [key, file] of Object.entries(docFiles)) {
        if (file) encoded[key] = await compressDoc(file);
      }
      await onUploadDocs(selUser.id, encoded);
      setActionMsg("Документы загружены!");
      setDocFiles({ passportMain: null, registration: null, selfie: null, previousPassports: null });
    } catch {
      setActionErr("Ошибка при загрузке документов");
    } finally {
      setDocUploading(false);
    }
  }

  useEffect(() => {
    if (selUser && clientView === "edit") {
      setEditLoading(true);
      onLoadProfile(selUser.id)
        .then(p => {
          const f: Record<string, string> = { password: "" };
          Object.entries(p).forEach(([k, v]) => { if (typeof v === "string") f[k] = v; });
          setEditHasApp(!!p.hasApplication);
          setEditForm(f);
        })
        .catch(() => {
          setEditForm({ fullName: selUser.fullName || "", phone: selUser.phone || "", email: selUser.email || "", password: "" });
          setActionErr("Не удалось загрузить анкету");
        })
        .finally(() => setEditLoading(false));
    }
  }, [selUser, clientView]);

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selUser) return;
    setEditSaving(true);
    setActionMsg(""); setActionErr("");
    try {
      await onUpdateUser(selUser.id, editForm);
      setActionMsg("Данные клиента обновлены!");
      setClientView("loans");
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Левая колонка */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ color: "#022c22", fontWeight: 700, fontSize: 20, margin: 0 }}>Клиенты <span style={{ color: "rgba(2,44,34,0.3)", fontSize: 14 }}>{filtered.length}</span></h2>
          <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
            style={{ ...PURPLE, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="UserPlus" size={14} />Добавить
          </button>
        </div>
        <input placeholder="Поиск по телефону или имени" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 12, padding: "10px 14px", color: "#022c22", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, outline: "none" }} />
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)", display: "flex", flexDirection: "column", gap: 8 }}>
          {usersLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-emerald-600" /></div>}
          {!usersLoading && filtered.length === 0 && <p style={{ color: "rgba(2,44,34,0.3)", textAlign: "center", padding: 40 }}>Нет клиентов</p>}
          {filtered.map(u => (
            <div key={u.id} style={{ position: "relative" }}>
              <button onClick={() => { setSelUser(u); setClientView("loans"); setActionMsg(""); setActionErr(""); onLoadLoans(u.id); }}
                style={{ ...GLASS, padding: "12px 14px", paddingRight: 40, cursor: "pointer", textAlign: "left", width: "100%", border: selUser?.id === u.id ? "1px solid rgba(16,185,129,0.6)" : "1px solid rgba(16,185,129,0.08)", borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#022c22", fontWeight: 600, fontSize: 14 }}>{u.phone}</span>
                  <span style={{ color: "rgba(2,44,34,0.3)", fontSize: 12 }}>{u.loanCount} займ.</span>
                </div>
                <div style={{ color: "rgba(2,44,34,0.45)", fontSize: 12 }}>{u.fullName || "—"}</div>
                {u.debt > 0 && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Долг: {u.debt.toLocaleString("ru-RU")} ₽</div>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelUser(u); setClientView("edit"); setActionMsg(""); setActionErr(""); }}
                title="Редактировать клиента"
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "4px 6px", cursor: "pointer", color: "#14b8a6", display: "flex", alignItems: "center" }}>
                <Icon name="Pencil" size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Правая колонка */}
      <div style={{ flex: 1 }}>
        {!selUser && clientView !== "addclient" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: "rgba(2,44,34,0.3)", gap: 16 }}>
            <Icon name="Users" size={48} />
            <p>Выберите клиента из списка</p>
          </div>
        ) : (
          <>
            {selUser && (
              <div style={{ ...GLASS, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "#022c22", fontWeight: 700, fontSize: 17 }}>{selUser.fullName || selUser.phone}</div>
                  <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 13 }}>{selUser.phone} · с {selUser.createdAt}</div>
                </div>
                <button onClick={() => setSelUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(2,44,34,0.4)" }}>
                  <Icon name="X" size={20} />
                </button>
              </div>
            )}

            {/* Вкладки */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {selUser && ([["loans","Займы","CreditCard"],["offer","Создать оффер","FileSignature"],["addloan","Добавить займ","Plus"],["docs","Документы","FileImage"],["edit","Редактировать","Pencil"]] as const).map(([v, label, icon]) => (
                <button key={v} onClick={() => { setClientView(v); setActionMsg(""); setActionErr(""); }}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                    background: clientView === v
                      ? (v === "offer" ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : v === "edit" ? "linear-gradient(135deg,#d97706,#f59e0b)" : v === "docs" ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#10b981,#14b8a6)")
                      : "rgba(16,185,129,0.07)",
                    color: clientView === v ? "white" : "rgba(2,44,34,0.5)" }}>
                  <Icon name={icon} size={13} />{label}
                </button>
              ))}
              {selUser && (
                <button onClick={() => { setClientView("creditdoctor" as typeof clientView); setActionMsg(""); setActionErr(""); }}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                    background: clientView === ("creditdoctor" as typeof clientView) ? "linear-gradient(135deg,#14b8a6,#ec4899)" : "rgba(16,185,129,0.15)",
                    color: clientView === ("creditdoctor" as typeof clientView) ? "white" : "#0f766e",
                    border: "1px solid rgba(16,185,129,0.35)",
                    boxShadow: clientView === ("creditdoctor" as typeof clientView) ? "0 0 14px rgba(16,185,129,0.4)" : "none" }}>
                  💊 Кредитный Доктор
                </button>
              )}
              <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                  background: clientView === "addclient" ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)",
                  color: clientView === "addclient" ? "white" : "rgba(2,44,34,0.5)" }}>
                <Icon name="UserPlus" size={13} />Новый клиент
              </button>
            </div>

            {actionMsg && <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 16px", color: "#4ade80", marginBottom: 16, fontSize: 14 }}>{actionMsg}</div>}
            {actionErr && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 16px", color: "#f87171", marginBottom: 16, fontSize: 14 }}>{actionErr}</div>}

            {/* Документы клиента */}
            {clientView === "docs" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(16,185,129,0.3)" }}>
                <h3 style={{ color: "#022c22", fontWeight: 700, margin: "0 0 6px" }}>Загрузить документы</h3>
                <p style={{ color: "rgba(2,44,34,0.4)", fontSize: 13, margin: "0 0 20px" }}>Загруженные файлы обновят документы в заявке клиента</p>
                <form onSubmit={handleDocsSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {DOC_LABELS.map(({ key, label }) => (
                      <label key={key} style={{ ...GLASS, padding: 16, borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, border: docFiles[key] ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(16,185,129,0.1)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name={docFiles[key] ? "CheckCircle" : "Upload"} size={16} style={{ color: docFiles[key] ? "#10b981" : "rgba(2,44,34,0.4)" }} />
                          <span style={{ color: "rgba(2,44,34,0.7)", fontSize: 13, fontWeight: 600 }}>{label}</span>
                        </div>
                        {docFiles[key] && <span style={{ color: "#10b981", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docFiles[key]!.name}</span>}
                        {!docFiles[key] && <span style={{ color: "rgba(2,44,34,0.3)", fontSize: 11 }}>Нажмите для выбора файла</span>}
                        <input type="file" accept="image/*,.pdf" style={{ display: "none" }}
                          onChange={e => setDocFiles(p => ({ ...p, [key]: e.target.files?.[0] ?? null }))} />
                      </label>
                    ))}
                  </div>
                  <button type="submit" disabled={docUploading}
                    style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: docUploading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: docUploading ? 0.7 : 1 }}>
                    {docUploading ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Upload" size={18} />}
                    {docUploading ? "Загружаем..." : "Загрузить документы"}
                  </button>
                </form>
              </div>
            )}

            {/* Кредитный Доктор */}
            {(clientView as string) === "creditdoctor" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#14b8a6,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💊</div>
                  <div>
                    <h3 style={{ color: "#022c22", fontWeight: 700, margin: 0, fontSize: 18 }}>Кредитный Доктор</h3>
                    <p style={{ color: "rgba(2,44,34,0.4)", fontSize: 13, margin: 0 }}>Одобрить займ по программе восстановления кредитной истории</p>
                  </div>
                </div>

                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, marginTop: 12 }}>
                  <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>💡 Программа Кредитный Доктор</div>
                  <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, lineHeight: 1.6 }}>
                    Займ выдаётся через карту партнёра. Клиент восстанавливает кредитную историю поэтапно:<br/>
                    Этап 1: 500–5 000 ₽ · Этап 2: до 15 000 ₽ · Этап 3: до 30 000 ₽ · Этап 4: до 50 000 ₽
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setCdSaving(true); setActionMsg(""); setActionErr("");
                  try {
                    await onCreditDoctor(selUser.id, { amount: +cdForm.amount, days: +cdForm.days, rate: +cdForm.rate / 100 });
                    setActionMsg("Займ по программе «Кредитный Доктор» одобрен и создан!");
                    setCdForm({ amount: "5000", days: "30", rate: "1.0" });
                  } catch {
                    setActionErr("Ошибка при создании займа");
                  } finally {
                    setCdSaving(false);
                  }
                }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                      { label: "Сумма (₽)", key: "amount" as const, placeholder: "5000" },
                      { label: "Срок (дней)", key: "days" as const, placeholder: "30" },
                      { label: "Ставка (%/день)", key: "rate" as const, placeholder: "1.0" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                        <input type="number" step="any" placeholder={placeholder} value={cdForm[key]}
                          onChange={e => setCdForm(p => ({ ...p, [key]: e.target.value }))} required
                          style={{ ...INPUT, border: "1px solid rgba(16,185,129,0.35)" }} />
                      </div>
                    ))}
                  </div>

                  {cdForm.amount && cdForm.days && cdForm.rate && (
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 24, flexWrap: "wrap" }}>
                      {[
                        { l: "Сумма", v: `${(+cdForm.amount).toLocaleString("ru-RU")} ₽` },
                        { l: "Срок", v: `${cdForm.days} дн.` },
                        { l: "Ставка", v: `${cdForm.rate}%/день` },
                        { l: "К возврату", v: `${Math.round(+cdForm.amount * (1 + +cdForm.rate / 100 * +cdForm.days)).toLocaleString("ru-RU")} ₽` },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <div style={{ color: "rgba(2,44,34,0.35)", fontSize: 11 }}>{l}</div>
                          <div style={{ color: "#0f766e", fontWeight: 700, fontSize: 14 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="submit" disabled={cdSaving}
                    style={{ background: "linear-gradient(135deg,#14b8a6,#ec4899)", color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: cdSaving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: cdSaving ? 0.7 : 1, boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
                    {cdSaving ? <><Icon name="Loader2" size={18} className="animate-spin" />Создаём займ...</> : <>💊 Одобрить по Кредитному Доктору</>}
                  </button>
                </form>
              </div>
            )}

            {/* Редактировать клиента */}
            {clientView === "edit" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(16,185,129,0.3)" }}>
                <h3 style={{ color: "#022c22", fontWeight: 700, margin: "0 0 6px" }}>Анкета клиента</h3>
                <p style={{ color: "rgba(2,44,34,0.4)", fontSize: 13, margin: "0 0 20px" }}>Все данные можно изменить. Пароль оставьте пустым, чтобы не менять его.</p>
                {actionErr && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 14px" }}>{actionErr}</p>}
                {editLoading ? (
                  <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-emerald-600" /></div>
                ) : (
                <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {!editHasApp && (
                    <div style={{ color: "#b45309", fontSize: 13, background: "rgba(245,158,11,0.1)", borderRadius: 10, padding: "10px 14px" }}>
                      У клиента нет анкеты — сохранятся только ФИО, телефон, email и пароль.
                    </div>
                  )}
                  {PROFILE_SECTIONS.map(sec => (
                    <div key={sec.title}>
                      <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{sec.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                        {sec.fields.filter(f => editHasApp || ["fullName", "phone", "email", "password"].includes(f.key)).map(f => (
                          <div key={f.key} style={f.wide ? { gridColumn: "1 / -1" } : undefined}>
                            <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginBottom: 6 }}>{f.label}</div>
                            <input
                              type={f.type || "text"}
                              placeholder={f.placeholder || ""}
                              value={editForm[f.key] ?? ""}
                              onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                              style={INPUT}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="submit" disabled={editSaving}
                    style={{ ...PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: editSaving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: editSaving ? 0.7 : 1 }}>
                    {editSaving ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Save" size={18} />}
                    {editSaving ? "Сохраняем..." : "Сохранить изменения"}
                  </button>
                </form>
                )}
              </div>
            )}

            {/* Займы */}
            {clientView === "loans" && selUser && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loansLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-emerald-600" /></div>}
                {!loansLoading && loans.length === 0 && <div style={{ ...GLASS, padding: 40, textAlign: "center", color: "rgba(2,44,34,0.3)" }}>У клиента нет займов</div>}
                {loans.map(loan => {
                  const st = STATUS[loan.status] || STATUS.active;
                  return (
                    <div key={loan.id} style={{ ...GLASS, padding: 18, border: loan.isOverdue ? "1px solid rgba(248,113,113,0.4)" : GLASS.border }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <span style={{ color: "#022c22", fontWeight: 700, fontSize: 18 }}>{loan.amount.toLocaleString("ru-RU")} ₽</span>
                          <span style={{ color: "rgba(2,44,34,0.4)", fontSize: 13, marginLeft: 12 }}>{loan.days} дн. · {loan.ratePercent}%/день</span>
                        </div>
                        <span style={{ background: `${st.color}25`, color: st.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                      </div>
                      {loan.isOverdue && !!loan.overdueDays && (
                        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Icon name="AlertTriangle" size={14} style={{ color: "#f87171", flexShrink: 0 }} />
                            <span style={{ color: "#fca5a5", fontSize: 12 }}>
                              Просрочка {loan.overdueDays} дн. · пеня 7%/день: <b>+{(loan.penaltyAmount ?? 0).toLocaleString("ru-RU")} ₽</b> · к возврату <b>{(loan.totalDue ?? loan.amount).toLocaleString("ru-RU")} ₽</b>
                            </span>
                          </div>
                          {!!loan.penaltyAmount && (
                            <div style={{ marginTop: 10 }}>
                              {waiveOpenId !== loan.id ? (
                                <button onClick={() => { setWaiveOpenId(loan.id); setWaiveAmount(""); setWaiveErr(""); }}
                                  style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                  <Icon name="Gift" size={13} />Списать пеню
                                </button>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: 12 }}>
                                  {waiveErr && <div style={{ color: "#f87171", fontSize: 12 }}>{waiveErr}</div>}
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    <input type="number" min="1" max={loan.penaltyAmount} placeholder={`До ${loan.penaltyAmount.toLocaleString("ru-RU")} ₽`}
                                      value={waiveAmount} onChange={e => setWaiveAmount(e.target.value)}
                                      style={{ ...INPUT, width: 160, padding: "7px 10px", fontSize: 13 }} />
                                    <button disabled={waiveSaving} onClick={() => handleWaive(loan.id, "amount")}
                                      style={{ background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: waiveSaving ? "not-allowed" : "pointer", opacity: waiveSaving ? 0.6 : 1 }}>
                                      Списать сумму
                                    </button>
                                    <button disabled={waiveSaving} onClick={() => handleWaive(loan.id, "full")}
                                      style={{ background: "linear-gradient(135deg,#059669,#10b981)", border: "none", color: "white", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: waiveSaving ? "not-allowed" : "pointer", opacity: waiveSaving ? 0.6 : 1 }}>
                                      {waiveSaving ? <Icon name="Loader2" size={13} className="animate-spin" /> : "Списать всю пеню"}
                                    </button>
                                    <button disabled={waiveSaving} onClick={() => { setWaiveOpenId(null); setWaiveErr(""); }}
                                      style={{ background: "rgba(16,185,129,0.06)", border: "none", color: "rgba(2,44,34,0.5)", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "rgba(2,44,34,0.3)", fontSize: 12, alignSelf: "center" }}>Статус:</span>
                        {Object.entries(STATUS).map(([val, cfg]) => (
                          <button key={val} onClick={() => onChangeStatus(loan.id, val)}
                            style={{ padding: "5px 12px", borderRadius: 8, border: loan.status === val ? `1px solid ${cfg.color}60` : "1px solid transparent",
                              background: loan.status === val ? `${cfg.color}20` : "rgba(16,185,129,0.05)",
                              color: loan.status === val ? cfg.color : "rgba(2,44,34,0.4)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ color: "rgba(2,44,34,0.2)", fontSize: 11, marginTop: 8 }}>Оформлен {loan.createdAt} · #{loan.id}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Оффер */}
            {clientView === "offer" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(14,165,233,0.3)" }}>
                <h3 style={{ color: "#022c22", fontWeight: 700, margin: "0 0 6px" }}>Создать оффер</h3>
                <p style={{ color: "rgba(2,44,34,0.4)", fontSize: 13, margin: "0 0 20px" }}>Клиент увидит условия в личном кабинете и сможет подписать</p>
                <form onSubmit={onSendOffer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Одобренная сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                        <input type="number" required placeholder={ph} value={offer[key as keyof typeof offer]}
                          onChange={e => setOffer({ ...offer, [key]: e.target.value })}
                          style={INPUT} />
                      </div>
                    ))}
                  </div>
                  {offer.amount && offer.days && offer.rate && (
                    <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 14 }}>
                      К возврату: <strong style={{ color: "#022c22" }}>{Math.round(+offer.amount * (1 + +offer.rate/100 * +offer.days)).toLocaleString("ru-RU")} ₽</strong>
                    </div>
                  )}
                  <button type="submit"
                    style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name="Send" size={18} />Отправить оффер клиенту
                  </button>
                </form>
              </div>
            )}

            {/* Добавить займ */}
            {clientView === "addloan" && selUser && (
              <div style={{ ...GLASS, padding: 24 }}>
                <h3 style={{ color: "#022c22", fontWeight: 700, margin: "0 0 20px" }}>Добавить займ</h3>
                <form onSubmit={onAddLoan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                        <input type="number" required placeholder={ph} value={newLoan[key as keyof typeof newLoan]}
                          onChange={e => setNewLoan({ ...newLoan, [key]: e.target.value })}
                          style={INPUT} />
                      </div>
                    ))}
                  </div>
                  {newLoan.amount && newLoan.days && (
                    <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 14 }}>
                      К возврату: <strong style={{ color: "#022c22" }}>{Math.round(+newLoan.amount * (1 + +newLoan.rate/100 * +newLoan.days)).toLocaleString("ru-RU")} ₽</strong>
                    </div>
                  )}
                  <button type="submit"
                    style={{ ...PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name="Plus" size={18} />Добавить займ
                  </button>
                </form>
              </div>
            )}

            {/* Новый клиент */}
            {clientView === "addclient" && (
              <div style={{ ...GLASS, padding: 24 }}>
                <h3 style={{ color: "#022c22", fontWeight: 700, margin: "0 0 20px" }}>Зарегистрировать клиента</h3>
                <form onSubmit={onAddClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Телефон", key: "phone" as const, placeholder: "+7 (999) 000-00-00" },
                    { label: "ФИО", key: "fullName" as const, placeholder: "Иванов Иван Иванович" },
                    { label: "Пароль", key: "password" as const, placeholder: "Пароль для клиента" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={newClient[key]}
                        onChange={e => setNewClient({ ...newClient, [key]: e.target.value })}
                        style={INPUT}
                      />
                    </div>
                  ))}
                  <button type="submit"
                    style={{ ...PURPLE, color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name="UserPlus" size={18} />Зарегистрировать
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}