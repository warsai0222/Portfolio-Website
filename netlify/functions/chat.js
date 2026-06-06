const FALLBACK =
  "I can't answer that right now. You can reach out to Varshith regarding the same.";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 18;
const QUESTION_MAX_CHARS = 700;
const MIN_RETRIEVAL_SCORE = 2;
const rateBuckets = new Map();

const KNOWLEDGE = [
  {
    id: "profile",
    title: "Profile and role positioning",
    category: "profile",
    keywords: ["who", "about", "summary", "profile", "role", "ai", "ml", "solutions", "recruiter summary", "introduce"],
    text:
      "Varshith Tipirneni is an AI/ML engineer and solutions builder focused on production RAG systems, agentic workflows, hallucination evaluation, healthcare ML, forecasting, and enterprise decision systems. Target roles: AI/ML Engineer, Machine Learning Engineer, Solutions Engineer, Solutions Architect, Applied ML Engineer, and Forward-Deployed Engineer."
  },
  {
    id: "contact-location",
    title: "Contact, location, availability",
    category: "contact",
    keywords: ["email", "contact", "phone", "linkedin", "where", "location", "from", "based", "availability", "start"],
    text:
      "Varshith is based in Chapel Hill, NC. Email: tipirnenivarshith@gmail.com. LinkedIn: linkedin.com/in/varshith-t/. Phone: 984-356-3633. He can start full-time from June 15, 2026 after graduating in May 2026. He is open to remote, hybrid, onsite, and relocation for the right AI/ML or solutions role."
  },
  {
    id: "education",
    title: "Education",
    category: "education",
    keywords: ["education", "school", "university", "degree", "gpa", "unc", "bmsce", "bangalore", "statistics"],
    text:
      "Education: M.S. Statistics, Analytics & Data Science at UNC Chapel Hill, Aug 2024-May 2026, GPA 4.0/4.0. B.E. Chemical Engineering at BMSCE Bangalore, 2019-2023, GPA 8.95/10. His background combines statistics, machine learning, and engineering systems thinking."
  },
  {
    id: "viatris",
    title: "Viatris Data Analyst experience",
    category: "experience",
    keywords: ["viatris", "data analyst", "supply", "chain", "pharma", "alteryx", "po", "markets", "stockout"],
    text:
      "At Viatris, Varshith is a Data Analyst working on enterprise decision systems across a $15B pharmaceutical supply-chain portfolio and 165+ markets. He built 5+ production-facing tools used by 100+ leaders, ranked top 5% company-wide for adoption, helped reduce inactive purchase orders by 88%, supported a 24-25% supply-gap value reduction, and built repeatable Alteryx + SQL + Power BI workflows."
  },
  {
    id: "dashboards-bi",
    title: "Dashboards and BI solution delivery",
    category: "project",
    keywords: ["dashboard", "dashboards", "power bi", "business intelligence", "bi", "blinkit", "kpi", "reporting", "figma", "regional marketing", "case study"],
    text:
      "Varshith's dashboard work is framed as decision-system design rather than static reporting. At Viatris, he built stakeholder-facing Power BI, Alteryx, and SQL workflows used by 100+ global leaders across supply-chain decisions. The Blinkit Business Insights Dashboard paired complex SQL extraction with Figma-designed UI/UX and Power BI dashboards for non-technical stakeholders, tracking KPIs and enabling regional marketing decisions."
  },
  {
    id: "nmss",
    title: "National MS Society healthcare ML",
    category: "experience",
    keywords: ["nmss", "ms", "multiple sclerosis", "healthcare", "claims", "patient", "therapy", "switch", "dmt", "auc"],
    text:
      "At the National MS Society, Varshith works on healthcare claims ML and longitudinal patient journeys. The work covers 1M+ MS patients and 10+ years of claims data. He engineered diagnosis, pharmacy, and procedure datasets; found 50-60% of treatment switches tied to generic substitution; and built a 3-stage ML pipeline for therapy initiation, switch probability, and next-line treatment decisions. The switch model achieved AUC 0.95 with 8x top-decile lift."
  },
  {
    id: "hybridrag",
    title: "HybridRAG Classifier",
    category: "project",
    keywords: ["hybridrag", "rag", "retrieval", "bge", "bm25", "rrf", "fda", "compliance", "pgvector", "ragas", "best project", "strongest project", "top project", "best work", "strongest work", "impressive project", "flagship project"],
    text:
      "HybridRAG is Varshith's strongest public AI project: a live FDA/pharma compliance classifier using BGE dense embeddings plus BM25 sparse retrieval, Reciprocal Rank Fusion, pgvector/HNSW retrieval, human review routing for low-confidence outputs, prompt-injection guardrails, and RAGAS evaluation. Live site: https://hybridrag.netlify.app/."
  },
  {
    id: "best-skill",
    title: "Strongest skill",
    category: "skill",
    keywords: ["best skill", "strongest skill", "top skill", "main skill", "primary skill", "sharpest skill", "superpower", "expertise", "good at", "does he do best"],
    text:
      "Varshith's strongest skill is building AI/ML solutions end to end: problem framing, solution architecture, data pipelines, retrieval or ML logic, evaluation, API/UX, and stakeholder adoption. His edge is combining statistical depth with product-minded engineering and stakeholder delivery."
  },
  {
    id: "hiring-strengths",
    title: "Hiring strengths",
    category: "hiring",
    keywords: ["hire", "why hire", "recruiter", "candidate", "strength", "different", "standout", "advantage", "interview"],
    text:
      "Why hire Varshith: he combines solution architecture, machine-learning judgment, product sense, and stakeholder delivery. He ships live systems rather than only notebooks, has a 4.0 M.S. in Statistics for model evaluation and failure-mode thinking, and has delivered enterprise tools used by VP/Sr. Director audiences with top-5% company-wide adoption."
  },
  {
    id: "prism",
    title: "PRISM",
    category: "project",
    keywords: ["prism", "research", "intelligence", "multimodal", "qdrant", "langgraph", "retrieval", "documents"],
    text:
      "PRISM is a multimodal research-intelligence pipeline for multi-document analysis. It combines BM25 plus dense retrieval, RRF fusion, Qdrant vector storage, structured LLM briefs, cross-document conflict detection, and LangGraph-style orchestration."
  },
  {
    id: "pulse",
    title: "PULSE",
    category: "project",
    keywords: ["pulse", "agentic", "search", "agents", "sse", "fastapi", "sentiment", "trends", "tavily"],
    text:
      "PULSE is an agentic search and intelligence pipeline. It routes a query into parallel research agents for news, sentiment, and trends, then synthesizes the result. The FastAPI backend streams progress with Server-Sent Events and includes input/output guardrails plus an LLM self-correction retry loop."
  },
  {
    id: "hallucinationbenchmark",
    title: "HallucinationBenchmark",
    category: "project",
    keywords: ["hallucination", "hallucinationbenchmark", "truthfulqa", "deepeval", "prompt engineering", "system prompt", "claude haiku", "claude sonnet", "mlflow", "benchmark", "evaluation"],
    text:
      "HallucinationBenchmark is a hallucination detection and prompt-evaluation pipeline benchmarking Claude Haiku versus Sonnet on TruthfulQA across 817 questions and 38 categories. It compares 7 prompt engineering experiments: zero-shot, few-shot, chain-of-thought, structured output, system prompt v1, system prompt v2, and temperature tuning. System Prompt v2 achieved a -60.3 percentage-point hallucination-rate improvement. The project includes MLflow experiment tracking, an interactive results dashboard, and per-technique detail pages."
  },
  {
    id: "skills",
    title: "Technical skills",
    category: "skill",
    keywords: ["skills", "stack", "tools", "python", "sql", "langchain", "langgraph", "fastapi", "docker", "mlops"],
    text:
      "Core stack: Python, SQL, DAX/M, R, LangGraph, LangChain, pgvector, Qdrant, BM25, BGE embeddings, HuggingFace, RAGAS, DeepEval, scikit-learn, XGBoost, Pandas, NumPy, time series, forecasting, classification, calibration, FastAPI, Docker, GitHub Actions, API design, SSE streaming, Alteryx, Power BI, Tableau, Plotly, Matplotlib. Currently deepening MLOps, MLflow, LangSmith, Airflow, dbt, Spark, and Databricks."
  },
  {
    id: "writing-personal",
    title: "Writing and personal interests",
    category: "personal",
    keywords: ["medium", "writing", "articles", "hobby", "personal", "football", "anime", "gym", "music", "two sides"],
    text:
      "Varshith has 5 Medium pieces on MCP, HybridRAG, data pipelines, LLM context limits, and production model drift. Outside work, he is into gym, running, football, music, Manchester United, Ronaldo 7, anime, and learning to cook. The Two Sides page has the more human version."
  }
];

