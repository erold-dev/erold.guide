import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const TABLE_NAME = process.env.TABLE_NAME || "erold-contributions";
const PENDING_BUCKET = process.env.PENDING_BUCKET || "erold-contributions-pending";
const GUIDELINES_BUCKET = process.env.GUIDELINES_BUCKET || "erold-guide-content";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Review criteria and prompts
const REVIEW_SYSTEM_PROMPT = `You are a senior technical reviewer for erold.guide, an open encyclopedia of development guidelines. Your job is to review submitted guidelines for quality, accuracy, and compliance with our standards.

## Review Criteria

1. **Content Quality** (Critical)
   - Is the guideline specific and actionable?
   - Does it explain WHY, not just WHAT?
   - Are code examples correct and well-formatted?
   - Does it show both good and bad patterns?

2. **Technical Accuracy** (Critical)
   - Is the information technically correct?
   - Is it up-to-date for the specified framework version?
   - Are there any security concerns in the recommendations?

3. **Formatting & Structure** (Important)
   - Does it follow markdown best practices?
   - Is it well-organized with clear sections?
   - Are code blocks properly syntax-highlighted?

4. **Uniqueness** (Important)
   - Does it duplicate existing guidelines?
   - Does it add value beyond what already exists?

5. **AI Optimization** (Nice to have)
   - Is the content clear enough for AI agents to apply?
   - Would this help AI write better code?

## Response Format

Respond with a JSON object:
{
  "decision": "approve" | "needs_changes" | "reject",
  "score": 0-100,
  "summary": "One sentence summary of your decision",
  "feedback": "Detailed feedback for the contributor (if needs_changes or reject)",
  "issues": [
    {
      "type": "critical" | "important" | "suggestion",
      "description": "Description of the issue",
      "location": "Where in the content (optional)"
    }
  ],
  "strengths": ["What the guideline does well"],
  "suggestions": ["Optional improvements even if approving"]
}

## Decision Guidelines

- **approve**: Score >= 70, no critical issues, meets quality standards
- **needs_changes**: Score 40-69, has fixable issues, contributor should revise
- **reject**: Score < 40, fundamentally flawed, doesn't fit the project, or duplicate`;

async function getExistingGuidelines(framework) {
  // Try to get existing guidelines from the published bucket for comparison
  try {
    const listResult = await s3.send(new ListObjectsV2Command({
      Bucket: GUIDELINES_BUCKET,
      Prefix: `guidelines/${framework}/`,
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
            const result = await s3.send(new GetObjectCommand({
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

  // Get full content from S3
  const s3Result = await s3.send(new GetObjectCommand({
    Bucket: PENDING_BUCKET,
    Key: `${contributionId}/guideline.json`
  }));
  const content = JSON.parse(await s3Result.Body.transformToString());

  // Get existing guidelines for comparison
  const existingGuidelines = await getExistingGuidelines(content.framework);

  // Build the review prompt
  const userPrompt = `## Submission to Review

**Framework:** ${content.framework}
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

## Existing Guidelines in ${content.framework} (for duplicate detection)

${existingGuidelines.length > 0
  ? existingGuidelines.map(g => `- **${g.title}** (${g.slug})`).join('\n')
  : 'No existing guidelines found for this framework.'}

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
        score: review.score,
        summary: review.summary,
        feedback: review.feedback || null,
        issues: review.issues || [],
        strengths: review.strengths || [],
        suggestions: review.suggestions || [],
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
