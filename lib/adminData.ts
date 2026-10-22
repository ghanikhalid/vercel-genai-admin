import { createClient } from "@/lib/supabaseServer";
import type { User } from "@supabase/supabase-js";

export const ADMIN_STATE_BUCKET = "avatars";
export const ADMIN_STATE_PATH = "prism-admin-state.json";

export interface AdminOverlayState {
  superadminIds: string[];
  revokedSuperadminIds: string[];
  mediaUpdates: Record<
    string,
    {
      caption?: string;
      image_url?: string;
      updated_at: string;
      updated_by: string;
    }
  >;
  deletedMediaIds: string[];
  createdMediaFallback: Array<{
    id: string;
    user_id: string;
    storage_path: string;
    image_url: string;
    caption: string;
    created_at: string;
  }>;
}

const DEFAULT_OVERLAY: AdminOverlayState = {
  superadminIds: [],
  revokedSuperadminIds: [],
  mediaUpdates: {},
  deletedMediaIds: [],
  createdMediaFallback: [],
};

export interface EnrichedProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  avatar_url: string | null;
  avatar_source: "supabase_storage" | "google_oauth" | "none";
  updated_at: string | null;
  is_superadmin: boolean;
  has_db_superadmin_column: boolean;
  memes_count: number;
  net_karma_earned: number;
  upvotes_received: number;
  downvotes_received: number;
  avg_karma_per_meme: number;
  votes_cast_total: number;
  upvotes_cast: number;
  downvotes_cast: number;
  generosity_rate: number; // % of votes cast that are +1
  has_fortune: boolean;
  fortune_vibe: string | null;
}

export interface EnrichedMedia {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  storage_path: string;
  image_url: string;
  caption: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  total_votes: number;
  net_score: number;
  approval_rate: number; // 0-100
  controversy_score: number; // 0-100
  archetype: "Crowd Pleaser" | "Spicy Debate" | "Hidden Gem" | "Tough Crowd" | "Fresh Drop";
  word_count: number;
  char_count: number;
  storage_bytes: number | null;
  storage_mime: string | null;
}

export interface EnrichedVote {
  id: string; // `${image_id}_${user_id}`
  image_id: string;
  user_id: string;
  vote_value: 1 | -1;
  created_at: string;
  voter_name: string;
  voter_avatar: string | null;
  media_caption: string;
  media_image_url: string;
  media_author_id: string;
  media_author_name: string;
  media_net_score: number;
  is_self_vote: boolean;
}

export interface StorageObjectSummary {
  bucket: "captioned-images" | "avatars";
  path: string;
  size: number;
  mimetype: string;
  created_at: string;
  public_url: string;
  owner_id: string | null;
}

export interface AdminTelemetryStats {
  totalUsers: number;
  superadminCount: number;
  customAvatarCount: number;
  googleAvatarCount: number;
  totalMedia: number;
  totalStorageBytes: number;
  captionedBucketBytes: number;
  avatarsBucketBytes: number;
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  globalApprovalRate: number;
  netCommunityKarma: number;
  avgVotesPerMedia: number;
  avgCaptionWords: number;
  avgCaptionChars: number;
  activeFortunesCount: number;
  // Creative highlights
  archetypeBreakdown: Record<EnrichedMedia["archetype"], number>;
  lengthVsKarmaBuckets: Array<{
    label: string;
    range: string;
    count: number;
    avgScore: number;
    avgApproval: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    label: string;
    uploads: number;
    votes: number;
    total: number;
  }>;
  topKeywords: Array<{ word: string; count: number; avgScore: number }>;
  affinityPairs: Array<{
    voterId: string;
    voterName: string;
    creatorId: string;
    creatorName: string;
    upvotes: number;
    downvotes: number;
    netAffinity: number;
  }>;
  hasDbSuperadminColumn: boolean;
}

