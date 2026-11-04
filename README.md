# Mukti Git & Open Source Contribution Workshop 🚀

Welcome to the **MUKTI — One Contribution, One Community** interactive open-source challenge!

This repository is a live, collaborative canvas for learning Git and open-source contribution workflows.

---

## 🎯 The Secret Sentence Challenge

Below is our community message where each word is represented by a numbered slot.

Each participant is assigned a specific number (and a secret word by the organizers). When you submit a Pull Request replacing your assigned number with your word, the sentence will be automatically verified and revealed in real time!

---

## 📜 The Secret Sentence

<!-- MUKTI-SENTENCE-START -->
1 2 3 4 5 6 7 8 9 10
<!-- MUKTI-SENTENCE-END -->

---

## 📊 Live Progress: 0/10 Words Revealed (0%)

`[░░░░░░░░░░░░░░░░░░░░]`

*Status: **LOCKED** | Last updated: 2026-11-04T18:57:22.220Z*

---

## 🛠️ How to Contribute

1. **Find your assigned slot:** Check with the organizers or find your assigned number in the [Participants Directory](PARTICIPANTS.md).
2. **Fork this repository:** Click the **Fork** button at the top-right of this page.
3. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/Mukti-GitHub.git
   cd Mukti-GitHub
   ```
4. **Create your contribution branch:**
   ```bash
   git checkout -b contrib-<your-slot-number>
   ```
5. **Make your edit:** Open `README.md`, find your assigned number in the single sentence above, and replace **ONLY** that number with your assigned word. Do not modify any other numbers or files!
6. **Commit and push:**
   ```bash
   git add README.md
   git commit -m "Replace slot <your-slot-number> with assigned word"
   git push origin contrib-<your-slot-number>
   ```
7. **Open a Pull Request:** Go to your fork on GitHub and click **Compare & pull request**.
8. **Automated verification:** The Mukti Bot will automatically validate your submission, merge your word, update the sentence, and comment with live progress! 🎉
