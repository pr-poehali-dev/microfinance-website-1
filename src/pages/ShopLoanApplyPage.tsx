import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import Navbar from "@/components/Navbar";

const API_URL    = "https://functions.poehali.dev/f0312370-20d7-488e-b072-dc4c0b2af2aa";
const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";

const AMOUNT_MIN = 3000;
const AMOUNT_MAX = 150000;
const MONTHS_MIN = 1;
const MONTHS_MAX = 24;
const RATE = 0.09;

const inp  = "w-full bg-transparent border rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm";
const iSt  = { borderColor: "rgba(255,255,255,0.12)" };
const lbl  = "block text-white/60 text-sm mb-1.5 font-medium";

const FILE_FIELDS = [
  { key: "filePassport",     label: "Паспорт — главная страница",     icon: "BookUser",    required: true },
  { key: "fileRegistration", label: "Паспорт — страница с пропиской", icon: "MapPin",      required: true },
  { key: "fileSelfie",       label: "Селфи с паспортом в руке",       icon: "Camera",      required: true },
  { key: "fileSnils",        label: "СНИЛС",                          icon: "CreditCard",  required: true },
] as const;

export default function ShopLoanApplyPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollTo = (href: string) => { setMobileOpen(false); document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); };

  const [amount, setAmount] = useState(30000);
  const [months, setMonths] = useState(6);
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", birthDate: "",
    address: "", passportSeries: "", passportNumber: "",
    passportDate: "", passportBy: "", snils: "",
    shopName: "", itemName: "", itemPrice: "",
    contactPerson: "", cardNumber: "",
  });
  const [files, setFiles] = useState<Record<string, File | null>>({
    filePassport: null, fileRegistration: null, fileSelfie: null, fileSnils: null,
  });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState("");
  const [sendError, setSendError] = useState("");

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const totalReturn  = Math.round(amount * (1 + RATE * months));
  const monthPayment = Math.round(totalReturn / months);

  const amountBg = `linear-gradient(to right,#a855f7 ${((amount - AMOUNT_MIN)/(AMOUNT_MAX - AMOUNT_MIN))*100}%,rgba(168,85,247,0.2) ${((amount - AMOUNT_MIN)/(AMOUNT_MAX - AMOUNT_MIN))*100}%)`;
  const monthsBg = `linear-gradient(to right,#06b6d4 ${((months - MONTHS_MIN)/(MONTHS_MAX - MONTHS_MIN))*100}%,rgba(6,182,212,0.2) ${((months - MONTHS_MIN)/(MONTHS_MAX - MONTHS_MIN))*100}%)`;

  const compressImage = useCallback((file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.6).split(",")[1]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }), []);

  const uploadFile = async (b64: string, filename: string): Promise<string> => {
    const res = await fetch(UPLOAD_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: b64, filename, folder: "shoploan" }),
    });
    if (!res.ok) throw new Error("upload failed");
    return (await res.json()).url as string;
  };

  const handleFile = (key: string, file: File | null) => {
    setFiles(p => ({ ...p, [key]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreviews(p => ({ ...p, [key]: reader.result as string }));
      reader.readAsDataURL(file);
    } else {
      setPreviews(p => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setSendError(""); setSendStep("");
    try {
      const fileEntries = Object.entries(files).filter(([, f]) => f);
      const phone = form.phone.replace(/\D/g, "");
      const now = Date.now();

      setSendStep(`Загружаем документы (${fileEntries.length} шт.)...`);
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
          ...form,
          loanAmount: amount,
          loanMonths: months,
          itemPrice: form.itemPrice ? parseInt(form.itemPrice) : null,
          ...fileUrls,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          navigate("/dashboard");
        } else {
          setSubmitted(true);
        }
      } else {
        setSendError("Ошибка при отправке. Попробуйте ещё раз.");
      }
    } catch {
      setSendError("Нет связи с сервером. Попробуйте позже.");
    } finally {
      setSending(false); setSendStep("");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen font-golos flex items-center justify-center px-4" style={{ background: "#0F0A1E" }}>
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 0 60px rgba(168,85,247,0.4)" }}>
            <Icon name="CheckCircle" size={44} className="text-white" />
          </div>
          <h2 className="font-oswald text-4xl font-bold text-white mb-4">ЗАЯВКА ПРИНЯТА!</h2>
          <p className="text-white/50 mb-2 leading-relaxed">Заявка на займ для покупки товара успешно отправлена.</p>
          <p className="text-purple-400 font-semibold mb-8">Решение — от 1 минуты до 1 часа.</p>
          <button onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)" }}>
            <Icon name="Home" size={18} /> На главную
          </button>
        </div>
      </div>
    );
  }

  const sectionHdr = (icon: string, title: string, gradient?: string) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: gradient || "linear-gradient(135deg,#a855f7,#06b6d4)" }}>
        <Icon name={icon} size={16} className="text-white" />
      </div>
      <h3 className="text-white font-bold text-lg">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen font-golos" style={{ background: "#0F0A1E" }}>
      <Navbar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#d8b4fe" }}>
            <Icon name="ShoppingBag" size={14} />
            Займ на покупку товаров
          </div>
          <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-2">
            ОФОРМИТЬ <span style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ЗАЯВКУ</span>
          </h1>
          <p className="text-white/40">Заполните форму — займёт около 5 минут</p>
        </div>

        {/* Краткие условия */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "Banknote", v: "до 150 000 ₽", l: "сумма",    c: "#a855f7" },
            { icon: "Calendar", v: "до 24 мес.",    l: "срок",     c: "#06b6d4" },
            { icon: "Percent",  v: "от 9%/мес.",    l: "ставка",   c: "#22c55e" },
          ].map(c => (
            <div key={c.l} className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Icon name={c.icon} size={18} style={{ color: c.c }} className="mx-auto mb-1" />
              <div className="font-bold text-sm" style={{ color: c.c }}>{c.v}</div>
              <div className="text-white/30 text-xs">{c.l}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── КАЛЬКУЛЯТОР ── */}
          <div className="rounded-2xl p-6 space-y-5"
            style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)" }}>
            {sectionHdr("Calculator", "Параметры займа")}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-sm">Сумма займа</span>
                <span className="font-bold text-purple-400 text-base">{amount.toLocaleString("ru-RU")} ₽</span>
              </div>
              <input type="range" min={AMOUNT_MIN} max={AMOUNT_MAX} step={1000} value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="slider-custom w-full" style={{ background: amountBg }} />
              <div className="flex justify-between text-white/30 text-xs mt-1"><span>3 000 ₽</span><span>150 000 ₽</span></div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-sm">Срок займа</span>
                <span className="font-bold text-cyan-400 text-base">{months} мес.</span>
              </div>
              <input type="range" min={MONTHS_MIN} max={MONTHS_MAX} step={1} value={months}
                onChange={e => setMonths(Number(e.target.value))}
                className="slider-custom w-full" style={{ background: monthsBg }} />
              <div className="flex justify-between text-white/30 text-xs mt-1"><span>1 мес.</span><span>24 мес.</span></div>
            </div>
            <div className="rounded-xl p-4 grid grid-cols-2 gap-3"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Ставка</div>
                <div className="text-green-400 font-bold">9% / мес.</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Платёж / мес.</div>
                <div className="text-white font-bold">{monthPayment.toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">Переплата</div>
                <div className="text-red-400 font-bold">{(totalReturn - amount).toLocaleString("ru-RU")} ₽</div>
              </div>
              <div className="text-center">
                <div className="text-white/40 text-xs mb-1">К возврату</div>
                <div className="font-bold text-purple-400">{totalReturn.toLocaleString("ru-RU")} ₽</div>
              </div>
            </div>
          </div>

          {/* ── ТОВАР ── */}
          <div className="rounded-2xl p-6 space-y-4"
            style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.25)" }}>
            {sectionHdr("ShoppingCart", "Информация о товаре", "linear-gradient(135deg,#06b6d4,#22c55e)")}
            <div>
              <label className={lbl}>Название магазина / площадки</label>
              <input type="text" placeholder="Wildberries, Ozon, М.Видео..." value={form.shopName}
                onChange={e => setF("shopName", e.target.value)} className={inp} style={iSt} />
            </div>
            <div>
              <label className={lbl}>Название товара <span className="text-red-400">*</span></label>
              <input type="text" placeholder="iPhone 15 Pro, диван угловой..." value={form.itemName}
                onChange={e => setF("itemName", e.target.value)} required className={inp} style={iSt} />
            </div>
            <div>
              <label className={lbl}>Цена товара (₽)</label>
              <input type="number" placeholder="50000" value={form.itemPrice}
                onChange={e => setF("itemPrice", e.target.value)} className={inp} style={iSt} />
            </div>
          </div>

          {/* ── ЛИЧНЫЕ ДАННЫЕ ── */}
          <div className="glass rounded-2xl p-6 space-y-4">
            {sectionHdr("User", "Личные данные")}
            <div>
              <label className={lbl}>ФИО <span className="text-red-400">*</span></label>
              <input type="text" placeholder="Иванов Иван Иванович" value={form.fullName}
                onChange={e => setF("fullName", e.target.value)} required className={inp} style={iSt} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Телефон <span className="text-red-400">*</span></label>
                <input type="tel" placeholder="+7 (900) 000-00-00" value={form.phone}
                  onChange={e => setF("phone", e.target.value)} required className={inp} style={iSt} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" placeholder="email@mail.ru" value={form.email}
                  onChange={e => setF("email", e.target.value)} className={inp} style={iSt} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Дата рождения <span className="text-red-400">*</span></label>
                <input type="date" value={form.birthDate}
                  onChange={e => setF("birthDate", e.target.value)} required className={inp} style={iSt} />
              </div>
              <div>
                <label className={lbl}>Адрес регистрации <span className="text-red-400">*</span></label>
                <input type="text" placeholder="г. Москва, ул. Примерная, д. 1" value={form.address}
                  onChange={e => setF("address", e.target.value)} required className={inp} style={iSt} />
              </div>
            </div>
          </div>

          {/* ── ПАСПОРТ ── */}
          <div className="glass rounded-2xl p-6 space-y-4">
            {sectionHdr("BookUser", "Паспортные данные")}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Серия <span className="text-red-400">*</span></label>
                <input type="text" placeholder="1234" value={form.passportSeries}
                  onChange={e => setF("passportSeries", e.target.value)} required className={inp} style={iSt} />
              </div>
              <div>
                <label className={lbl}>Номер <span className="text-red-400">*</span></label>
                <input type="text" placeholder="567890" value={form.passportNumber}
                  onChange={e => setF("passportNumber", e.target.value)} required className={inp} style={iSt} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Дата выдачи</label>
                <input type="date" value={form.passportDate}
                  onChange={e => setF("passportDate", e.target.value)} className={inp} style={iSt} />
              </div>
              <div>
                <label className={lbl}>СНИЛС <span className="text-red-400">*</span></label>
                <input type="text" placeholder="000-000-000 00" value={form.snils}
                  onChange={e => setF("snils", e.target.value)} required className={inp} style={iSt} />
              </div>
            </div>
            <div>
              <label className={lbl}>Кем выдан <span className="text-red-400">*</span></label>
              <input type="text" placeholder="УМВД России по г. Москва" value={form.passportBy}
                onChange={e => setF("passportBy", e.target.value)} required className={inp} style={iSt} />
            </div>
          </div>

          {/* ── ДОКУМЕНТЫ — ФОТО ── */}
          <div className="glass rounded-2xl p-6 space-y-5">
            {sectionHdr("Camera", "Фотографии документов")}
            <p className="text-white/40 text-xs -mt-3">Сфотографируйте документы при хорошем освещении. Поддерживаются JPG, PNG, HEIC.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {FILE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className={lbl}>{f.label} {f.required && <span className="text-red-400">*</span>}</label>
                  {previews[f.key] ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid rgba(168,85,247,0.4)" }}>
                      <img src={previews[f.key]} alt={f.label} className="w-full h-36 object-cover" />
                      <button type="button" onClick={() => handleFile(f.key, null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(239,68,68,0.8)" }}>
                        <Icon name="X" size={12} className="text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs text-white font-semibold"
                        style={{ background: "rgba(34,197,94,0.8)" }}>
                        <Icon name="CheckCircle" size={12} className="inline mr-1" />Загружено
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-36 rounded-xl cursor-pointer transition-all hover:border-purple-500/60"
                      style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.12)" }}>
                      <Icon name={f.icon} size={28} className="text-purple-400 mb-2" />
                      <span className="text-white/40 text-xs text-center px-2">Нажмите для загрузки</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={ev => handleFile(f.key, ev.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── РЕКВИЗИТЫ ── */}
          <div className="glass rounded-2xl p-6 space-y-4">
            {sectionHdr("CreditCard", "Контактная информация")}
            <div>
              <label className={lbl}>Контактный телефон родственника / друга <span className="text-red-400">*</span></label>
              <input type="tel" placeholder="+7 (900) 000-00-00 (ФИО)" value={form.contactPerson}
                onChange={e => setF("contactPerson", e.target.value)} required className={inp} style={iSt} />
            </div>
            <div>
              <label className={lbl}>Карта или телефон СБП для связи</label>
              <input type="text" placeholder="2200 1234 5678 9012 или +7 (900) 000-00-00" value={form.cardNumber}
                onChange={e => setF("cardNumber", e.target.value)} className={inp} style={iSt} />
            </div>
          </div>

          {/* Согласие */}
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Icon name="ShieldCheck" size={18} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="text-white/40 text-xs leading-relaxed">
              Нажимая «Отправить заявку», вы соглашаетесь на обработку персональных данных. Ставка от 9% в месяц, срок до 24 месяцев. Денежные средства переводятся в магазин напрямую.
            </p>
          </div>

          {sendStep && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-sm"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#d8b4fe" }}>
              <Icon name="Loader" size={15} className="animate-spin shrink-0" /> {sendStep}
            </div>
          )}
          {sendError && (
            <div className="rounded-xl p-4 text-red-400 text-sm text-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {sendError}
            </div>
          )}

          <button type="submit" disabled={sending}
            className="w-full py-5 rounded-2xl font-bold text-xl text-white flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", boxShadow: "0 0 40px rgba(168,85,247,0.4)", opacity: sending ? 0.7 : 1 }}>
            {sending
              ? <><Icon name="Loader" size={22} className="animate-spin" /> Отправляем...</>
              : <><Icon name="ShoppingBag" size={22} /> Отправить заявку</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}