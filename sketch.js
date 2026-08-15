function setup() {
  noCanvas();
  drawChart();
  window.addEventListener("resize", drawChart);
}

// 🎨 Couleurs institutionnelles — ici chaque teinte identifie une
// catégorie de décision (comme pour DT nach DT bereich), et non une
// intensité de valeur : pas de dégradé, une couleur fixe par série.
// Le petrol est réservé aux jours de service (Diensttage), comme dans
// DT geleistet — donc le Total prend le slate dk2 pour ne pas entrer
// en collision avec la ligne petrol ci-dessous.
const SERIES = [
  {
    key: "Total",
    internKey: "Total_Intern",
    label: "Total Disziplinarentscheide / Total des décisions disciplinaires / Totale decisioni disciplinari",
    color: "#44546A" // slate (dk2)
  },
  {
    key: "Art73_74",
    internKey: "Art73_74_Intern",
    label: "Disziplinarentscheide wegen Art. 73 oder 74 ZDG / Décisions disciplinaires pour infraction à l'art. 73 ou 74 LSC / Decisioni disciplinari causa articoli 73 o 74 LSC",
    color: "#CAE7EA" // mint
  },
  {
    key: "Art76",
    internKey: "Art76_Intern",
    label: "Disziplinarentscheide wegen Art. 76 ZDV / Décisions disciplinaires pour infraction à l'art. 76 LSC / Decisioni disciplinari causa articolo 76 OSCi",
    color: "#A3A8CA" // lila
  },
  {
    key: "Strafanzeigen",
    internKey: "Strafanzeigen_Intern",
    label: "Strafanzeigen / Plaintes pénales / Denuncia penale",
    color: "#B1B488" // kiwi
  },
  {
    key: "Strafbefehle",
    internKey: "Strafbefehle_Intern",
    label: "Strafbefehle wegen Zivildienstverweigerung / Ordonnances pénales pour refus de servir / Decreti penali causa Omissione del servizi",
    color: "#FCEB30" // jaune
  }
];

const LINE_COLOR = "#5A959D"; // petrol — Diensttage, comme DT geleistet
const LINE_LABEL = "Anrechenbare Diensttage / Jours de service pris en compte / Giorni di servizio computabili";

const AXIS_LEFT_LABEL = "Entscheide / Strafanzeigen / Strafbefehle\nDécisions / Plaintes pénales / Ordonnances pénales\nDecisioni / Denuncia penale / Decreti penali";
const AXIS_RIGHT_LABEL = "Anzahl Diensttage (Mio)\nJours de service (Million)\nGiorni di servizio (Milione)";

