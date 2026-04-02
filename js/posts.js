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

function extractStoragePathFromPublicUrl(photoUrl) {
  if (!photoUrl) return null;

  const marker = "/storage/v1/object/public/post-photos/";
  const idx = photoUrl.indexOf(marker);

  if (idx === -1) {
    return null;
  }

  return photoUrl.substring(idx + marker.length);
}

export async function deletePostWithPhoto(post) {
  if (!post || !post.id) {
    throw new Error("削除対象の投稿が不正です");
  }

  // 1. 画像削除
  if (post.photo_url) {
    const path = extractStoragePathFromPublicUrl(post.photo_url);

    if (path) {
      const { error: storageError } = await supabase.storage
        .from("post-photos")
        .remove([path]);

      if (storageError) {
        throw storageError;
      }
    }
  }

  // 2. DB削除
  const { error: dbError } = await supabase
    .from("posts")
    .delete()
    .eq("id", post.id);

  if (dbError) throw dbError;
}
