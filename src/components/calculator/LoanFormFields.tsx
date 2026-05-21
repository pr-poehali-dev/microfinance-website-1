import Icon from "@/components/ui/icon";

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  amount: string;
  days: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  passportDate: string;
  passportCode: string;
  passportBy: string;
  birthPlace: string;
  telegramId: string;
}

interface LoanFormFieldsProps {
  form: FormState;
  setForm: (form: FormState) => void;
  files: { [key: string]: File | null };
  onFileChange: (key: string, file: File | null) => void;
  formAmount: number;
  setFormAmount: (v: number) => void;
  formDays: number;
  setFormDays: (v: number) => void;
  sending: boolean;
  sendStep: string;
  sendError: string;
  onSubmit: (e: React.FormEvent) => void;
}

const inputCls = "w-full rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors";
const inputStyle = { background: "rgba(255,255,255,0.05)" };

export default function LoanFormFields({
  form, setForm, files, onFileChange,
  formAmount, setFormAmount, formDays, setFormDays,
  sending, sendStep, sendError, onSubmit,
}: LoanFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-white/70 text-sm mb-2 block">Фамилия Имя Отчество</label>
        <input
          type="text"
          placeholder="Иванов Иван Иванович"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">Дата рождения</label>
        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">Телефон</label>
        <input
          type="tel"
          placeholder="+7 (900) 000-00-00"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">Email</label>
        <input
          type="email"
          placeholder="ivan@mail.ru"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">
          Ваш Telegram (username или ID)
          <span className="text-white/30 font-normal ml-1">— для получения решения</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
          <input
            type="text"
            placeholder="username"
            value={form.telegramId}
            onChange={(e) => setForm({ ...form, telegramId: e.target.value.replace(/^@/, "") })}
            className="w-full rounded-xl pl-8 pr-4 py-3.5 text-white placeholder-white/30 outline-none border border-white/10 focus:border-purple-500 transition-colors"
            style={inputStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/70 text-sm mb-2 block">Серия паспорта</label>
          <input
            type="text"
            placeholder="1234"
            value={form.passportSeries}
            onChange={(e) => setForm({ ...form, passportSeries: e.target.value })}
            required
            maxLength={4}
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-white/70 text-sm mb-2 block">Номер паспорта</label>
          <input
            type="text"
            placeholder="567890"
            value={form.passportNumber}
            onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
            required
            maxLength={6}
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/70 text-sm mb-2 block">Дата выдачи</label>
          <input
            type="date"
            value={form.passportDate}
            onChange={(e) => setForm({ ...form, passportDate: e.target.value })}
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-white/70 text-sm mb-2 block">Код подразделения</label>
          <input
            type="text"
            placeholder="123-456"
            value={form.passportCode}
            onChange={(e) => setForm({ ...form, passportCode: e.target.value })}
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">Кем выдан</label>
        <input
          type="text"
          placeholder="УМВД России по г. Москве"
          value={form.passportBy}
          onChange={(e) => setForm({ ...form, passportBy: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-white/70 text-sm mb-2 block">Место рождения</label>
        <input
          type="text"
          placeholder="г. Москва"
          value={form.birthPlace}
          onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
          required
          className={inputCls}
          style={inputStyle}
        />
      </div>

      {/* КАЛЬКУЛЯТОР */}
      <div className="rounded-2xl border border-purple-500/40 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))" }}>
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.4)" }}>
            <Icon name="Calculator" size={14} className="text-purple-300" />
          </div>
          <span className="text-white/80 text-sm font-medium">Параметры займа</span>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white/60 text-sm">Желаемая сумма</span>
              <span className="font-bold text-base gradient-text">{formAmount.toLocaleString("ru-RU")} ₽</span>
            </div>
            <input
              type="range"
              min={5000}
              max={200000}
              step={5000}
              value={formAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFormAmount(val);
                setForm({ ...form, amount: String(val) });
              }}
              className="slider-custom w-full"
              style={{
                background: `linear-gradient(to right, #7C3AED ${((formAmount - 5000) / (200000 - 5000)) * 100}%, rgba(124,58,237,0.2) ${((formAmount - 5000) / (200000 - 5000)) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>5 000 ₽</span>
              <span>200 000 ₽</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-white/60 text-sm">Срок займа</span>
              <span className="font-bold text-base gradient-text">
                {formDays} {formDays === 1 ? "день" : formDays < 5 ? "дня" : "дней"}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={730}
              step={1}
              value={formDays}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFormDays(val);
                setForm({ ...form, days: String(val) });
              }}
              className="slider-custom w-full"
              style={{
                background: `linear-gradient(to right, #7C3AED ${((formDays - 5) / (730 - 5)) * 100}%, rgba(124,58,237,0.2) ${((formDays - 5) / (730 - 5)) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>5 дней</span>
              <span>730 дней</span>
            </div>
          </div>
          <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(0,0,0,0.25)" }}>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Сумма займа</span>
              <span className="text-white/80">{formAmount.toLocaleString("ru-RU")} ₽</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Проценты (0.8% × {formDays} дн.)</span>
              <span className="text-white/80">{Math.round(formAmount * 0.008 * formDays).toLocaleString("ru-RU")} ₽</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between items-center">
              <span className="text-white font-semibold">К возврату</span>
              <span className="font-bold text-2xl gradient-text">{(formAmount + Math.round(formAmount * 0.008 * formDays)).toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILE UPLOADS */}
      <div className="pt-2">
        <div className="text-white/70 text-sm mb-3 font-medium">Документы (фото или скан)</div>
        <div className="space-y-3">
          {[
            { key: "passportMain", label: "Паспорт — главная страница" },
            { key: "registration", label: "Прописка (страница регистрации)" },
            { key: "selfie", label: "Селфи с паспортом" },
            { key: "previousPassports", label: "О ранее выданных паспортах" },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl px-4 py-3 border border-white/10 cursor-pointer hover:border-purple-500 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                <Icon name={files[key] ? "CheckCircle" : "Upload"} size={16} className={files[key] ? "text-green-400" : "text-purple-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/70 text-sm">{label}</div>
                {files[key] && (
                  <div className="text-green-400 text-xs truncate">{files[key]!.name}</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => onFileChange(key, e.target.files?.[0] ?? null)}
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full btn-neon text-white font-bold py-4 rounded-2xl text-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
      >
        {sending ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            {sendStep || "Отправляем..."}
          </span>
        ) : "Отправить заявку"}
      </button>
      {sending && (
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-purple-400 rounded-full animate-pulse"
            style={{ width: sendStep.startsWith("Отправляем") ? "90%" : sendStep.includes("4") ? "75%" : sendStep.includes("3") ? "55%" : sendStep.includes("2") ? "35%" : "15%" }}
          />
        </div>
      )}
      {sendError && (
        <p className="text-red-400 text-sm text-center">{sendError}</p>
      )}
      <p className="text-white/30 text-xs text-center">
        Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
      </p>
    </form>
  );
}
