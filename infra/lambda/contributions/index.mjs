import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import crypto from "crypto";

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3UsEast1 = new S3Client({ region: 'us-east-1' });  // For erold-contributions-pending and erold-website
const s3EuWest1 = new S3Client({ region: 'eu-west-1' });  // For erold-guide-content
const cloudfront = new CloudFrontClient({ region: 'us-east-1' });
const lambda = new LambdaClient({});

const TABLE_NAME = process.env.TABLE_NAME || "erold-contributions";
const BUCKET_NAME = process.env.BUCKET_NAME || "erold-contributions-pending";
const GUIDELINES_BUCKET = process.env.GUIDELINES_BUCKET || "erold-guide-content";
const WEBSITE_BUCKET = process.env.WEBSITE_BUCKET || "erold-website";
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || "E1JEAAW1UUUT5Z";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://erold.guide";
const AI_REVIEWER_FUNCTION = process.env.AI_REVIEWER_FUNCTION || "erold-ai-reviewer";
const ADMIN_USERS = (process.env.ADMIN_USERS || "").split(",").map(u => u.trim()).filter(Boolean);

// Check if user is admin
function isAdmin(user) {
  return ADMIN_USERS.includes(user.username);
}

// Generate markdown file content for a guideline
function generateMarkdownFile(framework, category, guideline, contributor) {
  const frontmatter = {
    title: guideline.title,
    slug: guideline.slug,
    framework: framework,
    category: category,
    version: guideline.version,
    difficulty: guideline.difficulty,
    tags: guideline.tags,
    description: guideline.description,
    contributor: {
      username: contributor.username,
      github: `https://github.com/${contributor.username}`,
      avatar: contributor.avatar,
    },
    publishedAt: new Date().toISOString(),
  };

  const yamlContent = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = Object.entries(value)
          .map(([k, v]) => `  ${k}: "${v}"`)
          .join('\n');
        return `${key}:\n${nested}`;
      } else if (Array.isArray(value)) {
        const items = value.map(v => `  - "${v}"`).join('\n');
        return `${key}:\n${items}`;
      } else {
        return `${key}: "${value}"`;
      }
    })
    .join('\n');

  return `---\n${yamlContent}\n---\n\n${guideline.content}`;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
  return markdown
    // Code blocks first (before other processing)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline">$1</a>')
    // Unordered lists
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-4">$&</ul>')
    // Paragraphs (double newlines)
    .replace(/\n\n(?!<)/g, '</p><p class="my-4">')
    // Single newlines to <br> in paragraphs
    .replace(/\n(?!<)/g, '<br>')
    // Wrap in paragraph if doesn't start with tag
    .replace(/^(?!<)/, '<p class="my-4">')
    .replace(/(?!>)$/, '</p>');
}

