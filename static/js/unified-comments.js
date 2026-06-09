/**
 * Unified Comments - a Bluesky + Mastodon powered comments component
 *
 * Forked from sequoia-comments (https://tangled.org/stevedylan.dev/sequoia)
 * and extended to merge Fediverse replies into the same timeline.
 *
 * A self-contained Web Component that displays comments from a Bluesky post
 * (linked to documents via the AT Protocol) and a Mastodon status, interleaved
 * chronologically with a small network icon on each comment.
 *
 * Usage:
 *   <unified-comments mastodon-url="https://social.lol/@user/123456"></unified-comments>
 *
 * The component looks for a Bluesky post in three places (first wins):
 *   1. The `post-uri` attribute on the element
 *   2. The `document-uri` attribute on the element
 *   3. A <link rel="site.standard.document" href="at://..."> tag in the document head
 * If none resolve to a post, the Bluesky source is simply absent — Mastodon
 * comments still render, and vice versa.
 *
 * Custom reply button:
 *   Place any element with slot="reply-button" to replace the default buttons.
 *   It stays in the light DOM, so your page CSS applies to it normally.
 *
 * Attributes:
 *   - post-uri: Bluesky post as AT-URI (at://...) or bsky.app URL — skips PDS document lookup
 *   - document-uri: AT Protocol URI for the document (optional if link tag exists)
 *   - mastodon-url: URL of a Mastodon status whose replies should be shown
 *   - depth: Maximum depth of nested Bluesky replies to fetch (default: 6)
 *   - hide: Set to "auto" to hide if no comment source is detected
 *   - avatars: Set to "false" to hide commenter avatars (default: shown)
 *
 * CSS Custom Properties:
 *   - --sequoia-fg-color: Text color (default: #1f2937)
 *   - --sequoia-bg-alt: Nameplate background (default: faint translucent black)
 *   - --sequoia-border-color: Border color (default: #e5e7eb)
 *   - --sequoia-accent-color: Accent/link color (default: #2563eb)
 *   - --sequoia-secondary-color: Secondary text color (default: #6b7280)
 *   - --sequoia-error-color: Error/warning text color (default: #dc2626)
 *   - --sequoia-font-family: Font family (default: system-ui stack)
 *   - --sequoia-border-radius: Border radius (default: 8px)
 */

// ============================================================================
// Styles
// ============================================================================

const styles = `
:host {
	display: block;
	font-family: var(--sequoia-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
	color: var(--sequoia-fg-color, #1f2937);
	line-height: 1.5;
}

* {
	box-sizing: border-box;
}

.sequoia-comments-container {
	max-width: 100%;
}

.sequoia-loading,
.sequoia-error,
.sequoia-empty,
.sequoia-warning {
	font-style: italic;
	color: var(--sequoia-secondary-color, #6b7280);
}

.sequoia-loading-spinner {
	display: inline-block;
	width: 1.25rem;
	height: 1.25rem;
	border: 2px solid var(--sequoia-border-color, #e5e7eb);
	border-top-color: var(--sequoia-accent-color, #2563eb);
	border-radius: 50%;
	animation: sequoia-spin 0.8s linear infinite;
	margin-right: 0.5rem;
	vertical-align: middle;
}

@keyframes sequoia-spin {
	to { transform: rotate(360deg); }
}

.sequoia-error,
.sequoia-warning {
	color: var(--sequoia-error-color, #dc2626);
}

.sequoia-comments-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
}

.sequoia-comments-title {
	font-size: 0.875rem;
	font-weight: 700;
	margin: 0;
}

.sequoia-reply-button {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.375rem;
	border: none;
	background: none;
	font-size: 0.875rem;
	color: var(--sequoia-secondary-color, #6b7280);
	cursor: pointer;
	text-decoration: none;
	transition: color 0.15s ease;
	margin-left: 0.5rem;
}

.sequoia-reply-button:hover {
	color: var(--sequoia-accent-color, #2563eb);
}

.sequoia-reply-button svg {
	width: 1rem;
	height: 1rem;
}

.sequoia-comments-list {
	display: flex;
	flex-direction: column;
}

.sequoia-thread {
	margin-bottom: 1.5rem;
}

.sequoia-comment {
	margin-top: 1rem;
}

/* jwz-style nameplate: avatar attached to a bordered box holding the
   author line and the meta line; the comment text runs full-width below */
.sequoia-comment-plate {
	display: flex;
	align-items: stretch;
}

.sequoia-comment-avatar {
	width: 3.25em;
	border: 1px solid var(--sequoia-border-color, #e5e7eb);
	border-right: 0;
	background: var(--sequoia-border-color, #e5e7eb);
	object-fit: cover;
	flex-shrink: 0;
}

.sequoia-comment-avatar-placeholder {
	width: 3.25em;
	border: 1px solid var(--sequoia-border-color, #e5e7eb);
	border-right: 0;
	background: var(--sequoia-border-color, #e5e7eb);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	color: var(--sequoia-secondary-color, #6b7280);
	font-weight: 600;
	font-size: 1rem;
}

.sequoia-comment-plate-box {
	flex: 1;
	min-width: 0;
	border: 1px solid var(--sequoia-border-color, #e5e7eb);
	background: var(--sequoia-bg-alt, rgba(0, 0, 0, 0.03));
	padding: 0.3em 0.75em;
}

.sequoia-comment--owner .sequoia-comment-plate-box,
.sequoia-comment--owner .sequoia-comment-avatar,
.sequoia-comment--owner .sequoia-comment-avatar-placeholder {
	border-color: var(--sequoia-accent-color, #2563eb);
}

.sequoia-comment--owner .sequoia-comment-plate-box {
	background: color-mix(in srgb, var(--sequoia-accent-color, #2563eb) 8%, transparent);
}

.sequoia-comment-author-line {
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
	min-width: 0;
}

.sequoia-comment-meta-line {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.5rem;
	font-size: 0.875rem;
	color: var(--sequoia-secondary-color, #6b7280);
}

.sequoia-comment-via {
	opacity: 0.75;
	white-space: nowrap;
}

/* jwz-style reply nesting: dashed guide line that curves away at the bottom */
.sequoia-comment-children {
	margin: 0 0 1rem 1.5rem;
	padding-left: 1rem;
	border-left: 1px dashed var(--sequoia-border-color, #e5e7eb);
	border-bottom-left-radius: 6em;
}

@media (max-width: 40rem) {
	.sequoia-comment-children {
		margin-left: 0.5rem;
		padding-left: 0.75rem;
	}
}

.sequoia-comment-author {
	font-weight: 700;
	color: var(--sequoia-fg-color, #1f2937);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sequoia-comment-author:hover {
	color: var(--sequoia-accent-color, #2563eb);
}

.sequoia-comment-handle {
	font-size: 0.875rem;
	color: var(--sequoia-secondary-color, #6b7280);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sequoia-comment-time {
	flex-shrink: 0;
}

.sequoia-comment-text {
	margin: 0.5rem 0 0;
	white-space: pre-wrap;
	word-wrap: break-word;
}

.sequoia-comment-text--html {
	white-space: normal;
}

.sequoia-comment-text--html p {
	margin: 0 0 0.5em;
}

.sequoia-comment-text--html p:last-child {
	margin-bottom: 0;
}

.sequoia-comment-text a {
	color: var(--sequoia-accent-color, #2563eb);
	text-decoration: none;
}

.sequoia-comment-text a:hover {
	text-decoration: underline;
}

.sequoia-custom-emoji {
	height: 1.2em;
	vertical-align: text-bottom;
}

.sequoia-network-icon {
	width: 0.9em;
	height: 0.9em;
	vertical-align: -0.1em;
	margin-right: 0.25em;
}

.sequoia-bsky-logo {
	width: 1rem;
	height: 1rem;
}

.sequoia-quotes-section {
	margin-top: 1.75rem;
}

.sequoia-quotes-header {
	font-size: 0.875rem;
	font-weight: 700;
	margin: 0;
}

a.sequoia-comment-time {
	text-decoration: none;
	color: var(--sequoia-secondary-color, #6b7280);
}

a.sequoia-comment-time:hover {
	text-decoration: underline;
}
`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a relative time string (e.g., "2 hours ago")
 * @param {string|Date} dateInput - ISO date string or Date
 * @returns {string} Formatted relative time
 */
