// El estado vive en el hash (#tipo=solar&orden=desc&marcas=Seen,Polaroid) para poder
// compartir una vista exacta. Todo se pinta con textContent: nada de HTML inyectado.
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const TIPOS = ["todos", "solar", "oftalmico"];

let products = [];
const state = { tipo: "todos", orden: "asc", marcas: new Set() };

function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  state.tipo = TIPOS.includes(q.get("tipo")) ? q.get("tipo") : "todos";
  state.orden = q.get("orden") === "desc" ? "desc" : "asc";
  state.marcas = new Set((q.get("marcas") ?? "").split(",").filter(Boolean));
}

function writeHash() {
  const q = new URLSearchParams();
  if (state.tipo !== "todos") q.set("tipo", state.tipo);
  if (state.orden !== "asc") q.set("orden", state.orden);
  if (state.marcas.size) q.set("marcas", [...state.marcas].join(","));
  const hash = q.toString();
  history.replaceState(null, "", hash ? `#${hash}` : location.pathname);
}

const byTipo = (p) => state.tipo === "todos" || p.t === state.tipo;

function renderBrands() {
  // Los conteos siguen al tipo elegido; una marca sin productos en ese tipo no se ofrece.
  const counts = new Map();
  for (const p of products.filter(byTipo)) counts.set(p.b, (counts.get(p.b) ?? 0) + 1);
  for (const m of [...state.marcas]) if (!counts.has(m)) state.marcas.delete(m);

  const list = $("marcas-lista");
  list.replaceChildren();
  for (const [brand, n] of [...counts].sort((a, b) => a[0].localeCompare(b[0], "es"))) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.marcas.has(brand);
    input.addEventListener("change", () => {
      input.checked ? state.marcas.add(brand) : state.marcas.delete(brand);
      render();
    });
    const small = document.createElement("small");
    small.textContent = n;
    label.append(input, document.createTextNode(brand + " "), small);
    list.append(label);
  }
  $("marcas-sel").textContent = state.marcas.size ? `(${state.marcas.size})` : "";
}

function renderGrid() {
  const dir = state.orden === "asc" ? 1 : -1;
  const shown = products
    .filter(byTipo)
    .filter((p) => !state.marcas.size || state.marcas.has(p.b))
    .sort((a, b) => dir * (a.p - b.p) || a.n.localeCompare(b.n, "es"));

  const frag = document.createDocumentFragment();
  for (const p of shown) {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.src = `img/${p.i ?? p.id}.jpg`;
    img.alt = p.n;
    img.loading = "lazy";
    img.decoding = "async";

    const brand = Object.assign(document.createElement("div"), { className: "brand", textContent: p.b });
    const name = Object.assign(document.createElement("div"), { className: "name", textContent: p.n });
    name.title = p.n;
    const sku = Object.assign(document.createElement("div"), { className: "sku", textContent: p.s });
    const price = Object.assign(document.createElement("div"), { className: "price" });
    if (p.f) price.append(Object.assign(document.createElement("small"), { textContent: "Desde" }));
    price.append(document.createTextNode(money.format(p.p)));

    card.append(img, brand, name, sku, price);
    frag.append(card);
  }
  $("grid").replaceChildren(frag);
  $("vacio").hidden = shown.length > 0;
  $("conteo").textContent = `${shown.length} ${shown.length === 1 ? "lente" : "lentes"}`;
}

function render() {
  document.querySelectorAll(".tabs button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.tipo === state.tipo)),
  );
  $("orden").value = state.orden;
  renderBrands();
  renderGrid();
  writeHash();
}

document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    state.tipo = b.dataset.tipo;
    render();
  }),
);
$("orden").addEventListener("change", (e) => {
  state.orden = e.target.value;
  render();
});
$("limpiar").addEventListener("click", () => {
  state.marcas.clear();
  render();
});
addEventListener("hashchange", () => {
  readHash();
  render();
});

export function start(list) {
  products = list;
  readHash();
  render();
}
