"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Editor } from "@tiptap/react";
import { extractText } from "@/lib/utils";
import {
  createPost,
  updatePost,
  createReview,
  updateReview,
  updateReviewScore,
  createModGuide,
  updateModGuide,
  verifyModGuide,
  fetchTags,
  updatePostStatus,
  fetchGames,
  fetchGame,
  createTag,
  apiMutate,
} from "@/lib/api";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ARTICLE_STATUS_LABELS } from "@/lib/constants";
import ImageUploader from "@/components/admin/ImageUploader";
import useSWR, { useSWRConfig } from "swr";
import { ContentType } from "@/types";
import { Save, Send, Plus, X, ShieldCheck, RefreshCw } from "lucide-react";
import { revalidatePublicPages } from "@/app/admin/actions";
import MajorUpdateSection from "./MajorUpdateSection";
import LiveBlogPanel from "./LiveBlogPanel";
import WorkflowActions from "./WorkflowActions";
import {
  validateForPublish,
  getWordCount,
  PublishValidationInput,
  ValidationCheck,
} from "@/lib/publish-validation";
import PublishGate from "./PublishGate";
import SeoReadabilityPanel from "./SeoReadabilityPanel";
import OgImagePreview from "./OgImagePreview";
import EditorNotesSidebar from "./EditorNotesSidebar";
import BylineManager from "./BylineManager";
import VersionHistory from "./VersionHistory";
import EmbargoCountdown from "./EmbargoCountdown";
import AiAssistantSidebar from "./editor/AiAssistantSidebar";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="shimmer" style={{ height: 600 }} />,
});

const schema = z.object({
  title: z.string().min(1, "Title required"),
  slug: z.string().optional(),
  excerpt: z.string().max(300).optional(),

  contentType: z.string().default("NEWS"),
  seoTitle: z.string().max(90).optional(),
  seoDescription: z.string().max(250).optional(),
  focusKeyword: z.string().optional(),
  featured: z.boolean().default(false),
  isBreaking: z.boolean().default(false),
  isSponsored: z.boolean().default(false),
  sponsorName: z.string().optional(),
  isLiveBlog: z.boolean().default(false),
  scheduledAt: z.string().optional(),
  embargoUntil: z.string().optional(),

  // Mod guide specific
  gameName: z.string().optional(),
  modName: z.string().optional(),
  gameVersionNotes: z.string().optional(),
  gameVersion: z.string().optional(),
  gameVersionDate: z.string().optional(),
  difficulty: z.string().optional(),
  estimatedInstallMinutes: z.coerce.number().optional(),

  // Review specific
  gameTitle: z.string().optional(),
  developer: z.string().optional(),
  publisher: z.string().optional(),
  releaseDate: z.string().optional(),
  platforms: z.string().optional(), // Comma separated
  genres: z.string().optional(), // Comma separated
  reviewScore: z.coerce.number().min(0).max(10).optional(),
  verdict: z.string().optional(),
  showReviewDetails: z.boolean().default(true),
  scoreUpdateReason: z.string().max(500).optional(),
  copyProvidedByPublisher: z.boolean().default(false),

  // Walkthrough specific
  chapter: z.string().optional(),
  bossCount: z.coerce.number().min(0).optional(),

  // Deal specific
  store: z.string().optional(),
  product: z.string().optional(),
  price: z.string().optional(),
  originalPrice: z.string().optional(),
  url: z.string().optional(),
  expiryDate: z.string().optional(),
  dealPlatform: z.string().optional(),
  dealScore: z.coerce.number().min(0).max(10).optional(),
}).superRefine((data, ctx) => {
  if (data.contentType === "MOD_GUIDE") {
    if (!data.gameName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gameName"], message: "Required for Mod Guides" });
    }
    if (!data.modName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["modName"], message: "Required for Mod Guides" });
    }
    if (!data.gameVersionNotes?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gameVersionNotes"], message: "Required for Mod Guides" });
    }
    if (!data.gameVersion?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gameVersion"], message: "Required for Mod Guides" });
    }
  }
});

interface PostFormProps {
  mode: "create" | "edit";
  initialData?: Record<string, unknown>;
  slug?: string;
  type?: string;
}

