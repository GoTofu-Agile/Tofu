# GoTofu Persona Framework — Research & Design Document

> **Status**: Research & Evaluation Phase — kein Code wird geschrieben, bis die offenen Fragen am Ende dieses Dokuments beantwortet sind.

---

## 1. Das GoTofu Persona Framework

### Was eine GoTofu Persona ist

Eine GoTofu Persona ist kein demografischer Steckbrief — sie ist ein **psychologisch konsistentes Verhaltenssimulationsmodell**. Der entscheidende Unterschied zu flachen Personas: Demografie erklärt nur ~1.5% der Verhaltensvarianz. Was wirklich zählt, sind psychografische Tiefe, Narrative und interne Widersprüche.

Das Framework ist in 5 Schichten aufgebaut:

---

### Layer 1: Identity (Wer sie sind)

Demographische Grunddaten — bewusst *nicht* übergewichtet, da sie allein keine Verhaltensprognosen erlauben.

| Feld | Typ | Beispiele |
|------|-----|-----------|
| name, age, gender, location | string / int | ✅ bereits implementiert |
| occupation | string | ✅ |
| `incomeBracket` | enum | `<25k | 25-50k | 50-100k | 100-250k | 250k+` |
| `educationLevel` | enum | `high_school | vocational | bachelor | master | phd` |
| `companySizePreference` | enum | `solo | startup | smb | enterprise` |
| `yearsExperience` | int | Jahre Berufserfahrung |

---

### Layer 2: Psychology (Wie sie denken)

Das Herzstück. Hier liegt die Differenzierung von GoTofu.

**Big Five / OCEAN** *(alle 0–1 Floats, bereits implementiert)*:
- `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`

**Entscheidungsverhalten** *(bereits implementiert)*:
- `decisionMakingStyle`: analytical | intuitive | dependent | avoidant | spontaneous
- `riskTolerance`, `trustPropensity`, `emotionalExpressiveness`

**Neu hinzufügen**:
- `adoptionCurvePosition`: `INNOVATOR | EARLY_ADOPTER | EARLY_MAJORITY | LATE_MAJORITY | LAGGARD` — positioniert die Persona auf Rogers' Technology Adoption Curve, extrem nützlich für Produktforschung
- `changeReadiness` (0–1): wie offen ist die Persona für Verhaltensänderungen / Produktwechsel

**Forschungshintergrund**: Das SCOPE-Framework (2025) zeigt, dass volle psychologische Konditionierung die Vorhersagekorrelation von 0.624 auf 0.667 erhöht gegenüber demografie-only Ansätzen. Persönlichkeits-Vektoren (Big Five) können via Prompt-Engineering in LLMs zuverlässig kodiert werden.

---

### Layer 3: Behavior (Was sie tun)

| Feld | Typ | Status |
|------|-----|--------|
| `goals` | string[] | ✅ |
| `frustrations` | string[] | ✅ |
| `behaviors` | string[] | ✅ |
| `coreValues` | string[] (ranked) | ✅ |
| `dayInTheLife` | text narrative | ✅ |
| `techLiteracy` | int 1–5 | ✅ |
| `domainExpertise` | novice/intermediate/expert | ✅ |

---

### Layer 4: Communication (Wie sie sprechen)

| Feld | Typ | Status |
|------|-----|--------|
| `communicationStyle` | direct/verbose/analytical/empathetic | ✅ |
| `vocabularyLevel` | casual/professional/academic/technical | ✅ |
| `responseLengthTendency` | short/medium/long | ✅ |
| `directness` | 0–1 | ✅ |
| `criticalFeedbackTendency` | 0–1 | ✅ |
| `tangentTendency` | 0–1 | ✅ |
| `representativeQuote` | text | ✅ |
| `communicationSample` | text | ✅ |

---

### Layer 5: Research Behavior (Wie sie sich in Studien verhalten)

Wird *nicht* separat gespeichert — wird aus Layer 2+4 berechnet und in der UI angezeigt:

