import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import AdminLogin from "./admin/AdminLogin";
import AdminApplications from "./admin/AdminApplications";
import AdminClients from "./admin/AdminClients";
import { App, User, Loan, PURPLE } from "./admin/adminTypes";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";
const S = { background: "#0F0A1E", minHeight: "100vh" };

export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [pwd, setPwd]     = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const [tab, setTab]   = useState<"apps" | "clients">("apps");
  const [apps, setApps] = useState<App[]>([]);
  const [appFilter, setAppFilter] = useState<"pending"|"approved"|"rejected"|"postponed">("pending");
  const [appsLoading, setAppsLoading] = useState(false);

  const [users, setUsers]       = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch]     = useState("");
  const [selUser, setSelUser]   = useState<User | null>(null);
  const [loans, setLoans]       = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);

  const [clientView, setClientView] = useState<"loans"|"offer"|"addloan"|"addclient"|"edit"|"docs">("loans");
  const [offer, setOffer] = useState({ amount: "", days: "", rate: "0.8" });
  const [newLoan, setNewLoan] = useState({ amount: "", days: "", rate: "0.8" });
  const [newClient, setNewClient] = useState({ phone: "", fullName: "", password: "" });
  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");

  const [selApp, setSelApp]     = useState<App | null>(null);
  const [appRate, setAppRate]   = useState("0.8");
  const [appAmount, setAppAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [appAction, setAppAction] = useState<"approve"|"reject"|null>(null);
  const [appProcessing, setAppProcessing] = useState(false);
  const [appMsg, setAppMsg]     = useState("");
  const [appErr2, setAppErr2]   = useState("");

  const [lightbox, setLightbox] = useState("");

  const hdrs = (tok = token) => ({ "Content-Type": "application/json", "Authorization": `Bearer ${tok}` });

  function loadApps(_filter?: string, tok = token) {
    if (!tok) return;
    setAppsLoading(true);
    const statuses = ["pending", "postponed", "approved", "rejected"];
    Promise.all(
      statuses.map(s =>
        fetch(`${ADMIN_URL}?sub=applications&status=${s}`, { headers: hdrs(tok) })
          .then(r => r.json()).then(d => d.applications || []).catch(() => [])
      )
    ).then(results => {
      setApps(results.flat());
    }).finally(() => setAppsLoading(false));
  }

  function loadUsers(tok = token) {
    if (!tok) return;
    setUsersLoading(true);
    fetch(ADMIN_URL, { headers: hdrs(tok) })
      .then(r => r.json()).then(d => setUsers(d.users || []))
      .catch(() => {}).finally(() => setUsersLoading(false));
  }

  function loadLoans(userId: number) {
    setLoansLoading(true);
    fetch(`${ADMIN_URL}?sub=loans&userId=${userId}`, { headers: hdrs() })
      .then(r => r.json()).then(d => setLoans(d.loans || []))
      .finally(() => setLoansLoading(false));
  }

  useEffect(() => { if (token) { loadApps(); loadUsers(); } }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch(ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: pwd }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Неверный пароль"); return; }
      localStorage.setItem("admin_token", d.token);
      setToken(d.token);
      loadApps("pending", d.token);
      loadUsers(d.token);
    } catch { setErr("Ошибка соединения"); }
    finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken(""); setUsers([]); setApps([]);
  }

  async function approveApp() {
    if (!selApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr2("");
    const amount = appAmount ? parseFloat(appAmount) : selApp.amount;
    const r = await fetch(`${ADMIN_URL}?sub=approve&appId=${selApp.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ rate: parseFloat(appRate) / 100, amount }) });
    const d = await r.json();
    if (!r.ok) { setAppErr2(d.error); setAppProcessing(false); return; }
    setAppMsg(`Займ #${d.loanId} создан!`);
    setApps(prev => prev.filter(a => a.id !== selApp.id));
    setSelApp(null); setAppAction(null); setAppProcessing(false);
    loadUsers();
  }

  async function postponeApp(appId: number) {
    const r = await fetch(`${ADMIN_URL}?sub=postpone&appId=${appId}`, { method: "POST", headers: hdrs() });
    if (r.ok) {
      setAppMsg("Заявка отложена.");
      setApps(prev => prev.filter(a => a.id !== appId));
    }
  }

  async function restoreApp(appId: number) {
    const r = await fetch(`${ADMIN_URL}?sub=restore&appId=${appId}`, { method: "POST", headers: hdrs() });
    if (r.ok) {
      setAppMsg("Заявка возвращена в ожидание.");
      setApps(prev => prev.filter(a => a.id !== appId));
    }
  }

  async function rejectApp() {
    if (!selApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr2("");
    const r = await fetch(`${ADMIN_URL}?sub=reject&appId=${selApp.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ reason: rejectReason }) });
    const d = await r.json();
    if (!r.ok) { setAppErr2(d.error); setAppProcessing(false); return; }
    setAppMsg("Заявка отклонена.");
    setApps(prev => prev.filter(a => a.id !== selApp.id));
    setSelApp(null); setAppAction(null); setAppProcessing(false);
  }

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    if (!selUser) return;
    const r = await fetch(`${ADMIN_URL}?sub=offer&userId=${selUser.id}`, { method: "POST", headers: hdrs(), body: JSON.stringify({ offerAmount: +offer.amount, offerDays: +offer.days, offerRate: +offer.rate / 100 }) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Оффер отправлен клиенту!"); setOffer({ amount: "", days: "", rate: "0.8" });
  }

  async function addLoan(e: React.FormEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const r = await fetch(`${ADMIN_URL}?sub=loans`, { method: "POST", headers: hdrs(), body: JSON.stringify({ phone: selUser?.phone, amount: +newLoan.amount, days: +newLoan.days, rate: +newLoan.rate / 100 }) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Займ добавлен!"); setNewLoan({ amount: "", days: "", rate: "0.8" });
    if (selUser) loadLoans(selUser.id);
  }

  async function addClient(e: React.SyntheticEvent) {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const r = await fetch(`${ADMIN_URL}?sub=register`, { method: "POST", headers: hdrs(), body: JSON.stringify(newClient) });
    const d = await r.json();
    if (!r.ok) { setActionErr(d.error); return; }
    setActionMsg("Клиент зарегистрирован!"); setNewClient({ phone: "", fullName: "", password: "" });
    loadUsers();
  }

  async function updateUser(userId: number, data: { fullName: string; phone: string; email: string; password: string }) {
    const r = await fetch(`${ADMIN_URL}?sub=user_update&userId=${userId}`, { method: "POST", headers: hdrs(), body: JSON.stringify(data) });
    if (!r.ok) throw new Error("update failed");
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, fullName: data.fullName, phone: data.phone, email: data.email } : u));
  }

  async function partnerApprove(appId: number) {
    const r = await fetch(`${ADMIN_URL}?sub=partner_approve&appId=${appId}`, { method: "POST", headers: hdrs() });
    if (r.ok) {
      setAppMsg("Клиент направлен к партнёру.");
      setApps(prev => prev.filter(a => a.id !== appId));
    }
  }

  async function uploadDocs(userId: number, files: Record<string, string>) {
    const r = await fetch(`${ADMIN_URL}?sub=docs_upload&userId=${userId}`, { method: "POST", headers: hdrs(), body: JSON.stringify(files) });
    if (!r.ok) throw new Error("upload failed");
  }

  async function changeStatus(loanId: number, status: string) {
    await fetch(`${ADMIN_URL}?sub=loan&loanId=${loanId}`, { method: "PUT", headers: hdrs(), body: JSON.stringify({ status }) });
    if (selUser) loadLoans(selUser.id);
  }

  if (!token) return <AdminLogin pwd={pwd} setPwd={setPwd} err={err} loading={loading} onSubmit={login} />;

  const filtered = users.filter(u => u.phone.includes(search) || (u.fullName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S} className="font-golos">
      {lightbox && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setLightbox("")}>
          <button style={{ position: "absolute", top: 16, right: 16, color: "white", background: "none", border: "none", cursor: "pointer" }}>
            <Icon name="X" size={28} />
          </button>
          <img src={lightbox} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 16 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* NAVBAR */}
      <div style={{ background: "rgba(15,10,30,0.95)", borderBottom: "1px solid rgba(124,58,237,0.3)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ width: 36, height: 36, ...PURPLE, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="ShieldCheck" size={18} className="text-white" />
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 18, flex: 1 }}>PARAFINANS24 Admin</span>
        <button onClick={() => setTab("apps")}
          style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
            background: tab === "apps" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)", color: tab === "apps" ? "white" : "rgba(255,255,255,0.5)" }}>
          Заявки {apps.filter(a => a.status === "pending").length > 0 && tab !== "apps" ? `(${apps.filter(a => a.status === "pending").length})` : ""}
        </button>
        <button onClick={() => setTab("clients")}
          style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
            background: tab === "clients" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(255,255,255,0.07)", color: tab === "clients" ? "white" : "rgba(255,255,255,0.5)" }}>
          Клиенты
        </button>
        <button onClick={() => { loadApps(); loadUsers(); }} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="RefreshCw" size={16} />
        </button>
        <button onClick={logout} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="LogOut" size={16} />
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        {tab === "apps" && (
          <AdminApplications
            apps={apps} appsLoading={appsLoading}
            appFilter={appFilter} setAppFilter={setAppFilter}
            appMsg={appMsg} appErr2={appErr2} appProcessing={appProcessing}
            selApp={selApp} setSelApp={setSelApp}
            appAction={appAction} setAppAction={setAppAction}
            setAppMsg={setAppMsg} setAppErr2={setAppErr2}
            appRate={appRate} setAppRate={setAppRate}
            appAmount={appAmount} setAppAmount={setAppAmount}
            rejectReason={rejectReason} setRejectReason={setRejectReason}
            onApprove={approveApp} onReject={rejectApp} onPostpone={postponeApp} onRestore={restoreApp} onPartnerApprove={partnerApprove}
            setLightbox={setLightbox}
            token={token}
          />
        )}
        {tab === "clients" && (
          <AdminClients
            users={users} usersLoading={usersLoading}
            search={search} setSearch={setSearch} filtered={filtered}
            selUser={selUser} setSelUser={setSelUser}
            loans={loans} loansLoading={loansLoading}
            clientView={clientView} setClientView={setClientView}
            offer={offer} setOffer={setOffer}
            newLoan={newLoan} setNewLoan={setNewLoan}
            newClient={newClient} setNewClient={setNewClient}
            actionMsg={actionMsg} actionErr={actionErr}
            setActionMsg={setActionMsg} setActionErr={setActionErr}
            onLoadLoans={loadLoans}
            onSendOffer={sendOffer} onAddLoan={addLoan}
            onAddClient={addClient} onChangeStatus={changeStatus}
            onUpdateUser={updateUser} onUploadDocs={uploadDocs}
          />
        )}
      </div>
    </div>
  );
}