// Generate static HTML page for a guideline
function generateHtmlPage(framework, category, guideline, contributor) {
  const contentHtml = markdownToHtml(guideline.content);
  const tagsHtml = guideline.tags.map(t =>
    `<span class="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">${t}</span>`
  ).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${guideline.title} - erold.guide</title>
  <meta name="description" content="${guideline.description}">
  <meta property="og:title" content="${guideline.title}">
  <meta property="og:description" content="${guideline.description}">
  <meta property="og:type" content="article">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #12121a;
      --color-terminal-muted: #6b7280;
      --color-terminal-border: #1f2937;
    }
    body { background: var(--color-bg-primary); color: white; }
    pre { background: #1a1a2e; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'Monaco', 'Menlo', monospace; font-size: 0.875rem; }
    pre code { background: transparent; padding: 0; }
    code:not(pre code) { background: rgba(99, 102, 241, 0.2); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
  </style>
</head>
<body class="min-h-screen">
  <header class="border-b border-gray-800">
    <nav class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold text-white">erold.guide</a>
      <div class="flex items-center gap-6 text-sm text-gray-400">
        <a href="/frameworks" class="hover:text-white">Frameworks</a>
        <a href="/contribute" class="hover:text-white">Contribute</a>
      </div>
    </nav>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-12">
    <!-- Breadcrumb -->
    <nav class="text-sm text-gray-400 mb-6">
      <a href="/" class="hover:text-white">Home</a>
      <span class="mx-2">/</span>
      <a href="/frameworks/${framework}" class="hover:text-white capitalize">${framework}</a>
      <span class="mx-2">/</span>
      <span class="text-white">${category}</span>
    </nav>

    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-white mb-4">${guideline.title}</h1>
      <p class="text-lg text-gray-400 mb-4">${guideline.description}</p>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <span class="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 capitalize">${guideline.difficulty}</span>
        <span class="text-gray-500">v${guideline.version}</span>
        <div class="flex items-center gap-2">
          <img src="${contributor.avatar}" alt="${contributor.username}" class="w-5 h-5 rounded-full">
          <a href="https://github.com/${contributor.username}" class="text-gray-400 hover:text-white">${contributor.username}</a>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-4">${tagsHtml}</div>
    </header>

    <!-- Content -->
    <article class="prose prose-invert prose-lg max-w-none">
      ${contentHtml}
    </article>

    <!-- Footer -->
    <footer class="mt-16 pt-8 border-t border-gray-800">
      <div class="flex items-center justify-between text-sm text-gray-500">
        <span>Contributed by <a href="https://github.com/${contributor.username}" class="text-gray-400 hover:text-white">${contributor.username}</a></span>
        <a href="/contribute" class="text-indigo-400 hover:text-indigo-300">Suggest an edit</a>
      </div>
    </footer>
  </main>

  <footer class="border-t border-gray-800 mt-20">
    <div class="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
      <p>erold.guide - Open Encyclopedia of Development Guidelines</p>
    </div>
  </footer>
</body>
</html>`;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

// Response helpers
const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", ...corsHeaders },
  body: JSON.stringify(body),
});

const error = (statusCode, code, message, details = null) =>
  json(statusCode, { error: { code, message, ...(details && { details }) } });

// JWT helpers
function createJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token) {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Auth middleware
function getUser(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyJWT(auth.slice(7));
}

// GitHub OAuth
async function handleGitHubCallback(code) {
  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return error(400, "OAUTH_ERROR", tokenData.error_description);
  }

  // Get user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();

  // Store/update user in DynamoDB
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `USER#${user.id}`,
      sk: "PROFILE",
      gsi1pk: "USERS",
      gsi1sk: user.login,
      githubId: user.id,
      username: user.login,
      avatar: user.avatar_url,
      email: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));

  // Create JWT
  const jwt = createJWT({
    sub: user.id.toString(),
    username: user.login,
    avatar: user.avatar_url,
  });

  return json(200, { token: jwt, user: { username: user.login, avatar: user.avatar_url } });
}

// Validation
function validateGuideline(data) {
  const errors = [];

  if (!data.title || data.title.length < 5 || data.title.length > 100) {
    errors.push({ field: "title", message: "Must be 5-100 characters" });
  }
  if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push({ field: "slug", message: "Must be lowercase with hyphens only" });
  }
  if (!data.version || !/^\d+\.\d+\.\d+$/.test(data.version)) {
    errors.push({ field: "version", message: "Must be semver format (1.0.0)" });
  }
  if (!data.description || data.description.length < 20 || data.description.length > 300) {
    errors.push({ field: "description", message: "Must be 20-300 characters" });
  }
  if (!data.tags || !Array.isArray(data.tags) || data.tags.length < 1 || data.tags.length > 10) {
    errors.push({ field: "tags", message: "Must have 1-10 tags" });
  }
  if (!["beginner", "intermediate", "advanced"].includes(data.difficulty)) {
    errors.push({ field: "difficulty", message: "Must be beginner, intermediate, or advanced" });
  }
  if (!data.content || data.content.length < 100) {
    errors.push({ field: "content", message: "Content must be at least 100 characters" });
  }

  return errors;
}

