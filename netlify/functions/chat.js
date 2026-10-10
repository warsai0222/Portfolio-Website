const FALLBACK =
  "I can't answer that right now. You can reach out to Varshith regarding the same.";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 18;
const QUESTION_MAX_CHARS = 700;
const MIN_RETRIEVAL_SCORE = 2;
const RELEVANCE_GAP = 0.35;
const CACHE_TTL_MS = 15 * 60_000;
const CACHE_MAX = 200;
const rateBuckets = new Map();
const answerCache = new Map();

function cacheGet(key) {
  const hit = answerCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { answerCache.delete(key); return null; }
  return hit.value;
}

function cacheSet(key, value) {
  if (answerCache.size >= CACHE_MAX) answerCache.delete(answerCache.keys().next().value);
  answerCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const KNOWLEDGE = [
  {
    id: "profile",
    title: "Profile and role positioning",
    category: "profile",
    keywords: ["who", "about", "summary", "profile", "role", "data", "analytics", "solutions", "recruiter summary", "introduce"],
    text:
      "Varshith Tipirneni is a data scientist - a statistics-trained data scientist and analyst who digs into messy real-world data (claims, sales, catalogs) and turns it into forecasts, rankings, and decisions people actually use. He also built and still maintains one live production AI system, HybridRAG. Target roles: Data Scientist, Data Analyst, Business/Data Analytics, and Applied Machine Learning."
  },
  {
    id: "contact-location",
    title: "Contact, location, availability",
    category: "contact",
    keywords: ["email", "contact", "phone", "linkedin", "where", "location", "from", "based", "availability", "start"],
    text:
      "Varshith is based in St. Augustine, FL. Email: tipirnenivarshith@gmail.com. LinkedIn: linkedin.com/in/varshith-t/. Phone: 984-356-3633. He graduated from UNC Chapel Hill in May 2026 and is available to start immediately. He is open to remote, hybrid, or on-site work and will relocate for the right data science or analytics role."
  },
  {
    id: "education",
    title: "Education",
    category: "education",
    keywords: ["education", "school", "university", "degree", "gpa", "unc", "bmsce", "bangalore", "statistics"],
    text:
      "Education: M.S. Data Science, Analytics & Statistics at UNC Chapel Hill, Aug 2024-May 2026, GPA 4.0/4.0. B.E. Chemical Engineering at BMSCE Bangalore, 2019-2023, GPA 8.95/10. His background combines statistics, machine learning, and engineering systems thinking."
  },
  {
    id: "viatris",
    title: "Viatris Data Analyst experience",
    category: "experience",
    keywords: ["viatris", "data analyst", "supply", "chain", "pharma", "alteryx", "po", "markets", "stockout", "assumptions dashboard", "oos", "poos", "erp"],
    text:
      "At Viatris, Varshith was a Supply Chain Analyst (May 2025 - May 2026) working across a $15B pharmaceutical supply-chain portfolio spanning 165+ markets. He cut total supply gap value 10% - a $12.9M reduction - over 8 months by building and maintaining weekly OOS/POOS analytical pipelines and a daily Assumptions Dashboard, and drove an 88% reduction in stale ERP metrics through daily supply chain dashboards and an automated weekly Inactive PO pipeline. He collaborated directly with global supply planners to scope technical requirements behind those builds, and built automated Alteryx workflows to ingest, clean, and map multi-source procurement data, cutting manual prep time for weekly reporting."
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
    keywords: ["nmss", "ms", "multiple sclerosis", "healthcare", "claims", "patient", "therapy", "switch", "dmt", "survival analysis", "kaplan-meier", "cox", "snowflake"],
    text:
      "At the National MS Society, Varshith worked as Solutions Architect on a Data Science Practicum covering healthcare claims ML for therapy selection and medication switching. He built a sequential ML pipeline that reached 0.95 AUC predicting clinical medication switches, a 5.0pp absolute accuracy gain over legacy flat-table architectures, across roughly 1M patients (18K working cohort). He assessed long-term medication persistence across patient cohorts using survival models (Kaplan-Meier, Cox proportional hazards) with quarterly recalibration, and queried and joined 100M+ longitudinal medical claims in SQL and Snowflake to build cohort datasets and engineer training features. He also implemented MLflow and DVC for reproducible, auditable experiment tracking."
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
      "Varshith's strongest skill is evidence-first data analysis end to end: problem framing, feature and assumption checks, model selection backed by real backtests, evaluation, and stakeholder delivery. His edge is combining statistical depth with product-minded, honest reporting of results."
  },
  {
    id: "hiring-strengths",
    title: "Hiring strengths",
    category: "hiring",
    keywords: ["hire", "why hire", "recruiter", "candidate", "strength", "different", "standout", "advantage", "interview"],
    text:
      "Why hire Varshith: he combines statistical rigor, machine-learning judgment, and stakeholder delivery. He backs decisions with evidence and real baselines rather than a single train/test split, has a 4.0 M.S. in Statistics for model evaluation and failure-mode thinking, and has delivered enterprise tools used by VP/Sr. Director audiences with top-5% company-wide adoption."
  },
  {
    id: "sales-forecast",
    title: "Q4 Vehicle Sales Forecast",
    category: "project",
    keywords: ["sales forecast", "vehicle sales", "wape", "elasticnet", "demand forecast", "forecasting", "time series"],
    text:
      "Varshith forecasted monthly unit sales for 8 vehicle series three months out using 33 months of sales, incentive, and macro data. He diagnosed severe multicollinearity in the obvious lag-feature design (VIF up to 137) and redesigned it into an independent feature set (recent level, momentum vs. trailing average, trend slope). A pooled ElasticNet model, chosen only after true walk-forward backtesting against Ridge, Lasso, and Gradient Boosting, beat a naive-persistence baseline with a 7.16% average WAPE versus 15.9% for the baseline across four backtest quarters, plus bootstrapped P10-P90 uncertainty bands per series."
  },
  {
    id: "home-depot-search",
    title: "Product Search Relevance - Home Depot Catalog",
    category: "project",
    keywords: ["home depot", "search relevance", "product search", "lightgbm", "sentence transformer", "tf-idf", "ranking model", "ranker"],
    text:
      "Varshith built a two-stage product search relevance system for a home-improvement retailer's catalog: does a given product actually match what the shopper searched for. He engineered 13 lexical and statistical features (TF-IDF cosine similarity, n-gram overlap, length ratios) and trained a LightGBM ranker on 74K query-product pairs, cutting prediction error 11.5% versus a naive baseline. He then fine-tuned a dual-encoder sentence transformer to catch semantic matches keyword overlap misses, pushing the total error reduction to 16.1% while keeping inference to milliseconds via pre-cached product embeddings."
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
    id: "multi-agent-research",
    title: "Multi-Agent Research System",
    category: "project",
    keywords: ["multi-agent", "multi agent", "research system", "langchain", "tavily", "streamlit", "groq", "search agent", "web scraper", "writer chain", "critic chain", "agentic ai"],
    text:
      "The Multi-Agent Research System is a live four-stage LangChain agent pipeline. A Search Agent finds candidate sources, a Web Scraper retrieves usable evidence, a Writer Chain synthesizes a structured cited report, and a Critic Chain scores grounding and attribution before the report is shown. It makes retrieval failures and model-knowledge fallback explicit. Live demo: https://multi-agent-research-system-z9ag.onrender.com. GitHub: https://github.com/warsai0222/Multi_Agent_Research_System."
  },
  {
    id: "labcorp",
    title: "Healthcare Demand Forecasting - Labcorp",
    category: "project",
    keywords: ["labcorp", "diagnostic", "diagnostics", "test demand", "specialty", "specialties", "arima", "capacity planning", "healthcare forecasting", "working days"],
    text:
      "For Labcorp, Varshith forecast diagnostic-test demand across specialties through 2026 using a hybrid of Gradient Boosting and ARIMA. Early-stage adoption data biases demand forecasts upward, so he modeled adoption, timing, and repeat utilization as separate components to correct it, and engineered a working-days adjustment so calendar variation could not be mistaken for real movement in demand. The result held mean forecast error under 5% across specialties, in a form usable for capacity planning."
  },
  {
    id: "bike-demand",
    title: "Bike Demand Prediction",
    category: "project",
    keywords: ["bike demand", "bike sharing", "bike-share", "hourly demand", "gradient boosting", "mlflow", "dvc", "drift", "retrain", "streamlit", "uci bike sharing"],
    text:
      "Bike Demand Prediction is an end-to-end ML system forecasting hourly bike-share demand on the UCI Bike Sharing dataset. It uses leakage-safe lag and rolling features, walk-forward validated Gradient Boosting, MLflow experiment tracking, a DVC-versioned pipeline, automated tests, and simulated drift monitoring with a retrain trigger. It ships as an interactive Streamlit dashboard for on-demand prediction and model-performance monitoring: https://bike-demand-prediction-project.streamlit.app/."
  },
  {
    id: "skills",
    title: "Technical skills",
    category: "skill",
    keywords: ["skills", "stack", "tools", "python", "sql", "langchain", "langgraph", "fastapi", "docker", "mlops", "spark", "databricks", "pytorch", "tensorflow"],
    text:
      "Core stack: Python (Pandas, NumPy, scikit-learn, TensorFlow, PyTorch, HuggingFace), SQL, Spark, XGBoost, LightGBM, time series and demand forecasting, classification, survival analysis (Kaplan-Meier, Cox), NLP, RAG, LangGraph, LangChain, pgvector, BM25, BGE embeddings, RAGAS, FastAPI, Docker, MLflow, DVC, Databricks, Power BI, Alteryx, GitHub Actions, Claude, and ChatGPT. Currently deepening Databricks (lakehouse MLOps) and LangGraph/LangSmith for agentic AI tooling."
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
  "sales-forecast": ["project"],
  "home-depot-search": ["project"],
  hallucinationbenchmark: ["project", "skill"],
  "multi-agent-research": ["project", "skill"],
  "bike-demand": ["project", "skill"],
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
  "sales-forecast": "Vehicle Sales Forecast",
  "home-depot-search": "Search Relevance",
  hallucinationbenchmark: "HallucinationBenchmark",
  "multi-agent-research": "Multi-Agent Research System",
  "bike-demand": "Bike Demand Prediction",
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
  if (/\b(multi[-\s]?agent|research system|tavily|search agent|web scraper|writer chain|critic chain|agentic ai)\b/.test(q)) return "multi-agent-research";
  if (/\b(bike demand|bike sharing|bike-share|hourly demand|gradient boosting|dvc|drift monitoring|retrain)\b/.test(q)) return "bike-demand";
  if (/\b(hallucinationbenchmark|hallucination|truthfulqa|deepeval|prompt engineering|system prompt|claude haiku|claude sonnet)\b/.test(q)) return "hallucinationbenchmark";
  if (/\b(sales forecast|vehicle sales|wape|elasticnet)\b/.test(q)) return "sales-forecast";
  if (/\b(home depot|search relevance|product search|lightgbm|sentence transformer)\b/.test(q)) return "home-depot-search";
  if (/\b(viatris|supply chain|pharma|purchase order|alteryx|stockout)\b/.test(q)) return "viatris";
  if (/\b(dashboards?|power bi|business intelligence|blinkit|kpi|reporting|figma)\b/.test(q)) return "dashboard";
  if (/\b(nmss|national ms|multiple sclerosis|dmt|therapy switch|claims)\b/.test(q)) return "nmss";
  if (/\b(best|strongest|top|main|primary|sharpest)\s+skills?\b/.test(q)) return "best-skill";
  if (/\b(skill|expertise|superpower)\b/.test(q) && /\b(best|strongest|top|main|primary|sharpest)\b/.test(q)) return "best-skill";
  if (/\bwhat\s+(is|are|does)\s+.*\b(good at|do best)\b/.test(q)) return "best-skill";
  if (/\b(best|strongest|top|flagship|most impressive)\s+(project|work)\b/.test(q)) return "hybridrag";
  if (/\b(why hire|hire him|why varshith|stand out|different|candidate|recruiter)\b/.test(q)) return "hiring";
  if (/\b(role|fit|position|solutions engineer|solutions architect|machine learning engineer|ai engineer|ml engineer|forward deployed)\b/.test(q)) return "role";
  if (/\b(experience|work history|jobs|career|worked|viatris|nmss|national ms)\b/.test(q)) return "experience";
  if (/\b(projects?|portfolio|built|demo|case study|hybridrag)\b/.test(q)) return "project";
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
    .slice(0, 3)
    // drop trailing chunks far weaker than the best match: they add tokens, not answers
    .filter((chunk, _i, kept) => chunk.score >= kept[0].score * RELEVANCE_GAP);
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
    .slice(-4)
    .map(item => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: cleanAnswer(item?.content).slice(0, 260)
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
      answer: "Duta is getting a lot of questions right now. Please try again in about a minute.",
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

  const cacheKey = history.length ? null : normalize(question);
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return json(event, 200, { ...cached, cached: true });
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
        max_tokens: 160,
        messages: [
          {
            role: "system",
            content:
              `You are Duta, the portfolio assistant for Varshith Tipirneni.\n` +
              `Answer only from the provided context. If the answer is not clearly present, reply exactly: "${FALLBACK}"\n` +
              `If the user asks for Varshith's best skill, answer the skill directly; do not answer with his best project. If the user asks for best project or best work, answer HybridRAG.\n` +
              `Use the conversation history only to understand follow-up references, never as factual source material.\n` +
              `Answer in at most 70 words. Lead with the answer itself, no preamble and no restating the question. ` +
              `Use short plain-text lines; where you list things, one item per line prefixed with "- ". ` +
              `No markdown, no invented facts. Warm but brief.`
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
    const result = {
      answer: answer || FALLBACK,
      sourceIds: matches.map(chunk => chunk.id),
      sourceLabels: sourceLabels(matches),
      confidence: matches[0]?.score >= 12 ? "high" : "medium"
    };
    if (cacheKey && answer) cacheSet(cacheKey, result);
    return json(event, 200, result);
  } catch (error) {
    return json(event, 200, {
      answer: FALLBACK,
      sourceIds: matches.map(chunk => chunk.id),
      sourceLabels: sourceLabels(matches),
      error: "rag_unavailable"
    });
  }
};
