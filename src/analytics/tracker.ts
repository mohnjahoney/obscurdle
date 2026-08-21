const TRACKER_ENDPOINT = "https://public-data-receiver-test.mohnjahoney.chatgpt.site/api/test"

export function trackObscurdleEvent(message: string): void {
  void fetch(TRACKER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt or alter gameplay.
  })
}
