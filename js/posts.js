import { supabase } from "./supabase.js";

export async function uploadPhoto(file, userId) {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("lunch-photos")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("lunch-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createLunchSpot({ userId, shopName, comment, latitude, longitude, photoUrl }) {
  const { data, error } = await supabase
    .from("lunch_spots")
    .insert([
      {
        user_id: userId,
        shop_name: shopName,
        comment,
        latitude,
        longitude,
        photo_url: photoUrl
      }
    ])
    .select();

  if (error) throw error;
  return data;
}

export async function fetchLunchSpots() {
  const { data, error } = await supabase
    .from("lunch_spots")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}