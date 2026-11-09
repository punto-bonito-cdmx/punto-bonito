# Punto Bonito · Postres & detalles

Tienda en línea de Punto Bonito (Iztapalapa), publicada con GitHub Pages.

- El menú, las fotos y los ajustes viven en **`catalogo.json`**.
- El cliente arma su pedido y lo **envía por WhatsApp**; no hay servidor ni base
  de datos.
- `fotos/` tiene las fotos de producto; `marca/` el logo y los íconos.

## Cambiar precios, stock o datos de contacto

Todo se edita en `catalogo.json`:

| Qué | Dónde |
|---|---|
| Precio | `items[].price` (0 = "Precio por confirmar") |
| Piezas disponibles | `items[].stock` (`null` = sin contar, `0` = agotado) |
| Agotado / disponible | `items[].status` (`"disponible"` o `"agotado"`) |
| WhatsApp que recibe los pedidos | `settings.whatsapp` (con lada: `5255…`) |
| Instagram | `settings.instagram` (sin @) |
| Facebook | `settings.facebook`: usuario de la Página, `profile.php?id=…` o URL completa. El botón de Messenger sale solo (`m.me/…`); `settings.messenger` lo sobrescribe |
| Datos de transferencia | `settings.clabe`, `settings.beneficiario`, `settings.banco` |
| Pausar pedidos | `settings.abierto` (`false`) |
| Temporada | `settings.temporadaProgramada` (`halloween` o `revolucion`, con fechas) |

Después de editar, se sube el cambio y GitHub Pages actualiza la página en uno o
dos minutos.

## Origen

Es la versión estática de la tienda que corre en local en `~/postres` (WSL),
generada con `~/postres/scripts/publicar-estatico.ps1`.
