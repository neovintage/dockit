import nlp from "compromise";

/**
 * Generate tags from a filename using heuristics and optional NLP.
 */
export function autoTag(fileName: string, useNLP: boolean = false): string[] {
  const base = fileName.toLowerCase();

  const defaultTags: Record<string, string> = {
    chase: "chase",
    kaiser: "kaiser",
    w2: "tax",
    "1099": "tax",
    statement: "finance",
    benefit: "insurance",
  };

  // Tags based on keyword matches
  const keywordTags = Object.entries(defaultTags)
    .filter(([keyword]) => base.includes(keyword))
    .map(([, tag]) => tag);

  // NLP-based tags from filename
  let nlpTags: string[] = [];
  if (useNLP) {
    const doc = nlp(fileName);
    nlpTags = (doc.nouns().out("array") as string[]).map((s) =>
      s.toLowerCase(),
    );
  }

  // Combine, dedupe, and return
  return Array.from(new Set([...keywordTags, ...nlpTags]));
}
