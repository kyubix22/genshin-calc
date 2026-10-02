# Crónica de Teyvat

Aplicación móvil (PWA, instalable en Android/iOS) para **Genshin Impact**: archivo de personajes, calculadora de daño, equipos de 4, catálogo de armas y un consejero con IA.

## Funciones

- **Personajes**: los 127 personajes del juego con su icono oficial, filtrables por **elemento, nación, rol y arma** (y rareza).
- **Calculadora**: introduces los atributos del panel del juego (Vida, ATQ, DEF, Maestría, Prob./Daño CRIT, Recarga, bonos de daño por elemento), el nivel, los talentos, el arma (con nivel y refinamiento) y los artefactos. Calcula el daño **no crítico, crítico y medio** de cada golpe de cada talento, curaciones, escudos y reacciones (vaporizar, derretir, intensificar, propagación y transformativas).
- **Equipos**: hasta 4 personajes. Aplica resonancias elementales y los buffs de apoyo (Bennett, Kazuha, Furina, Raiden, Shenhe, Yun Jin, Nahida, Faruzan, Zhongli, Sara, Mona, Chevreuse, Citlali, Xilonen…), armas y sets de equipo (Nobleza, Milelith, Instructor, VV…). Cada bono se puede activar o desactivar.
- **Armas**: catálogo de las 255 armas con ATQ base y subestadística por nivel y pasiva en R1–R5.
- **Consejero**: análisis experto local calculado con el propio motor (prioridad de subestadísticas, estadística principal por pieza, ranking de armas y sets, equilibrio crítico, Recarga recomendada) y **Oráculo IA** opcional con la API de Claude (requiere la clave del usuario, que se guarda sólo en el dispositivo).

## Datos y precisión

Los datos (estadísticas base por nivel, multiplicadores de talentos 1–15, armas por nivel y refinamiento, sets) se extraen del cliente del juego mediante [`genshin-db`](https://www.npmjs.com/package/genshin-db). Para actualizarlos tras un parche:

```bash
npm install
npm run build:data
```

Fórmula: `(multiplicador × atributo + plano) × (1 + bono de daño) × crítico × DEF × RES × reacción`.
Limitaciones: las constelaciones y algunas pasivas condicionales se añaden con «Bonos manuales»; las reacciones lunares de Nod-Krai aún no se calculan.

## Ejecutar

Es una web estática sin compilación:

```bash
npm start          # sirve app/ en http://localhost:8080
npm test           # pruebas del motor de cálculo
```

Para usarla en el móvil, publica la carpeta `app/` (p. ej. GitHub Pages) y elige «Añadir a pantalla de inicio». Funciona sin conexión tras la primera visita.

Genshin Impact es una marca de HoYoverse/miHoYo. Proyecto no oficial.