**Predicted Sycophancy Score** = `(agreeableness + (1 - criticalFeedbackTendency)) / 2`

- Score > 0.65 → "Agreeable" (Vorsicht: hohes Sycophancy-Risiko)
- Score 0.35–0.65 → "Balanced"
- Score < 0.35 → "Skeptic" (wertvollste Personas für ehrliches Feedback)

**Forschungshintergrund**: Sycophancy ist das größte Risiko in AI-gestützter Forschung. LLMs tendieren dazu, zustimmend und positiv zu sein. GoTofu bekämpft das bereits mit dem 30%-Skeptiker-Mechanismus im Prompt. Der Predicted Sycophancy Score macht das für Nutzer sichtbar und filterbar.

---

### Framework-Metadaten (Neue Felder für Validierung)

Diese Felder sind besonders kritisch für die **temporale Validierungsstrategie** (Studie mit Daten vor 2025 simulieren, dann mit echten Post-2025-Ergebnissen vergleichen):

| Feld | Typ | Zweck |
|------|-----|-------|
| `dataTemporalRangeStart` | DateTime | Frühestes verwendetes Source-Datum |
| `dataTemporalRangeEnd` | DateTime | Spätestes verwendetes Source-Datum |
| `dataSourceTypes` | String[] | Welche Quellen genutzt (REDDIT, G2_REVIEW, etc.) |
| `confidenceScore` | Float 0–1 | Wie viel echte Daten vs. Halluzination |
| `geographicCoverage` | String[] | Länder/Regionen der Source-Daten |
| `frameworkVersion` | String | Version des GoTofu Frameworks bei Generierung |

Der `confidenceScore` ergibt sich aus: Anzahl DomainKnowledge-Einträge / erwartete Mindestanzahl × Qualitätsscore der Quellen. Bei 0 DomainKnowledge = 0.0 (reine Halluzination). Bei 20 hochwertigen Quellen → 1.0.

---

### Quality Scoring (Extended)

Aktuell hat GoTofu ein 16-Punkte System in `computeQualityScore()`. Erweiterung um 6 neue Checks:

| Check | Was er prüft | Warum wichtig |
|-------|-------------|---------------|
| **Personality Extremity** | Mind. 3 von 5 Big Five mit `|trait - 0.5| > 0.2` | Verhindert "mittelmäßige" Personas |
| **Trait Coherence** | Agreeableness < 0.4 wenn CriticalFeedback > 0.6 | Interne Konsistenz Skeptiker |
| **Backstory Specificity** | Enthält Eigennamen / konkrete Orte | Spezifische Events, nicht generisch |
| **Values Uniqueness** | Keine doppelten Strings in coreValues | Qualitätskontrolle |
| **Internal Contradiction** | Backstory enthält "but/however/despite/although" | CRITICAL RULE aus dem Prompt-Framework |
| **Data Grounding** | `confidenceScore > 0` | Data-Based > Prompt-Generated |

**Post-Interview Quality Validation** (nach Batch-Interviews):
- `sycophancyActualScore`: Sentiment-Ratio der RESPONDENT-Nachrichten
- Wenn > 85% positive Sätze: Persona als "sycophancy risk" flaggen
- Rückmeldung ans Framework für zukünftige Generierungen

---

### Gewichtung im Prompt (5-Layer Architektur)

Die aktuelle 5-Layer Prompt-Architektur in `generate-personas.ts` ist bereits State-of-the-Art. Explizite Gewichtung, die ins Prompt eingebaut werden sollte:

```
Psychological Depth:     30%  (Persönlichkeit, Motivation, Werte)
Behavioral Specificity:  25%  (Konkrete Verhaltensweisen, Jobs-to-be-done)
Narrative Authenticity:  20%  (Backstory mit echten Ereignissen)
Communication Realism:   15%  (Sprachstil, Vokabular, Tonalität)
Demographic Grounding:   10%  (Nur zur Verortung — nicht stereotypisieren)
```

