# 🏙️ ArchiVerse AI — Parallel-World City Builder

> A JavaFX desktop simulation application featuring multi-world state management and custom Data Structures & Algorithms (DSA) integration.

![Java](https://img.shields.io/badge/Java-21+-orange?style=for-the-badge&logo=java)
![JavaFX](https://img.shields.io/badge/JavaFX-GUI-blue?style=for-the-badge)
![Maven](https://img.shields.io/badge/Maven-Build-red?style=for-the-badge&logo=apachemaven)

---

## 📖 Overview

**ArchiVerse AI** is an interactive parallel-world city builder built as a Data Structures and Algorithms (DSA) project. **Milestone 2** focuses on bridging custom backend data structures with a responsive **JavaFX** graphical user interface, allowing users to seamlessly toggle between alternate realities (**World A** and **World B**) while maintaining full state history for instant rollbacks.

---

## ✨ Key Features

- **🌐 Parallel Reality Switching:** Toggle dynamically between *World A (Prime Reality)* and *World B (Parallel Reality)*.
- **↩️ Custom Stack-Backed Undo System:** Every reality switch and state change is tracked using a custom-built generic `CustomStack<T>` (LIFO) implementation.
- **🖥️ Interactive JavaFX Interface:** Clean, responsive desktop UI with real-time status feedback.
- **🧱 Modular Package Architecture:** Clear separation between GUI presentation logic and core DSA implementations.

---

## 📂 Project Structure

```text
ArchiVerseAI/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── archiverse/
│                   ├── App.java                # Main JavaFX Application & UI Event Handlers
│                   └── dsa/
│                       └── CustomStack.java    # Generic Stack Implementation for Action History
├── pom.xml                                     # Maven Dependencies & JavaFX Plugin Config
└── README.md                                   # Project Documentation
