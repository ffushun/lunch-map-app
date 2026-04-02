import { supabase } from "./supabase.js";

export async function uploadPhoto(file, userId) {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("post-photos")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("post-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createPost({
  userId,
  posterName,
  shopName,
  rating,
  latitude,
  longitude,
  photoUrl
}) {
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        user_id: userId,
        poster_name: posterName,
        shop_name: shopName,
        rating,
        latitude,
        longitude,
        photo_url: photoUrl
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deletePost(postId) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (error) throw error;
}