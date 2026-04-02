import { supabase } from "./supabase.js";

export async function fetchLikes(postId) {
  const { data, error } = await supabase
    .from("likes")
    .select("*")
    .eq("post_id", postId);

  if (error) throw error;
  return data;
}

export async function addLike(postId, userId) {
  const { data, error } = await supabase
    .from("likes")
    .insert([
      {
        post_id: postId,
        user_id: userId
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeLike(postId, userId) {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error) throw error;
}
