import { Suspense } from "react"
import UserDashboardLayout from "@/components/dashboard/user-dashboard-layout"
import UserFavoritesList from "@/components/dashboard/user/user-favorites-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export default function UserFavoritesPage() {
  return (
    <UserDashboardLayout title="My Favorites">
      <p className="text-olive-600 mb-8 -mt-4">Access your saved practitioners and services.</p>

      <Tabs defaultValue="practitioners" className="space-y-6">
          <TabsList>
            <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="saved-searches">Saved Searches</TabsTrigger>
          </TabsList>

          <TabsContent value="practitioners">
            <Suspense fallback={<FavoritesListSkeleton />}>
              <UserFavoritesList />
            </Suspense>
          </TabsContent>

          <TabsContent value="services">
            <Suspense fallback={<FavoritesListSkeleton />}>
              <UserFavoritesList type="services" />
            </Suspense>
          </TabsContent>

          <TabsContent value="saved-searches">
            <Suspense fallback={<FavoritesListSkeleton />}>
              <div className="text-center py-12">
                <p className="text-muted-foreground">You don't have any saved searches yet.</p>
              </div>
            </Suspense>
          </TabsContent>
        </Tabs>
    </UserDashboardLayout>
  )
}

function FavoritesListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
