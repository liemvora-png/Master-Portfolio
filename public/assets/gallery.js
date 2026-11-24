const galleryGrid = document.querySelector("#gallery-grid");
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const constrainedNetwork = Boolean(
  connection && (connection.saveData || connection.effectiveType === "slow-2g" || connection.effectiveType === "2g")
);

fetch("/api/gallery", { headers: { Accept: "application/json" } })
  .then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load photographs.");
    galleryGrid.replaceChildren();
    if (result.images.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Photographs will be added here.";
      galleryGrid.append(empty);
      return;
    }
    for (const [index, photo] of result.images.entries()) {
      const figure = document.createElement("figure");
      figure.className = "gallery-photo";
      const frame = document.createElement("div");
      frame.className = "gallery-photo-frame";
      const image = document.createElement("img");
      image.alt = photo.alt_text;
      image.loading = index < 3 ? "eager" : "lazy";
      if (index < 3) image.fetchPriority = "high";
      image.decoding = "async";
      image.width = 1200;
      image.height = 900;
      image.className = "gallery-photo-image";
      frame.append(image);
      figure.append(frame);

      const originalUrl = photo.image_url;
      const targetUrl = photo.medium_url || originalUrl;
      const lowUrl = photo.preview_url || targetUrl;
      const hasPreview = lowUrl !== targetUrl;

      function markReady() {
        image.classList.remove("is-preview");
        image.classList.add("is-ready");
      }

      function upgrade(url) {
        if (!url || url === image.src) {
          markReady();
          return;
        }
        const candidate = new Image();
        candidate.decoding = "async";
        candidate.width = 1200;
        candidate.height = 900;
        candidate.onload = async () => {
          try {
            if (typeof candidate.decode === "function") await candidate.decode();
          } catch {}
          image.src = url;
          requestAnimationFrame(markReady);
        };
        candidate.onerror = () => {
          if (url !== originalUrl) {
            upgrade(originalUrl);
          } else {
            markReady();
          }
        };
        candidate.src = url;
      }

      image.addEventListener("load", () => {
        if (hasPreview) {
          image.classList.add("is-preview");
          if (constrainedNetwork && !photo.medium_url) {
            image.addEventListener("click", () => upgrade(targetUrl), { once: true });
          } else {
            upgrade(targetUrl);
          }
        } else {
          markReady();
        }
      }, { once: true });

      image.addEventListener("error", () => {
        if (image.src !== targetUrl && targetUrl !== lowUrl) {
          upgrade(targetUrl);
        } else if (image.src !== originalUrl && originalUrl !== lowUrl) {
          upgrade(originalUrl);
        } else {
          markReady();
        }
      }, { once: true });

      image.src = lowUrl;
      if (photo.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = photo.caption;
        figure.append(caption);
      }
      galleryGrid.append(figure);
    }
  })
  .catch((error) => {
    galleryGrid.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    galleryGrid.append(message);
  });
