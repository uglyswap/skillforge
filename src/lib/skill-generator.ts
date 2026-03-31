import { prisma } from "./prisma";
import { getProvider } from "./ai-providers";
import { decrypt } from "./encryption";

interface GenerateSkillConfig {
  userId: string;
  fileName: string;
  fileContent: string;
  skillName: string;
  templateId: string;
  providerId: string;
  modelId: string;
}

export async function generateSkill(
  config: GenerateSkillConfig
): Promise<string> {
  const template = await prisma.skillTemplate.findUnique({
    where: { id: config.templateId },
  });

  if (!template) {
    throw new Error("Template introuvable");
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      userId: config.userId,
      provider: config.providerId,
      isActive: true,
    },
  });

  if (!apiKey) {
    throw new Error(
      `Aucune clé API configurée pour le provider ${config.providerId}`
    );
  }

  const provider = getProvider(config.providerId);
  if (!provider) {
    throw new Error(`Provider inconnu : ${config.providerId}`);
  }

  const docName = config.fileName.replace(/\.[^.]+$/, "");
  const currentDate = new Date().toISOString().split("T")[0];
  const skillName = config.skillName || "à déterminer";

  const systemPrompt = template.systemPrompt
    .replaceAll("{{DOC_NAME}}", docName)
    .replaceAll("{{DOC_CONTENT}}", config.fileContent)
    .replaceAll("{{SKILL_NAME}}", skillName)
    .replaceAll("{{CURRENT_DATE}}", currentDate);

  const decryptedKey = decrypt(apiKey.keyValue);

  const content = await provider.chatCompletion({
    apiKey: decryptedKey,
    model: config.modelId,
    systemPrompt,
    userMessage:
      "Génère le skill Claude Code à partir de cette documentation.",
    maxTokens: 8192,
    temperature: 0.7,
  });

  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```markdown")) {
    cleanedContent = cleanedContent.slice("```markdown".length);
  } else if (cleanedContent.startsWith("```md")) {
    cleanedContent = cleanedContent.slice("```md".length);
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith("```")) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  cleanedContent = cleanedContent.trim();

  return cleanedContent;
}
