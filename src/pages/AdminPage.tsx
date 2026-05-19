import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminNavbar from "@/components/admin/AdminNavbar";
import AdminApplications from "@/components/admin/AdminApplications";
import AdminClients from "@/components/admin/AdminClients";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface User { id: number; phone: string; fullName: string; email: string; createdAt: string; loanCount: number; debt: number; }
interface Loan  { id: number; amount: number; days: number; rate: number; ratePercent: number; status: string; createdAt: string; }
interface Application {
  id: number; fullName: string; phone: string; email: string;
  amount: number; days: number; birthDate: string;
  passportSeries: string; passportNumber: string;
  status: string; createdAt: string; rejectReason: string;
}

type MainTab = "applications" | "clients";

export default function AdminPage() {
  const navigate = useNavigate();
  const [token, setToken]       = useState(() => sessionStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoad, setLoginLoad] = useState(false);

  const [mainTab, setMainTab] = useState<MainTab>("applications");

  // --- Заявки ---
  const [applications, setApplications]   = useState<Application[]>([]);
  const [appsLoading, setAppsLoading]     = useState(false);
  const [appsFilter, setAppsFilter]       = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedApp, setSelectedApp]     = useState<Application | null>(null);
  const [approveRate, setApproveRate]     = useState("0.8");
  const [rejectReason, setRejectReason]   = useState("");
  const [appAction, setAppAction]         = useState<"approve" | "reject" | null>(null);
  const [appMsg, setAppMsg]               = useState("");
  const [appErr, setAppErr]               = useState("");
  const [appProcessing, setAppProcessing] = useState(false);

  // --- Клиенты ---
  const [users, setUsers]           = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch]         = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loans, setLoans]           = useState<Loan[]>([]);
  const [loansLoad, setLoansLoad]   = useState(false);
  const [clientTab, setClientTab]   = useState<"loans" | "add" | "register">("loans");
  const [newLoan, setNewLoan]       = useState({ amount: "", days: "", rate: "0.8" });
  const [newClient, setNewClient]   = useState({ phone: "", fullName: "", password: "" });
  const [actionMsg, setActionMsg]   = useState("");
  const [actionErr, setActionErr]   = useState("");

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  }), [token]);

  const handleUnauth = useCallback(() => {
    sessionStorage.removeItem("admin_token");
    setToken(""); setUsers([]); setApplications([]); setSelectedUser(null);
  }, []);

  const loadApplications = useCallback((status = appsFilter) => {
    if (!token) return;
    setAppsLoading(true);
    fetch(`${ADMIN_URL}?sub=applications&status=${status}`, { headers: authHeaders() })
      .then((r) => {
        if (r.status === 401) { handleUnauth(); return null; }
        return r.json();
      })
      .then((d) => { if (d) setApplications(d.applications || []); })
      .finally(() => setAppsLoading(false));
  }, [token, appsFilter, authHeaders, handleUnauth]);

  const loadUsers = useCallback(() => {
    if (!token) return;
    setUsersLoading(true);
    fetch(ADMIN_URL, { headers: authHeaders() })
      .then((r) => {
        if (r.status === 401) { handleUnauth(); return null; }
        return r.json();
      })
      .then((d) => { if (d) setUsers(d.users || []); })
      .finally(() => setUsersLoading(false));
  }, [token, authHeaders, handleUnauth]);

  useEffect(() => { if (token) { loadApplications(); loadUsers(); } }, [token]);
  useEffect(() => { if (token) loadApplications(appsFilter); }, [appsFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(""); setLoginLoad(true);
    try {
      const res = await fetch(ADMIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginErr(data.error || "Неверный пароль"); return; }
      sessionStorage.setItem("admin_token", data.token);
      setToken(data.token);
    } catch { setLoginErr("Ошибка соединения"); }
    finally { setLoginLoad(false); }
  };

  const approveApp = async () => {
    if (!selectedApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr("");
    const res = await fetch(`${ADMIN_URL}?sub=approve&appId=${selectedApp.id}`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ rate: parseFloat(approveRate) / 100 }),
    });
    const data = await res.json();
    if (!res.ok) { setAppErr(data.error); setAppProcessing(false); return; }
    setAppMsg(`Займ #${data.loanId} создан! Клиент добавлен в систему.`);
    setAppAction(null); setSelectedApp(null);
    setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));
    loadUsers();
    setAppProcessing(false);
  };

  const rejectApp = async () => {
    if (!selectedApp) return;
    setAppProcessing(true); setAppMsg(""); setAppErr("");
    const res = await fetch(`${ADMIN_URL}?sub=reject&appId=${selectedApp.id}`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = await res.json();
    if (!res.ok) { setAppErr(data.error); setAppProcessing(false); return; }
    setAppMsg("Заявка отклонена.");
    setAppAction(null); setSelectedApp(null);
    setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));
    setAppProcessing(false);
  };

  const openUser = (user: User) => {
    setSelectedUser(user); setLoansLoad(true); setClientTab("loans");
    setActionMsg(""); setActionErr("");
    fetch(`${ADMIN_URL}?sub=loans&userId=${user.id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLoans(d.loans || []))
      .finally(() => setLoansLoad(false));
  };

  const changeStatus = async (loanId: number, status: string) => {
    await fetch(`${ADMIN_URL}?sub=loan&loanId=${loanId}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    setLoans((prev) => prev.map((l) => l.id === loanId ? { ...l, status } : l));
  };

  const addLoan = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=loans`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ phone: selectedUser?.phone, amount: parseFloat(newLoan.amount), days: parseInt(newLoan.days), rate: parseFloat(newLoan.rate) / 100 }),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Займ успешно добавлен!"); setNewLoan({ amount: "", days: "", rate: "0.8" });
    openUser(selectedUser!);
  };

  const registerClient = async (e: React.FormEvent) => {
    e.preventDefault(); setActionMsg(""); setActionErr("");
    const res = await fetch(`${ADMIN_URL}?sub=register`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify(newClient),
    });
    const data = await res.json();
    if (!res.ok) { setActionErr(data.error); return; }
    setActionMsg("Клиент зарегистрирован!"); setNewClient({ phone: "", fullName: "", password: "" });
    loadUsers();
  };

  const logout = () => {
    sessionStorage.removeItem("admin_token");
    setToken(""); setUsers([]); setApplications([]); setSelectedUser(null);
  };

  const filtered = users.filter((u) => u.phone.includes(search) || u.fullName.toLowerCase().includes(search.toLowerCase()));

  if (!token) return (
    <AdminLogin
      password={password}
      setPassword={setPassword}
      loginErr={loginErr}
      loginLoad={loginLoad}
      onSubmit={handleLogin}
      onBack={() => navigate("/")}
    />
  );

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <AdminNavbar
        mainTab={mainTab}
        setMainTab={setMainTab}
        appsFilter={appsFilter}
        applicationsCount={applications.length}
        onRefresh={() => { loadApplications(); loadUsers(); }}
        onLogout={logout}
      />

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-10">
        {mainTab === "applications" && (
          <AdminApplications
            applications={applications}
            appsLoading={appsLoading}
            appsFilter={appsFilter}
            setAppsFilter={setAppsFilter}
            appMsg={appMsg}
            appErr={appErr}
            appProcessing={appProcessing}
            selectedApp={selectedApp}
            setSelectedApp={setSelectedApp}
            appAction={appAction}
            setAppAction={setAppAction}
            setAppMsg={setAppMsg}
            setAppErr={setAppErr}
            approveRate={approveRate}
            setApproveRate={setApproveRate}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            onApprove={approveApp}
            onReject={rejectApp}
          />
        )}

        {mainTab === "clients" && (
          <AdminClients
            users={users}
            usersLoading={usersLoading}
            search={search}
            setSearch={setSearch}
            filtered={filtered}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            loans={loans}
            loansLoad={loansLoad}
            clientTab={clientTab}
            setClientTab={setClientTab}
            newLoan={newLoan}
            setNewLoan={setNewLoan}
            newClient={newClient}
            setNewClient={setNewClient}
            actionMsg={actionMsg}
            actionErr={actionErr}
            setActionMsg={setActionMsg}
            setActionErr={setActionErr}
            onOpenUser={openUser}
            onChangeStatus={changeStatus}
            onAddLoan={addLoan}
            onRegisterClient={registerClient}
          />
        )}
      </div>
    </div>
  );
}