function formatRelativeTime(dateInput) {
	const date = new Date(dateInput);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffSeconds < 60) {
		return "just now";
	}
	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	}
	if (diffHours < 24) {
		return `${diffHours}h ago`;
	}
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}
	if (diffWeeks < 4) {
		return `${diffWeeks}w ago`;
	}
	if (diffMonths < 12) {
		return `${diffMonths}mo ago`;
	}
	return `${diffYears}y ago`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Convert post text with facets to HTML
 * @param {string} text - Post text
 * @param {Array<{index: {byteStart: number, byteEnd: number}, features: Array<{$type: string, uri?: string, did?: string, tag?: string}>}>} [facets] - Rich text facets
 * @returns {string} HTML string with links
 */
function renderTextWithFacets(text, facets) {
	if (!facets || facets.length === 0) {
		return escapeHtml(text);
	}

	// Convert text to bytes for proper indexing
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const textBytes = encoder.encode(text);

	// Sort facets by start index
	const sortedFacets = [...facets].sort(
		(a, b) => a.index.byteStart - b.index.byteStart,
	);

	let result = "";
	let lastEnd = 0;

	for (const facet of sortedFacets) {
		const { byteStart, byteEnd } = facet.index;

		// Add text before this facet
		if (byteStart > lastEnd) {
			const beforeBytes = textBytes.slice(lastEnd, byteStart);
			result += escapeHtml(decoder.decode(beforeBytes));
		}

		// Get the facet text
		const facetBytes = textBytes.slice(byteStart, byteEnd);
		const facetText = decoder.decode(facetBytes);

		// Find the first renderable feature
		const feature = facet.features[0];
		if (feature) {
			if (feature.$type === "app.bsky.richtext.facet#link") {
				result += `<a href="${escapeHtml(feature.uri)}" target="_blank" rel="noopener noreferrer">${escapeHtml(facetText)}</a>`;
			} else if (feature.$type === "app.bsky.richtext.facet#mention") {
				result += `<a href="https://bsky.app/profile/${escapeHtml(feature.did)}" target="_blank" rel="noopener noreferrer">${escapeHtml(facetText)}</a>`;
			} else if (feature.$type === "app.bsky.richtext.facet#tag") {
				result += `<a href="https://bsky.app/hashtag/${escapeHtml(feature.tag)}" target="_blank" rel="noopener noreferrer">${escapeHtml(facetText)}</a>`;
			} else {
				result += escapeHtml(facetText);
			}
		} else {
			result += escapeHtml(facetText);
		}

		lastEnd = byteEnd;
	}

	// Add remaining text
	if (lastEnd < textBytes.length) {
		const remainingBytes = textBytes.slice(lastEnd);
		result += escapeHtml(decoder.decode(remainingBytes));
	}

	return result;
}

/**
 * Get initials from a name for avatar placeholder
 * @param {string} name - Display name
 * @returns {string} Initials (1-2 characters)
 */
function getInitials(name) {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}
	return name.substring(0, 2).toUpperCase();
}

// ============================================================================
// Normalized comment shape
// ============================================================================

/**
 * @typedef {Object} Comment
 * @property {"bluesky"|"mastodon"} network
 * @property {string} id - Network-native identifier (Bluesky: AT-URI, Mastodon: status id)
 * @property {string} authorId - Network-native author id (Bluesky: DID, Mastodon: account id)
 * @property {boolean} isOwner - true when the comment is by the thread's author (the blogger)
 * @property {{name: string, nameHtml: string, handle: string, avatarUrl: string|null, profileUrl: string}} author
 * @property {string} html - Pre-rendered, safe HTML for the comment body
 * @property {boolean} isRichHtml - true for Mastodon block HTML, false for Bluesky inline text
 * @property {Date} timestamp
 * @property {string} permalink - URL of the original post on its network
 * @property {Comment[]} children
 */

/**
 * Flag every comment authored by the thread owner
 * @param {Comment[]} comments
 * @param {string|null} ownerId
 */
function markOwnerComments(comments, ownerId) {
	if (!ownerId) return;
	for (const comment of comments) {
		comment.isOwner = comment.authorId === ownerId;
		markOwnerComments(comment.children, ownerId);
	}
}

/**
 * Recursively sort comment trees chronologically, oldest first
 * @param {Comment[]} comments
 * @returns {Comment[]} The same array, sorted in place
 */
function sortCommentTree(comments) {
	comments.sort((a, b) => a.timestamp - b.timestamp);
	for (const comment of comments) {
		sortCommentTree(comment.children);
	}
	return comments;
}

// ============================================================================
// AT Protocol Client Functions
// ============================================================================

/**
 * Parse an AT URI into its components
 * Format: at://did/collection/rkey
 * @param {string} atUri - AT Protocol URI
 * @returns {{did: string, collection: string, rkey: string} | null} Parsed components or null
 */
function parseAtUri(atUri) {
	const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
	if (!match) return null;
	return {
		did: match[1],
		collection: match[2],
		rkey: match[3],
	};
}

/**
 * Resolve a DID to its PDS URL
 * Supports did:plc and did:web methods
 * @param {string} did - Decentralized Identifier
 * @returns {Promise<string>} PDS URL
 */