// Contribution handlers
async function createContribution(user, body) {
  const { framework, category, guideline } = body;

  if (!framework || !category) {
    return error(400, "VALIDATION_ERROR", "Framework and category are required");
  }

  const validationErrors = validateGuideline(guideline);
  if (validationErrors.length > 0) {
    return error(400, "VALIDATION_ERROR", "Invalid guideline format", validationErrors);
  }

  // Check for duplicate slug
  const existing = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk AND gsi1sk = :sk",
    ExpressionAttributeValues: {
      ":pk": `FRAMEWORK#${framework}`,
      ":sk": `${category}#${guideline.slug}`,
    },
  }));

  if (existing.Items?.length > 0) {
    return error(409, "DUPLICATE_ERROR", "A guideline with this slug already exists");
  }

  const id = `contrib_${crypto.randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();

  // Store content in S3
  await s3UsEast1.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${id}/guideline.json`,
    Body: JSON.stringify({ framework, category, guideline }),
    ContentType: "application/json",
  }));

  // Store metadata in DynamoDB
  const item = {
    pk: `CONTRIB#${id}`,
    sk: "META",
    gsi1pk: `USER#${user.sub}`,
    gsi1sk: now,
    id,
    status: "pending",
    framework,
    category,
    slug: guideline.slug,
    title: guideline.title,
    contributor: {
      githubId: user.sub,
      username: user.username,
      avatar: user.avatar,
    },
    createdAt: now,
    updatedAt: now,
    review: null,
  };

  await dynamodb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  // Trigger AI review asynchronously (fire and forget)
  try {
    await lambda.send(new InvokeCommand({
      FunctionName: AI_REVIEWER_FUNCTION,
      InvocationType: "Event", // Async invocation
      Payload: JSON.stringify({ contributionId: id }),
    }));
    console.log(`AI review triggered for ${id}`);
  } catch (err) {
    // Don't fail the submission if AI review fails to trigger
    console.error(`Failed to trigger AI review for ${id}:`, err);
  }

  return json(201, {
    id,
    status: "pending",
    createdAt: now,
    contributor: item.contributor,
    framework,
    category,
    guideline: { title: guideline.title, slug: guideline.slug },
  });
}

async function getContribution(user, id) {
  const result = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!result.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  // Check ownership (unless admin - future feature)
  if (result.Item.contributor.githubId !== user.sub) {
    return error(403, "FORBIDDEN", "You can only view your own contributions");
  }

  // Get full content from S3
  const s3Result = await s3UsEast1.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${id}/guideline.json`,
  }));
  const content = JSON.parse(await s3Result.Body.transformToString());

  return json(200, { ...result.Item, guideline: content.guideline });
}

async function listContributions(user) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk",
    ExpressionAttributeValues: { ":pk": `USER#${user.sub}` },
    ScanIndexForward: false,
  }));

  return json(200, {
    contributions: result.Items?.map(item => ({
      id: item.id,
      status: item.status,
      framework: item.framework,
      category: item.category,
      title: item.title,
      slug: item.slug,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      review: item.review,
    })) || [],
  });
}

