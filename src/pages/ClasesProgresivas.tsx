import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClassCardView from "@/components/ClassCardView";
import { CLASSES, type ClassId, type CardType } from "@/data/classCardsData";
import { useAuth } from "@/contexts/AuthContext";

export default function ClassCardPage({ cardType, title }: { cardType: CardType; title: string }) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const targetUserId = searchParams.get("userId") || user?.id || null;
  const isViewingOther = !!searchParams.get("userId") && searchParams.get("userId") !== user?.id;
  const initialClass = (searchParams.get("class") as ClassId) || "amigo";
  const [active, setActive] = useState<ClassId>(initialClass);

  useEffect(() => {
    const c = searchParams.get("class") as ClassId | null;
    if (c && CLASSES.some((x) => x.id === c)) setActive(c);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={title} subtitle={isViewingOther ? "Vista de administrador" : "Conquistadores"} />
      <div className="container py-6 space-y-4">
        <Tabs value={active} onValueChange={(v) => setActive(v as ClassId)}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
            {CLASSES.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="text-xs py-2">{c.label}</TabsTrigger>
            ))}
          </TabsList>
          {CLASSES.map((c) => (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              {active === c.id && (
                <ClassCardView classId={c.id} cardType={cardType} targetUserId={targetUserId} isViewingOther={isViewingOther} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}