async function resolvePDS(did) {
	let pdsUrl;

	if (did.startsWith("did:plc:")) {
		// Fetch DID document from plc.directory
		const didDocUrl = `https://plc.directory/${did}`;
		const didDocResponse = await fetch(didDocUrl);
		if (!didDocResponse.ok) {
			throw new Error(`Could not fetch DID document: ${didDocResponse.status}`);
		}
		const didDoc = await didDocResponse.json();

		// Find the PDS service endpoint
		const pdsService = didDoc.service?.find(
			(s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer",
		);
		pdsUrl = pdsService?.serviceEndpoint;
	} else if (did.startsWith("did:web:")) {
		// For did:web, fetch the DID document from the domain
		const domain = did.replace("did:web:", "");
		const didDocUrl = `https://${domain}/.well-known/did.json`;
		const didDocResponse = await fetch(didDocUrl);
		if (!didDocResponse.ok) {
			throw new Error(`Could not fetch DID document: ${didDocResponse.status}`);
		}
		const didDoc = await didDocResponse.json();

		const pdsService = didDoc.service?.find(
			(s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer",
		);
		pdsUrl = pdsService?.serviceEndpoint;
	} else {
		throw new Error(`Unsupported DID method: ${did}`);
	}

	if (!pdsUrl) {
		throw new Error("Could not find PDS URL for user");
	}

	return pdsUrl;
}

/**
 * Fetch a record from a PDS using the public API
 * @param {string} did - DID of the repository owner
 * @param {string} collection - Collection name
 * @param {string} rkey - Record key
 * @returns {Promise<any>} Record value
 */
async function getRecord(did, collection, rkey) {
	const pdsUrl = await resolvePDS(did);

	const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.getRecord`);
	url.searchParams.set("repo", did);
	url.searchParams.set("collection", collection);
	url.searchParams.set("rkey", rkey);

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Failed to fetch record: ${response.status}`);
	}

	const data = await response.json();
	return data.value;
}

/**
 * Fetch a document record from its AT URI
 * @param {string} atUri - AT Protocol URI for the document
 * @returns {Promise<{$type: string, title: string, site: string, path: string, textContent: string, publishedAt: string, canonicalUrl?: string, description?: string, tags?: string[], bskyPostRef?: {uri: string, cid: string}}>} Document record
 */
async function getDocument(atUri) {
	const parsed = parseAtUri(atUri);
	if (!parsed) {
		throw new Error(`Invalid AT URI: ${atUri}`);
	}

	return getRecord(parsed.did, parsed.collection, parsed.rkey);
}

/**
 * Fetch a post thread from the public Bluesky API
 * @param {string} postUri - AT Protocol URI for the post
 * @param {number} [depth=6] - Maximum depth of replies to fetch
 * @returns {Promise<ThreadViewPost>} Thread view post
 */
async function getPostThread(postUri, depth = 6) {
	const url = new URL(
		"https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread",
	);
	url.searchParams.set("uri", postUri);
	url.searchParams.set("depth", depth.toString());

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Failed to fetch post thread: ${response.status}`);
	}

	const data = await response.json();

	if (data.thread.$type !== "app.bsky.feed.defs#threadViewPost") {
		throw new Error("Post not found or blocked");
	}

	return data.thread;
}

/**
 * Build a Bluesky app URL for a post
 * @param {string} postUri - AT Protocol URI for the post
 * @returns {string} Bluesky app URL
 */
function buildBskyAppUrl(postUri) {
	const parsed = parseAtUri(postUri);
	if (!parsed) {
		throw new Error(`Invalid post URI: ${postUri}`);
	}

	return `https://bsky.app/profile/${parsed.did}/post/${parsed.rkey}`;
}

/**
 * Build a Blacksky app URL for a post
 * @param {string} postUri - AT Protocol URI for the post
 * @returns {string} Blacksky app URL
 */
function buildBlackskyAppUrl(postUri) {
	const parsed = parseAtUri(postUri);
	if (!parsed) {
		throw new Error(`Invalid post URI: ${postUri}`);
	}

	return `https://blacksky.community/profile/${parsed.did}/post/${parsed.rkey}`;
}

/**
 * Type guard for ThreadViewPost
 * @param {any} post - Post to check
 * @returns {boolean} True if post is a ThreadViewPost
 */
function isThreadViewPost(post) {
	return post?.$type === "app.bsky.feed.defs#threadViewPost";
}

/**
 * Normalise a user-supplied post reference to an AT-URI.
 * Accepts:
 *   - AT-URIs as-is:          at://did:plc:.../app.bsky.feed.post/rkey
 *   - bsky.app post URLs:     https://bsky.app/profile/<handle-or-did>/post/<rkey>
 * When the profile segment is already a DID no network request is made.
 * @param {string} uriOrUrl
 * @returns {Promise<string>} AT-URI
 */
async function resolvePostUri(uriOrUrl) {
	if (uriOrUrl.startsWith("at://")) return uriOrUrl;

	const match = uriOrUrl.match(
		/bsky\.app\/profile\/([^/?#]+)\/post\/([^/?#]+)/,
	);
	if (!match) throw new Error(`Cannot parse Bluesky URL: ${uriOrUrl}`);

	const [, handleOrDid, rkey] = match;

	let did = handleOrDid;
	if (!handleOrDid.startsWith("did:")) {
		const url = new URL(
			"https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle",
		);
		url.searchParams.set("handle", handleOrDid);
		const response = await fetch(url.toString());
		if (!response.ok)
			throw new Error(`Failed to resolve handle: ${response.status}`);
		did = (await response.json()).did;
	}

	return `at://${did}/app.bsky.feed.post/${rkey}`;
}

/**
 * Fetch all quote posts for a given post URI, paginating through all results.
 * Uses the public Bluesky AppView — gaps are expected for posts from
 * less-connected PDS instances.
 * @param {string} postUri - AT Protocol URI for the post
 * @returns {Promise<Array>} Array of PostView objects
 */
async function getQuotes(postUri) {
	const quotes = [];
	let cursor;

	do {
		const url = new URL(
			"https://public.api.bsky.app/xrpc/app.bsky.feed.getQuotes",
		);
		url.searchParams.set("uri", postUri);
		url.searchParams.set("limit", "100");
		if (cursor) url.searchParams.set("cursor", cursor);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`Failed to fetch quotes: ${response.status}`);
		}

		const data = await response.json();
		quotes.push(...(data.posts ?? []));
		cursor = data.cursor;
	} while (cursor);

	return quotes;
}

// ============================================================================
// Bluesky Adapter
// ============================================================================

/**
 * Map a Bluesky PostView to the normalized comment shape
 * @param {any} post - PostView object
 * @returns {Comment}
 */
