import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const FORM_FEATURES = [
  { icon: "Shield", text: "Ваши данные надёжно защищены" },
  { icon: "Clock", text: "Ответ в течение 15 минут" },
  { icon: "CreditCard", text: "Перевод на любую карту" },
] as const;
import LoanCalculator from "./calculator/LoanCalculator";
import LoanFormFields from "./calculator/LoanFormFields";
import LoanSubmittedScreen from "./calculator/LoanSubmittedScreen";

const API_URL = "https://functions.poehali.dev/29f70c88-f1f7-4926-9c65-c642fd11fdfb";
const UPLOAD_URL = "https://functions.poehali.dev/45733e38-49ca-4566-9ae3-b5323aec9a63";

export default function CalculatorForm() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(30000);
  const [days, setDays] = useState(15);
  const [formAmount, setFormAmount] = useState(50000);
  const [formDays, setFormDays] = useState(15);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    amount: "50000",
    days: "15",
    birthDate: "",
    passportSeries: "",
    passportNumber: "",
    passportDate: "",
    passportCode: "",
    passportBy: "",
    birthPlace: "",
    telegramId: "",
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    passportMain: null,
    registration: null,
    selfie: null,
    previousPassports: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendStep, setSendStep] = useState("");
  const [timerSec, setTimerSec] = useState(15 * 60);
  const [timerDone, setTimerDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!submitted) return;
    setTimerSec(15 * 60);
    setTimerDone(false);
    timerRef.current = setInterval(() => {
      setTimerSec((prev) => {
        if (prev <= 5 * 60 + 1) {
          clearInterval(timerRef.current!);
          setTimerDone(true);
          return 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [submitted]);

  const fmtTime = useCallback((sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  const handleFileChange = (key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

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
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", 0.5).split(",")[1]);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const uploadFile = async (b64: string, filename: string, folder: string): Promise<string> => {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: b64, filename, folder }),
    });
    if (!res.ok) throw new Error("upload failed");
    const data = await res.json();
    return data.url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError("");
    setSendStep("");
    try {
      const fileEntries = Object.entries(files).filter(([, f]) => f);
      const now = Date.now();
      const phone = form.phone.replace(/\D/g, "");

      setSendStep(`Загружаем фото (${fileEntries.length} шт.)...`);
      const uploadResults = await Promise.all(
        fileEntries.map(async ([key, file]) => {
          const b64 = await compressImage(file!);
          const filename = `${now}_${phone}_${key}.webp`;
          const url = await uploadFile(b64, filename, "applications");
          return [key, url] as const;
        })
      );
      const fileUrls = Object.fromEntries(uploadResults);

      setSendStep("Отправляем заявку...");
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: form.fullName, ...fileUrls }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        navigate("/dashboard");
      } else {
        setSendError("Ошибка при отправке. Попробуйте ещё раз.");
      }
    } catch {
      setSendError("Нет связи с сервером. Попробуйте позже.");
    } finally {
      setSending(false);
      setSendStep("");
    }
  };

  return (
    <>
      <LoanCalculator
        amount={amount}
        days={days}
        onAmountChange={setAmount}
        onDaysChange={setDays}
      />

      <section id="form" className="py-24" style={{ background: "rgba(124,58,237,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block glass px-4 py-1.5 rounded-full text-purple-300 text-sm mb-4">
                Быстрая заявка
              </div>
              <h2 className="font-oswald text-4xl md:text-5xl font-bold text-white mb-6">
                ПОЛУЧИТЕ ДЕНЬГИ <span className="gradient-text">СЕГОДНЯ</span>
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Заполните короткую форму — и мы перезвоним вам в течение 15 минут. Без очередей, без лишних бумаг.
              </p>
              <div className="space-y-4">
                {FORM_FEATURES.map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                      <Icon name={f.icon} size={16} className="text-purple-400" />
                    </div>
                    <span className="text-white/70 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              {submitted ? (
                <LoanSubmittedScreen
                  timerSec={timerSec}
                  timerDone={timerDone}
                  fmtTime={fmtTime}
                />
              ) : (
                <LoanFormFields
                  form={form}
                  setForm={setForm}
                  files={files}
                  onFileChange={handleFileChange}
                  formAmount={formAmount}
                  setFormAmount={setFormAmount}
                  formDays={formDays}
                  setFormDays={setFormDays}
                  sending={sending}
                  sendStep={sendStep}
                  sendError={sendError}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}