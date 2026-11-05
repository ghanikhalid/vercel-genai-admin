import AdminHeader from "@/app/components/AdminHeader";
import ImagesLibrary from "@/app/components/ImagesLibrary";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { loadAdminContext } from "@/lib/adminData";
import { listCatalog, type StudioImage } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="images"
        nextPath="/images"
      />
    );
  }

  const images = await listCatalog<StudioImage>("images");

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="images" isSuperadmin />
      <main className="main-content">
        <ImagesLibrary
          images={images.rows}
          missing={images.missing}
          error={images.error}
        />
      </main>
    </div>
  );
}
