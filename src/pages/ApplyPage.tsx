import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const API_URL = "https://functions.poehali.dev/29f70c88-f1f7-4926-9c65-c642fd11fdfb";
const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";

const inputCls = "w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors text-sm";
const inputStyle = { background: "rgba(255,255,255,0.05)" };
const labelCls = "text-white/70 text-sm mb-2 block font-medium";

const FILE_FIELDS = [
  { key: "passportMain", label: "Паспорт — главная страница" },
  { key: "registration", label: "Прописка (страница регистрации)" },
  { key: "selfie", label: "Селфи с паспортом" },
  { key: "previousPassports", label: "О ранее выданных паспортах" },
] as const;

const SECTIONS = [
  { id: "personal", label: "Личные данные", icon: "User" },
  { id: "passport", label: "Паспорт", icon: "BookOpen" },
  { id: "work", label: "Работа и доходы", icon: "Briefcase" },
  { id: "contacts", label: "Контакты", icon: "Phone" },
  { id: "loan", label: "Параметры займа", icon: "Calculator" },
  { id: "docs", label: "Документы", icon: "FileImage" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function ApplyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", birthDate: "", birthPlace: "", telegramId: "",
    passportSeries: "", passportNumber: "", passportDate: "", passportCode: "", passportBy: "",
    snils: "",
    workplace: "", position: "", workPhone: "", salary: "",
    contactPerson: "", cardNumber: "",
    amount: "10000", days: "30",
  });
  const [formAmount, setFormAmount] = useState(5000);
  const [formDays, setFormDays] = useState(15);
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    passportMain: null, registration: null, selfie: null, previousPassports: null,
  });
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState("");
  const [sendError, setSendError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timerSec, setTimerSec] = useState(15 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!submitted) return;
    timerRef.current = setInterval(() => {
      setTimerSec(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [submitted]);

  const fmtTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  const compressImage = (file: File): Promise<string> =>
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

  const uploadFile = async (b64: string, filename: string): Promise<string> => {
    const res = await fetch(UPLOAD_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: b64, filename, folder: "applications" }),
    });
    if (!res.ok) throw new Error("upload failed");
    return (await res.json()).url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setSendError(""); setSendStep("");
    try {
      const fileEntries = Object.entries(files).filter(([, f]) => f);
      const phone = form.phone.replace(/\D/g, "");
      const now = Date.now();
      setSendStep(`Загружаем фото (${fileEntries.length} шт.)...`);
      const uploadResults = await Promise.all(
        fileEntries.map(async ([key, file]) => {
          const b64 = await compressImage(file!);
          const url = await uploadFile(b64, `${now}_${phone}_${key}.webp`);
          return [key, url] as const;
        })
      );
      const fileUrls = Object.fromEntries(uploadResults);
      setSendStep("Отправляем заявку...");
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, name: form.fullName,
          amount: String(formAmount), days: String(formDays),
          ...fileUrls,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) localStorage.setItem("token", data.token);
        setSubmitted(true);
      } else {
        setSendError("Ошибка при отправке. Попробуйте ещё раз.");
      }
    } catch {
      setSendError("Нет связи с сервером. Попробуйте позже.");
    } finally {
      setSending(false); setSendStep("");
    }
  };

  const RATE = 0.005;
  const amountBg = `linear-gradient(to right, #7C3AED ${((formAmount - 500) / (50000 - 500)) * 100}%, rgba(124,58,237,0.2) ${((formAmount - 500) / (50000 - 500)) * 100}%)`;
  const daysBg = `linear-gradient(to right, #7C3AED ${((formDays - 15) / (365 - 15)) * 100}%, rgba(124,58,237,0.2) ${((formDays - 15) / (365 - 15)) * 100}%)`;

  const setF = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  if (submitted) {
    return (
      <div className="min-h-screen font-golos flex items-center justify-center px-4" style={{ background: "#0F0A1E" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 btn-neon rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Icon name="CheckCircle" size={40} className="text-white" />
          </div>
          <h2 className="font-oswald text-4xl font-bold text-white mb-3">Заявка принята!</h2>
          <p className="text-white/50 mb-6">Мы рассматриваем заявки от 1 до 30 минут. Ожидайте звонка специалиста.</p>
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="font-oswald text-5xl font-bold gradient-text mb-2">{fmtTime(timerSec)}</div>
            <p className="text-white/40 text-sm">Примерное время до ответа</p>
          </div>
          <button onClick={() => navigate("/dashboard")}
            className="btn-neon text-white font-bold px-8 py-4 rounded-2xl w-full flex items-center justify-center gap-2">
            <Icon name="LayoutDashboard" size={18} />
            Перейти в личный кабинет
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center">
              <Icon name="Wallet" size={20} className="text-white" />
            </div>
            <span className="font-oswald text-xl font-bold tracking-wide text-white">
              PARA<span className="gradient-text">FINANS24</span>
            </span>
          </button>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <Icon name="ArrowLeft" size={16} />
            Назад
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", color: "#c084fc" }}>
            <Icon name="FileText" size={14} />
            Анкета заёмщика
          </div>
          <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-3">
            ОФОРМИТЬ <span className="gradient-text">ЗАЙМ</span>
          </h1>
          <p className="text-white/50">Заполните все поля — это займёт около 5 минут</p>
        </div>

        {/* НАВИГАЦИЯ ПО СЕКЦИЯМ */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: activeSection === s.id ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.05)",
                border: activeSection === s.id ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                color: activeSection === s.id ? "#e9d5ff" : "rgba(255,255,255,0.5)",
              }}>
              <Icon name={s.icon} size={13} />
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">

            {/* ЛИЧНЫЕ ДАННЫЕ */}
            {activeSection === "personal" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="User" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Личные данные</h3>
                </div>
                <div>
                  <label className={labelCls}>Фамилия Имя Отчество <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Иванов Иван Иванович" value={form.fullName} onChange={e => setF("fullName", e.target.value)} required className={inputCls} style={inputStyle} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Дата рождения <span className="text-red-400">*</span></label>
                    <input type="date" value={form.birthDate} onChange={e => setF("birthDate", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Место рождения <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="г. Москва" value={form.birthPlace} onChange={e => setF("birthPlace", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Телефон <span className="text-red-400">*</span></label>
                    <input type="tel" placeholder="+7 (900) 000-00-00" value={form.phone} onChange={e => setF("phone", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                    <input type="email" placeholder="ivan@mail.ru" value={form.email} onChange={e => setF("email", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telegram <span className="text-white/30 font-normal">— для получения решения</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                    <input type="text" placeholder="username" value={form.telegramId} onChange={e => setF("telegramId", e.target.value.replace(/^@/, ""))}
                      className="w-full rounded-xl pl-8 pr-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors text-sm" style={inputStyle} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setActiveSection("passport")}
                    className="btn-neon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ПАСПОРТ */}
            {activeSection === "passport" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="BookOpen" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Паспортные данные</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Серия <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="1234" value={form.passportSeries} onChange={e => setF("passportSeries", e.target.value)} required maxLength={4} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Номер <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="567890" value={form.passportNumber} onChange={e => setF("passportNumber", e.target.value)} required maxLength={6} className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Дата выдачи <span className="text-red-400">*</span></label>
                    <input type="date" value={form.passportDate} onChange={e => setF("passportDate", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Код подразделения <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="123-456" value={form.passportCode} onChange={e => setF("passportCode", e.target.value)} required className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Кем выдан <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="УМВД России по г. Москве" value={form.passportBy} onChange={e => setF("passportBy", e.target.value)} required className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls}>СНИЛС <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="000-000-000 00" value={form.snils} onChange={e => setF("snils", e.target.value)} required className={inputCls} style={inputStyle} />
                  <p className="text-white/30 text-xs mt-1">Страховой номер индивидуального лицевого счёта</p>
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setActiveSection("personal")}
                    className="glass text-white/60 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:text-white transition-colors">
                    <Icon name="ArrowLeft" size={16} /> Назад
                  </button>
                  <button type="button" onClick={() => setActiveSection("work")}
                    className="btn-neon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* РАБОТА */}
            {activeSection === "work" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="Briefcase" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Работа и доходы</h3>
                </div>
                <div>
                  <label className={labelCls}>Место работы</label>
                  <input type="text" placeholder="ООО Компания" value={form.workplace} onChange={e => setF("workplace", e.target.value)} className={inputCls} style={inputStyle} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Должность</label>
                    <input type="text" placeholder="Менеджер" value={form.position} onChange={e => setF("position", e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls}>Рабочий телефон</label>
                    <input type="tel" placeholder="+7 (495) 000-00-00" value={form.workPhone} onChange={e => setF("workPhone", e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Зарплата (₽ в месяц)</label>
                  <input type="number" placeholder="50000" value={form.salary} onChange={e => setF("salary", e.target.value)} className={inputCls} style={inputStyle} />
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setActiveSection("passport")}
                    className="glass text-white/60 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:text-white transition-colors">
                    <Icon name="ArrowLeft" size={16} /> Назад
                  </button>
                  <button type="button" onClick={() => setActiveSection("contacts")}
                    className="btn-neon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* КОНТАКТЫ */}
            {activeSection === "contacts" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="Phone" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Контактная информация</h3>
                </div>
                <div>
                  <label className={labelCls}>Контактный телефон родственника или друга <span className="text-red-400">*</span></label>
                  <input type="tel" placeholder="+7 (900) 000-00-00 (ФИО)" value={form.contactPerson} onChange={e => setF("contactPerson", e.target.value)} required className={inputCls} style={inputStyle} />
                  <p className="text-white/30 text-xs mt-1">Укажите имя и телефон контактного лица</p>
                </div>
                <div>
                  <label className={labelCls}>Номер карты или телефон СБП для перевода <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="2200 1234 5678 9012 или +7 (900) 000-00-00" value={form.cardNumber} onChange={e => setF("cardNumber", e.target.value)} required className={inputCls} style={inputStyle} />
                  <p className="text-white/30 text-xs mt-1">На этот реквизит поступят деньги после одобрения</p>
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setActiveSection("work")}
                    className="glass text-white/60 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:text-white transition-colors">
                    <Icon name="ArrowLeft" size={16} /> Назад
                  </button>
                  <button type="button" onClick={() => setActiveSection("loan")}
                    className="btn-neon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ПАРАМЕТРЫ ЗАЙМА */}
            {activeSection === "loan" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="Calculator" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Параметры займа</h3>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">Сумма займа</span>
                    <span className="font-bold gradient-text text-base">{formAmount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <input type="range" min={500} max={50000} step={500} value={formAmount}
                    onChange={e => { const v = Number(e.target.value); setFormAmount(v); setF("amount", String(v)); }}
                    className="slider-custom w-full" style={{ background: amountBg }} />
                  <div className="flex justify-between text-white/30 text-xs mt-1">
                    <span>500 ₽</span><span>50 000 ₽</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-white/60 text-sm">Срок займа</span>
                    <span className="font-bold gradient-text text-base">{formDays} дней</span>
                  </div>
                  <input type="range" min={15} max={365} step={5} value={formDays}
                    onChange={e => { const v = Number(e.target.value); setFormDays(v); setF("days", String(v)); }}
                    className="slider-custom w-full" style={{ background: daysBg }} />
                  <div className="flex justify-between text-white/30 text-xs mt-1">
                    <span>15 дней</span><span>365 дней</span>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  <div className="grid grid-cols-2 gap-3 text-center mb-3">
                    <div>
                      <div className="text-white/40 text-xs mb-1">Сумма</div>
                      <div className="text-white font-bold">{formAmount.toLocaleString("ru-RU")} ₽</div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs mb-1">Срок</div>
                      <div className="text-white font-bold">{formDays} дн.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div>
                      <div className="text-white/40 text-xs mb-1">Ставка</div>
                      <div className="text-yellow-300 font-bold">0.5% / день</div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs mb-1">К возврату</div>
                      <div className="text-purple-300 font-bold">{Math.round(formAmount * (1 + RATE * formDays)).toLocaleString("ru-RU")} ₽</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button type="button" onClick={() => setActiveSection("contacts")}
                    className="glass text-white/60 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:text-white transition-colors">
                    <Icon name="ArrowLeft" size={16} /> Назад
                  </button>
                  <button type="button" onClick={() => setActiveSection("docs")}
                    className="btn-neon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                    Далее <Icon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ДОКУМЕНТЫ */}
            {activeSection === "docs" && (
              <div className="glass rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl btn-neon flex items-center justify-center shrink-0">
                    <Icon name="FileImage" size={16} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg">Фото документов</h3>
                  <span className="text-white/30 text-sm font-normal">(необязательно)</span>
                </div>
                <div className="space-y-3">
                  {FILE_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={e => setFiles(p => ({ ...p, [key]: e.target.files?.[0] ?? null }))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-colors"
                          style={{ background: "rgba(255,255,255,0.03)", borderColor: files[key] ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.12)" }}>
                          <Icon name={files[key] ? "CheckCircle" : "Upload"} size={16} className={files[key] ? "text-green-400" : "text-white/30"} />
                          <span className="text-sm" style={{ color: files[key] ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
                            {files[key] ? files[key]!.name : "Нажмите для выбора фото"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {sendError && (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <Icon name="AlertCircle" size={16} className="text-red-400 shrink-0" />
                    <span className="text-red-300 text-sm">{sendError}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={() => setActiveSection("loan")}
                    className="glass text-white/60 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:text-white transition-colors">
                    <Icon name="ArrowLeft" size={16} /> Назад
                  </button>
                  <button type="submit" disabled={sending}
                    className="btn-neon text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
                    {sending
                      ? <><Icon name="Loader2" size={16} className="animate-spin" />{sendStep || "Отправляем..."}</>
                      : <><Icon name="Send" size={16} />Отправить заявку</>
                    }
                  </button>
                </div>
                <p className="text-white/20 text-xs text-center">
                  Нажимая «Отправить», вы соглашаетесь с условиями обработки персональных данных
                </p>
              </div>
            )}

          </div>
        </form>

        {/* Прогресс */}
        <div className="mt-6 flex justify-center gap-2">
          {SECTIONS.map((s, i) => (
            <div key={s.id} onClick={() => setActiveSection(s.id)}
              className="w-2 h-2 rounded-full cursor-pointer transition-all"
              style={{
                background: activeSection === s.id ? "#a855f7" : "rgba(255,255,255,0.15)",
                width: activeSection === s.id ? 24 : 8,
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}