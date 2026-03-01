export type Tone = "direct" | "warm" | "analytical";

interface GeneratedPost {
  name: string;
  headline: string;
  body: string;
  likes: number;
  comments: number;
  reposts: number;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractKeywords(topic: string): string[] {
  const stopWords = new Set([
    "i", "we", "the", "a", "an", "is", "are", "was", "were", "be",
    "been", "about", "my", "our", "your", "it", "to", "for", "in",
    "on", "at", "of", "and", "or", "but", "not", "this", "that",
    "with", "from", "how", "what", "why", "when", "just", "got",
    "had", "have", "has", "do", "did", "will", "can", "should",
  ]);
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

const TEMPLATES: Record<Tone, ((topic: string, keywords: string[]) => string)[]> = {
  direct: [
    (t) =>
      `Most people overthink ${t}.\n\nHere is what actually works:\n\n1. Start before you feel ready\n2. Ship something small every week\n3. Get real feedback, not opinions\n\nSimplicity scales. Complexity stalls.`,
    (t) =>
      `Spent the last quarter deep in ${t}.\n\nThree things I wish I knew earlier:\n\nContext matters more than credentials.\nSpeed matters more than perfection.\nConsistency matters more than intensity.\n\nDo the work. The rest follows.`,
    (t) =>
      `Hot take on ${t}:\n\nThe best strategy is the one you actually execute.\n\nI have seen brilliant plans fail because no one owned the outcome. And I have seen rough ideas succeed because someone refused to quit.\n\nBias towards action. Always.`,
    (t) =>
      `${t} is changing fast.\n\nThe teams winning right now share one trait: they make decisions with 70% of the information and correct along the way.\n\nWaiting for certainty is the most expensive strategy.`,
    (t, kw) =>
      `If you are working in ${kw[0] || t}, stop doing these three things:\n\n1. Chasing vanity metrics\n2. Building features nobody asked for\n3. Ignoring what your best customers tell you\n\nFocus is a competitive advantage.`,
    (t) =>
      `One lesson from working on ${t}:\n\nThe people who get ahead are not the smartest in the room. They are the ones who follow through.\n\nTalent opens doors. Reliability keeps them open.`,
  ],
  warm: [
    (t) =>
      `Something I have been thinking about lately: ${t}.\n\nI used to believe you had to have it all figured out before sharing. Turns out, the best conversations happen when you are still figuring it out.\n\nWhat is your experience with this? Genuinely curious.`,
    (t) =>
      `A colleague asked me about ${t} today and it made me reflect.\n\nThe truth is, I have learned more from mistakes than any course or book. The willingness to be wrong is what makes us better.\n\nSharing in case it resonates with anyone here.`,
    (t) =>
      `Grateful for the lessons ${t} has taught me this year.\n\nThe biggest one: surround yourself with people who challenge your thinking, not just people who agree with you.\n\nGrowth happens at the edge of comfort.`,
    (t) =>
      `Real talk about ${t}.\n\nSome days are brilliant. Some days are a grind. Both matter.\n\nThe narrative that success is a straight line does a disservice to everyone putting in the work. Progress is messy, and that is perfectly fine.`,
    (t, kw) =>
      `Had a great conversation about ${kw[0] || t} this week.\n\nOne thing that stuck with me: the best teams do not avoid disagreement. They have learned to disagree well.\n\nThat distinction changes everything.`,
    (t) =>
      `A small win worth celebrating: made real progress on ${t}.\n\nIt is easy to discount the small steps when you are focused on the destination. But looking back, every small step mattered.\n\nWhat small win are you celebrating this week?`,
  ],
  analytical: [
    (t) =>
      `Analysed our approach to ${t} over the last 90 days. Here is what the data shows:\n\nIterations with tight feedback loops outperformed planned rollouts by 2.3x on key metrics.\n\nThe takeaway: optimise for learning speed, not launch perfection.`,
    (t) =>
      `Three data points on ${t} that changed my perspective:\n\n1. 68% of outcomes are determined by timing, not strategy\n2. Teams that document decisions recover from mistakes 40% faster\n3. The highest-performing contributors ask 3x more questions\n\nNumbers tell stories that narratives miss.`,
    (t) =>
      `Broke down our ${t} process into measurable components.\n\nThe bottleneck was not where we expected. Turns out, 60% of our cycle time was spent on alignment, not execution.\n\nBetter communication frameworks beat better tools every time.`,
    (t, kw) =>
      `An observation on ${kw[0] || t}:\n\nCompanies that track leading indicators outperform those focused on lagging metrics. The difference is not marginal; it is structural.\n\nWhat you measure determines what you optimise. Choose carefully.`,
    (t) =>
      `Reviewed 50+ ${t} case studies this quarter.\n\nPattern: the organisations that scaled effectively shared one trait. They standardised process before they standardised tools.\n\nProcess clarity removes ambiguity. Tools amplify whatever you already have.`,
    (t) =>
      `Framework I use when thinking about ${t}:\n\n1. Define the constraint (not the symptom)\n2. Measure the baseline honestly\n3. Test one variable at a time\n4. Commit to the result, not the hypothesis\n\nRigour is underrated.`,
  ],
};

export function generateDemoPost(topic: string, tone: Tone): GeneratedPost {
  const keywords = extractKeywords(topic);
  const seed = hashString(topic.toLowerCase().trim() + tone);
  const templates = TEMPLATES[tone];
  const template = templates[seed % templates.length];
  const body = template(topic.trim(), keywords);

  return {
    name: "Alex Chen",
    headline: "VP of Growth \u00b7 B2B SaaS",
    body,
    likes: 40 + (seed % 180),
    comments: 8 + (seed % 35),
    reposts: 3 + (seed % 18),
  };
}
