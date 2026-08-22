import { Expo } from "expo-server-sdk";

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : undefined,
);

// Sends a push notification to every valid Expo push token in `tokens`.
// Best-effort: logs and swallows delivery errors instead of throwing, since
// notification delivery should never block the action that triggered it.
export const sendPushNotifications = async (
  tokens,
  { title, body, data, image } = {},
) => {
  const validTokens = [...new Set(tokens)].filter((token) =>
    Expo.isExpoPushToken(token),
  );
  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    // Renders as a big-picture/rich-media attachment on the notification
    // itself (not just once the app is opened) - must be an absolute,
    // publicly reachable URL, since Expo's push service fetches it directly.
    ...(image ? { richContent: { image } } : {}),
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Failed to send push notification chunk:", err);
    }
  }
};