const INTENT_BOOSTS = {
  profile: ["profile", "hiring", "skill", "experience"],
  role: ["profile", "hiring", "skill", "experience"],
  contact: ["contact"],
  education: ["education", "profile"],
  experience: ["experience", "hiring", "profile"],
  project: ["project", "skill"],
  hybridrag: ["project"],
  viatris: ["experience"],
  dashboard: ["project", "experience", "skill"],
  nmss: ["experience"],
  prism: ["project"],
  pulse: ["project"],
  hallucinationbenchmark: ["project", "skill"],
  skill: ["skill", "hiring", "project"],
  hiring: ["hiring", "skill", "experience", "profile"],
  personal: ["personal", "profile"],
  writing: ["personal", "project"]
};

const SOURCE_LABELS = {
  profile: "Profile",
  "contact-location": "Contact",
  education: "Education",
  viatris: "Viatris",
  "dashboards-bi": "Dashboards / BI solutions",
  nmss: "NMSS",
  hybridrag: "HybridRAG",
  "best-skill": "Strongest skill",
  "hiring-strengths": "Hiring strengths",
  prism: "PRISM",
  pulse: "PULSE",
  hallucinationbenchmark: "HallucinationBenchmark",
  skills: "Technical skills",
  "writing-personal": "Writing / personal"
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "can", "do", "for", "from", "he",
  "her", "him", "his", "i", "in", "is", "it", "me", "of", "on", "or", "that", "the",
  "this", "to", "varshith", "what", "where", "who", "why", "with", "you"
]);

