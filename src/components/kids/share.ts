export function campaignShareText(opts: {
  institution: string;
  children: number;
  deadline: string;
  url: string;
}) {
  return [
    `Oi! ❤️ Estamos preparando um Culto Kids muito especial na ${opts.institution} para aproximadamente ${opts.children} crianças.`,
    "",
    "Ainda precisamos de algumas doações.",
    "",
    "Você pode escolher um item para doar ou contribuir pelo PIX.",
    "",
    `As doações serão recebidas até ${opts.deadline}.`,
    "",
    "Confira nossa lista aqui:",
    opts.url,
  ].join("\n");
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function whatsappChatUrl(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}