export default function PostForm({
  mode,
  initialData,
  slug,
  type,
}: PostFormProps) {
  const router = useRouter();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const initialContent = useMemo(() => {
    const modSections = (initialData?.modGuide as any)?.sections;
    const isModGuide =
      initialData?.contentType === "MOD_GUIDE" || type === "MOD_GUIDE";

    if (isModGuide) {
      if (modSections && modSections.length > 0) return modSections;
      // If converting from standard post to Mod Guide for the first time,
      // move the body into the primary "Main Content" tab.
      if (initialData?.content) {
        return [
          { id: "main", label: "Main Content", content: initialData.content },
        ];
      }
      return null;
    }
    return initialData?.content || null;
  }, [initialData, type]);

  const [content, setContent] = useState<unknown>(initialContent);
  const [aiEditor, setAiEditor] = useState<Editor | null>(null);
  const [featuredImage, setFeaturedImage] = useState<string>(
    (initialData?.featuredImageUrl as string) || "",
  );
  const [featuredImageCredit, setFeaturedImageCredit] = useState<string>(
    (initialData?.featuredImageCredit as string) || "",
  );

  // initialData.tags comes from the API as [{ tagId: '...', tag: {...} }] or string[] depending on the endpoint
  const initialTags =
    (initialData?.tags as any[])?.map((t) =>
      typeof t === "string" ? t : t.tagId,
    ) || [];
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  const [selectedPlatformsTested, setSelectedPlatformsTested] = useState<string[]>(
    (initialData?.gameReview as any)?.platformsTested || [],
  );
  const PLATFORM_TESTED_OPTIONS = ["PC", "PS5", "XSX", "Switch", "PS4", "XBO"];

  // Walkthroughs store "Chapter: X" / "Bosses: N" as tags — recover them for editing
  const initialTagObjs = ((initialData?.tags as any[]) || [])
    .map((t) => (typeof t === "string" ? null : t.tag))
    .filter(Boolean) as { name: string }[];
  const initialChapterTag = initialTagObjs.find((t) => /^chapter:\s*/i.test(t.name));
  const initialBossTag = initialTagObjs.find((t) => /^bosses:\s*/i.test(t.name));
  const initialChapter = initialChapterTag?.name.replace(/^chapter:\s*/i, "") || "";
  const initialBossCount = initialBossTag
    ? parseInt(initialBossTag.name.replace(/^bosses:\s*/i, ""), 10) || undefined
    : undefined;

  const initialGames = (initialData?.games as any[])?.map((g) => g.id) || [];
  const [selectedGames, setSelectedGames] = useState<string[]>(initialGames);
  const [gameSearch, setGameSearch] = useState("");
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const { data: allGames } = useSWR("form-games", () =>
    fetchGames({ fields: 'card', limit: 100 }).then((r) => r.data || []),
  );
  const availableGames = allGames || [];

  // When a game is selected for a REVIEW, fetch its full record and pre-fill
  // the Game Review Details fields (still editable after auto-fill).
  const autoFillReviewFromGame = async (g: any) => {
    setIsAutoFilling(true);
    try {
      // card projection is missing developer — fetch the full record
      const res = await fetchGame(g.slug, 0);
      const full = res.data || g;
      if (full.title) setValue('gameTitle', full.title);
      if (full.developer) setValue('developer', full.developer);
      if (full.publisher) setValue('publisher', full.publisher);
      if (full.releaseDate) {
        setValue('releaseDate', new Date(full.releaseDate).toISOString().split('T')[0]);
      }
      if (full.platforms?.length) {
        setValue('platforms', Array.isArray(full.platforms) ? full.platforms.join(', ') : full.platforms);
      }
      if (full.genres?.length) {
        setValue('genres', Array.isArray(full.genres) ? full.genres.join(', ') : full.genres);
      }
    } catch {
      // silent — fields remain editable manually
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Prerequisites: normalize stored data (can be plain strings OR objects)
  const rawPrereqs = (initialData?.modGuide as any)?.prerequisiteList || [];
  const normalizedPrereqs = rawPrereqs.map((p: any) =>
    typeof p === "string"
      ? { name: p, url: "", required: true }
      : { name: p.name || "", url: p.url || "", required: p.required ?? true },
  );
  const [prereqs, setPrereqs] =
    useState<{ name: string; url: string; required: boolean }[]>(
      normalizedPrereqs,
    );

  // Mod guide verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState<{
    lastVerifiedAt?: string | null;
    lastVerifiedVersion?: string | null;
    lastVerifiedBy?: { displayName: string } | null;
  } | null>((initialData?.modGuide as any) ?? null);

  // Publish validation state
  const [isPublishGateOpen, setIsPublishGateOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>(
    [],
  );
  const [pendingData, setPendingData] = useState<z.infer<typeof schema> | null>(
    null,
  );

  const [pendingDraftId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = sessionStorage.getItem("rte-pending-id");
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("rte-pending-id", id);
      }
      return id;
    }
    return "";
  });

  const addPrereq = () =>
    setPrereqs((prev) => [...prev, { name: "", url: "", required: true }]);
  const removePrereq = (i: number) =>
    setPrereqs((prev) => prev.filter((_, idx) => idx !== i));
  const updatePrereq = (
    i: number,
    field: "name" | "url" | "required",
    value: string | boolean,
  ) =>
    setPrereqs((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    );

  const { data: tags } = useSWR("form-tags", () =>
    fetchTags().then((r) => r.data || []),
  );

  const [newTag, setNewTag] = useState("");
  const { mutate } = useSWRConfig();

  // Find a tag by exact name (case-insensitive), creating it if it doesn't exist yet.
  const ensureTagByName = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = (tags || []).find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const res = await createTag({ name: trimmed });
    if (res.success && res.data?.id) {
      mutate("form-tags");
      return res.data.id;
    }
    return null;
  };

  // Pre-select the "walkthrough"/"guide" tags when starting a new walkthrough
  useEffect(() => {
    if (mode !== "create" || type !== "WALKTHROUGH" || !tags || tags.length === 0) return;
    const preselectNames = ["walkthrough", "guide"];
    const matches = tags
      .filter((t) => preselectNames.includes(t.name.toLowerCase()))
      .map((t) => t.id);
    if (matches.length > 0) {
      setSelectedTags((prev) => Array.from(new Set([...prev, ...matches])));
    }
  }, [tags, mode, type]);

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;
    const res = await createTag({ name: newTag.trim() });
    if (res.success && res.data?.id) {
      const newTagId = res.data.id;
      mutate("form-tags");
      setSelectedTags((prev) => [...prev, newTagId]);
      setNewTag("");
    } else {
      addToast({ type: "error", message: res.error || "Failed to create tag" });
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: (initialData?.title as string) || "",
      slug: (initialData?.slug as string) || "",
      excerpt: (initialData?.excerpt as string) || "",

      contentType: (initialData?.contentType as string) || type || "NEWS",
      seoTitle: (initialData?.seoTitle as string) || "",
      seoDescription: (initialData?.seoDescription as string) || "",
      gameName: (initialData?.modGuide as any)?.gameName || "",
      modName: (initialData?.modGuide as any)?.modName || "",
      gameVersionNotes: (initialData?.modGuide as any)?.gameVersionNotes || "",
      gameVersion: (initialData?.modGuide as any)?.gameVersion || "",
      gameVersionDate:
        (initialData?.modGuide as any)?.gameVersionDate?.slice(0, 10) || "",
      difficulty: (initialData?.modGuide as any)?.difficulty || "INTERMEDIATE",
      estimatedInstallMinutes:
        (initialData?.modGuide as any)?.estimatedInstallMinutes || 30,

      gameTitle: (initialData?.gameReview as any)?.gameTitle || "",
      developer: (initialData?.gameReview as any)?.developer || "",
      publisher: (initialData?.gameReview as any)?.publisher || "",
      releaseDate:
        (initialData?.gameReview as any)?.releaseDate?.slice(0, 10) || "",
      platforms: (initialData?.gameReview as any)?.platforms?.join(", ") || "",
      genres: (initialData?.gameReview as any)?.genres?.join(", ") || "",
      reviewScore: (initialData?.gameReview as any)?.reviewScore || 0,
      verdict: (initialData?.gameReview as any)?.verdict || "",
      showReviewDetails:
        (initialData?.gameReview as any)?.showReviewDetails ?? true,
      scoreUpdateReason: "",
      copyProvidedByPublisher:
        (initialData?.gameReview as any)?.copyProvidedByPublisher ?? false,

      chapter: initialChapter,
      bossCount: initialBossCount,

      store: (initialData?.deal as any)?.store || "",
      product: (initialData?.deal as any)?.product || "",
      price: (initialData?.deal as any)?.price || "",
      originalPrice: (initialData?.deal as any)?.originalPrice || "",
      url: (initialData?.deal as any)?.url || "",
      expiryDate: (initialData?.deal as any)?.expiryDate?.slice(0, 16) || "",
      dealPlatform: (initialData?.deal as any)?.platform || "",
      dealScore: (initialData?.deal as any)?.dealScore || 0,

      focusKeyword: (initialData?.focusKeyword as string) || "",
      featured: (initialData?.featured as boolean) ?? false,
      isBreaking: (initialData?.isBreaking as boolean) ?? false,
      isSponsored: (initialData?.isSponsored as boolean) ?? false,
      sponsorName: (initialData?.sponsorName as string) || "",
      isLiveBlog: (initialData?.isLiveBlog as boolean) ?? false,
      scheduledAt: (initialData?.scheduledAt as string)?.slice(0, 16) || "",
      embargoUntil: (initialData?.embargoUntil as string)?.slice(0, 16) || "",
    },
  });

  const currentType = watch("contentType");
  const currentGameVersion = watch("gameVersion");

  // Reviews link to exactly one game — drop extras if switching from a
  // content type that allowed multiple related games.
  useEffect(() => {
    if (currentType === "REVIEW" && selectedGames.length > 1) {
      setSelectedGames((prev) => prev.slice(0, 1));
    }
  }, [currentType, selectedGames.length]);

  const handleVerifyGuide = async () => {
    if (!slug || !currentGameVersion) return;
    setIsVerifying(true);
    const res = await verifyModGuide(slug, { version: currentGameVersion });
    setIsVerifying(false);
    if (res.success) {
      addToast({ type: "success", message: "Guide marked as verified" });
      setVerifiedInfo(res.data as any);
    } else {
      addToast({ type: "error", message: res.error || "Failed to verify guide" });
    }
  };

  const seoTitle = watch("seoTitle");
  const seoDescription = watch("seoDescription");
  const focusKeyword = watch("focusKeyword");
  const title = watch("title");

  const validationData: PublishValidationInput = useMemo(
    () => ({
      content,
      metaTitle: seoTitle || "",
      metaDesc: seoDescription || "",
      focusKw: focusKeyword || "",
      featuredImageUrl: featuredImage,
      wordCount: getWordCount(content),
      contentType: currentType || "NEWS",
    }),
    [
      content,
      seoTitle,
      seoDescription,
      focusKeyword,
      featuredImage,
      currentType,
    ],
  );

  const save = async (data: z.infer<typeof schema>, status: string) => {
    let finalStatus = status;
    if (
      mode === "edit" &&
      initialData?.status === "PUBLISHED" &&
      status === "DRAFT"
    ) {
      finalStatus = "PUBLISHED"; // Don't demote to draft via standard PUT
    }

    // Walkthroughs persist Chapter / Boss Count as "Chapter: X" / "Bosses: N" tags
    let walkthroughTagIds: string[] = [];
    if (currentType === "WALKTHROUGH") {
      const tagNames: string[] = [];
      if (data.chapter?.trim()) tagNames.push(`Chapter: ${data.chapter.trim()}`);
      if (data.bossCount !== undefined && data.bossCount !== null && !Number.isNaN(data.bossCount)) {
        tagNames.push(`Bosses: ${data.bossCount}`);
      }
      const ids = await Promise.all(tagNames.map((name) => ensureTagByName(name)));
      walkthroughTagIds = ids.filter((id): id is string => !!id);
    }
    const allTagIds = Array.from(new Set([...selectedTags, ...walkthroughTagIds]));

    const payload = {
      ...data,
      slug: data.slug?.trim() || undefined,
      content:
        currentType === "MOD_GUIDE" ? { type: "doc", content: [] } : content,
      sections:
        currentType === "MOD_GUIDE"
          ? (content as any[])?.map(({ id: _id, ...s }: any) => s)
          : undefined,
      prerequisiteList:
        currentType === "MOD_GUIDE"
          ? prereqs
              .filter((p) => p.name.trim())
              .map((p) => ({
                name: p.name.trim(),
                url: p.url.trim() || undefined,
                required: p.required,
              }))
          : undefined,
      featuredImageUrl: featuredImage || undefined,
      featuredImageCredit: featuredImageCredit || undefined,
      tagIds: allTagIds.length > 0 ? allTagIds : undefined,
      gameIds: selectedGames.length > 0 ? selectedGames : undefined,
      // GameReview.gameId is the FK the game hub page reads to find its editorial
      // review — distinct from gameIds (the Article<->Game tag relation above).
      gameId:
        currentType === "REVIEW" && selectedGames.length > 0
          ? selectedGames[0]
          : undefined,

      excerpt: data.excerpt || undefined,
      seoTitle: data.seoTitle || undefined,
      seoDescription: data.seoDescription || undefined,
      status: finalStatus,
      pendingDraftId: pendingDraftId || undefined,
      scheduledAt: data.scheduledAt
        ? new Date(data.scheduledAt).toISOString()
        : null,
      embargoUntil: data.embargoUntil
        ? new Date(data.embargoUntil).toISOString()
        : null,

      platforms: data.platforms
        ? data.platforms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      genres: data.genres
        ? data.genres
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      releaseDate: data.releaseDate
        ? new Date(data.releaseDate).toISOString()
        : undefined,
      gameVersionDate: data.gameVersionDate
        ? new Date(data.gameVersionDate).toISOString()
        : undefined,
      showReviewDetails: data.showReviewDetails,
      scoreUpdateReason: data.scoreUpdateReason || undefined,
      copyProvidedByPublisher: data.copyProvidedByPublisher,
      platformsTested: selectedPlatformsTested,

      // The backend expects deal fields flat (store, product, ..., expiryDate), not nested.
      // expiryDate comes from a datetime-local input ("YYYY-MM-DDTHH:mm") and must be
      // converted to full ISO before sending, same as scheduledAt/embargoUntil above.
      expiryDate: data.expiryDate
        ? new Date(data.expiryDate).toISOString()
        : undefined,
    };
    if (data.contentType === "REVIEW" && selectedGames.length !== 1) {
      addToast({
        type: "error",
        message: "A review must be linked to exactly one game.",
      });
      return;
    }

    let res;
    if (data.contentType === "MOD_GUIDE") {
      res =
        mode === "edit" && slug
          ? await updateModGuide(slug, payload)
          : await createModGuide(payload);
    } else if (data.contentType === "REVIEW") {
      if (mode === "edit" && slug && data.scoreUpdateReason && data.reviewScore !== undefined) {
        // BUG-02: Route score changes through the dedicated /score endpoint
        // which enforces EDITOR/ADMIN role and correctly preserves originalScore.
        const scoreRes = await updateReviewScore(slug, {
          reviewScore: data.reviewScore as number,
          scoreUpdateReason: data.scoreUpdateReason,
        });
        if (!scoreRes.success) {
          addToast({ type: "error", message: scoreRes.error || "Score update failed" });
          return;
        }
        // Send the rest of the review fields without the score fields
        const { reviewScore: _rs, scoreUpdateReason: _sr, ...payloadWithoutScore } = payload as Record<string, unknown>;
        res = await updateReview(slug, payloadWithoutScore);
      } else {
        res =
          mode === "edit" && slug
            ? await updateReview(slug, payload)
            : await createReview(payload);
      }
    } else {
      res =
        mode === "edit" && slug
          ? await updatePost(slug, payload)
          : await createPost(payload);
    }

    const isCreateWithAction = mode === "create" && status !== "DRAFT";
    const isEditWithStatusChange = mode === "edit" && slug && initialData?.status !== status;

    // Call action route if status changed or if a new article was created with a non-DRAFT status
    if (res.success && (isCreateWithAction || isEditWithStatusChange)) {
      const targetSlug = mode === "edit" ? slug : (res.data as any)?.slug;
      const actionMap: Record<string, string> = {
        DRAFT: "unpublish",
        IN_REVIEW: "submit",
        PUBLISHED: "publish",
        APPROVED: "approve",
      };
      
      if (actionMap[status] && targetSlug) {
        const actionRes = await updatePostStatus(
          targetSlug,
          actionMap[status],
          data.contentType,
        );
        if (!actionRes.success) {
          addToast({
            type: "error",
            message: `Saved, but failed to update status to ${status}`,
          });
          return;
        }
      }
    }

    if (res.success) {
      addToast({
        type: "success",
        message: `Post ${mode === "edit" ? "updated" : "created"}!`,
      });
      await revalidatePublicPages(slug, data.contentType);
      const redirectMap: Record<string, string> = {
        MOD_GUIDE: "/admin/mod-guides",
        REVIEW: "/admin/reviews",
        WALKTHROUGH: "/admin/walkthroughs",
        NEWS: "/admin/news",
        DEAL: "/admin/deals",
        FEATURE: "/admin/features",
        OPINION: "/admin/opinions",
        LISTICLE: "/admin/listicles",
      };
      router.push(redirectMap[data.contentType] || "/admin");
    } else {
      addToast({ type: "error", message: res.error || "Failed" });
    }
  };

  const currentStatusObj = initialData?.status
    ? ARTICLE_STATUS_LABELS[initialData.status as string]
    : null;

  return (
    <form className="flex-1 h-full min-h-0 flex flex-col w-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0 mb-2 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === "edit" ? "Edit Post" : "New Post"}
          </h1>
          {currentStatusObj && (
            <Badge className={currentStatusObj.color}>
              {currentStatusObj.label}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            loading={isSubmitting}
            onClick={handleSubmit((d) => save(d, "DRAFT"))}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={isSubmitting}
            onClick={handleSubmit((d) => save(d, "IN_REVIEW"))}
          >
            Submit for Review
          </Button>
          {(user?.role === "ADMIN" || user?.role === "EDITOR") && (
            <Button
              type="button"
              size="sm"
              icon={<Send className="w-4 h-4" />}
              loading={isSubmitting}
              onClick={handleSubmit(async (d) => {
                const checks = validateForPublish(validationData);
                if (checks.length > 0) {
                  setValidationChecks(checks);
                  setPendingData(d);
                  setIsPublishGateOpen(true);
                } else {
                  await save(d, "PUBLISHED");
                }
              })}
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      <PublishGate
        isOpen={isPublishGateOpen}
        onClose={() => setIsPublishGateOpen(false)}
        onConfirm={async () => {
          if (pendingData) {
            setIsPublishing(true);
            await save(pendingData, "PUBLISHED");
            setIsPublishing(false);
          }
          setIsPublishGateOpen(false);
        }}
        checks={validationChecks}
        isPublishing={isPublishing}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1 min-h-0 mt-2 pb-4 sm:pb-6 lg:pb-8 pl-4 sm:pl-6 lg:pl-8">
        {/* Main content — scrolls independently */}
        <div className="overflow-y-auto h-full min-h-0 space-y-4 pr-1 flex flex-col">
          {/* Content Card — title + editor with clear visual separation from page */}
          <div
            className="rounded-2xl border border-border bg-bg-surface shadow-sm flex flex-col shrink-0"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {/* Title area */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <input
                {...register("title")}
                placeholder="Post title…"
                className="w-full text-2xl font-bold bg-transparent border-none outline-none text-text-primary placeholder:text-text-dim leading-snug"
              />
              {errors.title && (
                <p className="text-xs text-danger mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Slug area */}
            <div className="px-5 py-2 border-b border-border bg-bg-secondary flex items-center gap-2">
              <label className="text-xs font-semibold text-text-muted shrink-0">
                Slug:
              </label>
              <input
                {...register("slug")}
                placeholder="auto-generated-from-title"
                className="w-full text-sm font-mono bg-transparent border-none outline-none text-text-primary placeholder:text-text-dim"
              />
              {errors.slug && (
                <p className="text-xs text-danger mt-1">
                  {errors.slug.message}
                </p>
              )}
            </div>

            {/* "Article Content" label row */}
            <div className="px-5 pt-3 pb-2 flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-dim select-none shrink-0">
                Article Content
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>



            {/* Editor — inside card, editor handles its own border / chrome */}
            <div className="flex flex-1 min-h-0">
              <div className="px-4 pb-4 pt-2 flex-1 min-w-0 flex flex-col">
                <RichTextEditor
                  content={content as Record<string, unknown>}
                  onChange={setContent}
                  multiSection={currentType === "MOD_GUIDE"}
                  postTitle={watch("title")}
                  slug={slug}
                  pendingDraftId={pendingDraftId}
                  onMetaChange={(meta) => {
                    if (meta.metaTitle) setValue("seoTitle", meta.metaTitle);
                    if (meta.metaDesc) setValue("seoDescription", meta.metaDesc);
                    if (meta.focusKw) setValue("focusKeyword", meta.focusKw);
                  }}
                  onEditorReady={setAiEditor}
                />
              </div>
              <AiAssistantSidebar
                editor={aiEditor}
                articleContent={extractText(content).slice(0, 2000)}
                existingTagIds={selectedTags}
                allTags={tags || []}
                onUseHeadline={(headline) => setValue("title", headline)}
                onUseExcerpt={(excerpt) => setValue("excerpt", excerpt)}
                onAddTag={(tagId) =>
                  setSelectedTags((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]))
                }
                onCreateAndAddTag={async (name) => {
                  const tagId = await ensureTagByName(name);
                  if (tagId) {
                    setSelectedTags((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
                  }
                }}
              />
            </div>
          </div>

          {/* Dynamic extra sections — MOD_GUIDE only */}
          {/* Extra sections UI removed in favor of internal editor tabs */}

          {currentType === "MOD_GUIDE" && (
            <div className="space-y-4 rounded-xl border border-border p-5 bg-bg-surface mt-6">
              <h3 className="font-bold text-lg text-text-primary">
                Mod Guide Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Game Name
                  </label>
                  <input
                    {...register("gameName")}
                    placeholder="e.g. Grand Theft Auto V"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  {errors.gameName && (
                    <p className="text-xs text-danger mt-1">{errors.gameName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Mod / Pack Name
                  </label>
                  <input
                    {...register("modName")}
                    placeholder="e.g. GTA V Redux (incl. NaturalVision ENB)"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  {errors.modName && (
                    <p className="text-xs text-danger mt-1">{errors.modName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Game Version <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...register("gameVersion")}
                    placeholder="e.g. 1.58"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  {errors.gameVersion && (
                    <p className="text-xs text-danger mt-1">{errors.gameVersion.message}</p>
                  )}
                  <p className="text-[11px] text-text-dim mt-1">The specific game version this guide was written for.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Game Version Release Date
                  </label>
                  <input
                    type="date"
                    {...register("gameVersionDate")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Game Version Notes
                  </label>
                  <input
                    {...register("gameVersionNotes")}
                    placeholder="e.g. GTA V 1.68 (Story Mode only)"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  {errors.gameVersionNotes && (
                    <p className="text-xs text-danger mt-1">{errors.gameVersionNotes.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Difficulty
                  </label>
                  <select
                    {...register("difficulty")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  >
                    <option value="EASY">Easy</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Install Time (mins)
                  </label>
                  <input
                    type="number"
                    {...register("estimatedInstallMinutes")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Verification status */}
              {mode === "edit" && slug && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-primary px-4 py-3">
                  <div className="text-xs text-text-muted">
                    {verifiedInfo?.lastVerifiedAt ? (
                      <>
                        Last verified{" "}
                        <span className="text-text-primary font-medium">
                          {new Date(verifiedInfo.lastVerifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {verifiedInfo.lastVerifiedVersion && (
                          <> against version <span className="text-text-primary font-medium">{verifiedInfo.lastVerifiedVersion}</span></>
                        )}
                        {verifiedInfo.lastVerifiedBy?.displayName && (
                          <> by <span className="text-text-primary font-medium">{verifiedInfo.lastVerifiedBy.displayName}</span></>
                        )}
                      </>
                    ) : (
                      "Never verified"
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyGuide}
                    disabled={isVerifying || !currentGameVersion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium hover:bg-accent-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isVerifying ? "Verifying..." : "Mark as Verified"}
                  </button>
                </div>
              )}

              {/* Prerequisites */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Prerequisites
                  </label>
                  <button
                    type="button"
                    onClick={addPrereq}
                    className="flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {prereqs.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={p.name}
                        onChange={(e) =>
                          updatePrereq(i, "name", e.target.value)
                        }
                        placeholder="Prerequisite name"
                        className="flex-1 px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <input
                        value={p.url}
                        onChange={(e) => updatePrereq(i, "url", e.target.value)}
                        placeholder="URL (optional)"
                        className="flex-1 px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <label className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.required}
                          onChange={(e) =>
                            updatePrereq(i, "required", e.target.checked)
                          }
                          className="rounded text-accent"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removePrereq(i)}
                        className="text-danger hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {prereqs.length === 0 && (
                    <p className="text-xs text-text-dim italic">
                      No prerequisites added yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentType === "REVIEW" && (
            <div className="space-y-4 rounded-xl border border-border p-5 bg-bg-surface mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-text-primary">
                  Game Review Details
                </h3>
                {isAutoFilling && (
                  <span className="flex items-center gap-1.5 text-xs text-accent animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Auto-filling from game data…
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Game Title
                  </label>
                  <input
                    {...register("gameTitle")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Developer
                  </label>
                  <input
                    {...register("developer")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Publisher
                  </label>
                  <input
                    {...register("publisher")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Release Date
                  </label>
                  <input
                    type="date"
                    {...register("releaseDate")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Platforms (comma separated)
                  </label>
                  <input
                    {...register("platforms")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Genres (comma separated)
                  </label>
                  <input
                    {...register("genres")}
                    placeholder="e.g. RPG, Action, Adventure"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Review Score (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("reviewScore")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      {...register("showReviewDetails")}
                      type="checkbox"
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Show Review Details on Public Page
                    </span>
                  </label>
                  <p className="text-[10px] text-text-muted mt-1 ml-6">
                    If disabled, the review score and verdict will not be
                    shown on the public post.
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Verdict
                  </label>
                  <textarea
                    {...register("verdict")}
                    rows={2}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-y"
                  />
                </div>

                {mode === "edit" && initialData?.status === "PUBLISHED" && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-text-muted mb-1 block">
                      Score update reason
                    </label>
                    <input
                      {...register("scoreUpdateReason")}
                      placeholder="Why is the score changing?"
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      {...register("copyProvidedByPublisher")}
                      type="checkbox"
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Copy provided by publisher
                    </span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Platforms tested
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORM_TESTED_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setSelectedPlatformsTested((prev) =>
                            prev.includes(p)
                              ? prev.filter((x) => x !== p)
                              : [...prev, p],
                          )
                        }
                        className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selectedPlatformsTested.includes(p) ? "bg-accent/20 text-accent-light" : "bg-bg-elevated text-text-muted hover:text-text-primary"}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentType === "WALKTHROUGH" && (
            <div className="space-y-4 rounded-xl border border-border p-5 bg-bg-surface mt-6">
              <h3 className="font-bold text-lg text-text-primary">
                Walkthrough Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Chapter
                  </label>
                  <input
                    {...register("chapter")}
                    placeholder="e.g. Chapter 3: The Crypt"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  <p className="text-[11px] text-text-dim mt-1">Used to organize this walkthrough by game chapter or section.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Boss Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...register("bossCount")}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Article meta preview */}
              {(() => {
                const chapterVal = (watch("chapter") as string | undefined) || "";
                const bossVal = watch("bossCount") as number | undefined;
                if (!chapterVal && (bossVal === undefined || bossVal === null)) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted rounded-lg border border-border bg-bg-primary px-4 py-3">
                    <span className="font-semibold text-text-primary">Article meta:</span>
                    {chapterVal && <Badge variant="info">{chapterVal}</Badge>}
                    {bossVal !== undefined && bossVal !== null && (
                      <Badge variant="info">{bossVal} boss{Number(bossVal) === 1 ? "" : "es"}</Badge>
                    )}
                  </div>
                );
              })()}
              <p className="text-[11px] text-text-dim">Saved as &ldquo;Chapter: …&rdquo; / &ldquo;Bosses: …&rdquo; tags so they can be filtered and displayed alongside this walkthrough.</p>
            </div>
          )}

          {currentType === "DEAL" && (
            <div className="space-y-4 rounded-xl border border-border p-5 bg-bg-surface mt-6">
              <h3 className="font-bold text-lg text-text-primary">
                Deal / Offer Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Retailer / Store
                  </label>
                  <input
                    {...register("store")}
                    placeholder="e.g. Amazon, Steam"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Product Name
                  </label>
                  <input
                    {...register("product")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Affiliate URL
                  </label>
                  <input
                    {...register("url")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Current Price
                  </label>
                  <input
                    {...register("price")}
                    placeholder="$29.99"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Original Price
                  </label>
                  <input
                    {...register("originalPrice")}
                    placeholder="$59.99"
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Platform Badge
                  </label>
                  <select
                    {...register("dealPlatform")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  >
                    <option value="">None</option>
                    <option value="PC">PC</option>
                    <option value="PS5">PlayStation 5</option>
                    <option value="Xbox">Xbox</option>
                    <option value="Switch">Nintendo Switch</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Deal Score (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("dealScore")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1 block">
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    {...register("expiryDate")}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — scrolls independently, never grows the page */}
        <div className="overflow-y-auto h-full min-h-0 space-y-4 pb-6">
          {mode === "edit" && slug && (
            <>
              <WorkflowActions
                articleSlug={slug}
                contentType={(initialData?.contentType as string) || type}
                currentStatus={(initialData?.status as string) || "DRAFT"}
                validationData={validationData}
                // EditPostPage is a client component fetching initialData via useSWR
                // (key: `edit-post-${slug}`), not server props — router.refresh() only
                // re-runs server-rendered data and does nothing here, which is why the
                // status badge stayed stale despite the action succeeding. Revalidate
                // the actual SWR cache entry instead.
                onStatusChange={() => mutate(`edit-post-${slug}`)}
                embargoUntil={(initialData?.embargoUntil as string) || undefined}
                scheduledAt={(initialData?.scheduledAt as string) || undefined}
                deletionRequestedAt={(initialData?.deletionRequestedAt as string) || null}
                deletionRequestedByName={(initialData?.deletionRequestedBy as { displayName?: string } | null)?.displayName || null}
                deletionRequestReason={(initialData?.deletionRequestReason as string) || null}
              />
              <OgImagePreview
                title={seoTitle || title || "Untitled Article"}
                description={seoDescription || ""}
                imageUrl={featuredImage || ""}
                siteUrl="https://thecoregamer.com"
                siteName="TheCoreGamer"
              />
              <SeoReadabilityPanel
                content={content}
                focusKeyword={focusKeyword || ""}
              />
              <BylineManager slug={slug} />
              <VersionHistory articleSlug={slug} currentContent={content} />
              <EditorNotesSidebar slug={slug} />
            </>
          )}

          <div className="rounded-xl bg-bg-surface border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Settings
            </h3>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">
                Content Type
              </label>
              <select
                {...register("contentType")}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none"
              >
                {Object.values(ContentType).map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {currentType !== "DEAL" && (
              <div>
                <label className="text-xs font-medium text-text-muted mb-1 block">
                  {currentType === "REVIEW" ? "Game" : "Related Games"}{" "}
                  {currentType === "REVIEW" && <span className="text-danger">*</span>}
                </label>
                {currentType === "REVIEW" && (
                  <p className="text-xs text-text-muted mb-1.5">
                    A review covers exactly one game.
                  </p>
                )}

                {/* Selected Game Pills */}
                {selectedGames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedGames.map((gameId) => {
                      const g = availableGames.find(
                        (ag: any) => ag.id === gameId,
                      ) || { id: gameId, title: "Unknown Game" };
                      // If it's a previously selected game that's not in the first 100, we still show the pill, though its title might be "Unknown Game".
                      // In a real app we'd fetch selected games by ID. For now initialData has title if needed, but we don't have it easily accessible here without a map.
                      // Let's see if we can get it from initialData
                      const initialG = (initialData?.games as any[])?.find(
                        (ig) => ig.id === gameId,
                      );
                      return (
                        <div
                          key={gameId}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent-light"
                        >
                          <span>
                            {g.title !== "Unknown Game"
                              ? g.title
                              : initialG?.title || "Unknown Game"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedGames((prev) =>
                                prev.filter((id) => id !== gameId),
                              )
                            }
                            className="hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Autocomplete Input — reviews are capped at one game */}
                {(currentType !== "REVIEW" || selectedGames.length === 0) && (
                <div className="relative">
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    placeholder={
                      currentType === "REVIEW"
                        ? "Search for the game this review covers..."
                        : "Search games..."
                    }
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                  />
                  {gameSearch.trim() && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-bg-surface border border-border rounded-lg shadow-lg">
                      {availableGames.filter(
                        (g: any) =>
                          g.title
                            .toLowerCase()
                            .includes(gameSearch.toLowerCase()) &&
                          !selectedGames.includes(g.id),
                      ).length > 0 ? (
                        availableGames
                          .filter(
                            (g: any) =>
                              g.title
                                .toLowerCase()
                                .includes(gameSearch.toLowerCase()) &&
                              !selectedGames.includes(g.id),
                          )
                          .map((g: any) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setSelectedGames((prev) =>
                                  currentType === "REVIEW" ? [g.id] : [...prev, g.id],
                                );
                                setGameSearch("");
                                if (currentType === "REVIEW") {
                                  autoFillReviewFromGame(g);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-primary transition-colors"
                            >
                              {g.title}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-text-muted italic">
                          No games found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(tags || []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(t.id)
                          ? prev.filter((id) => id !== t.id)
                          : [...prev, t.id],
                      )
                    }
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selectedTags.includes(t.id) ? "bg-accent/20 text-accent-light" : "bg-bg-elevated text-text-muted hover:text-text-primary"}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleCreateTag())
                  }
                  placeholder="New tag name"
                  className="w-full px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCreateTag}
                >
                  Create
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register("featured")}
                type="checkbox"
                className="rounded text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register("isBreaking")}
                type="checkbox"
                className="rounded text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Breaking News</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...register("isSponsored")}
                type="checkbox"
                className="rounded text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Sponsored Content</span>
            </label>
            {watch("isSponsored") && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Sponsor Name
                </label>
                <input
                  {...register("sponsorName")}
                  type="text"
                  placeholder="e.g. Acme Studios"
                  className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                />
                <p className="mt-1 text-[11px] text-text-muted">
                  FTC requires a clear "Sponsored" disclosure on the article — this name appears in that disclosure.
                </p>
              </div>
            )}
            {/* Live blog is a rolling-updates news format — Reviews/Mod Guides are static
                content and neither their schemas nor their public pages support it. */}
            {currentType !== "REVIEW" && currentType !== "MOD_GUIDE" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register("isLiveBlog")}
                  type="checkbox"
                  className="rounded text-accent focus:ring-accent"
                />
                <span className="text-sm text-text-primary">Enable Live Blog</span>
              </label>
            )}

          </div>

          <div className="rounded-xl bg-bg-surface border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Featured Image
            </h3>
            <ImageUploader value={featuredImage} onChange={setFeaturedImage} />
            <div className="mt-3">
              <label className="text-xs font-medium text-text-muted mb-1 block">
                Image Credit
              </label>
              <input
                type="text"
                value={featuredImageCredit}
                onChange={(e) => setFeaturedImageCredit(e.target.value)}
                placeholder="e.g. Getty Images"
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="rounded-xl bg-bg-surface border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">SEO</h3>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-text-muted">
                  SEO Title
                </label>
                <span
                  className={`text-[10px] ${(watch("seoTitle")?.length || 0) > 90 ? "text-danger" : "text-text-dim"}`}
                >
                  {watch("seoTitle")?.length || 0}/90
                </span>
              </div>
              <input
                {...register("seoTitle")}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-text-muted">
                  SEO Description
                </label>
                <span
                  className={`text-[10px] ${(watch("seoDescription")?.length || 0) > 250 ? "text-danger" : "text-text-dim"}`}
                >
                  {watch("seoDescription")?.length || 0}/250
                </span>
              </div>
              <textarea
                {...register("seoDescription")}
                rows={2}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-y"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-text-muted">
                  Focus Keyword
                </label>
              </div>
              <input
                {...register("focusKeyword")}
                placeholder="e.g. best gaming mouse"
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-text-muted">
                  Article Excerpt
                </label>
                <span
                  className={`text-[10px] ${(watch("excerpt")?.length || 0) > 300 ? "text-danger" : "text-text-dim"}`}
                >
                  {watch("excerpt")?.length || 0}/300
                </span>
              </div>
              <textarea
                {...register("excerpt")}
                rows={3}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-y"
              />
            </div>
          </div>
          {/* Mark as Major Update — edit mode only */}
          {mode === 'edit' && slug && (
            <MajorUpdateSection slug={slug} />
          )}

          {/* Live Blog updates panel — edit mode only, when enabled */}
          {mode === 'edit' && slug && watch('isLiveBlog') && (
            <LiveBlogPanel slug={slug} isEnded={!!(initialData?.liveBlogEndedAt)} />
          )}

        </div>
      </div>
    </form>
  );
}
