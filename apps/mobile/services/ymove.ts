const API_KEY = process.env.EXPO_PUBLIC_YMOVE_API_KEY;

export const getExerciseVideos = async () => {
  const res = await fetch("https://api.ymove.app/v1/exercises", {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  return res.json();
};