---

## 2. Die Kuratierte Persona Library

### Konzept

Ein globaler, vorberechneter Pool von synthetischen Personas — von GoTofu kuriert, nicht vom Kunden erstellt. Kunden können filtern und importieren.

**Ziel**: 1M+ Personas mit systematischer Abdeckung der Weltwirtschaft.

**Generierungsstrategie** (iterativ aufbauen):
- Phase 1: ~200 Branchen × 10 Job Functions × 5 Personas = 10.000 Personas
- Phase 2: Ausweitung auf 100.000 durch automatisierte Pipelines
- Phase 3: 1M+ durch kontinuierliche Anreicherung

**Technische Grundlage**: Das Feld `isPrebuilt: Boolean` auf `PersonaGroup` ist *bereits im Schema* — die Library wurde also beim initialen Design bereits antizipiert.

---

### Filter-Dimensionen

Was Nutzer in der Library filtern können sollen:

**Demographisch**:
- Altersgruppe (18–25, 26–35, 36–45, 46–55, 56+)
- Geschlecht
- Geografie / Region
- Income Bracket
- Education Level

**Professionell**:
- Branche (SaaS, Healthcare, Finance, Retail, Education, etc.)
- Job Function (Engineering, Marketing, Sales, Operations, etc.)
- Seniority / Berufserfahrung
- Unternehmensgröße

**Psychografisch** *(das ist die Differenzierung)*:
- Adoption Curve Position (Innovator → Laggard)
- Decision Making Style
- Research Personality (Skeptiker / Balanced / Agreeable)
- Tech Literacy (1–5)
- Domain Expertise

**Daten-Provenienz** *(für Validierungsstudien)*:
- Quell-Plattformen (Reddit, G2, App Store, etc.)
- Zeitraum der Source-Daten (für temporale Validierung)
- Geographic Coverage der Daten
- Confidence Score (min. threshold)

**Semantic Search**: "Finde Personas, die frustriert mit Enterprise-Software-Onboarding sind" → pgvector-Ähnlichkeitssuche auf dem `embedding`-Feld (das bereits in beiden Tabellen existiert, aber noch nicht genutzt wird).

---

### Import-Flow

1. Nutzer sucht/filtert in der Library
2. Wählt N Personas aus
3. "In mein Workspace importieren" → erstellt neue PersonaGroup im Nutzer-Org
4. Kopiert Persona-Records mit PersonalityProfile
5. Verlinkt auf Original via `sourceReference`-JSON (bereits im Schema)
6. Nutzer kann sofort Studien damit starten

---

## 3. Die Datenbeschaffungs-Pipeline

### Übergeordnetes Prinzip

Das Ziel ist **datenbegründete Personas** (hoher `confidenceScore`) statt reiner LLM-Halluzination. Die Qualität der Personas ist direkt proportional zur Qualität und Relevanz der Source-Daten.

Die vorhandene `DomainKnowledge`-Tabelle ist bereits perfekt dafür ausgelegt — mit `sourceType`, `publishedAt`, `relevanceScore`, `sentiment`, `embedding` und allen notwendigen Provenienz-Feldern.

---

### Datenquellen — Bewertung und Prioritisierung

**Tier 1: Sofort verfügbar, hohe Qualität**

| Quelle | Stärke | Tool | Kosten | Bias |
|--------|--------|------|--------|------|
| **Reddit** | Community-Diskussionen, authentische Sprache, Meinungstiefe | Reddit Official API | Kostenlos (100 req/min) | Tech-skewed |
| **G2 Reviews** | B2B-Käufer, Entscheidungsprozesse, Vergleiche | Apify Actor | ~$5/1k | B2B/SaaS |
| **Trustpilot** | Consumer-Sentiment, klare Pain Points | Apify Actor | ~$5/1k | Konsumgüter |
| **Tavily** | News, Blogs, Branchenkontext | Bereits integriert | 1k free/mo | English-heavy |

**Tier 2: Mittelfristig**

