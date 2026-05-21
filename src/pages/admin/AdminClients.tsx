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
  onUpdateUser: (userId: number, data: { fullName: string; phone: string; email: string; password: string }) => Promise<void>;
  onUploadDocs: (userId: number, files: Record<string, string>) => Promise<void>;
}

const INPUT = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 15, width: "100%", boxSizing: "border-box" as const, outline: "none" };

export default function AdminClients({
  users, usersLoading, search, setSearch, filtered,
  selUser, setSelUser, loans, loansLoading,
  clientView, setClientView,
  offer, setOffer, newLoan, setNewLoan, newClient, setNewClient,
  actionMsg, actionErr, setActionMsg, setActionErr,
  onLoadLoans, onSendOffer, onAddLoan, onAddClient, onChangeStatus, onUpdateUser, onUploadDocs,
}: Props) {
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [editSaving, setEditSaving] = useState(false);

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
      setEditForm({ fullName: selUser.fullName || "", phone: selUser.phone || "", email: selUser.email || "", password: "" });
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
    } catch {
      setActionErr("Ошибка при сохранении");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Левая колонка */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ color: "white", fontWeight: 700, fontSize: 20, margin: 0 }}>Клиенты <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>{filtered.length}</span></h2>
          <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
            style={{ ...PURPLE, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="UserPlus" size={14} />Добавить
          </button>
        </div>
        <input placeholder="Поиск по телефону или имени" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", color: "white", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 12, outline: "none" }} />
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)", display: "flex", flexDirection: "column", gap: 8 }}>
          {usersLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-purple-400" /></div>}
          {!usersLoading && filtered.length === 0 && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 40 }}>Нет клиентов</p>}
          {filtered.map(u => (
            <div key={u.id} style={{ position: "relative" }}>
              <button onClick={() => { setSelUser(u); setClientView("loans"); setActionMsg(""); setActionErr(""); onLoadLoans(u.id); }}
                style={{ ...GLASS, padding: "12px 14px", paddingRight: 40, cursor: "pointer", textAlign: "left", width: "100%", border: selUser?.id === u.id ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{u.phone}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{u.loanCount} займ.</span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{u.fullName || "—"}</div>
                {u.debt > 0 && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Долг: {u.debt.toLocaleString("ru-RU")} ₽</div>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelUser(u); setClientView("edit"); setActionMsg(""); setActionErr(""); }}
                title="Редактировать клиента"
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, padding: "4px 6px", cursor: "pointer", color: "#a78bfa", display: "flex", alignItems: "center" }}>
                <Icon name="Pencil" size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Правая колонка */}
      <div style={{ flex: 1 }}>
        {!selUser && clientView !== "addclient" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: "rgba(255,255,255,0.3)", gap: 16 }}>
            <Icon name="Users" size={48} />
            <p>Выберите клиента из списка</p>
          </div>
        ) : (
          <>
            {selUser && (
              <div style={{ ...GLASS, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 17 }}>{selUser.fullName || selUser.phone}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{selUser.phone} · с {selUser.createdAt}</div>
                </div>
                <button onClick={() => setSelUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
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
                      ? (v === "offer" ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : v === "edit" ? "linear-gradient(135deg,#d97706,#f59e0b)" : v === "docs" ? "linear-gradient(135deg,#059669,#10b981)" : "linear-gradient(135deg,#7c3aed,#a855f7)")
                      : "rgba(255,255,255,0.07)",
                    color: clientView === v ? "white" : "rgba(255,255,255,0.5)" }}>
                  <Icon name={icon} size={13} />{label}
                </button>
              ))}
              <button onClick={() => { setSelUser(null); setClientView("addclient"); setActionMsg(""); setActionErr(""); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                  background: clientView === "addclient" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)",
                  color: clientView === "addclient" ? "white" : "rgba(255,255,255,0.5)" }}>
                <Icon name="UserPlus" size={13} />Новый клиент
              </button>
            </div>

            {actionMsg && <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 16px", color: "#4ade80", marginBottom: 16, fontSize: 14 }}>{actionMsg}</div>}
            {actionErr && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 16px", color: "#f87171", marginBottom: 16, fontSize: 14 }}>{actionErr}</div>}

            {/* Документы клиента */}
            {clientView === "docs" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(16,185,129,0.3)" }}>
                <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 6px" }}>Загрузить документы</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Загруженные файлы обновят документы в заявке клиента</p>
                <form onSubmit={handleDocsSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {DOC_LABELS.map(({ key, label }) => (
                      <label key={key} style={{ ...GLASS, padding: 16, borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, border: docFiles[key] ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name={docFiles[key] ? "CheckCircle" : "Upload"} size={16} style={{ color: docFiles[key] ? "#10b981" : "rgba(255,255,255,0.4)" }} />
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>{label}</span>
                        </div>
                        {docFiles[key] && <span style={{ color: "#10b981", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docFiles[key]!.name}</span>}
                        {!docFiles[key] && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Нажмите для выбора файла</span>}
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

            {/* Редактировать клиента */}
            {clientView === "edit" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(245,158,11,0.3)" }}>
                <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 6px" }}>Редактировать клиента</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Оставьте пароль пустым, чтобы не менять его</p>
                <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "ФИО", key: "fullName" as const, placeholder: "Иванов Иван Иванович", type: "text" },
                    { label: "Телефон", key: "phone" as const, placeholder: "+7 (999) 000-00-00", type: "text" },
                    { label: "Email", key: "email" as const, placeholder: "client@mail.ru", type: "email" },
                    { label: "Новый пароль (необязательно)", key: "password" as const, placeholder: "Оставьте пустым чтобы не менять", type: "password" },
                  ].map(({ label, key, placeholder, type }) => (
                    <div key={key}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={editForm[key]}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                        style={INPUT}
                      />
                    </div>
                  ))}
                  <button type="submit" disabled={editSaving}
                    style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "white", border: "none", borderRadius: 12, padding: "14px", cursor: editSaving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: editSaving ? 0.7 : 1 }}>
                    {editSaving ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Save" size={18} />}
                    {editSaving ? "Сохраняем..." : "Сохранить изменения"}
                  </button>
                </form>
              </div>
            )}

            {/* Займы */}
            {clientView === "loans" && selUser && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loansLoading && <div style={{ textAlign: "center", padding: 40 }}><Icon name="Loader2" size={28} className="animate-spin text-purple-400" /></div>}
                {!loansLoading && loans.length === 0 && <div style={{ ...GLASS, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>У клиента нет займов</div>}
                {loans.map(loan => {
                  const st = STATUS[loan.status] || STATUS.active;
                  return (
                    <div key={loan.id} style={{ ...GLASS, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{loan.amount.toLocaleString("ru-RU")} ₽</span>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 12 }}>{loan.days} дн. · {loan.ratePercent}%/день</span>
                        </div>
                        <span style={{ background: `${st.color}25`, color: st.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, alignSelf: "center" }}>Статус:</span>
                        {Object.entries(STATUS).map(([val, cfg]) => (
                          <button key={val} onClick={() => onChangeStatus(loan.id, val)}
                            style={{ padding: "5px 12px", borderRadius: 8, border: loan.status === val ? `1px solid ${cfg.color}60` : "1px solid transparent",
                              background: loan.status === val ? `${cfg.color}20` : "rgba(255,255,255,0.05)",
                              color: loan.status === val ? cfg.color : "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 8 }}>Оформлен {loan.createdAt} · #{loan.id}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Оффер */}
            {clientView === "offer" && selUser && (
              <div style={{ ...GLASS, padding: 24, border: "1px solid rgba(14,165,233,0.3)" }}>
                <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 6px" }}>Создать оффер</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Клиент увидит условия в личном кабинете и сможет подписать</p>
                <form onSubmit={onSendOffer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Одобренная сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                        <input type="number" required placeholder={ph} value={offer[key as keyof typeof offer]}
                          onChange={e => setOffer({ ...offer, [key]: e.target.value })}
                          style={INPUT} />
                      </div>
                    ))}
                  </div>
                  {offer.amount && offer.days && offer.rate && (
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                      К возврату: <strong style={{ color: "white" }}>{Math.round(+offer.amount * (1 + +offer.rate/100 * +offer.days)).toLocaleString("ru-RU")} ₽</strong>
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
                <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 20px" }}>Добавить займ</h3>
                <form onSubmit={onAddLoan} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Сумма (₽)","amount","50000"],["Срок (дней)","days","15"],["Ставка (%/день)","rate","0.8"]].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
                        <input type="number" required placeholder={ph} value={newLoan[key as keyof typeof newLoan]}
                          onChange={e => setNewLoan({ ...newLoan, [key]: e.target.value })}
                          style={INPUT} />
                      </div>
                    ))}
                  </div>
                  {newLoan.amount && newLoan.days && (
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                      К возврату: <strong style={{ color: "white" }}>{Math.round(+newLoan.amount * (1 + +newLoan.rate/100 * +newLoan.days)).toLocaleString("ru-RU")} ₽</strong>
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
                <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 20px" }}>Зарегистрировать клиента</h3>
                <form onSubmit={onAddClient} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Телефон", key: "phone" as const, placeholder: "+7 (999) 000-00-00" },
                    { label: "ФИО", key: "fullName" as const, placeholder: "Иванов Иван Иванович" },
                    { label: "Пароль", key: "password" as const, placeholder: "Пароль для клиента" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>{label}</div>
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