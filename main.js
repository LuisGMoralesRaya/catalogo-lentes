import { start } from "./app.js";

const $ = (id) => document.getElementById(id);
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function decrypt(password) {
  const blob = await (await fetch("data.enc")).json();
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

async function unlock(password) {
  try {
    const products = await decrypt(password);
    document.body.classList.remove("locked");
    $("gate").remove();
    start(products);
    return true;
  } catch {
    return false; // contraseña incorrecta (la etiqueta de AES-GCM no valida)
  }
}

const saved = sessionStorage.getItem("k");
if (!(saved && (await unlock(saved)))) {
  sessionStorage.removeItem("k");
  $("pw")?.focus();
}

$("gate-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button");
  button.disabled = true;
  $("gate-error").textContent = "";
  const password = $("pw").value;
  if (await unlock(password)) sessionStorage.setItem("k", password);
  else {
    $("gate-error").textContent = "Contraseña incorrecta";
    $("pw").select();
    button.disabled = false;
  }
});