async function updateContribution(user, id, body) {
  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!existing.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  if (existing.Item.contributor.githubId !== user.sub) {
    return error(403, "FORBIDDEN", "You can only update your own contributions");
  }

  if (!["pending", "ai_needs_changes", "admin_needs_changes"].includes(existing.Item.status)) {
    return error(400, "INVALID_STATE", "Can only update pending or needs-changes contributions");
  }

  const { framework, category, guideline } = body;
  const validationErrors = validateGuideline(guideline);
  if (validationErrors.length > 0) {
    return error(400, "VALIDATION_ERROR", "Invalid guideline format", validationErrors);
  }

  // Update S3
  await s3UsEast1.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${id}/guideline.json`,
    Body: JSON.stringify({ framework, category, guideline }),
    ContentType: "application/json",
  }));

  // Update DynamoDB
  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
    UpdateExpression: "SET #status = :status, title = :title, slug = :slug, updatedAt = :now, review = :review, adminReview = :adminReview",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "pending",
      ":title": guideline.title,
      ":slug": guideline.slug,
      ":now": now,
      ":review": null, // Clear previous AI review
      ":adminReview": null, // Clear previous admin review
    },
  }));

  // Trigger AI review for updated contribution
  try {
    await lambda.send(new InvokeCommand({
      FunctionName: AI_REVIEWER_FUNCTION,
      InvocationType: "Event",
      Payload: JSON.stringify({ contributionId: id }),
    }));
    console.log(`AI review triggered for updated ${id}`);
  } catch (err) {
    console.error(`Failed to trigger AI review for ${id}:`, err);
  }

  return json(200, { id, status: "pending", updatedAt: now });
}

async function deleteContribution(user, id) {
  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!existing.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  if (existing.Item.contributor.githubId !== user.sub) {
    return error(403, "FORBIDDEN", "You can only withdraw your own contributions");
  }

  if (!["pending", "ai_needs_changes", "ai_approved"].includes(existing.Item.status)) {
    return error(400, "INVALID_STATE", "Cannot withdraw approved or rejected contributions");
  }

  // Update status to withdrawn
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
    UpdateExpression: "SET #status = :status, updatedAt = :now",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "withdrawn",
      ":now": new Date().toISOString(),
    },
  }));

  return json(200, { id, status: "withdrawn" });
}

// Admin handlers
async function adminListContributions(user, queryParams) {
  if (!isAdmin(user)) {
    return error(403, "FORBIDDEN", "Admin access required");
  }

  const status = queryParams?.status;

  // Scan all contributions (could optimize with GSI for status)
  const result = await dynamodb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: status
      ? "begins_with(pk, :prefix) AND #status = :status"
      : "begins_with(pk, :prefix)",
    ExpressionAttributeNames: status ? { "#status": "status" } : undefined,
    ExpressionAttributeValues: status
      ? { ":prefix": "CONTRIB#", ":status": status }
      : { ":prefix": "CONTRIB#" },
  }));

  const contributions = result.Items?.map(item => ({
    id: item.id,
    status: item.status,
    framework: item.framework,
    category: item.category,
    title: item.title,
    slug: item.slug,
    contributor: item.contributor,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    review: item.review,
  })) || [];

  // Sort by updatedAt descending
  contributions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return json(200, { contributions });
}

async function adminGetContribution(user, id) {
  if (!isAdmin(user)) {
    return error(403, "FORBIDDEN", "Admin access required");
  }

  const result = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!result.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  // Get full content from S3
  const s3Result = await s3UsEast1.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${id}/guideline.json`,
  }));
  const content = JSON.parse(await s3Result.Body.transformToString());

  return json(200, { ...result.Item, guideline: content.guideline });
}

