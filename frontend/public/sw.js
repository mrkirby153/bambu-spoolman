self.addEventListener("install", () => {
  self.skipwaiting();
});

self.addEventListener("activate", () => {
  self.registration.unregister().then(() =>
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    }),
  );
});
