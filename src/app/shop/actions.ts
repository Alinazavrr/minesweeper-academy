"use server";

import { revalidatePath } from "next/cache";
import { findSkin, type CosmeticKind } from "@/lib/cosmetics/catalog";
import {
  purchaseSkin as purchaseSkinDb,
  setEquippedSkin as setEquippedSkinDb,
} from "@/lib/db/cosmetics";
import { createClient } from "@/lib/supabase/server";

export type ShopActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const INITIAL_SHOP_STATE: ShopActionState = {
  status: "idle",
  message: "",
};

async function ensureSignedIn(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

function revalidateAll() {
  // Skins are read in layout.tsx, so every route needs to re-render.
  revalidatePath("/", "layout");
}

export async function purchaseSkinAction(
  _state: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const userId = await ensureSignedIn();
  if (!userId) {
    return { status: "error", message: "Sign in to buy skins." };
  }
  const skinId = String(formData.get("skin_id") ?? "");
  const skin = findSkin(skinId);
  if (!skin) return { status: "error", message: "Unknown skin." };

  try {
    const result = await purchaseSkinDb({
      skinId: skin.id,
      kind: skin.kind,
      price: skin.price,
    });
    revalidateAll();
    if (result.alreadyOwned) {
      return { status: "success", message: `${skin.name} is already owned.` };
    }
    return {
      status: "success",
      message: `Purchased ${skin.name}. ${result.minesBalance} Mines left.`,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not buy skin.",
    };
  }
}

export async function equipSkinAction(
  _state: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const userId = await ensureSignedIn();
  if (!userId) {
    return { status: "error", message: "Sign in first." };
  }
  const skinId = String(formData.get("skin_id") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  if (kindRaw !== "ui" && kindRaw !== "board") {
    return { status: "error", message: "Bad skin kind." };
  }
  const kind: CosmeticKind = kindRaw;

  try {
    await setEquippedSkinDb({ kind, skinId });
    revalidateAll();
    const skin = findSkin(skinId);
    return {
      status: "success",
      message: skin ? `Equipped ${skin.name}.` : "Skin equipped.",
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not equip skin.",
    };
  }
}

export async function unequipSkinAction(
  _state: ShopActionState,
  formData: FormData,
): Promise<ShopActionState> {
  const userId = await ensureSignedIn();
  if (!userId) {
    return { status: "error", message: "Sign in first." };
  }
  const kindRaw = String(formData.get("kind") ?? "");
  if (kindRaw !== "ui" && kindRaw !== "board") {
    return { status: "error", message: "Bad skin kind." };
  }
  const kind: CosmeticKind = kindRaw;

  try {
    await setEquippedSkinDb({ kind, skinId: null });
    revalidateAll();
    return { status: "success", message: "Skin removed." };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not unequip skin.",
    };
  }
}