| Quelle | Stärke | Tool | Kosten |
|--------|--------|------|--------|
| **App Store / Play Store** | Mobile-Nutzer, kurze direkte Aussagen | Apify Actor | ~$3/1k |
| **Pew Research** | Repräsentative Surveys, validierte Daten | CSV-Download | Kostenlos |
| **Product Hunt Comments** | Early Adopters, Maker-Mindset | Apify Actor | ~$3/1k |
| **Hacker News** | Entwickler, technische Tiefen-Analysen | Public API | Kostenlos |

**Tier 3: Langfristig**

| Quelle | Hindernis |
|--------|-----------|
| LinkedIn | ToS-Problem, hohe Kosten für zuverlässigen Zugang |
| Twitter/X | API extrem teuer ($100/mo+ für nennenswerte Volumina) |
| Bluesky / Mastodon | Wachsend, liberale APIs — gut für die Zukunft |

---

### Pipeline-Architektur (Konzept)

```
Nutzer-Input (Zielgruppe beschreiben)
        ↓
Source Selection Engine
(Welche Quellen sind relevant für diese Zielgruppe?)
        ↓
Parallele Scraping-Jobs (Inngest Fan-out)
    ├── Reddit: relevante Subreddits + Keywords
    ├── Reviews: G2/Trustpilot für Branche/Produkt
    ├── News: Tavily für Kontext + Trends
    └── Custom URLs: bestehende Implementierung
        ↓
NLP Processing Layer
    ├── Deduplication (SHA-256 Content-Hash)
    ├── Relevance Scoring (Embedding-Ähnlichkeit zur Zielgruppe)
    ├── Sentiment Tagging (positiv / negativ / neutral)
    ├── Embedding Generation (text-embedding-3-small, bereits in provider.ts)
    └── Temporal Tagging (publishedAt, scrapedAt)
        ↓
DomainKnowledge Storage (Schema bereits vollständig bereit)
        ↓
Persona Generation (bestehende Pipeline — jetzt mit reicherem RAG)
```

---

### NLP-Verarbeitung: Was aus Texten extrahierbar ist

| Signal | Extraktionsmethode | Output |
|--------|-------------------|--------|
| **Pain Points** | Aspect-Based Sentiment Analysis (BERT) | Geordnete Pain-Point-Liste |
| **Goals** | Topic Modeling (LDA / BERTopic) | Job-to-be-done Cluster |
| **Persönlichkeitssignale** | LIWC-Mapping oder LLM-Extraktion | Big Five Tendenzen |
| **Vocabulary Level** | Syntaktische Komplexität, Fachbegriff-Häufigkeit | casual/professional/technical |
| **Decision Making** | Daten-Sprache vs. Bauchgefühl-Sprache | analytical vs. intuitive |

Für GoTofu ist ein **LLM-basierter Extraktions-Schritt** (bereits für URL+Text implementiert) der pragmatischste Ansatz. Das bestehende `extractedContextSchema` gibt bereits die richtige Ausgabestruktur vor.

---

### Datenqualitätskontrolle

| Control | Implementierungsidee |
|---------|---------------------|
| Mindest-Content-Länge | `content.length < 100` → verwerfen |
| Deduplication | SHA-256 Hash des normalisierten Texts |
| Sprache | Nur `language: 'en'` initial, multilingual später |
| Relevanz-Threshold | Cosine Similarity zur Zielgruppe > 0.3 (pgvector) |
| Temporal Tagging | `publishedAt` immer speichern — kritisch für Validierung |
| Quell-Qualitätsscore | Reddit: Upvote-Ratio; Reviews: Verified-Purchase-Flag |

---

### Wichtige Bias-Warnung

Die Forschung zeigt: LLMs haben einen starken **WEIRD-Bias** (Western, Educated, Industrialized, Rich, Democratic):
- Weiße Personen werden mit 88–99% überrepräsentiert
- Starke Häufung in Tech/Finance/Creative-Berufen
- Geographische Konzentration auf NYC, SF, London

