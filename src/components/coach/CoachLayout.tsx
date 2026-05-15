"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CoachChat } from "@/components/coach/CoachChat";
import {
  ConversationList,
  type ConversationListItem,
} from "@/components/coach/ConversationList";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  conversations: ConversationListItem[];
  selectedId: string | null;
  initialMessages: Message[];
  initialUsage: {
    tier: "free" | "pro_lite" | "pro";
    limit: number;
    used: number;
    remaining: number;
  };
  conversationKind: "free_chat" | "post_game_review";
  conversationTitle: string | null;
  reviewGameId: string | null;
};

export function CoachLayout(props: Props) {
  const router = useRouter();
  const onNew = useCallback(() => {
    router.push("/coach");
  }, [router]);

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ConversationList
        items={props.conversations}
        selectedId={props.selectedId}
        onNew={onNew}
      />
      <CoachChat
        key={props.selectedId ?? "__new__"}
        initialConversationId={props.selectedId}
        initialMessages={props.initialMessages}
        initialUsage={props.initialUsage}
        conversationKind={props.conversationKind}
        conversationTitle={props.conversationTitle}
        reviewGameId={props.reviewGameId}
      />
    </div>
  );
}
