// Variante con servidor: la contraseña ya la pidió el servidor (HTTP Basic).
import { start } from "./app.js";

// "no-cache": revalida siempre, así una actualización del catálogo se ve al instante.
start(await (await fetch("products.json", { cache: "no-cache" })).json());
