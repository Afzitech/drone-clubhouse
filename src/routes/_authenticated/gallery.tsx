import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/gallery")({
  component: GalleryPage,
});

type Item = {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  uploaded_by: string;
  created_at: string;
};

function GalleryPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Item[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("gallery_items")
      .select("id,title,caption,image_url,uploaded_by,created_at")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  }

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const list = (roles ?? []).map((r) => r.role);
      setCanUpload(list.includes("admin") || list.includes("lead"));
      setIsAdmin(list.includes("admin"));
      load();
    })();
  }, [user.id]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("gallery")
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return alert(upErr.message);
    }
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error } = await supabase.from("gallery_items").insert({
      title: title.trim(),
      caption: caption.trim() || null,
      image_url: pub.publicUrl,
      uploaded_by: user.id,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setTitle("");
    setCaption("");
    setFile(null);
    load();
  }

  async function remove(item: Item) {
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase
      .from("gallery_items")
      .delete()
      .eq("id", item.id);
    if (error) return alert(error.message);
    // best-effort delete of storage object
    try {
      const url = new URL(item.image_url);
      const idx = url.pathname.indexOf("/gallery/");
      if (idx >= 0) {
        const key = decodeURIComponent(url.pathname.slice(idx + "/gallery/".length));
        await supabase.storage.from("gallery").remove([key]);
      }
    } catch {
      /* ignore */
    }
    setItems((x) => x.filter((i) => i.id !== item.id));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[10px] uppercase tracking-widest text-primary">
          / Hangar · Showcase gallery /
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Gallery</h1>
        <p className="mono mt-1 text-[11px] text-muted-foreground">
          Images here are publicly visible on the landing page.
        </p>
      </div>

      {canUpload && (
        <form
          onSubmit={upload}
          className="hud-panel corner-brackets space-y-3 p-5"
        >
          <p className="mono text-[10px] uppercase tracking-widest text-command">
            / Upload photo /
          </p>
          <input
            className="hud-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={140}
          />
          <input
            className="hud-input"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="mono text-xs text-muted-foreground"
          />
          <button
            disabled={busy}
            className="mono rounded border border-command/40 bg-command/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-command hover:bg-command/20 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Publish to gallery"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="hud-panel p-6 text-center">
          <p className="mono text-xs text-muted-foreground">
            Gallery is empty.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="hud-panel corner-brackets overflow-hidden">
              <div className="aspect-video overflow-hidden bg-surface">
                <img
                  src={it.image_url}
                  alt={it.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground">
                  {it.title}
                </p>
                {it.caption && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.caption}
                  </p>
                )}
                {isAdmin && (
                  <button
                    onClick={() => remove(it)}
                    className="mono mt-2 rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