function normalizeBskyPost(post) {
	const author = post.author;
	const displayName = author.displayName || author.handle;
	return {
		network: "bluesky",
		id: post.uri,
		authorId: author.did,
		isOwner: false,
		author: {
			name: displayName,
			nameHtml: escapeHtml(displayName),
			handle: author.handle,
			avatarUrl: author.avatar ?? null,
			profileUrl: `https://bsky.app/profile/${author.did}`,
		},
		html: renderTextWithFacets(post.record.text, post.record.facets),
		isRichHtml: false,
		timestamp: new Date(post.record.createdAt),
		permalink: buildBskyAppUrl(post.uri),
		children: [],
	};
}

/**
 * Recursively map a ThreadViewPost subtree to a normalized comment tree
 * @param {any} thread - ThreadViewPost
 * @returns {Comment}
 */
function normalizeBskyThread(thread) {
	const comment = normalizeBskyPost(thread.post);
	comment.children = (thread.replies?.filter(isThreadViewPost) ?? []).map(
		normalizeBskyThread,
	);
	return comment;
}

/**
 * Fetch the post author's own replies belonging to a thread, via their author
 * feed. The AppView can filter an author's replies out of unauthenticated
 * thread views (e.g. while the account carries a moderation label like
 * needs-review), but the author feed still returns them.
 * @param {string} did - Author DID
 * @param {string} postUri - AT-URI of the thread root
 * @param {string} [rootCreatedAt] - Root post timestamp, used to stop paging
 * @returns {Promise<Array>} PostView objects that reply into this thread
 */
async function getAuthorThreadReplies(did, postUri, rootCreatedAt, maxPages = 5) {
	const replies = [];
	let cursor;

	for (let page = 0; page < maxPages; page++) {
		const url = new URL(
			"https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed",
		);
		url.searchParams.set("actor", did);
		url.searchParams.set("filter", "posts_with_replies");
		url.searchParams.set("limit", "100");
		if (cursor) url.searchParams.set("cursor", cursor);

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`Failed to fetch author feed: ${response.status}`);
		}

		const data = await response.json();
		const items = data.feed ?? [];

		for (const item of items) {
			if (item.reason) continue; // skip reposts
			const post = item.post;
			if (
				post.author?.did === did &&
				post.record?.reply?.root?.uri === postUri
			) {
				replies.push(post);
			}
		}

		cursor = data.cursor;
		if (!cursor || items.length === 0) break;

		// Replies cannot predate the post they're under: once a feed page is
		// entirely older than the root post, stop paging.
		const oldest = items[items.length - 1]?.post?.record?.createdAt;
		if (
			rootCreatedAt &&
			oldest &&
			new Date(oldest) < new Date(rootCreatedAt)
		) {
			break;
		}
	}

	return replies;
}

/**
 * Merge a thread view's replies into an existing comment's children,
 * skipping nodes already present in the tree.
 * @param {Comment} comment - Comment to attach children to
 * @param {any} threadView - ThreadViewPost anchored at that comment's post
 * @param {Map<string, Comment>} byUri - Index of every comment in the tree
 */
function attachSubtree(comment, threadView, byUri) {
	for (const replyView of threadView.replies?.filter(isThreadViewPost) ?? []) {
		const uri = replyView.post.uri;
		let child = byUri.get(uri);
		if (!child) {
			child = normalizeBskyPost(replyView.post);
			byUri.set(uri, child);
			comment.children.push(child);
		}
		attachSubtree(child, replyView, byUri);
	}
}

// ============================================================================
// Mastodon Adapter
// ============================================================================

/**
 * Parse a Mastodon status URL into instance origin and status ID.
 * Accepts the common URL shapes:
 *   https://instance/@user/<id>
 *   https://instance/@user@otherhost/<id>
 *   https://instance/users/<user>/statuses/<id>
 * @param {string} url
 * @returns {{origin: string, statusId: string} | null}
 */
function parseMastodonUrl(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const segments = parsed.pathname.split("/").filter(Boolean);
	const last = segments[segments.length - 1];
	if (!last || !/^\d+$/.test(last)) return null;
	return { origin: parsed.origin, statusId: last };
}

/**
 * Fetch the reply context for a status from the public Mastodon API
 * @param {string} origin - Instance origin (https://instance)
 * @param {string} statusId
 * @returns {Promise<{ancestors: Array, descendants: Array}>}
 */
async function getMastodonContext(origin, statusId) {
	const response = await fetch(`${origin}/api/v1/statuses/${statusId}/context`);
	if (!response.ok) {
		throw new Error(`Failed to fetch Mastodon replies: ${response.status}`);
	}
	return response.json();
}

const MASTODON_ALLOWED_TAGS = new Set([
	"P",
	"BR",
	"A",
	"SPAN",
	"EM",
	"STRONG",
	"I",
	"B",
	"U",
	"DEL",
	"S",
	"CODE",
	"PRE",
	"BLOCKQUOTE",
	"UL",
	"OL",
	"LI",
]);

const MASTODON_DROPPED_TAGS = new Set([
	"SCRIPT",
	"STYLE",
	"IFRAME",
	"OBJECT",
	"EMBED",
]);

/**
 * Sanitize a subtree in place: drop dangerous elements, unwrap unknown ones,
 * strip every attribute except a safe http(s) href on anchors.
 * @param {Node} node
 */
function sanitizeNode(node) {
	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) continue;
		if (child.nodeType !== Node.ELEMENT_NODE) {
			child.remove();
			continue;
		}
		if (MASTODON_DROPPED_TAGS.has(child.tagName)) {
			child.remove();
			continue;
		}

		sanitizeNode(child);

		if (!MASTODON_ALLOWED_TAGS.has(child.tagName)) {
			child.replaceWith(...child.childNodes);
			continue;
		}

		let href = null;
		if (child.tagName === "A") {
			try {
				const hrefUrl = new URL(child.getAttribute("href") ?? "");
				if (hrefUrl.protocol === "http:" || hrefUrl.protocol === "https:") {
					href = hrefUrl.href;
				}
			} catch {
				// relative or malformed URL — drop it
			}
		}
		for (const attr of Array.from(child.attributes)) {
			child.removeAttribute(attr.name);
		}
		if (href) {
			child.setAttribute("href", href);
			child.setAttribute("target", "_blank");
			child.setAttribute("rel", "noopener noreferrer nofollow");
		}
	}
}

/**
 * Replace :shortcode: occurrences in text nodes with custom emoji images
 * @param {Node} root
 * @param {Array<{shortcode: string, url: string, static_url?: string}>} emojis
 */
