import { PlaylistItem } from "@/types/playlist";

export function PlaylistPreview({ items }: { items: (PlaylistItem | null)[] | undefined }) {
  if (!items || items.length === 0) return null;

  const validItems = items.filter((item): item is PlaylistItem => item !== null && item !== undefined);

  if (validItems.length === 0) return null;

  return (
    <div className="mt-4 flex gap-1 overflow-hidden">
      {validItems.slice(0, 4).map((item) => (
        <div
          key={item.id}
          className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted"
        >
          {item.rss_feed_url ? (
            <div className="h-full w-full flex items-center justify-center bg-red-600">
              <span className="text-xs text-white font-bold">RSS</span>
            </div>
          ) : item.asset && item.asset.type === "image" ? (
            <img
              src={item.asset.url || "/placeholder.svg"}
              alt={item.asset.name}
              className="h-full w-full object-cover"
            />
          ) : item.asset ? (
            <video
              src={item.asset.url}
              className="h-full w-full object-cover"
              muted
            />
          ) : null}
        </div>
      ))}
      {validItems.length > 4 && (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted text-sm text-muted-foreground">
          +{validItems.length - 4}
        </div>
      )}
    </div>
  );
}
