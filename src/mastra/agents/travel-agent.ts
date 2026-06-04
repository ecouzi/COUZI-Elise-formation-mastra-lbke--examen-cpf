import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createTool } from "@mastra/core/tools";
import { LibSQLStore } from "@mastra/libsql";
import { voyages } from "../data/voyages";
import { criteresSchema } from "../schema/criteres-schema";
import { openrouter } from "@openrouter/ai-sdk-provider";

/* -----------------------------
   💾 MEMORY
------------------------------ */
const memory = new Memory({
  storage: new LibSQLStore({
    id: "travel-agent-memory-v1",
    url: "file:./mastra.db",
  }),
});

/* -----------------------------
   🧰 TOOL SCORING VOYAGE
------------------------------ */
const findBestVoyage = createTool({
  id: "findBestVoyage",
  description: "Trouve le meilleur voyage selon les critères utilisateur",
  inputSchema: criteresSchema,
  
  execute: async (params) => {
    const safe = params ?? {};

    /* -----------------------------
       ♿ FILTRE ACCESSIBILITÉ
    ------------------------------ */
    const filtered = voyages.filter((v) => {
      if (safe.acces_handicap) {
        return v.accessibleHandicap === "oui";
      }
      return true;
    });

    /* -----------------------------
       ⭐ SCORING
    ------------------------------ */
    const scored = filtered.map((v) => {
      let score = 0;
      if (safe.plage && v.labels.includes("plage")) score += 2;
      if (safe.montagne && v.labels.includes("montagne")) score += 2;
      if (safe.ville && v.labels.includes("ville")) score += 1;
      if (safe.sport && v.labels.includes("sport")) score += 2;
      if (safe.detente && v.labels.includes("detente")) score += 2;
      if (safe.campagne === false && v.labels.includes("campagne")) score -= 3
      if (safe.campagne === true && v.labels.includes("campagne")) score += 1
      if (safe.acces_handicap && v.accessibleHandicap !== "oui") {
        score -= 3;
      }
      return { ...v, score };
    });

    /* -----------------------------
       🏁 MEILLEUR RÉSULTAT
    ------------------------------ */
    const results = scored.sort((a, b) => b.score - a.score);
    const best = results[0];

    if (!best || best.score < 1) {
      return { voyage: null, message: "Aucun voyage ne correspond aux critères." }
    }

    return { voyage: best };
  },
});

/* -----------------------------
   🤖 AGENT
------------------------------ */
export const travelAgent = new Agent({
  id: "travel-agent",
  name: "Travel Agent LBKE",
  model: openrouter("openai/gpt-4o-mini"),
  instructions: `
Tu es un conseiller de voyage.

Quand l'utilisateur exprime des préférences, tu DOIS :
1. Identifier les critères parmi : plage, montagne, ville, sport, detente, acces_handicap
2. Mapper les synonymes :
   - "se reposer / relaxer / farniente / calme" → detente: true
   - "escalade / ski / randonnée / activité physique" → sport: true
   - "mer / sable / soleil / côte" → plage: true
   - "altitude / col / neige / alpes" → montagne: true
   - "musée / restaurants / animation / urban" → ville: true
   - "fauteuil roulant / PMR / mobilité réduite" → acces_handicap: true
3. Appeler findBestVoyage avec TOUS les critères détectés mis à true
4. Présenter UNIQUEMENT le voyage retourné par le tool — ne jamais en inventer un

Règles :
- si message incompréhensible → demander une clarification
- si aucun critère détecté → poser une question sur les préférences
- si critères présents → appeler UNE SEULE FOIS findBestVoyage
- si le tool retourne voyage: null → expliquer qu'aucun voyage ne correspond et proposer d'affiner
- répondre en texte naturel, sans JSON
- INTERDICTION de recommander un voyage sans avoir appelé le tool
`,
  tools: {
    findBestVoyage,
  },
  memory,
});