function applyCustomEmojis(root, emojis) {
	const byShortcode = new Map(emojis.map((e) => [e.shortcode, e]));
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const textNodes = [];
	while (walker.nextNode()) textNodes.push(walker.currentNode);

	for (const node of textNodes) {
		// Capture-group split alternates plain text and shortcode candidates
		const parts = node.textContent.split(/:([a-zA-Z0-9_]+):/g);
		if (parts.length === 1) continue;

		const fragment = document.createDocumentFragment();
		let replaced = false;
		parts.forEach((part, i) => {
			if (i % 2 === 1 && byShortcode.has(part)) {
				const emoji = byShortcode.get(part);
				const img = document.createElement("img");
				img.className = "sequoia-custom-emoji";
				img.src = emoji.static_url || emoji.url;
				img.alt = `:${part}:`;
				fragment.appendChild(img);
				replaced = true;
			} else if (i % 2 === 1) {
				fragment.appendChild(document.createTextNode(`:${part}:`));
			} else if (part) {
				fragment.appendChild(document.createTextNode(part));
			}
		});
		if (replaced) node.replaceWith(fragment);
	}
}

/**
 * Sanitize Mastodon status HTML and render custom emojis.
 * Mastodon sanitizes server-side, but content crosses instance boundaries —
 * a small allowlist pass keeps this component safe on any instance.
 * @param {string} html - status.content
 * @param {Array} [emojis] - status.emojis
 * @returns {string} Safe HTML
 */
function sanitizeMastodonHtml(html, emojis) {
	const doc = new DOMParser().parseFromString(html, "text/html");
	sanitizeNode(doc.body);
	if (emojis?.length) {
		applyCustomEmojis(doc.body, emojis);
	}
	return doc.body.innerHTML;
}

/**
 * Escape a display name and render its custom emojis
 * @param {string} name
 * @param {Array} [emojis] - account.emojis
 * @returns {string} Safe HTML
 */
function renderNameWithEmojis(name, emojis) {
	let html = escapeHtml(name);
	for (const emoji of emojis ?? []) {
		const src = escapeHtml(emoji.static_url || emoji.url);
		html = html.replaceAll(
			`:${emoji.shortcode}:`,
			`<img class="sequoia-custom-emoji" src="${src}" alt=":${escapeHtml(emoji.shortcode)}:">`,
		);
	}
	return html;
}

/**
 * Map a Mastodon status to the normalized comment shape
 * @param {any} status
 * @returns {Comment}
 */
function normalizeMastodonStatus(status) {
	const account = status.account;
	const name = account.display_name || account.username;
	return {
		network: "mastodon",
		id: status.id,
		authorId: account.id,
		isOwner: false,
		author: {
			name,
			nameHtml: renderNameWithEmojis(name, account.emojis),
			handle: account.acct,
			avatarUrl: account.avatar ?? null,
			profileUrl: account.url,
		},
		html: sanitizeMastodonHtml(status.content, status.emojis),
		isRichHtml: true,
		timestamp: new Date(status.created_at),
		permalink: status.url ?? status.uri,
		children: [],
	};
}

/**
 * Build comment trees from the flat descendants list of a context response.
 * Replies whose parent is the root status — or whose parent is missing from
 * the list (deleted/filtered) — become top-level threads.
 * @param {Array} descendants - Flat list of statuses with in_reply_to_id
 * @param {string} rootId - ID of the root status
 * @returns {Comment[]} Top-level comment trees
 */
function buildMastodonThreads(descendants, rootId) {
	const byId = new Map();
	for (const status of descendants) {
		byId.set(status.id, {
			comment: normalizeMastodonStatus(status),
			inReplyTo: status.in_reply_to_id,
		});
	}

	const topLevel = [];
	for (const { comment, inReplyTo } of byId.values()) {
		const parent =
			inReplyTo != null && inReplyTo !== rootId ? byId.get(inReplyTo) : null;
		if (parent) {
			parent.comment.children.push(comment);
		} else {
			topLevel.push(comment);
		}
	}
	return topLevel;
}

// ============================================================================
// Network Icons
// ============================================================================

const BLUESKY_PATH =
	"m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z";

const MASTODON_PATH =
	"M74.7135 16.6043C73.6199 8.54587 66.5351 2.19527 58.1366 0.964691C56.7196 0.756754 51.351 0 38.9148 0H38.822C26.3824 0 23.7135 0.756754 22.2966 0.964691C14.1319 2.16118 6.67571 7.86752 4.86669 16.0214C3.99657 20.0369 3.90371 24.4888 4.06535 28.5726C4.29578 34.4289 4.34049 40.275 4.877 46.1075C5.24791 49.9817 5.89495 53.8251 6.81328 57.6088C8.53288 64.5968 15.4938 70.4122 22.3138 72.7848C29.6155 75.259 37.468 75.6697 44.9919 73.971C45.8196 73.7801 46.6381 73.5586 47.4475 73.3063C49.2737 72.7307 51.4164 72.0869 52.9915 70.9559C53.0131 70.94 53.0308 70.9194 53.0433 70.8957C53.0558 70.872 53.0628 70.8458 53.0637 70.819V65.1701C53.0633 65.1451 53.0573 65.1205 53.0462 65.0981C53.0351 65.0757 53.0192 65.056 52.9996 65.0405C52.9799 65.0249 52.957 65.0139 52.9326 65.0082C52.9082 65.0025 52.8828 65.0023 52.8583 65.0076C48.0381 66.1591 43.0986 66.7363 38.1425 66.7273C29.6147 66.7273 27.3216 62.6802 26.6649 60.9956C26.1372 59.5398 25.802 58.0214 25.6678 56.4788C25.6664 56.4529 25.6712 56.427 25.6817 56.4033C25.6922 56.3796 25.7082 56.3587 25.7283 56.3424C25.7484 56.3261 25.772 56.3148 25.7973 56.3094C25.8226 56.304 25.8488 56.3046 25.8738 56.3112C30.6132 57.4544 35.4733 58.0314 40.3499 58.0299C41.5228 58.0299 42.6919 58.0299 43.8648 57.999C48.7693 57.8615 53.9398 57.6105 58.7656 56.6677C58.886 56.6437 59.0064 56.6231 59.1097 56.5922C66.7212 55.131 73.9665 50.5429 74.7026 38.9272C74.7301 38.4699 74.7989 34.1374 74.7989 33.6628C74.8023 32.0498 75.3186 22.2217 74.7135 16.6043ZM62.9996 44.8742H54.9926V25.2657C54.9926 21.1377 53.2718 19.0322 49.7716 19.0322C45.9233 19.0322 43.9961 21.5236 43.9961 26.4444V37.1809H36.0364V26.4444C36.0364 21.5236 34.1057 19.0322 30.2574 19.0322C26.7779 19.0322 25.0399 21.1377 25.0365 25.2657V44.8742H17.0364V24.6695C17.0364 20.5415 18.0904 17.2625 20.1985 14.8325C22.3729 12.4079 25.2235 11.1639 28.7625 11.1639C32.8587 11.1639 35.9554 12.7387 38.0148 15.8848L40.0058 19.2257L41.9994 15.8848C44.0588 12.7387 47.1555 11.1639 51.2441 11.1639C54.7797 11.1639 57.6303 12.4079 59.8125 14.8325C61.9203 17.2602 62.9743 20.5392 62.9743 24.6695L62.9996 44.8742Z";

