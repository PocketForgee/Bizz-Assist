"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { KnowledgeRow, LearnedRow, QaRow } from "@/lib/qa";
import type { PublicAction } from "@/lib/action-public";
import { QaTab } from "@/components/qa";
import { Segmented, SubNav } from "@/components/ui";
import { DocumentsTab, WebsiteTab } from "./sources";
import { ActionsTab } from "./actions";
import { LearnedTab } from "./learned";

export type TrainTab = "website" | "documents" | "qa" | "actions" | "learned";

export function TrainTabs(props: {
  tab: TrainTab;
  ask?: string;
  web: KnowledgeRow[];
  docs: KnowledgeRow[];
  qa: QaRow[];
  actions: PublicAction[];
  learned: LearnedRow[];
  limits: { pages: number; qa: number; actions: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<TrainTab>(props.tab);
  const [learnedCount, setLearnedCount] = useState(props.learned.length);

  function go(t: TrainTab) {
    setTab(t);
    router.replace(`${pathname}?tab=${t}`, { scroll: false });
  }

  return (
    <>
      <SubNav title="Train" />
      <div className="mb-6 overflow-x-auto">
        <Segmented<TrainTab>
          label="Training sources"
          value={tab}
          onChange={go}
          options={[
            { value: "website", label: "Website" },
            { value: "documents", label: "Documents" },
            { value: "qa", label: "Q&A" },
            { value: "actions", label: "API Actions" },
            { value: "learned", label: learnedCount ? `Learned (${learnedCount})` : "Learned" },
          ]}
        />
      </div>
      {/* tabs stay mounted so switching keeps their state and polling */}
      <div hidden={tab !== "website"}>
        <WebsiteTab initial={props.web} limit={props.limits.pages} />
      </div>
      <div hidden={tab !== "documents"}>
        <DocumentsTab initial={props.docs} />
      </div>
      <div hidden={tab !== "qa"}>
        <QaTab initial={props.qa} limit={props.limits.qa} ask={props.ask} />
      </div>
      <div hidden={tab !== "actions"}>
        <ActionsTab initial={props.actions} limit={props.limits.actions} />
      </div>
      <div hidden={tab !== "learned"}>
        <LearnedTab initial={props.learned} onCountChange={setLearnedCount} />
      </div>
    </>
  );
}
