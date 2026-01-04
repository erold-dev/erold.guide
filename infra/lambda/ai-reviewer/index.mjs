import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3UsEast1 = new S3Client({ region: 'us-east-1' });  // For pending bucket
const s3EuWest1 = new S3Client({ region: 'eu-west-1' });  // For guidelines bucket

const TABLE_NAME = process.env.TABLE_NAME || "erold-contributions";
const PENDING_BUCKET = process.env.PENDING_BUCKET || "erold-contributions-pending";
const GUIDELINES_BUCKET = process.env.GUIDELINES_BUCKET || "erold-guide-content";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Review criteria and prompts
const REVIEW_SYSTEM_PROMPT = `You are a senior technical reviewer for erold.guide, an open encyclopedia of development guidelines. Your job is to provide a comprehensive assessment to help ADMINS decide whether to publish a guideline.

## Review Criteria

1. **Safety & Security** (CRITICAL - Block if failed)
   - No malicious code examples (working XSS, SQL injection, etc.)
   - No harmful advice that could compromise systems
   - Code examples are safe to copy-paste
   - No credential exposure or security anti-patterns presented as good

2. **Technical Accuracy** (CRITICAL)
   - Is the information technically correct?
   - Is it up-to-date for current versions?
   - Would following this advice produce working code?

3. **Content Quality** (Important)
   - Is the guideline specific and actionable?
   - Does it explain WHY, not just WHAT?
   - Are code examples correct and well-formatted?
   - Does it show both good and bad patterns?

4. **Value & Uniqueness** (Important)
   - Does it add value to the encyclopedia?
   - Is it too basic (e.g., "use semicolons")?
   - Does it duplicate existing content?

5. **Structure & Formatting** (Minor)
   - Proper markdown formatting
   - Clear sections and organization
   - Syntax-highlighted code blocks

## Response Format

Respond with a JSON object:
{
  "decision": "approve" | "needs_changes" | "reject",
  "confidence": 0-100,
  "overallScore": 0-100,

  "adminSummary": "2-3 sentence summary for admin explaining your recommendation",

  "checks": {
    "safe": { "passed": true/false, "note": "explanation" },
    "accurate": { "passed": true/false, "note": "explanation" },
    "valuable": { "passed": true/false, "note": "explanation" },
    "wellWritten": { "passed": true/false, "note": "explanation" },
    "followsRules": { "passed": true/false, "note": "explanation" }
  },

  "recommendation": "PUBLISH" | "NEEDS_REVISION" | "REJECT",
  "recommendationReason": "One clear reason for your recommendation",

  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "description": "Description of the issue",
      "location": "Where in the content (optional)"
    }
  ],

  "strengths": ["What the guideline does well"],

  "feedbackForContributor": "Constructive feedback if changes needed (null if approving)"
}

## Decision Guidelines

- **approve** (recommend PUBLISH): Score >= 75, all critical checks pass, ready for public
- **needs_changes** (NEEDS_REVISION): Score 50-74 OR has fixable issues, contributor should revise
- **reject** (REJECT): Score < 50, unsafe, inaccurate, spam, or fundamentally unsuitable

Be STRICT on safety. Be helpful with feedback. Admins rely on your assessment.`;

async function getExistingGuidelines(topic) {
  // Try to get existing guidelines from the published bucket for comparison
  try {
    const listResult = await s3EuWest1.send(new ListObjectsV2Command({
      Bucket: GUIDELINES_BUCKET,
      Prefix: `guidelines/${topic}/`,
    }));

    if (!listResult.Contents || listResult.Contents.length === 0) {
      return [];
    }

    const guidelines = await Promise.all(
      listResult.Contents
        .filter(obj => obj.Key.endsWith('.md'))
        .slice(0, 10) // Limit to 10 for context size
        .map(async (obj) => {
          try {
            const result = await s3EuWest1.send(new GetObjectCommand({
              Bucket: GUIDELINES_BUCKET,
              Key: obj.Key,
            }));
            const content = await result.Body.transformToString();
            // Extract title from frontmatter
            const titleMatch = content.match(/^title:\s*(.+)$/m);
            const slugMatch = content.match(/^slug:\s*(.+)$/m);
            return {
              slug: slugMatch?.[1] || obj.Key,
              title: titleMatch?.[1] || 'Unknown',
              preview: content.slice(0, 500)
            };
          } catch {
            return null;
          }
        })
    );

    return guidelines.filter(Boolean);
  } catch (err) {
    console.log('Could not load existing guidelines:', err.message);
    return [];
  }
}