async function adminApproveContribution(user, id, body) {
  if (!isAdmin(user)) {
    return error(403, "FORBIDDEN", "Admin access required");
  }

  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!existing.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  if (!["ai_approved", "pending", "ai_needs_changes"].includes(existing.Item.status)) {
    return error(400, "INVALID_STATE", "Can only approve pending or AI-reviewed contributions");
  }

  // Get the full content from S3
  const s3Result = await s3UsEast1.send(new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${id}/guideline.json`,
  }));
  const content = JSON.parse(await s3Result.Body.transformToString());
  const { framework, category, guideline } = content;

  // Generate markdown file
  const markdown = generateMarkdownFile(framework, category, guideline, existing.Item.contributor);
  const guidelinePath = `guidelines/${framework}/${category}/${guideline.slug}.md`;

  // Publish markdown to guidelines bucket (for content storage) - EU region
  await s3EuWest1.send(new PutObjectCommand({
    Bucket: GUIDELINES_BUCKET,
    Key: guidelinePath,
    Body: markdown,
    ContentType: "text/markdown",
    Metadata: {
      contributionId: id,
      contributor: existing.Item.contributor.username,
    },
  }));
  console.log(`Published markdown to ${guidelinePath}`);

  // Generate and publish static HTML page to website bucket
  const htmlContent = generateHtmlPage(framework, category, guideline, existing.Item.contributor);
  const htmlPath = `guidelines/${framework}/${category}/${guideline.slug}/index.html`;

  await s3UsEast1.send(new PutObjectCommand({
    Bucket: WEBSITE_BUCKET,
    Key: htmlPath,
    Body: htmlContent,
    ContentType: "text/html",
    CacheControl: "max-age=3600", // 1 hour cache
  }));
  console.log(`Published HTML to ${htmlPath}`);

  // Invalidate CloudFront cache for this page
  try {
    await cloudfront.send(new CreateInvalidationCommand({
      DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `${id}-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: [`/guidelines/${framework}/${category}/${guideline.slug}*`],
        },
      },
    }));
    console.log(`CloudFront invalidation created for /guidelines/${framework}/${category}/${guideline.slug}`);
  } catch (cfErr) {
    console.error('CloudFront invalidation failed (non-blocking):', cfErr.message);
  }

  // Update status in DynamoDB
  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
    UpdateExpression: "SET #status = :status, updatedAt = :now, approvedBy = :admin, approvedAt = :now, publishedPath = :path",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "approved",
      ":now": now,
      ":admin": { username: user.username, avatar: user.avatar },
      ":path": guidelinePath,
    },
  }));

  // Also create an index entry for the guideline (for GSI lookup)
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `GUIDELINE#${framework}#${category}#${guideline.slug}`,
      sk: "META",
      gsi1pk: `FRAMEWORK#${framework}`,
      gsi1sk: `${category}#${guideline.slug}`,
      contributionId: id,
      framework,
      category,
      slug: guideline.slug,
      title: guideline.title,
      description: guideline.description,
      version: guideline.version,
      difficulty: guideline.difficulty,
      tags: guideline.tags,
      contributor: existing.Item.contributor,
      publishedAt: now,
      publishedPath: guidelinePath,
    },
  }));

  return json(200, {
    id,
    status: "approved",
    approvedAt: now,
    publishedPath: guidelinePath,
    guidelineUrl: `https://erold.guide/guidelines/${framework}/${category}/${guideline.slug}`,
  });
}

async function adminRejectContribution(user, id, body) {
  if (!isAdmin(user)) {
    return error(403, "FORBIDDEN", "Admin access required");
  }

  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!existing.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  if (["approved", "rejected", "withdrawn"].includes(existing.Item.status)) {
    return error(400, "INVALID_STATE", "Cannot reject already finalized contributions");
  }

  const { reason } = body || {};
  const now = new Date().toISOString();

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
    UpdateExpression: "SET #status = :status, updatedAt = :now, rejectedBy = :admin, rejectedAt = :now, rejectionReason = :reason",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "rejected",
      ":now": now,
      ":admin": { username: user.username, avatar: user.avatar },
      ":reason": reason || "Does not meet quality standards",
    },
  }));

  return json(200, { id, status: "rejected", rejectedAt: now });
}

async function adminRequestChanges(user, id, body) {
  if (!isAdmin(user)) {
    return error(403, "FORBIDDEN", "Admin access required");
  }

  const existing = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
  }));

  if (!existing.Item) {
    return error(404, "NOT_FOUND", "Contribution not found");
  }

  if (["approved", "rejected", "withdrawn"].includes(existing.Item.status)) {
    return error(400, "INVALID_STATE", "Cannot request changes for finalized contributions");
  }

  const { feedback } = body || {};
  if (!feedback) {
    return error(400, "VALIDATION_ERROR", "Feedback is required when requesting changes");
  }

  const now = new Date().toISOString();
  const adminReview = {
    feedback,
    requestedBy: { username: user.username, avatar: user.avatar },
    requestedAt: now,
  };

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: `CONTRIB#${id}`, sk: "META" },
    UpdateExpression: "SET #status = :status, updatedAt = :now, adminReview = :review",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "admin_needs_changes",
      ":now": now,
      ":review": adminReview,
    },
  }));

  return json(200, { id, status: "admin_needs_changes", adminReview });
}

