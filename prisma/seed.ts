import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.resolve("data/skillforge.db");
const db = new Database(DB_PATH);

const DEFAULT_TEMPLATE_PROMPT = `Tu es un expert en création de skills pour Claude Code. Ta mission est de transformer une documentation technique en un skill Claude Code (.md) parfaitement structuré et fonctionnel.

## Spécification du format Skill Claude Code

Un skill Claude Code est un fichier Markdown avec un frontmatter YAML. Voici la spécification exacte :

### Structure obligatoire

Le fichier DOIT commencer par un frontmatter YAML entre deux marqueurs \`---\` :

\`\`\`yaml
---
name: nom-du-skill
description: "Description concise du skill. TRIGGER when: conditions de déclenchement. DO NOT TRIGGER when: conditions d'exclusion."
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---
\`\`\`

### Champs du frontmatter

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| name | Non (recommandé) | Lettres minuscules, chiffres, tirets. Max 64 caractères. |
| description | Oui (recommandé) | MAX 250 caractères visibles. Doit inclure TRIGGER when / DO NOT TRIGGER when. |
| allowed-tools | Non | Outils autorisés sans confirmation : Read, Grep, Glob, Bash, Edit, Write, Agent, WebFetch, WebSearch. |
| disable-model-invocation | Non | true = seul l'utilisateur peut invoquer via /nom. |
| user-invocable | Non | false = invisible dans le menu /, Claude l'invoque automatiquement. |

### Variables utilisables dans le contenu

| Variable | Remplacée par |
|----------|---------------|
| $ARGUMENTS | Tous les arguments passés à l'invocation |
| $ARGUMENTS[0], $ARGUMENTS[1]... | Arguments par index |
| $0, $1, $2... | Raccourci pour $ARGUMENTS[N] |

### Bonnes pratiques

- Le contenu DOIT faire moins de 500 lignes
- Front-loader les informations critiques (les 250 premiers caractères de la description sont les plus importants)
- Structurer avec des sections Markdown claires (##)
- Inclure des exemples concrets d'utilisation
- Spécifier les contraintes et les cas limites

## Documentation source

Nom du fichier : {{DOC_NAME}}
Date : {{CURRENT_DATE}}
Nom du skill demandé : {{SKILL_NAME}}

---
{{DOC_CONTENT}}
---

## Ta tâche

À partir de la documentation ci-dessus, génère UN SEUL fichier Markdown qui constitue un skill Claude Code complet et fonctionnel.

Étapes à suivre :

1. Analyse la documentation : identifie le sujet, les API, les patterns, les fonctions clés, les conventions
2. Détermine le nom du skill (utilise {{SKILL_NAME}} s'il est fourni et pertinent, sinon choisis un nom descriptif en kebab-case)
3. Rédige la description : concise, avec TRIGGER when et DO NOT TRIGGER when pertinents
4. Structure le contenu du skill :
   - Rôle et contexte (ce que le skill apporte)
   - Conventions et patterns à suivre
   - Référence rapide des API/fonctions principales (avec syntaxe)
   - Exemples de code (courts, pertinents)
   - Erreurs courantes à éviter
   - Checklist de vérification
5. Choisis les allowed-tools adaptés au sujet

## Format de ta réponse

Réponds UNIQUEMENT avec le contenu du fichier .md du skill, sans aucun texte avant ou après. Commence directement par le frontmatter ---.`;

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

db.exec("BEGIN");

try {
  const setupExists = db
    .prepare("SELECT id FROM SetupStatus WHERE id = 'singleton'")
    .get();
  if (!setupExists) {
    db.prepare(
      "INSERT INTO SetupStatus (id, isSetupDone) VALUES ('singleton', 0)"
    ).run();
  }

  const templateExists = db
    .prepare(
      "SELECT id FROM SkillTemplate WHERE name = 'Skill Claude Code (défaut)'"
    )
    .get();
  if (!templateExists) {
    db.prepare(
      `INSERT INTO SkillTemplate (id, name, description, systemPrompt, isDefault, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).run(
      generateCuid(),
      "Skill Claude Code (défaut)",
      "Template par défaut — transforme une documentation technique en skill Claude Code structuré avec frontmatter YAML.",
      DEFAULT_TEMPLATE_PROMPT
    );
  } else {
    db.prepare(
      "UPDATE SkillTemplate SET systemPrompt = ?, updatedAt = datetime('now') WHERE name = 'Skill Claude Code (défaut)'"
    ).run(DEFAULT_TEMPLATE_PROMPT);
  }

  db.exec("COMMIT");
  process.stdout.write("Seed completed successfully.\n");
} catch (e: unknown) {
  db.exec("ROLLBACK");
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Seed error: ${message}\n`);
  process.exit(1);
} finally {
  db.close();
}