export interface AdminGateResult {
  status: "unauthenticated" | "forbidden" | "authorized";
  user: User | null;
  currentProfile: EnrichedProfile | null;
  hasDbSuperadminColumn: boolean;
  profilesPreviewCount: number;
  data: {
    profiles: EnrichedProfile[];
    media: EnrichedMedia[];
    votes: EnrichedVote[];
    fortunes: Array<{
      user_id: string;
      author_name: string;
      caption: string;
      prophecy: string;
      vibe_tag: string;
      lucky_stat: string;
      rolled_at: string;
    }>;
    storageObjects: StorageObjectSummary[];
    stats: AdminTelemetryStats;
  } | null;
}

export async function readAdminOverlay(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AdminOverlayState> {
  try {
    const { data, error } = await supabase.storage
      .from(ADMIN_STATE_BUCKET)
      .download(ADMIN_STATE_PATH);
    if (error || !data) return { ...DEFAULT_OVERLAY };
    const text = await data.text();
    const parsed = JSON.parse(text) as Partial<AdminOverlayState>;
    return {
      superadminIds: Array.isArray(parsed.superadminIds) ? parsed.superadminIds : [],
      revokedSuperadminIds: Array.isArray(parsed.revokedSuperadminIds)
        ? parsed.revokedSuperadminIds
        : [],
      mediaUpdates: parsed.mediaUpdates && typeof parsed.mediaUpdates === "object"
        ? parsed.mediaUpdates
        : {},
      deletedMediaIds: Array.isArray(parsed.deletedMediaIds)
        ? parsed.deletedMediaIds
        : [],
      createdMediaFallback: Array.isArray(parsed.createdMediaFallback)
        ? parsed.createdMediaFallback
        : [],
    };
  } catch {
    return { ...DEFAULT_OVERLAY };
  }
}

export async function writeAdminOverlay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  state: AdminOverlayState
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(state, null, 2), "utf-8");
  await supabase.storage.from(ADMIN_STATE_BUCKET).upload(ADMIN_STATE_PATH, payload, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
}

function classifyArchetype(
  upvotes: number,
  downvotes: number,
  netScore: number
): EnrichedMedia["archetype"] {
  const total = upvotes + downvotes;
  if (total === 0) return "Fresh Drop";
  if (upvotes > 0 && downvotes > 0 && Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes) >= 0.4) {
    return "Spicy Debate";
  }
  if (netScore >= 2 || (netScore >= 1 && upvotes >= 2)) {
    return "Crowd Pleaser";
  }
  if (netScore > 0) {
    return "Hidden Gem";
  }
  if (netScore < 0) {
    return "Tough Crowd";
  }
  return "Spicy Debate";
}

const STOP_WORDS = new Set([
  "THE", "AND", "FOR", "THAT", "THIS", "WITH", "YOU", "YOUR", "ARE", "WAS",
  "NOT", "BUT", "FROM", "HAVE", "HAS", "HAD", "WHEN", "WHAT", "WHO", "WHY",
  "HOW", "ALL", "ANY", "CAN", "OUT", "INTO", "JUST", "LIKE", "ITS", "IT'S",
  "ONE", "TWO", "AFTER", "BEFORE", "WHILE", "STILL", "ONLY", "OVER", "UNDER",
]);