// Main handler
export const handler = async (event) => {
  // HTTP API v2 uses different property names
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  let path = event.rawPath || event.path;
  const queryStringParameters = event.queryStringParameters;
  const body = event.body;

  // Strip stage prefix from path (e.g., /prod/auth/github -> /auth/github)
  const stage = event.requestContext?.stage;
  if (stage && path.startsWith(`/${stage}`)) {
    path = path.slice(stage.length + 1) || "/";
  }

  // Handle CORS preflight
  if (httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  try {
    // Auth routes (no auth required)
    if (path === "/auth/github/callback" && httpMethod === "GET") {
      const code = queryStringParameters?.code;
      if (!code) return error(400, "MISSING_CODE", "Authorization code required");
      return await handleGitHubCallback(code);
    }

    if (path === "/auth/github" && httpMethod === "GET") {
      const redirectUri = `${ALLOWED_ORIGIN}/auth/callback`;
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
      return {
        statusCode: 302,
        headers: { Location: githubUrl, ...corsHeaders },
      };
    }

    // Protected routes - require auth
    const user = getUser(event);
    if (!user) {
      return error(401, "UNAUTHORIZED", "Authentication required");
    }

    // Contribution routes
    if (path === "/v1/contributions" && httpMethod === "POST") {
      return await createContribution(user, JSON.parse(body));
    }

    if (path === "/v1/contributions" && httpMethod === "GET") {
      return await listContributions(user);
    }

    const contribMatch = path.match(/^\/v1\/contributions\/([^/]+)$/);
    if (contribMatch) {
      const id = contribMatch[1];
      if (httpMethod === "GET") return await getContribution(user, id);
      if (httpMethod === "PUT") return await updateContribution(user, id, JSON.parse(body));
      if (httpMethod === "DELETE") return await deleteContribution(user, id);
    }

    // Admin routes
    if (path === "/v1/admin/contributions" && httpMethod === "GET") {
      return await adminListContributions(user, queryStringParameters);
    }

    const adminContribMatch = path.match(/^\/v1\/admin\/contributions\/([^/]+)$/);
    if (adminContribMatch) {
      const id = adminContribMatch[1];
      if (httpMethod === "GET") return await adminGetContribution(user, id);
    }

    const adminApproveMatch = path.match(/^\/v1\/admin\/contributions\/([^/]+)\/approve$/);
    if (adminApproveMatch && httpMethod === "POST") {
      return await adminApproveContribution(user, adminApproveMatch[1], body ? JSON.parse(body) : {});
    }

    const adminRejectMatch = path.match(/^\/v1\/admin\/contributions\/([^/]+)\/reject$/);
    if (adminRejectMatch && httpMethod === "POST") {
      return await adminRejectContribution(user, adminRejectMatch[1], body ? JSON.parse(body) : {});
    }

    const adminChangesMatch = path.match(/^\/v1\/admin\/contributions\/([^/]+)\/request-changes$/);
    if (adminChangesMatch && httpMethod === "POST") {
      return await adminRequestChanges(user, adminChangesMatch[1], body ? JSON.parse(body) : {});
    }

    // Check if current user is admin
    if (path === "/v1/admin/me" && httpMethod === "GET") {
      return json(200, { isAdmin: isAdmin(user), username: user.username });
    }

    return error(404, "NOT_FOUND", "Route not found");

  } catch (err) {
    console.error("Handler error:", err);
    return error(500, "INTERNAL_ERROR", "An internal error occurred");
  }
};
