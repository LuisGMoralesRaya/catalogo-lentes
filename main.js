import { start } from "./app.js";

const $ = (id) => document.getElementById(id);
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function decrypt(password) {
  // "no-cache": siempre revalida con el servidor, así un cambio de contraseña
  // se ve al instante y no tras los 10 minutos de caché de GitHub Pages.
  const blob = await (await fetch("data.enc", { cache: "no-cache" })).json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bytes(blob.salt), iterations: blob.iter, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(blob.iv) }, key, bytes(blob.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

// "ok" | "bad" (contraseña incorrecta) | "error" (conexión, navegador sin WebCrypto…)
async function unlock(password) {
  try {
    const products = await decrypt(password);
    document.body.classList.remove("locked");
    $("gate").remove();
    start(products);
    return "ok";
  } catch (e) {
    // Con AES-GCM una contraseña incorrecta falla la verificación: OperationError.
    return e?.name === "OperationError" ? "bad" : "error";
  }
}

const saved = sessionStorage.getItem("k");
if (!(saved && (await unlock(saved)) === "ok")) {
  sessionStorage.removeItem("k");
  $("pw")?.focus();
}

$("gate-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button");
  button.disabled = true;
  $("gate-error").textContent = "";
  const password = $("pw").value.trim(); // un espacio al pegar no debe impedir la entrada
  const result = await unlock(password);
  if (result === "ok") sessionStorage.setItem("k", password);
  else {
    $("gate-error").textContent =
      result === "bad"
        ? "Contraseña incorrecta (revisa mayúsculas y minúsculas)"
        : "No se pudo abrir el catálogo. Revisa tu conexión e inténtalo de nuevo.";
    $("pw").select();
    button.disabled = false;
  }
});