const BLUESKY_ICON = `<svg class="sequoia-bsky-logo" viewBox="0 0 600 530" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="${BLUESKY_PATH}"/>
</svg>`;

const MASTODON_ICON = `<svg class="sequoia-bsky-logo" viewBox="0 0 79 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="${MASTODON_PATH}"/>
</svg>`;

const BLACKSKY_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.0620117 0.348442 87.9941 74.9653"><path d="M41.9565 74.9643L24.0161 74.9653L41.9565 74.9643ZM63.8511 74.9653H45.9097L63.8501 74.9643V57.3286H63.8511V74.9653ZM45.9097 44.5893C45.9099 49.2737 49.7077 53.0707 54.3921 53.0707H63.8501V57.3286H54.3921C49.7077 57.3286 45.9099 61.1257 45.9097 65.81V74.9643H41.9565V65.81C41.9563 61.1258 38.1593 57.3287 33.4751 57.3286H24.0161V53.0707H33.4741C38.1587 53.0707 41.9565 49.2729 41.9565 44.5883V35.1303H45.9097V44.5893ZM63.8511 53.0707H63.8501V35.1303H63.8511V53.0707Z" fill="currentColor"></path><path d="M52.7272 9.83198C49.4148 13.1445 49.4148 18.5151 52.7272 21.8275L59.4155 28.5158L56.4051 31.5262L49.7169 24.8379C46.4044 21.5254 41.0338 21.5254 37.7213 24.8379L31.2482 31.3111L28.4527 28.5156L34.9259 22.0424C38.2383 18.7299 38.2383 13.3594 34.9259 10.0469L28.2378 3.35883L31.2482 0.348442L37.9365 7.03672C41.2489 10.3492 46.6195 10.3492 49.932 7.03672L56.6203 0.348442L59.4155 3.14371L52.7272 9.83198Z" fill="currentColor"/><path d="M24.3831 23.2335C23.1706 27.7584 25.8559 32.4095 30.3808 33.6219L39.5172 36.07L38.4154 40.182L29.2793 37.734C24.7544 36.5215 20.1033 39.2068 18.8909 43.7317L16.5215 52.5745L12.7028 51.5513L15.0721 42.7088C16.2846 38.1839 13.5993 33.5328 9.07434 32.3204L-0.0620117 29.8723L1.03987 25.76L10.1762 28.2081C14.7011 29.4206 19.3522 26.7352 20.5647 22.2103L23.0127 13.074L26.8311 14.0971L24.3831 23.2335Z" fill="currentColor"/><path d="M67.3676 22.0297C68.5801 26.5546 73.2311 29.2399 77.756 28.0275L86.8923 25.5794L87.9941 29.6914L78.8578 32.1394C74.3329 33.3519 71.6476 38.003 72.86 42.5279L75.2294 51.3707L71.411 52.3938L69.0417 43.5513C67.8293 39.0264 63.1782 36.3411 58.6533 37.5535L49.5169 40.0016L48.415 35.8894L57.5514 33.4413C62.0763 32.2288 64.7616 27.5778 63.5492 23.0528L61.1011 13.9165L64.9195 12.8934L67.3676 22.0297Z" fill="currentColor"/></svg>';

// Small inline icons shown next to each comment's timestamp
const NETWORK_ICONS = {
	bluesky: `<svg class="sequoia-network-icon" viewBox="0 0 600 530" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="${BLUESKY_PATH}"/></svg>`,
	mastodon: `<svg class="sequoia-network-icon" viewBox="0 0 79 75" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="${MASTODON_PATH}"/></svg>`,
};

// ============================================================================
// Web Component
// ============================================================================

// SSR-safe base class - use HTMLElement in browser, empty class in Node.js
const BaseElement = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