export async function loadAdminContext(): Promise<AdminGateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "unauthenticated",
      user: null,
      currentProfile: null,
      hasDbSuperadminColumn: false,
      profilesPreviewCount: 0,
      data: null,
    };
  }

  // Ensure the signed-in user has a row in `profiles`
  const metaName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";
  const [defaultFirst, ...restLast] = metaName.split(" ");
  const defaultLast = restLast.join(" ");

  const { data: existingOwnProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingOwnProfile) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: defaultFirst || user.email?.split("@")[0] || "Admin",
        last_name: defaultLast || "",
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  const [overlay, profilesRes] = await Promise.all([
    readAdminOverlay(supabase),
    supabase.from("profiles").select("*").order("updated_at", { ascending: false }),
  ]);

  const rawProfiles = (profilesRes.data ?? []) as Array<Record<string, unknown>>;
  const hasDbSuperadminColumn =
    rawProfiles.length > 0 && "is_superadmin" in rawProfiles[0];

  const isUserSuperadmin = (row: Record<string, unknown>, uid: string): boolean => {
    if (overlay.revokedSuperadminIds.includes(uid)) return false;
    if (row.is_superadmin === true) return true;
    if (overlay.superadminIds.includes(uid)) return true;
    if (uid === user.id && user.user_metadata?.is_superadmin === true) return true;
    return false;
  };

  const ownRow =
    rawProfiles.find((r) => String(r.id) === user.id) ||
    ({
      id: user.id,
      first_name: defaultFirst || user.email?.split("@")[0] || "Member",
      last_name: defaultLast || "",
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>);

  const authorized = isUserSuperadmin(ownRow, user.id);

  if (!authorized) {
    const fullName = [
      typeof ownRow.first_name === "string" ? ownRow.first_name : "",
      typeof ownRow.last_name === "string" ? ownRow.last_name : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || user.email || "Authenticated User";

    return {
      status: "forbidden",
      user,
      hasDbSuperadminColumn,
      profilesPreviewCount: rawProfiles.length,
      currentProfile: {
        id: user.id,
        first_name: (ownRow.first_name as string) || null,
        last_name: (ownRow.last_name as string) || null,
        full_name: fullName,
        avatar_url: (ownRow.avatar_url as string) || null,
        avatar_source: "none",
        updated_at: (ownRow.updated_at as string) || null,
        is_superadmin: false,
        has_db_superadmin_column: hasDbSuperadminColumn,
        memes_count: 0,
        net_karma_earned: 0,
        upvotes_received: 0,
        downvotes_received: 0,
        avg_karma_per_meme: 0,
        votes_cast_total: 0,
        upvotes_cast: 0,
        downvotes_cast: 0,
        generosity_rate: 0,
        has_fortune: false,
        fortune_vibe: null,
      },
      data: null,
    };
  }

  // Authorized superadmin: load full database & storage telemetry
  const [imagesRes, votesRes, fortunesRes, rootCaptionedList, rootAvatarsList] =
    await Promise.all([
      supabase
        .from("captioned_images")
        .select("id, user_id, storage_path, image_url, caption, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("caption_votes")
        .select("image_id, user_id, vote_value, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("daily_meme_fortunes")
        .select("user_id, caption, prophecy, vibe_tag, lucky_stat, rolled_at")
        .order("rolled_at", { ascending: false }),
      supabase.storage.from("captioned-images").list("", { limit: 100 }),
      supabase.storage.from("avatars").list("", { limit: 100 }),
    ]);

  // Inspect subfolders in captioned-images bucket for byte telemetry
  const storageObjects: StorageObjectSummary[] = [];
  const storageByPath = new Map<string, { size: number; mimetype: string }>();

  const folders = (rootCaptionedList.data ?? []).filter((item) => !item.id);
  const directFiles = (rootCaptionedList.data ?? []).filter((item) => Boolean(item.id));

  for (const file of directFiles) {
    const size = Number((file.metadata as Record<string, unknown>)?.size ?? 0);
    const mimetype = String(
      (file.metadata as Record<string, unknown>)?.mimetype ?? "image/jpeg"
    );
    const { data: pub } = supabase.storage
      .from("captioned-images")
      .getPublicUrl(file.name);
    storageObjects.push({
      bucket: "captioned-images",
      path: file.name,
      size,
      mimetype,
      created_at: file.created_at || new Date().toISOString(),
      public_url: pub.publicUrl,
      owner_id: null,
    });
    storageByPath.set(file.name, { size, mimetype });
  }

  const folderLists = await Promise.all(
    folders.map(async (f) => {
      const res = await supabase.storage
        .from("captioned-images")
        .list(f.name, { limit: 100 });
      return { folder: f.name, items: res.data ?? [] };
    })
  );

  for (const group of folderLists) {
    for (const file of group.items) {
      if (!file.id) continue;
      const fullPath = `${group.folder}/${file.name}`;
      const size = Number((file.metadata as Record<string, unknown>)?.size ?? 0);
      const mimetype = String(
        (file.metadata as Record<string, unknown>)?.mimetype ?? "image/jpeg"
      );
      const { data: pub } = supabase.storage
        .from("captioned-images")
        .getPublicUrl(fullPath);
      storageObjects.push({
        bucket: "captioned-images",
        path: fullPath,
        size,
        mimetype,
        created_at: file.created_at || new Date().toISOString(),
        public_url: pub.publicUrl,
        owner_id: group.folder,
      });
      storageByPath.set(fullPath, { size, mimetype });
    }
  }

  for (const file of rootAvatarsList.data ?? []) {
    if (!file.id || file.name === ADMIN_STATE_PATH) continue;
    const size = Number((file.metadata as Record<string, unknown>)?.size ?? 0);
    const mimetype = String(
      (file.metadata as Record<string, unknown>)?.mimetype ?? "image/png"
    );
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(file.name);
    const ownerMatch = file.name.match(/^([0-9a-f-]{36})/i);
    storageObjects.push({
      bucket: "avatars",
      path: file.name,
      size,
      mimetype,
      created_at: file.created_at || new Date().toISOString(),
      public_url: pub.publicUrl,
      owner_id: ownerMatch ? ownerMatch[1] : null,
    });
    storageByPath.set(`avatars/${file.name}`, { size, mimetype });
  }

  // Merge DB media with any overlay updates/deletes/creations
  const deletedSet = new Set(overlay.deletedMediaIds);
  const dbMediaRows = (imagesRes.data ?? []) as Array<{
    id: string;
    user_id: string;
    storage_path: string;
    image_url: string;
    caption: string;
    created_at: string;
  }>;

  const existingIds = new Set(dbMediaRows.map((m) => m.id));
  const combinedMediaRows = [
    ...dbMediaRows,
    ...overlay.createdMediaFallback.filter((m) => !existingIds.has(m.id)),
  ].filter((m) => !deletedSet.has(m.id));

  // Map profiles by ID
  const profileMap = new Map<
    string,
    {
      first_name: string | null;
      last_name: string | null;
      full_name: string;
      avatar_url: string | null;
      updated_at: string | null;
      is_superadmin: boolean;
    }
  >();

  for (const row of rawProfiles) {
    const id = String(row.id);
    const first = typeof row.first_name === "string" ? row.first_name : null;
    const last = typeof row.last_name === "string" ? row.last_name : null;
    const fullName = [first, last].filter(Boolean).join(" ").trim() || "Club Member";
    profileMap.set(id, {
      first_name: first,
      last_name: last,
      full_name: fullName,
      avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
      updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
      is_superadmin: isUserSuperadmin(row, id),
    });
  }

  // Raw votes
  const rawVotes = ((votesRes.data ?? []) as Array<{
    image_id: string;
    user_id: string;
    vote_value: number;
    created_at: string;
  }>).filter((v) => !deletedSet.has(v.image_id));

  const votesByImage = new Map<
    string,
    Array<{ user_id: string; vote_value: 1 | -1; created_at: string }>
  >();
  for (const v of rawVotes) {
    if (v.vote_value !== 1 && v.vote_value !== -1) continue;
    const list = votesByImage.get(v.image_id) ?? [];
    list.push({
      user_id: v.user_id,
      vote_value: v.vote_value as 1 | -1,
      created_at: v.created_at,
    });
    votesByImage.set(v.image_id, list);
  }

  // Enrich Media
  const media: EnrichedMedia[] = combinedMediaRows.map((row) => {
    const override = overlay.mediaUpdates[row.id];
    const caption = override?.caption ?? row.caption;
    const imageUrl = override?.image_url ?? row.image_url;
    const votes = votesByImage.get(row.id) ?? [];
    let upvotes = 0;
    let downvotes = 0;
    for (const v of votes) {
      if (v.vote_value === 1) upvotes += 1;
      else if (v.vote_value === -1) downvotes += 1;
    }
    const totalVotes = upvotes + downvotes;
    const netScore = upvotes - downvotes;
    const approvalRate = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;

    // Controversy score: balance of up & down weighted by engagement volume
    const balance =
      totalVotes >= 2
        ? Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes)
        : 0;
    const controversyScore = Math.min(
      100,
      Math.round(balance * 100 * Math.min(1, totalVotes / 3))
    );

    const author = profileMap.get(row.user_id);
    const words = caption
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const storageMeta = storageByPath.get(row.storage_path);

    return {
      id: row.id,
      user_id: row.user_id,
      author_name: author?.full_name || "Club Member",
      author_avatar: author?.avatar_url || null,
      storage_path: row.storage_path,
      image_url: imageUrl,
      caption,
      created_at: row.created_at,
      upvotes,
      downvotes,
      total_votes: totalVotes,
      net_score: netScore,
      approval_rate: approvalRate,
      controversy_score: controversyScore,
      archetype: classifyArchetype(upvotes, downvotes, netScore),
      word_count: words.length,
      char_count: caption.length,
      storage_bytes: storageMeta?.size ?? null,
      storage_mime: storageMeta?.mimetype ?? null,
    };
  });

  const mediaById = new Map<string, EnrichedMedia>();
  for (const m of media) {
    mediaById.set(m.id, m);
  }

  // Enrich Votes
  const votes: EnrichedVote[] = rawVotes
    .filter((v) => v.vote_value === 1 || v.vote_value === -1)
    .map((v) => {
      const voter = profileMap.get(v.user_id);
      const targetMedia = mediaById.get(v.image_id);
      return {
        id: `${v.image_id}_${v.user_id}`,
        image_id: v.image_id,
        user_id: v.user_id,
        vote_value: v.vote_value as 1 | -1,
        created_at: v.created_at,
        voter_name: voter?.full_name || "Club Member",
        voter_avatar: voter?.avatar_url || null,
        media_caption: targetMedia?.caption || "Deleted Media",
        media_image_url: targetMedia?.image_url || "",
        media_author_id: targetMedia?.user_id || "",
        media_author_name: targetMedia?.author_name || "Unknown Author",
        media_net_score: targetMedia?.net_score ?? 0,
        is_self_vote: Boolean(targetMedia && targetMedia.user_id === v.user_id),
      };
    });

  // Fortunes
  const rawFortunes = (fortunesRes.data ?? []) as Array<{
    user_id: string;
    caption: string;
    prophecy: string;
    vibe_tag: string;
    lucky_stat: string;
    rolled_at: string;
  }>;
  const fortuneByUser = new Map<string, (typeof rawFortunes)[number]>();
  for (const f of rawFortunes) {
    fortuneByUser.set(f.user_id, f);
  }

  // Enrich Profiles
  const profiles: EnrichedProfile[] = rawProfiles.map((row) => {
    const id = String(row.id);
    const base = profileMap.get(id)!;
    const authoredMedia = media.filter((m) => m.user_id === id);
    const upvotesReceived = authoredMedia.reduce((acc, m) => acc + m.upvotes, 0);
    const downvotesReceived = authoredMedia.reduce((acc, m) => acc + m.downvotes, 0);
    const netKarma = upvotesReceived - downvotesReceived;
    const avgKarma =
      authoredMedia.length > 0
        ? Number((netKarma / authoredMedia.length).toFixed(2))
        : 0;

    const userVotes = votes.filter((v) => v.user_id === id);
    const upvotesCast = userVotes.filter((v) => v.vote_value === 1).length;
    const downvotesCast = userVotes.filter((v) => v.vote_value === -1).length;
    const generosityRate =
      userVotes.length > 0
        ? Math.round((upvotesCast / userVotes.length) * 100)
        : 100;

    const avatarUrl = base.avatar_url;
    const avatarSource: EnrichedProfile["avatar_source"] = !avatarUrl
      ? "none"
      : avatarUrl.includes("supabase.co")
      ? "supabase_storage"
      : "google_oauth";

    const fortune = fortuneByUser.get(id);

    return {
      id,
      first_name: base.first_name,
      last_name: base.last_name,
      full_name: base.full_name,
      avatar_url: avatarUrl,
      avatar_source: avatarSource,
      updated_at: base.updated_at,
      is_superadmin: base.is_superadmin,
      has_db_superadmin_column: hasDbSuperadminColumn,
      memes_count: authoredMedia.length,
      net_karma_earned: netKarma,
      upvotes_received: upvotesReceived,
      downvotes_received: downvotesReceived,
      avg_karma_per_meme: avgKarma,
      votes_cast_total: userVotes.length,
      upvotes_cast: upvotesCast,
      downvotes_cast: downvotesCast,
      generosity_rate: generosityRate,
      has_fortune: Boolean(fortune),
      fortune_vibe: fortune?.vibe_tag ?? null,
    };
  });

  // Compute Telemetry Statistics
  const captionedBucketBytes = storageObjects
    .filter((o) => o.bucket === "captioned-images")
    .reduce((acc, o) => acc + o.size, 0);
  const avatarsBucketBytes = storageObjects
    .filter((o) => o.bucket === "avatars")
    .reduce((acc, o) => acc + o.size, 0);

  const totalUpvotes = votes.filter((v) => v.vote_value === 1).length;
  const totalDownvotes = votes.filter((v) => v.vote_value === -1).length;
  const totalVotes = totalUpvotes + totalDownvotes;
  const globalApprovalRate =
    totalVotes > 0 ? Math.round((totalUpvotes / totalVotes) * 100) : 100;

  const archetypeBreakdown: Record<EnrichedMedia["archetype"], number> = {
    "Crowd Pleaser": 0,
    "Spicy Debate": 0,
    "Hidden Gem": 0,
    "Tough Crowd": 0,
    "Fresh Drop": 0,
  };
  for (const m of media) {
    archetypeBreakdown[m.archetype] += 1;
  }

  // Caption length vs karma buckets
  const bucketDefs = [
    { label: "Ultra-Punchy", range: "1–6 words", min: 1, max: 6 },
    { label: "Golden Ratio", range: "7–10 words", min: 7, max: 10 },
    { label: "Storyteller", range: "11+ words", min: 11, max: 999 },
  ];
  const lengthVsKarmaBuckets = bucketDefs.map((b) => {
    const matching = media.filter(
      (m) => m.word_count >= b.min && m.word_count <= b.max
    );
    const count = matching.length;
    const avgScore =
      count > 0
        ? Number(
            (
              matching.reduce((acc, m) => acc + m.net_score, 0) / count
            ).toFixed(2)
          )
        : 0;
    const avgApproval =
      count > 0
        ? Math.round(
            matching.reduce((acc, m) => acc + m.approval_rate, 0) / count
          )
        : 0;
    return {
      label: b.label,
      range: b.range,
      count,
      avgScore,
      avgApproval,
    };
  });

  // 24-Hour Circadian Activity
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`;
    return { hour, label, uploads: 0, votes: 0, total: 0 };
  });
  for (const m of media) {
    const hr = new Date(m.created_at).getUTCHours();
    if (!Number.isNaN(hr) && hourlyActivity[hr]) {
      hourlyActivity[hr].uploads += 1;
      hourlyActivity[hr].total += 1;
    }
  }
  for (const v of votes) {
    const hr = new Date(v.created_at).getUTCHours();
    if (!Number.isNaN(hr) && hourlyActivity[hr]) {
      hourlyActivity[hr].votes += 1;
      hourlyActivity[hr].total += 1;
    }
  }

  // Keyword frequency & sentiment
  const wordStats = new Map<string, { count: number; totalScore: number }>();
  for (const m of media) {
    const tokens = m.caption
      .toUpperCase()
      .replace(/[^A-Z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const uniqueInCaption = new Set(tokens);
    for (const token of uniqueInCaption) {
      const prev = wordStats.get(token) ?? { count: 0, totalScore: 0 };
      prev.count += 1;
      prev.totalScore += m.net_score;
      wordStats.set(token, prev);
    }
  }
  const topKeywords = Array.from(wordStats.entries())
    .map(([word, st]) => ({
      word,
      count: st.count,
      avgScore: Number((st.totalScore / st.count).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, 12);

  // Voter -> Creator Affinity Network
  const pairMap = new Map<
    string,
    {
      voterId: string;
      voterName: string;
      creatorId: string;
      creatorName: string;
      upvotes: number;
      downvotes: number;
      netAffinity: number;
    }
  >();
  for (const v of votes) {
    if (!v.media_author_id) continue;
    const key = `${v.user_id}->${v.media_author_id}`;
    const existing = pairMap.get(key) ?? {
      voterId: v.user_id,
      voterName: v.voter_name,
      creatorId: v.media_author_id,
      creatorName: v.media_author_name,
      upvotes: 0,
      downvotes: 0,
      netAffinity: 0,
    };
    if (v.vote_value === 1) existing.upvotes += 1;
    else existing.downvotes += 1;
    existing.netAffinity = existing.upvotes - existing.downvotes;
    pairMap.set(key, existing);
  }
  const affinityPairs = Array.from(pairMap.values()).sort(
    (a, b) =>
      b.upvotes + b.downvotes - (a.upvotes + a.downvotes) ||
      b.netAffinity - a.netAffinity
  );

  const stats: AdminTelemetryStats = {
    totalUsers: profiles.length,
    superadminCount: profiles.filter((p) => p.is_superadmin).length,
    customAvatarCount: profiles.filter((p) => p.avatar_source === "supabase_storage").length,
    googleAvatarCount: profiles.filter((p) => p.avatar_source === "google_oauth").length,
    totalMedia: media.length,
    totalStorageBytes: captionedBucketBytes + avatarsBucketBytes,
    captionedBucketBytes,
    avatarsBucketBytes,
    totalVotes,
    totalUpvotes,
    totalDownvotes,
    globalApprovalRate,
    netCommunityKarma: totalUpvotes - totalDownvotes,
    avgVotesPerMedia:
      media.length > 0 ? Number((totalVotes / media.length).toFixed(1)) : 0,
    avgCaptionWords:
      media.length > 0
        ? Number(
            (
              media.reduce((acc, m) => acc + m.word_count, 0) / media.length
            ).toFixed(1)
          )
        : 0,
    avgCaptionChars:
      media.length > 0
        ? Math.round(
            media.reduce((acc, m) => acc + m.char_count, 0) / media.length
          )
        : 0,
    activeFortunesCount: rawFortunes.length,
    archetypeBreakdown,
    lengthVsKarmaBuckets,
    hourlyActivity,
    topKeywords,
    affinityPairs,
    hasDbSuperadminColumn,
  };

  const currentProfile =
    profiles.find((p) => p.id === user.id) ?? profiles[0] ?? null;

  return {
    status: "authorized",
    user,
    currentProfile,
    hasDbSuperadminColumn,
    profilesPreviewCount: profiles.length,
    data: {
      profiles,
      media,
      votes,
      fortunes: rawFortunes.map((f) => ({
        ...f,
        author_name: profileMap.get(f.user_id)?.full_name || "Club Member",
      })),
      storageObjects,
      stats,
    },
  };
}
