import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        animationLab: "animation-lab.html",
        originalAnimationReview: "original-animation-review.html",
        spineAnimationReview: "spine-animation-review.html"
      }
    }
  }
});