**GoTofu-Strategie**: Durch datenbegründete Generierung (hoher `confidenceScore`) wird dieser Bias reduziert — aber nicht eliminiert. Die `geographicCoverage`-Metadaten erlauben es Nutzern, bewusst zu entscheiden, welche Quellen ihr Persona-Set prägen.

---

## 4. Validierungsstrategie (Wie wir Qualität beweisen)

### Die zwei Kern-Methoden (bereits geplant)

1. **Concurrent Validity**: 500 reale Studierende vs. 500 synthetische Personas — gleiche Fragen, Ergebnisvergleich
2. **Temporal Predictive Validity**: Daten vor 2025 → Studie simulieren → mit echten Post-2025-Ergebnissen vergleichen. Das `dataTemporalRangeEnd`-Feld ist dafür essenziell.

### Weitere Validierungsansätze

| Methode | Was sie beweist | Aufwand |
|---------|----------------|---------|
| **Replication of Published Studies** | GoTofu reproduziert Ergebnisse aus Peer-Reviewed-Papers | Mittel — öffentliche Datensätze verfügbar |
| **Turing Test für Transkripte** | UX-Researcher können echte und synthetische Interviews nicht unterscheiden | Niedrig — nur Rekrutierung von Evaluatoren nötig |
| **Construct Validity** | Skeptiker-Personas sind messbar kritischer als agreeable Personas | Niedrig — rein intern testbar |
| **A/B Product Decision Tracking** | Partner-Unternehmen nutzen GoTofu-Insights für Produktentscheidungen → Tracking ob richtig | Hoch — braucht engagierte Partner |
| **WEIRD-Bias Audit** | GoTofu erzeugt weniger Bias als Konkurrenten bei data-grounded Personas | Mittel — vergleichbarer Test |
| **Inter-Study Reliability** | Gleiche Studie 3× → konsistente Kernthemen und Empfehlungen | Niedrig — vollständig automatisierbar |

---

## 5. Offene Fragen (vor Implementierung zu klären)

### Produkt / UX
1. Wird die Library als separater Bereich in der Sidebar angezeigt, oder als Teil des Personas-Flows?
2. Ist die Datenbeschaffung automatisch (im Hintergrund) oder ein manueller "Enrich"-Schritt?
3. Können Free-Tier-Nutzer die Library durchsuchen, oder nur bezahlte Kunden?

### Business
4. Wie werden Scraping-Kosten (Apify: ~$5/1k Reviews) dem Kunden gegenüber abgerechnet?
5. Erste Version nur Englisch — wann kommt Mehrsprachigkeit?

### Technisch
6. Welche Scraping-Quellen haben Priorität basierend auf Kundensegment? (B2B → G2 zuerst; Consumer → App Store + Reddit)
7. Ist Supabase pgvector für 1M+ Personas bei Semantic Search ausreichend performant, oder brauchen wir einen separaten Vektorspeicher?
8. Inngest-Limits für lang laufende Fan-out-Pipelines evaluieren (Scraping kann 10–60 Minuten dauern)

---

## Was im Code bereits existiert (nicht neu bauen)

- **DomainKnowledge Schema**: vollständig mit allen sourceTypes (REDDIT, G2_REVIEW, TRUSTPILOT, APP_REVIEW, etc.), Provenienz-Feldern, Embedding-Vektor ✅
- **PersonaDataSource**: Provenienz-Verknüpfung zwischen Persona und Source ✅
- **isPrebuilt auf PersonaGroup**: Library-Architektur antizipiert ✅
- **Tavily-Integration**: Basis für Datenpipeline ✅
- **5-Layer Prompt-Architektur**: Anti-Sycophancy, RAG, Differenzierung ✅
- **Embedding-Columns**: auf Persona und DomainKnowledge (brauchen nur aktiviert zu werden) ✅
- **qualityScore**: 16-Punkt-Scoring bei Generierung ✅