async function callClaudeAPI(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function reviewContribution(contributionId) {
  console.log(`Reviewing contribution: ${contributionId}`);

  // Get contribution metadata
  const metaResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${contributionId}`, sk: "META" }
  }));

  if (!metaResult.Item) {
    throw new Error(`Contribution not found: ${contributionId}`);
  }

  const meta = metaResult.Item;

  // Only review pending contributions
  if (meta.status !== 'pending') {
    console.log(`Skipping - contribution is ${meta.status}`);
    return { skipped: true, reason: `Status is ${meta.status}` };
  }

  // Get full content from S3 (pending bucket is in us-east-1)
  const s3Result = await s3UsEast1.send(new GetObjectCommand({
    Bucket: PENDING_BUCKET,
    Key: `${contributionId}/guideline.json`
  }));
  const content = JSON.parse(await s3Result.Body.transformToString());

  // Get existing guidelines for comparison
  const topic = content.topic || content.framework; // Backwards compatibility
  const existingGuidelines = await getExistingGuidelines(topic);

  // Build the review prompt
  const userPrompt = `## Submission to Review

**Topic:** ${topic}
**Category:** ${content.category}
**Title:** ${content.guideline.title}
**Slug:** ${content.guideline.slug}
**Version:** ${content.guideline.version}
**Difficulty:** ${content.guideline.difficulty}
**Tags:** ${content.guideline.tags.join(', ')}

**Description:**
${content.guideline.description}

**Content:**
${content.guideline.content}

---

## Existing Guidelines in ${topic} (for duplicate detection)

${existingGuidelines.length > 0
  ? existingGuidelines.map(g => `- **${g.title}** (${g.slug})`).join('\n')
  : 'No existing guidelines found for this topic.'}

---

Please review this submission and provide your assessment in JSON format.`;

  // Call Claude API
  console.log('Calling Claude API for review...');
  const reviewText = await callClaudeAPI(REVIEW_SYSTEM_PROMPT, userPrompt);

  // Parse the review response
  let review;
  try {
    // Extract JSON from the response (might be wrapped in markdown code blocks)
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    review = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Failed to parse review:', reviewText);
    throw new Error(`Failed to parse review response: ${err.message}`);
  }

  // Map decision to status
  const statusMap = {
    'approve': 'ai_approved',
    'needs_changes': 'ai_needs_changes',
    'reject': 'ai_rejected'
  };

  const newStatus = statusMap[review.decision] || 'ai_needs_changes';

  // Update contribution with review results
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${contributionId}`, sk: "META" },
    UpdateExpression: "SET #status = :status, review = :review, updatedAt = :now",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": newStatus,
      ":review": {
        // Core assessment
        score: review.overallScore || review.score || 0,
        confidence: review.confidence || 0,
        decision: review.decision,
        recommendation: review.recommendation || review.decision.toUpperCase(),
        recommendationReason: review.recommendationReason || review.summary,

        // Admin summary
        adminSummary: review.adminSummary || review.summary,

        // Detailed checks
        checks: review.checks || null,

        // Issues and feedback
        issues: review.issues || [],
        strengths: review.strengths || [],
        feedbackForContributor: review.feedbackForContributor || review.feedback || null,

        // Metadata
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'claude-sonnet-4'
      },
      ":now": new Date().toISOString()
    }
  }));

  console.log(`Review complete: ${newStatus} (score: ${review.score})`);

  return {
    contributionId,
    status: newStatus,
    score: review.score,
    summary: review.summary
  };
}

export const handler = async (event) => {
  console.log('AI Reviewer invoked:', JSON.stringify(event));

  try {
    // Support both direct invocation and SQS/SNS triggers
    let contributionId;

    if (event.contributionId) {
      // Direct invocation
      contributionId = event.contributionId;
    } else if (event.Records) {
      // SQS/SNS trigger
      const record = event.Records[0];
      const body = JSON.parse(record.body || record.Sns?.Message || '{}');
      contributionId = body.contributionId;
    } else {
      throw new Error('No contribution ID provided');
    }

    const result = await reviewContribution(contributionId);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('Review error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