class UnifiedComments extends BaseElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: "open" });

		const styleTag = document.createElement("style");
		shadow.appendChild(styleTag);
		styleTag.innerText = styles;

		const container = document.createElement("div");
		shadow.appendChild(container);
		container.className = "sequoia-comments-container";
		container.part = "container";

		this.commentsContainer = container;
		this.state = { type: "loading" };
		this.abortController = null;
	}

	static get observedAttributes() {
		return [
			"post-uri",
			"document-uri",
			"mastodon-url",
			"depth",
			"hide",
			"avatars",
		];
	}

	connectedCallback() {
		this.initialized = true;
		this.render();
		this.loadComments();
	}

	disconnectedCallback() {
		this.abortController?.abort();
	}

	attributeChangedCallback() {
		// attributeChangedCallback fires for pre-existing attributes during
		// element upgrade, *before* connectedCallback — skip until we've done
		// the initial load, otherwise every attribute triggers a duplicate fetch.
		if (this.initialized) {
			this.loadComments();
		}
	}

	get documentUri() {
		// First check attribute
		const attrUri = this.getAttribute("document-uri");
		if (attrUri) {
			return attrUri;
		}

		// Then scan for link tag in document head
		const linkTag = document.querySelector(
			'link[rel="site.standard.document"]',
		);
		return linkTag?.href ?? null;
	}

	get mastodonUrl() {
		return this.getAttribute("mastodon-url");
	}

	get depth() {
		const depthAttr = this.getAttribute("depth");
		return depthAttr ? parseInt(depthAttr, 10) : 6;
	}

	get hide() {
		const hideAttr = this.getAttribute("hide");
		return hideAttr === "auto";
	}

	get showAvatars() {
		return this.getAttribute("avatars") !== "false";
	}

	/**
	 * Resolve and fetch the Bluesky source.
	 * Returns null when no Bluesky post is configured for this page (no
	 * post-uri attribute, no document link, or document without bskyPostRef) —
	 * absence is not an error. Throws on actual fetch failures.
	 * @returns {Promise<{threads: Comment[], quotes: Comment[], postUrl: string, blackskyPostUrl: string} | null>}
	 */
	async loadBlueskySource() {
		const rawPostUri = this.getAttribute("post-uri");
		let postUri = rawPostUri ? await resolvePostUri(rawPostUri) : null;
		if (!postUri) {
			const docUri = this.documentUri;
			if (!docUri) {
				return null;
			}

			const document = await getDocument(docUri);
			if (!document.bskyPostRef) {
				return null;
			}

			postUri = document.bskyPostRef.uri;
		}

		const postUrl = buildBskyAppUrl(postUri);
		const blackskyPostUrl = buildBlackskyAppUrl(postUri);

		// Fetch thread and quotes in parallel; quote failures degrade gracefully
		const [threadResult, quotesResult] = await Promise.allSettled([
			getPostThread(postUri, this.depth),
			getQuotes(postUri),
		]);

		if (threadResult.status === "rejected") {
			throw threadResult.reason;
		}

		const thread = threadResult.value;
		const quotes =
			quotesResult.status === "fulfilled" ? quotesResult.value : [];

		const threads = (thread.replies?.filter(isThreadViewPost) ?? []).map(
			normalizeBskyThread,
		);

		// The thread view can silently omit the author's own replies for
		// logged-out viewers; graft them back from the author feed.
		try {
			await this.restoreAuthorReplies(thread, threads, postUri);
		} catch (error) {
			console.warn(
				"unified-comments: could not restore author replies:",
				error,
			);
		}

		const normalizedQuotes = quotes.map(normalizeBskyPost);
		const ownerDid = parseAtUri(postUri)?.did ?? null;
		markOwnerComments(threads, ownerDid);
		markOwnerComments(normalizedQuotes, ownerDid);

		return {
			threads,
			quotes: normalizedQuotes,
			postUrl,
			blackskyPostUrl,
		};
	}

	/**
	 * Graft the thread author's replies that the thread view filtered out back
	 * into the comment tree, then recover any third-party replies that were
	 * pruned along with them by re-anchoring the thread at each grafted post.
	 * Mutates `threads` in place.
	 * @param {any} rootThread - ThreadViewPost of the root post
	 * @param {Comment[]} threads - Normalized top-level comment trees
	 * @param {string} postUri - AT-URI of the root post
	 */
	async restoreAuthorReplies(rootThread, threads, postUri) {
		const authorDid = parseAtUri(postUri)?.did;
		if (!authorDid) return;

		const authorPosts = await getAuthorThreadReplies(
			authorDid,
			postUri,
			rootThread.post?.record?.createdAt,
		);
		if (authorPosts.length === 0) return;

		const byUri = new Map();
		const index = (comment) => {
			byUri.set(comment.id, comment);
			comment.children.forEach(index);
		};
		threads.forEach(index);

		// Oldest first so parents are grafted before their children
		const missing = authorPosts
			.filter((post) => !byUri.has(post.uri))
			.sort(
				(a, b) => new Date(a.record.createdAt) - new Date(b.record.createdAt),
			);

		const grafted = [];
		for (const post of missing) {
			const comment = normalizeBskyPost(post);
			byUri.set(comment.id, comment);

			const parentUri = post.record.reply?.parent?.uri;
			const parent =
				parentUri && parentUri !== postUri ? byUri.get(parentUri) : null;
			if (parent) {
				parent.children.push(comment);
			} else {
				// Direct reply to the root, or orphaned under a hidden/deleted
				// comment — promote to a top-level thread
				threads.push(comment);
			}
			grafted.push({ comment, post });
		}

		// Replies under a filtered post are pruned from the main thread view,
		// but appear when the thread is anchored at that post itself.
		await Promise.allSettled(
			grafted
				.filter(({ post }) => (post.replyCount ?? 0) > 0)
				.map(async ({ comment, post }) => {
					const subtree = await getPostThread(post.uri, this.depth);
					attachSubtree(comment, subtree, byUri);
				}),
		);
	}

	/**
	 * Fetch the Mastodon source.
	 * @param {string} url - Mastodon status URL
	 * @returns {Promise<{threads: Comment[], tootUrl: string}>}
	 */
	async loadMastodonSource(url) {
		const parsed = parseMastodonUrl(url);
		if (!parsed) {
			throw new Error(`Cannot parse Mastodon URL: ${url}`);
		}

		// Root status is only needed to identify the thread owner — optional
		const [context, rootStatus] = await Promise.all([
			getMastodonContext(parsed.origin, parsed.statusId),
			fetch(`${parsed.origin}/api/v1/statuses/${parsed.statusId}`)
				.then((response) => (response.ok ? response.json() : null))
				.catch(() => null),
		]);

		const threads = buildMastodonThreads(
			context.descendants ?? [],
			parsed.statusId,
		);
		markOwnerComments(threads, rootStatus?.account?.id ?? null);

		return { threads, tootUrl: url };
	}

	async loadComments() {
		// Cancel any in-flight request
		this.abortController?.abort();
		this.abortController = new AbortController();

		this.state = { type: "loading" };
		this.render();

		const mastodonUrl = this.mastodonUrl;

		// Sources load independently — one failing must not blank the other
		const [bskyResult, mastoResult] = await Promise.allSettled([
			this.loadBlueskySource(),
			mastodonUrl ? this.loadMastodonSource(mastodonUrl) : Promise.resolve(null),
		]);

		if (bskyResult.status === "rejected") {
			console.warn(
				"unified-comments: Bluesky comments failed to load:",
				bskyResult.reason,
			);
		}
		if (mastoResult.status === "rejected") {
			console.warn(
				"unified-comments: Mastodon comments failed to load:",
				mastoResult.reason,
			);
		}

		const bsky = bskyResult.status === "fulfilled" ? bskyResult.value : null;
		const masto = mastoResult.status === "fulfilled" ? mastoResult.value : null;

		if (!bsky && !masto) {
			const anyFailed =
				bskyResult.status === "rejected" || mastoResult.status === "rejected";
			if (anyFailed) {
				const reason =
					bskyResult.status === "rejected"
						? bskyResult.reason
						: mastoResult.reason;
				const message =
					reason instanceof Error ? reason.message : "Failed to load comments";
				this.state = { type: "error", message };
			} else {
				this.state = { type: "no-sources" };
			}
			this.render();
			return;
		}

		const urls = {
			bsky: bsky?.postUrl ?? null,
			blacksky: bsky?.blackskyPostUrl ?? null,
			mastodon: masto?.tootUrl ?? null,
		};

		// Merge top-level threads from both networks, oldest first at every level
		const threads = sortCommentTree([
			...(bsky?.threads ?? []),
			...(masto?.threads ?? []),
		]);
		const quotes = bsky?.quotes ?? [];

		if (threads.length === 0 && quotes.length === 0) {
			this.state = { type: "empty", urls };
		} else {
			this.state = { type: "loaded", threads, quotes, urls };
		}
		this.render();
	}

	render() {
		this.commentsContainer.className = this.showAvatars
			? "sequoia-comments-container"
			: "sequoia-comments-container sequoia-no-avatars";

		switch (this.state.type) {
			case "loading":
				this.commentsContainer.innerHTML = `
					<div class="sequoia-loading">
						<span class="sequoia-loading-spinner"></span>
						Loading comments...
					</div>
				`;
				break;

			case "no-sources":
				this.commentsContainer.innerHTML = `
					<div class="sequoia-warning">
						No comment sources found. Add a <code>&lt;link rel="site.standard.document" href="at://..."&gt;</code> tag or a <code>mastodon-url</code> attribute.
					</div>
				`;
				if (this.hide) {
					this.commentsContainer.style.display = "none";
				}
				break;

			case "empty":
				this.commentsContainer.innerHTML = `
					<div class="sequoia-comments-header">
						<h3 class="sequoia-comments-title">Comments</h3>
						<div>${this.renderReplyButtons(this.state.urls)}</div>
					</div>
					<div class="sequoia-empty">
						No comments yet. Be the first to reply on ${this.availableNetworks(this.state.urls)}!
					</div>
				`;
				break;

			case "error":
				this.commentsContainer.innerHTML = `
					<div class="sequoia-error">
						Failed to load comments: ${escapeHtml(this.state.message)}
					</div>
				`;
				break;

			case "loaded": {
				const { threads, quotes, urls } = this.state;
				const threadsHtml = threads
					.map((thread) => this.renderThread(thread))
					.join("");
				const commentCount = this.countComments(threads);
				const titleText =
					commentCount > 0
						? `${commentCount} Response${commentCount !== 1 ? "s" : ""}:`
						: "Comments";
				const quotesHtml = this.renderQuotesSection(quotes);

				this.commentsContainer.innerHTML = `
					<div class="sequoia-comments-header">
						<h3 class="sequoia-comments-title">${titleText}</h3>
						<div>${this.renderReplyButtons(urls)}</div>
					</div>
					<div class="sequoia-comments-list">
						${threadsHtml}
					</div>
					${quotesHtml}
				`;
				break;
			}
		}
	}

	/**
	 * Human-readable list of networks that have a reply URL
	 */
	availableNetworks(urls) {
		return [urls.bsky && "Bluesky", urls.mastodon && "Mastodon"]
			.filter(Boolean)
			.join(" or ");
	}

	/**
	 * Render the reply-button slot. Any element with slot="reply-button" in the
	 * light DOM is projected here and remains styleable by external CSS.
	 * The default network buttons are used as fallback content.
	 */
	renderReplyButtons(urls) {
		const buttons = [];
		if (urls.bsky) {
			buttons.push(
				`<a href="${escapeHtml(urls.bsky)}" target="_blank" rel="noopener noreferrer" class="sequoia-reply-button sequoia-reply-bluesky">${BLUESKY_ICON}</a>`,
			);
		}
		if (urls.blacksky) {
			buttons.push(
				`<a href="${escapeHtml(urls.blacksky)}" target="_blank" rel="noopener noreferrer" class="sequoia-reply-button sequoia-reply-blacksky">${BLACKSKY_ICON}</a>`,
			);
		}
		if (urls.mastodon) {
			buttons.push(
				`<a href="${escapeHtml(urls.mastodon)}" target="_blank" rel="noopener noreferrer" class="sequoia-reply-button sequoia-reply-mastodon">${MASTODON_ICON}</a>`,
			);
		}
		return `
			<slot name="reply-button">
				${buttons.join("\n")}
			</slot>
		`;
	}

	/**
	 * Render a complete thread (top-level comment + all nested replies)
	 * @param {Comment} thread - Root comment of the tree
	 */
	renderThread(thread) {
		return `<div class="sequoia-thread">${this.renderCommentTree(thread)}</div>`;
	}

	/**
	 * Render a comment and, indented beneath it, its replies (recursively)
	 * @param {Comment} comment
	 */
	renderCommentTree(comment) {
		const childrenHtml =
			comment.children.length > 0
				? `<div class="sequoia-comment-children">${comment.children
						.map((child) => this.renderCommentTree(child))
						.join("")}</div>`
				: "";

		return `${this.renderComment(comment)}${childrenHtml}`;
	}

	/**
	 * Render a section of quote posts below the replies
	 * @param {Comment[]} quotes - Normalized quote posts
	 */
	renderQuotesSection(quotes) {
		if (quotes.length === 0) return "";

		const quotesHtml = quotes
			.map((quote) => {
				return `<div class="sequoia-thread">${this.renderComment(quote)}</div>`;
			})
			.join("");

		return `
			<div class="sequoia-quotes-section">
				<h4 class="sequoia-quotes-header">${quotes.length} Quote${quotes.length !== 1 ? "s" : ""}:</h4>
				<div class="sequoia-comments-list">
					${quotesHtml}
				</div>
			</div>
		`;
	}

	/**
	 * Render a single comment
	 * @param {Comment} comment - Normalized comment
	 */
	renderComment(comment) {
		const { author } = comment;
		const avatarHtml = !this.showAvatars
			? ""
			: author.avatarUrl
				? `<img class="sequoia-comment-avatar" src="${escapeHtml(author.avatarUrl)}" alt="${escapeHtml(author.name)}" loading="lazy" />`
				: `<div class="sequoia-comment-avatar-placeholder">${getInitials(author.name)}</div>`;

		const networkIcon = NETWORK_ICONS[comment.network] ?? "";
		const networkName = comment.network === "mastodon" ? "Mastodon" : "Bluesky";
		const timeAgo = formatRelativeTime(comment.timestamp);
		const textClass = comment.isRichHtml
			? "sequoia-comment-text sequoia-comment-text--html"
			: "sequoia-comment-text";
		const commentClass = comment.isOwner
			? "sequoia-comment sequoia-comment--owner"
			: "sequoia-comment";

		return `
			<div class="${commentClass}">
				<div class="sequoia-comment-plate">
					${avatarHtml}
					<div class="sequoia-comment-plate-box">
						<div class="sequoia-comment-author-line">
							<a href="${escapeHtml(author.profileUrl)}" target="_blank" rel="noopener noreferrer" class="sequoia-comment-author">
								${author.nameHtml}
							</a>
							<span class="sequoia-comment-handle">@${escapeHtml(author.handle)}</span>
						</div>
						<div class="sequoia-comment-meta-line">
							<a href="${escapeHtml(comment.permalink)}" target="_blank" rel="noopener noreferrer" class="sequoia-comment-time">${timeAgo}</a>
							<span class="sequoia-comment-via">${networkIcon}via ${networkName}</span>
						</div>
					</div>
				</div>
				<div class="${textClass}">${comment.html}</div>
			</div>
		`;
	}

	/**
	 * Count all comments in a list of comment trees
	 * @param {Comment[]} threads
	 * @returns {number}
	 */
	countComments(threads) {
		let count = 0;
		for (const thread of threads) {
			count += 1 + this.countComments(thread.children);
		}
		return count;
	}
}

// Register the custom element
if (typeof customElements !== "undefined") {
	customElements.define("unified-comments", UnifiedComments);
}

// Export for module usage
export { UnifiedComments };
