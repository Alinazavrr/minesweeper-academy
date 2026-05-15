import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CosmeticKind, EquippedSkins } from "@/lib/cosmetics/catalog";
import type { Database } from "@/types/supabase";

export type OwnedSkin = Pick<
  Database["public"]["Tables"]["user_cosmetics"]["Row"],
  "skin_id" | "kind" | "price" | "equipped" | "acquired_at"
>;

export async function getOwnedSkins(userId: string): Promise<OwnedSkin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_cosmetics")
    .select("skin_id,kind,price,equipped,acquired_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as OwnedSkin[];
}

export function pickEquipped(owned: ReadonlyArray<OwnedSkin>): EquippedSkins {
  let ui: string | null = null;
  let board: string | null = null;
  for (const row of owned) {
    if (!row.equipped) continue;
    if (row.kind === "ui") ui = row.skin_id;
    if (row.kind === "board") board = row.skin_id;
  }
  return { ui, board };
}

export async function getEquippedSkinsForCurrentUser(): Promise<EquippedSkins> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ui: null, board: null };
  const owned = await getOwnedSkins(userId);
  return pickEquipped(owned);
}

export async function purchaseSkin(input: {
  skinId: string;
  kind: CosmeticKind;
  price: number;
}): Promise<{
  skinId: string;
  kind: CosmeticKind;
  price: number;
  equipped: boolean;
  minesBalance: number;
  alreadyOwned: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_skin", {
    target_skin_id: input.skinId,
    target_kind: input.kind,
    target_price: input.price,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("purchase_skin returned no row");
  return {
    skinId: row.skin_id,
    kind: row.kind,
    price: row.price,
    equipped: row.equipped,
    minesBalance: row.mines_balance,
    alreadyOwned: row.already_owned,
  };
}

export async function setEquippedSkin(input: {
  kind: CosmeticKind;
  skinId: string | null;
}): Promise<{ kind: CosmeticKind; equippedSkinId: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_equipped_skin", {
    target_kind: input.kind,
    target_skin_id: input.skinId as string,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("set_equipped_skin returned no row");
  return { kind: row.kind, equippedSkinId: row.equipped_skin_id ?? null };
}