// --- Formatage suisse : 1'234 ---
function formatSwiss(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function drawChart() {

  d3.select("#chart").selectAll("*").remove();
  d3.select("#legend").selectAll("*").remove();

  const containerWidth = document.getElementById("chart").clientWidth;
  const isMobile = containerWidth < 600;

  d3.csv("RD_2025.csv").then(raw => {

    const data = raw.map(d => {
      const row = { year: +d.Jahr, diensttage: +d.Diensttage };
      SERIES.forEach(s => {
        row[s.key] = +d[s.key];
        row[s.internKey] = +d[s.internKey];
      });
      return row;
    }).sort((a, b) => a.year - b.year);

    const margin = {
      top: 12,
      right: isMobile ? 52 : 70,
      bottom: 28,
      left: isMobile ? 62 : 78
    };

    // ⭐ Budget par groupe resserré : avec 6 années × 5 barres, l'ancien
    // budget (170px/groupe) donnait une largeur totale > 1000px — au-delà
    // du cadre LivingDocs, d'où le scroll horizontal forcé. Resserré pour
    // que les 6 groupes tiennent sans scroll, quitte à des barres fines.
    const containerInnerWidth = containerWidth - margin.left - margin.right;
    const minInnerWidth = data.length * (isMobile ? 84 : 124);
    const innerWidth = Math.max(containerInnerWidth, minInnerWidth);
    const width = innerWidth + margin.left + margin.right;

    const innerHeight = 280;
    const height = margin.top + innerHeight + margin.bottom;

    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- Échelles ---
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerWidth])
      .paddingInner(0.3)
      .paddingOuter(0.15);

    const x1 = d3.scaleBand()
      .domain(SERIES.map(s => s.key))
      .range([0, x0.bandwidth()])
      .padding(0.12);

    const maxLeftRaw = d3.max(data, d => d3.max(SERIES, s => d[s.key]));
    const maxLeft = Math.ceil(maxLeftRaw / 100) * 100;

    const yLeft = d3.scaleLinear()
      .domain([0, maxLeft])
      .range([innerHeight, 0]);

    const minDT = d3.min(data, d => d.diensttage);
    const maxDT = d3.max(data, d => d.diensttage);
    const dtRange = Math.max(maxDT - minDT, 1);

    const yRight = d3.scaleLinear()
      .domain([minDT - dtRange * 0.55, maxDT + dtRange * 0.3])
      .nice()
      .range([innerHeight, 0]);

    // --- Repères horizontaux discrets (axe gauche) ---
    const leftTicks = d3.range(0, maxLeft + 1, 100);

    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(leftTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yLeft(d))
      .attr("y2", d => yLeft(d))
      .attr("stroke", "#e5e5e5")
      .attr("stroke-width", 1);

    // --- Axe gauche ---
    g.append("g")
      .call(
        d3.axisLeft(yLeft)
          .tickValues(leftTicks)
          .tickSize(0)
          .tickFormat(d => formatSwiss(d))
      )
      .call(axisG => axisG.select(".domain").remove())
      .selectAll("text")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "10.5px" : "12.5px")
      .style("fill", "#555");

    // --- Axe droit ---
    g.append("g")
      .attr("transform", `translate(${innerWidth}, 0)`)
      .call(
        d3.axisRight(yRight)
          .ticks(7)
          .tickSize(0)
          .tickFormat(d => (d / 1e6).toFixed(2))
      )
      .call(axisG => axisG.select(".domain").remove())
      .selectAll("text")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "10.5px" : "12.5px")
      .style("fill", "#555");

    // --- Titres d'axes, trilingues sur 3 lignes, rotation -90° ---
    // ⭐ Un seul <text> pivoté, avec 3 tspans à x=0 partagé (donc alignés
    // les uns au-dessus des autres, comme le reste du graphique) et des
    // y explicites (pas des dy en em, qui posaient problème ailleurs) —
    // plus robuste que 3 <text> séparés avec un offset par ligne, qui se
    // superposaient (chaque ligne était centrée indépendamment).
    function axisTitle(x, textBlock) {
      const lines = textBlock.split("\n");
      const lineGap = isMobile ? 11.5 : 13.5;
      const totalSpan = (lines.length - 1) * lineGap;

      const titleText = g.append("text")
        .attr("transform", `translate(${x}, ${innerHeight / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .style("font-family", "Arial")
        .style("fill", "#555");

      lines.forEach((line, i) => {
        titleText.append("tspan")
          .attr("x", 0)
          .attr("y", -totalSpan / 2 + i * lineGap)
          .style("font-size", isMobile ? "10.5px" : "12.5px")
          .text(line);
      });
    }

    axisTitle(-(margin.left - (isMobile ? 14 : 18)), AXIS_LEFT_LABEL);
    axisTitle(innerWidth + (margin.right - (isMobile ? 14 : 18)), AXIS_RIGHT_LABEL);

    // --- Barres groupées avec animation d'apparition ---
    const groups = g.selectAll("g.year-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "year-group")
      .attr("transform", d => `translate(${x0(d.year)}, 0)`);

    SERIES.forEach((s, si) => {

      const bars = groups.append("rect")
        .attr("class", `bar bar-${s.key}`)
        .attr("x", x1(s.key))
        .attr("width", x1.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", s.color);

      bars.transition()
        .delay((d, i) => i * 90 + si * 40)
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr("y", d => yLeft(d[s.key]))
        .attr("height", d => innerHeight - yLeft(d[s.key]));

      // ⭐ Valeur principale + valeur interne réunies sur UNE seule ligne
      // (au lieu de 2 lignes empilées) : avec des barres plus fines
      // (6 années × 5 barres), ça économise la hauteur au-dessus de la
      // barre et réduit le risque de chevauchement avec les groupes voisins.
      const label = groups.append("text")
        .attr("class", `value-main value-${s.key}`)
        .attr("x", x1(s.key) + x1.bandwidth() / 2)
        .attr("y", d => yLeft(d[s.key]) - 8)
        .attr("text-anchor", "middle")
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "8.5px" : "9.5px")
        .style("opacity", 0);

      label.append("tspan")
        .style("font-weight", "bold")
        .style("fill", "#111")
        .text("0");

      label.append("tspan")
        .style("fill", "#888")
        .text("");

      label.transition()
        .delay((d, i) => i * 90 + si * 40)
        .duration(650)
        .ease(d3.easeCubicOut)
        .style("opacity", 1)
        .tween("text", function (d) {
          const iMain = d3.interpolateNumber(0, d[s.key]);
          const iIntern = d3.interpolateNumber(0, d[s.internKey]);
          const tspans = d3.select(this).selectAll("tspan");
          return t => {
            tspans.filter((dd, i) => i === 0).text(formatSwiss(iMain(t)));
            tspans.filter((dd, i) => i === 1).text(` (${formatSwiss(iIntern(t))})`);
          };
        });
    });

    // --- Années sous les groupes ---
    g.selectAll("text.year-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "year-label")
      .attr("x", d => x0(d.year) + x0.bandwidth() / 2)
      .attr("y", innerHeight + 24)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "11.5px" : "13.5px")
      .style("font-weight", "bold")
      .style("fill", "#111")
      .text(d => d.year);

    // --- Ligne des jours de service (axe droit), tracé progressif ---
    const lineGen = d3.line()
      .x(d => x0(d.year) + x0.bandwidth() / 2)
      .y(d => yRight(d.diensttage))
      .curve(d3.curveMonotoneX);

    const path = g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", LINE_COLOR)
      .attr("stroke-width", 3)
      .attr("d", lineGen);

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .delay(300)
      .duration(1100)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // --- Pastille qui suit l'année survolée sur la ligne ---
    const hoverDot = g.append("circle")
      .attr("r", 5)
      .attr("fill", LINE_COLOR)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("opacity", 0)
      .style("pointer-events", "none");

    // --- Survol par année : isolation du groupe ---
    function highlight(year) {
      g.selectAll(".year-group").transition().duration(150)
        .style("opacity", d => (year === null || d.year === year) ? 1 : 0.3);

      if (year === null) {
        hoverDot.style("opacity", 0);
      } else {
        const d = data.find(dd => dd.year === year);
        hoverDot
          .attr("cx", x0(year) + x0.bandwidth() / 2)
          .attr("cy", yRight(d.diensttage))
          .style("opacity", 1);
      }
    }

    g.selectAll("rect.hit")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "hit")
      .attr("x", d => x0(d.year))
      .attr("y", 0)
      .attr("width", x0.bandwidth())
      .attr("height", innerHeight + margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => highlight(d.year))
      .on("mouseout", () => highlight(null));

    // --- Légende HTML, trilingue (une langue par ligne), wrap responsive ---
    const legend = d3.select("#legend");

    // ⭐ Une langue par ligne (comme sur les autres graphiques à texte
    // dense) : les libellés trilingues très longs restent entièrement
    // lisibles au lieu d'être tronqués en une seule ligne avec "...".
    function appendLegendText(container, label) {
      const textCol = container.append("div").attr("class", "legend-text");
      label.split(" / ").forEach(line => {
        textCol.append("div").text(line);
      });
    }

    SERIES.forEach(s => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span").attr("class", "legend-swatch").style("background", s.color);
      appendLegendText(item, s.label);
    });

    const lineItem = legend.append("div").attr("class", "legend-item");
    lineItem.append("span").attr("class", "legend-line");
    appendLegendText(lineItem, LINE_LABEL);
  });
}
