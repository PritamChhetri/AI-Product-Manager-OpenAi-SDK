import "dotenv/config";

import {
  Agent,
  run,
  tool,
} from "@openai/agents";

import { z } from "zod";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// ============================================================
// ENVIRONMENT CHECK
// ============================================================

if (!process.env.OPENAI_API_KEY) {
  console.error("\n❌ OPENAI_API_KEY is missing.");
  console.error("Create a .env file and add:");
  console.error("OPENAI_API_KEY=your_api_key_here\n");
  process.exit(1);
}

// ============================================================
// TYPES
// ============================================================

type ProductContext = {
  productIdea: string;
  feedback: string;
  competitors: string;
  roadmap: string;
  prd: string;
};

// Shared project memory
const project: ProductContext = {
  productIdea: "",
  feedback: "",
  competitors: "",
  roadmap: "",
  prd: "",
};

// ============================================================
// HUMAN APPROVAL
// ============================================================

async function askApproval(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input,
    output,
  });

  try {
    const answer = await rl.question(
      `\n⚠️ HUMAN APPROVAL REQUIRED\n\n${message}\n\nApprove? (y/n): `
    );

    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

// ============================================================
// TOOL 1
// PRODUCT RESEARCH
// ============================================================

const researchProductTool = tool({
  name: "research_product",

  description:
    "Research and structure a product idea into a clear product opportunity.",

  parameters: z.object({
    productIdea: z.string().describe("The product idea to research"),
  }),

  async execute({ productIdea }) {
    console.log("\n🔎 TOOL 1: Product Research");

    const result = `
PRODUCT RESEARCH

Product Idea:
${productIdea}

Target Users:
Identify the primary users who would benefit from this product.

Core Problem:
Identify the main problem this product should solve.

Opportunity:
Explain why solving this problem could create value.

Potential Solution:
Describe a practical first version of the product.
`;

    project.productIdea = productIdea;

    return result;
  },
});

// ============================================================
// TOOL 2
// FEEDBACK ANALYSIS
// ============================================================

const feedbackTool = tool({
  name: "analyze_feedback",

  description:
    "Analyze customer feedback and extract pain points, requests and priorities.",

  parameters: z.object({
    feedback: z.string().describe("Customer or user feedback"),
  }),

  async execute({ feedback }) {
    console.log("\n💬 TOOL 2: Feedback Analysis");

    const result = `
CUSTOMER FEEDBACK ANALYSIS

Raw Feedback:
${feedback}

Key Pain Points:
- Identify the biggest problems mentioned by users.

Feature Requests:
- Identify features users are requesting.

Positive Signals:
- Identify what users already like.

Priority:
- Determine which feedback should be addressed first.
`;

    project.feedback = result;

    return result;
  },
});

// ============================================================
// TOOL 3
// COMPETITOR ANALYSIS
// ============================================================

const competitorTool = tool({
  name: "analyze_competitors",

  description:
    "Analyze competitors and identify opportunities for differentiation.",

  parameters: z.object({
    competitors: z
      .string()
      .describe("Competitor names or competitor descriptions"),
  }),

  async execute({ competitors }) {
    console.log("\n🏢 TOOL 3: Competitor Analysis");

    const result = `
COMPETITOR ANALYSIS

Competitors:
${competitors}

Competitive Factors:
- Main features
- Target customers
- Strengths
- Weaknesses
- Pricing or business model when known

Differentiation Opportunities:
Identify ways our product could provide a better or different experience.
`;

    project.competitors = result;

    return result;
  },
});

// ============================================================
// TOOL 4
// ROADMAP CREATION
// ============================================================

const roadmapTool = tool({
  name: "create_roadmap",

  description:
    "Create a practical product development roadmap based on research, feedback and competition.",

  needsApproval: true,

  parameters: z.object({
    roadmap: z.string().describe("Proposed product roadmap"),
  }),

  async execute({ roadmap }) {
    console.log("\n🗺️ TOOL 4: Creating Product Roadmap");

    project.roadmap = roadmap;

    return `
PRODUCT ROADMAP APPROVED

${roadmap}

The roadmap has been saved as the current product roadmap.
`;
  },
});

// ============================================================
// TOOL 5
// PRD CREATION
// ============================================================

const prdTool = tool({
  name: "create_prd",

  description:
    "Create a Product Requirements Document based on the product strategy.",

  needsApproval: true,

  parameters: z.object({
    prd: z.string().describe("Complete Product Requirements Document"),
  }),

  async execute({ prd }) {
    console.log("\n📄 TOOL 5: Creating PRD");

    project.prd = prd;

    return `
PRODUCT REQUIREMENTS DOCUMENT APPROVED

${prd}

The PRD has been saved.
`;
  },
});

// ============================================================
// AGENT 1
// PRODUCT RESEARCH AGENT
// ============================================================

const productResearchAgent = new Agent({
  name: "Product Research Agent",

  instructions: `
You are a Product Research Specialist.

Your job is to understand a product idea.

You must:
1. Identify the target users.
2. Identify the problem.
3. Identify the opportunity.
4. Clarify the proposed solution.

Use the research_product tool.

Return a concise research summary.
`,

  tools: [researchProductTool],
});

// ============================================================
// AGENT 2
// CUSTOMER FEEDBACK AGENT
// ============================================================

const feedbackAgent = new Agent({
  name: "Customer Feedback Agent",

  instructions: `
You are a Customer Feedback Specialist.

Analyze customer feedback.

Identify:
- Pain points
- Feature requests
- Positive feedback
- Priority improvements

Use the analyze_feedback tool.

Return a structured feedback analysis.
`,

  tools: [feedbackTool],
});

// ============================================================
// AGENT 3
// COMPETITOR ANALYSIS AGENT
// ============================================================

const competitorAgent = new Agent({
  name: "Competitor Analysis Agent",

  instructions: `
You are a Competitive Intelligence Specialist.

Analyze the provided competitors.

Identify:
- Strengths
- Weaknesses
- Important features
- Differentiation opportunities

Use the analyze_competitors tool.

Return a structured competitor analysis.
`,

  tools: [competitorTool],
});

// ============================================================
// AGENT 4
// PRODUCT STRATEGY AGENT
// ============================================================

const strategyAgent = new Agent({
  name: "Product Strategy Agent",

  instructions: `
You are a Senior Product Strategist.

Create a realistic product roadmap.

Use the available research, feedback and competitor information.

The roadmap should contain:

1. MVP
2. Phase 2
3. Phase 3
4. Future improvements

Prioritize features based on user value and development practicality.

You MUST use the create_roadmap tool when creating the roadmap.

The roadmap tool requires human approval.
`,

  tools: [roadmapTool],
});

// ============================================================
// AGENT 5
// PRODUCT MANAGER AGENT
// ============================================================

const productManagerAgent = new Agent({
  name: "Product Manager Agent",

  instructions: `
You are the Lead AI Product Manager.

Your responsibility is to combine:

- Product research
- Customer feedback
- Competitor analysis
- Product roadmap

Then create a professional Product Requirements Document.

The PRD must include:

1. Product overview
2. Problem statement
3. Target users
4. Goals
5. User stories
6. Functional requirements
7. Non-functional requirements
8. MVP scope
9. Roadmap
10. Success metrics
11. Risks
12. Future improvements

You MUST use the create_prd tool.

The PRD tool requires human approval.
`,

  tools: [prdTool],
});

// ============================================================
// RUN AGENT
// ============================================================

async function runAgent(
  agent: Agent,
  inputText: string
): Promise<string> {
  const result = await run(agent, inputText);

  return result.finalOutput ?? "No output returned.";
}

// ============================================================
// MAIN APPLICATION
// ============================================================

async function main() {
  console.clear();

  console.log("================================================");
  console.log("       AI PRODUCT MANAGER SYSTEM");
  console.log("================================================");

  console.log("\n🤖 5 Agents:");
  console.log("1. Product Research Agent");
  console.log("2. Customer Feedback Agent");
  console.log("3. Competitor Analysis Agent");
  console.log("4. Product Strategy Agent");
  console.log("5. Product Manager Agent");

  console.log("\n🛠️ 5 Tools:");
  console.log("1. Product Research");
  console.log("2. Feedback Analysis");
  console.log("3. Competitor Analysis");
  console.log("4. Roadmap Creation");
  console.log("5. PRD Creation");

  console.log("\n🔐 Human-in-the-loop: ENABLED");

  console.log("\n================================================\n");

  const rl = readline.createInterface({
    input,
    output,
  });

  try {
    // --------------------------------------------------------
    // PRODUCT IDEA
    // --------------------------------------------------------

    const productIdea = await rl.question(
      "💡 Enter your product idea:\n> "
    );

    if (!productIdea.trim()) {
      console.log("\n❌ Product idea cannot be empty.");
      return;
    }

    // --------------------------------------------------------
    // RESEARCH
    // --------------------------------------------------------

    console.log("\n\n========== AGENT 1 ==========");
    console.log("🔎 Product Research Agent is working...\n");

    const research = await runAgent(
      productResearchAgent,
      `Research this product idea:

${productIdea}`
    );

    console.log("\n📊 RESEARCH RESULT:");
    console.log(research);

    // --------------------------------------------------------
    // FEEDBACK
    // --------------------------------------------------------

    const feedback = await rl.question(
      "\n\n💬 Enter sample customer feedback:\n> "
    );

    console.log("\n\n========== AGENT 2 ==========");
    console.log("💬 Customer Feedback Agent is working...\n");

    const feedbackResult = await runAgent(
      feedbackAgent,
      `Analyze this customer feedback:

${feedback}`
    );

    console.log("\n📊 FEEDBACK RESULT:");
    console.log(feedbackResult);

    // --------------------------------------------------------
    // COMPETITORS
    // --------------------------------------------------------

    const competitors = await rl.question(
      "\n\n🏢 Enter competitors or competing products:\n> "
    );

    console.log("\n\n========== AGENT 3 ==========");
    console.log("🏢 Competitor Analysis Agent is working...\n");

    const competitorResult = await runAgent(
      competitorAgent,
      `Analyze these competitors:

${competitors}`
    );

    console.log("\n📊 COMPETITOR RESULT:");
    console.log(competitorResult);

    // --------------------------------------------------------
    // ROADMAP
    // --------------------------------------------------------

    console.log("\n\n========== AGENT 4 ==========");
    console.log("🗺️ Product Strategy Agent is working...\n");

    const roadmapDraft = await runAgent(
      strategyAgent,
      `
Create a product roadmap using the following information.

PRODUCT:
${productIdea}

RESEARCH:
${research}

CUSTOMER FEEDBACK:
${feedbackResult}

COMPETITOR ANALYSIS:
${competitorResult}

Create a realistic roadmap with MVP, Phase 2, Phase 3 and future improvements.
`
    );

    console.log("\n🗺️ ROADMAP RESULT:");
    console.log(roadmapDraft);

    // --------------------------------------------------------
    // HUMAN APPROVAL FOR ROADMAP
    // --------------------------------------------------------

    const roadmapApproved = await askApproval(
      `The Product Strategy Agent has created the roadmap.

Please review the roadmap shown above.

Do you want to approve this roadmap?
`
    );

    if (!roadmapApproved) {
      console.log("\n❌ Roadmap rejected by human.");
      console.log("The workflow has been stopped.");
      return;
    }

    console.log("\n✅ Roadmap approved by human.");

    // --------------------------------------------------------
    // PRD
    // --------------------------------------------------------

    console.log("\n\n========== AGENT 5 ==========");
    console.log("📄 Product Manager Agent is working...\n");

    const prdDraft = await runAgent(
      productManagerAgent,
      `
Create the final Product Requirements Document.

PRODUCT:
${productIdea}

RESEARCH:
${research}

CUSTOMER FEEDBACK:
${feedbackResult}

COMPETITOR ANALYSIS:
${competitorResult}

APPROVED ROADMAP:
${roadmapDraft}

Create a professional PRD containing:
- Product overview
- Problem statement
- Target users
- Goals
- User stories
- Functional requirements
- Non-functional requirements
- MVP scope
- Roadmap
- Success metrics
- Risks
- Future improvements

Then use the create_prd tool.
`
    );

    console.log("\n📄 PRD RESULT:");
    console.log(prdDraft);

    // --------------------------------------------------------
    // HUMAN APPROVAL FOR PRD
    // --------------------------------------------------------

    const prdApproved = await askApproval(
      `The Product Manager Agent has created the final PRD.

Do you approve the final PRD?
`
    );

    if (!prdApproved) {
      console.log("\n❌ PRD rejected by human.");
      console.log("The workflow has been stopped.");
      return;
    }

    console.log("\n✅ PRD approved by human.");

    // --------------------------------------------------------
    // FINAL SUMMARY
    // --------------------------------------------------------

    console.log("\n");
    console.log("================================================");
    console.log("             PROJECT COMPLETE");
    console.log("================================================");

    console.log("\n✅ Product Research completed");
    console.log("✅ Customer Feedback analyzed");
    console.log("✅ Competitors analyzed");
    console.log("✅ Roadmap created and approved");
    console.log("✅ PRD created and approved");

    console.log("\n🎯 FINAL PRODUCT PLAN READY");
    console.log("================================================\n");
  } catch (error) {
    console.error("\n❌ Unexpected error:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  } finally {
    rl.close();
  }
}

// ============================================================
// START
// ============================================================

main();