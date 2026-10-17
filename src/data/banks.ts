export const SBP_BANKS = [
  "Сбербанк",
  "Т-Банк (Тинькофф)",
  "ВТБ",
  "Альфа-Банк",
  "Газпромбанк",
  "Райффайзенбанк",
  "Озон Банк",
  "Яндекс Банк",
  "Совкомбанк",
  "Россельхозбанк",
  "Почта Банк",
  "МТС Банк",
  "Открытие",
  "Промсвязьбанк",
  "Росбанк",
  "Wildberries Банк",
  "Другой банк",
];

const SEP = " · ";

export function splitPayout(value: string): { main: string; bank: string } {
  const i = value.indexOf(SEP);
  if (i === -1) return { main: value, bank: "" };
  return { main: value.slice(0, i), bank: value.slice(i + SEP.length) };
}

export function joinPayout(main: string, bank: string): string {
  return bank ? `${main}${SEP}${bank}` : main;
}

export function isCardValue(main: string): boolean {
  return main.replace(/\D/g, "").length >= 16;
}

export function validatePayout(value: string): string {
  const { main, bank } = splitPayout(value);
  const digits = main.replace(/\D/g, "");
  const phoneOk = digits.length === 10 || digits.length === 11;
  const cardOk = digits.length >= 16 && digits.length <= 19;
  if (!phoneOk && !cardOk) return "Укажите телефон для перевода по СБП";
  if (phoneOk && !bank) return "Выберите банк, на который перевести деньги по СБП";
  return "";
}
