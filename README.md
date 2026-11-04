# Mukti Git & Open Source Contribution Workshop 🚀

Welcome to the **Mukti Git and Open Source Contribution Workshop**!

This repository is a live, collaborative canvas for learning Git and open-source contribution workflows.

---

## 🎯 The Secret Sentence Challenge

Below is a hidden message where each word is represented by a slot number.

Each participant is assigned a specific number (and a secret word by the workshop organizers). When you submit a Pull Request replacing your assigned number with your secret word, our automated bot will validate your change and reveal the secret message in real time!

---

## 📜 The Secret Sentence

<!-- MUKTI-SENTENCE-START -->
1 2 3 4 5 6 7 8 9 10
<!-- MUKTI-SENTENCE-END -->

---

## 🛠️ How to Contribute

1. **Find your assignment:** Get your assigned slot number and secret word from the organizers.
2. **Fork the repo:** Click the **Fork** button at the top-right of this page.
3. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/Mukti-GitHub.git
   cd Mukti-GitHub
   ```
4. **Create a new branch:**
   ```bash
   git checkout -b contrib-<your-number>
   ```
5. **Make your edit:** Open `README.md`, find your assigned number in the sentence above, and replace **ONLY** that number with your assigned word. Do not touch other numbers or lines!
6. **Commit and push:**
   ```bash
   git add README.md
   git commit -m "Replace slot <your-number> with assigned word"
   git push origin contrib-<your-number>
   ```
7. **Open a Pull Request:** Go to your fork on GitHub and click **Compare & pull request**.
8. **Watch the live automation:** The Mukti Bot will automatically validate your submission, merge your word, update the sentence, and comment with the real-time progress! 🎉