function headersOf(event) {
  return event.headers || {};
}

function allowedOrigin(event) {
  const headers = headersOf(event);
  const origin = headers.origin || headers.Origin || "";
  if (!origin) return "";

  const host = headers.host || headers.Host || "";
  try {
    const originHost = new URL(origin).host;
    if (originHost === host || originHost === "localhost:8888" || originHost.startsWith("localhost:")) return origin;
  } catch {
    return "";
  }

  return "";
}

function isOriginAllowed(event) {
  const origin = headersOf(event).origin || headersOf(event).Origin || "";
  return !origin || !!allowedOrigin(event);
}

function json(event, statusCode, body) {
  const origin = allowedOrigin(event);
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "null",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin"
    },
    body: JSON.stringify(body)
  };
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  return normalize(text)
    .split(" ")
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function scoreChunk(question, chunk) {
  const q = normalize(question);
  const qTokens = tokens(q);
  const haystack = normalize(`${chunk.title} ${chunk.keywords.join(" ")} ${chunk.text}`);
  let score = 0;

  for (const token of qTokens) {
    if (haystack.includes(token)) score += 1;
  }

  for (const keyword of chunk.keywords) {
    const key = normalize(keyword);
    if (key && q.includes(key)) score += key.includes(" ") ? 5 : 2;
  }

  return score;
}

function queryIntent(question) {
  const q = normalize(question);
  if (/\b(hybridrag|hybrid rag|fda|compliance classifier)\b/.test(q)) return "hybridrag";
  if (/\b(hallucinationbenchmark|hallucination|truthfulqa|deepeval|prompt engineering|system prompt|claude haiku|claude sonnet|mlflow)\b/.test(q)) return "hallucinationbenchmark";
  if (/\b(viatris|supply chain|pharma|purchase order|alteryx|stockout)\b/.test(q)) return "viatris";
  if (/\b(dashboards?|power bi|business intelligence|blinkit|kpi|reporting|figma)\b/.test(q)) return "dashboard";
  if (/\b(nmss|national ms|multiple sclerosis|dmt|therapy switch|claims)\b/.test(q)) return "nmss";
  if (/\b(prism|qdrant|research intelligence|multi doc|multidoc)\b/.test(q)) return "prism";
  if (/\b(pulse|agentic search|multi agent|sse|tavily)\b/.test(q)) return "pulse";
  if (/\b(best|strongest|top|main|primary|sharpest)\s+skills?\b/.test(q)) return "best-skill";
  if (/\b(skill|expertise|superpower)\b/.test(q) && /\b(best|strongest|top|main|primary|sharpest)\b/.test(q)) return "best-skill";
  if (/\bwhat\s+(is|are|does)\s+.*\b(good at|do best)\b/.test(q)) return "best-skill";
  if (/\b(best|strongest|top|flagship|most impressive)\s+(project|work)\b/.test(q)) return "hybridrag";
  if (/\b(why hire|hire him|why varshith|stand out|different|candidate|recruiter)\b/.test(q)) return "hiring";
  if (/\b(role|fit|position|solutions engineer|solutions architect|machine learning engineer|ai engineer|ml engineer|forward deployed)\b/.test(q)) return "role";
  if (/\b(experience|work history|jobs|career|worked|viatris|nmss|national ms)\b/.test(q)) return "experience";
  if (/\b(projects?|portfolio|built|demo|case study|prism|pulse|hybridrag)\b/.test(q)) return "project";
  if (/\b(skills?|stack|tools|python|sql|langchain|fastapi|docker)\b/.test(q)) return "skill";
  if (/\b(email|contact|phone|linkedin|where|location|based|available|availability|start|open to work|relocate)\b/.test(q)) return "contact";
  if (/\b(education|degree|gpa|school|university|unc|masters|statistics)\b/.test(q)) return "education";
  if (/\b(medium|writing|article|blog|personal|hobby|outside|football|anime|gym|music|two sides)\b/.test(q)) return "personal";
  if (/\b(who|about|summary|profile|introduce|overview)\b/.test(q)) return "profile";
  return "";
}

function isFollowUpQuestion(question) {
  const q = normalize(question);
  return q.split(" ").length <= 5 && /^(more|details|expand|why|how|what about|tell me more|go deeper)/.test(q);
}

function retrieve(question, history = []) {
  const intent = queryIntent(question);
  const recentHistory = isFollowUpQuestion(question)
    ? history.slice(-2).map(item => item.content).join(" ")
    : "";
  const retrievalText = `${question} ${recentHistory}`.trim();
  const boostedCategories = INTENT_BOOSTS[intent] || [];
  return KNOWLEDGE
    .map(chunk => ({
      ...chunk,
      score:
        scoreChunk(retrievalText, chunk) +
        (intent && chunk.id === intent ? 100 : 0) +
        (boostedCategories.includes(chunk.category) ? 8 : 0)
    }))
    .filter(chunk => chunk.score >= MIN_RETRIEVAL_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function sourceLabels(matches) {
  return matches.map(chunk => SOURCE_LABELS[chunk.id] || chunk.title);
}

function cleanAnswer(answer) {
  return String(answer || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .map(item => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: cleanAnswer(item?.content).slice(0, 900)
    }))
    .filter(item => item.content);
}

function clientId(event) {
  const headers = headersOf(event);
  return String(
    headers["x-nf-client-connection-ip"] ||
      headers["x-forwarded-for"] ||
      headers["client-ip"] ||
      "unknown"
  )
    .split(",")[0]
    .trim();
}

function isRateLimited(event) {
  const now = Date.now();
  const id = clientId(event);
  const bucket = rateBuckets.get(id) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateBuckets.set(id, bucket);

  for (const [key, value] of rateBuckets.entries()) {
    if (now > value.resetAt + RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
  }

  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

exports.handler = async event => {
  if (!isOriginAllowed(event)) return json(event, 403, { answer: FALLBACK });
  if (event.httpMethod === "OPTIONS") return json(event, 200, {});
  if (event.httpMethod !== "POST") return json(event, 405, { answer: FALLBACK });

  if (isRateLimited(event)) {
    return json(event, 429, {
      answer: "AskVarshith is getting a lot of questions right now. Please try again in about a minute.",
      sourceIds: [],
      rateLimited: true
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(event, 400, { answer: FALLBACK });
  }

  const question = String(payload.question || "").trim().slice(0, QUESTION_MAX_CHARS);
  if (!question) return json(event, 200, { answer: "Ask me anything about Varshith's work, projects, skills, or background." });

  const history = cleanHistory(payload.history);
  const historyText = history.map(item => `${item.role}: ${item.content}`).join("\n");
  const matches = retrieve(question, history);
  const context = matches.map((chunk, index) => `[${index + 1}] ${chunk.title}\n${chunk.text}`).join("\n\n");

  if (!matches.length) {
    return json(event, 200, { answer: FALLBACK, sourceIds: [] });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json(event, 200, { answer: FALLBACK, sourceIds: matches.map(chunk => chunk.id), sourceLabels: sourceLabels(matches), missingKey: true });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              `You are AskVarshith, the portfolio assistant for Varshith Tipirneni.\n` +
              `Answer only from the provided context. If the answer is not clearly present, reply exactly: "${FALLBACK}"\n` +
              `If the user asks for Varshith's best skill, answer the skill directly; do not answer with his best project. If the user asks for best project or best work, answer HybridRAG.\n` +
              `Use the conversation history only to understand follow-up references, never as factual source material.\n` +
              `Be concise, warm, and recruiter-friendly. Use plain text only. No markdown. No invented facts.`
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nConversation history:\n${historyText || "None"}\n\nCurrent question: ${question}`
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`Groq returned ${response.status}`);

    const data = await response.json();
    const answer = cleanAnswer(data?.choices?.[0]?.message?.content);
    return json(event, 200, {
      answer: answer || FALLBACK,
      sourceIds: matches.map(chunk => chunk.id),
      sourceLabels: sourceLabels(matches),
      confidence: matches[0]?.score >= 12 ? "high" : "medium"
    });
  } catch (error) {
    return json(event, 200, {
      answer: FALLBACK,
      sourceIds: matches.map(chunk => chunk.id),
      sourceLabels: sourceLabels(matches),
      error: "rag_unavailable"
    });
  }
};
