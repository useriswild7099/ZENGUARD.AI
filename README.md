# ZenGuard AI 🛡️
> **Privacy-First Mental Health Companion & Sentiment Analytics**

ZenGuard AI is a sophisticated, edge-computing mental health platform designed for students. It leverages the **Gemma 3:4B** large language model running entirely on local hardware via **Ollama** to provide deep emotional insights, personalized companion interactions, and grounding exercises without compromising user privacy.

---

## ✨ Key Features

### 👤 57+ AI Personalities (Elite Realism Stack)
Experience conversations with a diverse range of companions, from **Stoic Philosophers** and **Global Icons** to **Family Archetypes**.
- **Tiered Behavioral Architecture**: Each persona follows a 7-tier hierarchy (Identity, Lexical Fingerprints, Emotional Intensity, Rhythm Variance, Micro-Imperfections, and Question Control).
- **Linguistic Mirroring**: AI adapts its vocabulary and cadence to match the user's emotional state.
- **Privacy-Locked Identity**: Personas are strictly non-clinical and non-judgmental.

### 🧠 Advanced Sentiment Analytics
- **Emotional Masking Detection**: Detects discrepancies between stated feelings and underlying stress patterns.
- **Visual Mood Tracking**: Multimodal analysis of "Mood Doodles" to interpret unspoken emotions.
- **Chain-of-Thought Reasoning**: Uses `<think>` tags to reason through complex emotional patterns before responding.

### 🛡️ Privacy by Design
- **Client-Side Sanitization**: PII (Personally Identifiable Information) is scrubbed locally before analysis.
- **Stateless Processing**: Zero database connections. No conversation history is stored server-side.
- **Zero-Log Policy**: Server logs are disabled to ensure ephemeral, truly private interactions.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **LLM Engine** | Google Gemma 3:4B (Ollama) |
| **Backend** | Python 3.10+, FastAPI |
| **Frontend** | React, Next.js 14, Tailwind CSS |
| **Privacy** | Custom PII Scrubber (Client-side) |
| **Deployment** | Local-First / Self-Hosted |

---

## 🚀 How to Run Locally (Foolproof Guide)

ZenGuard AI runs 100% on your local machine to guarantee your privacy. It is literally impossible for us to see your data because nothing leaves your computer! 

Follow these 3 simple steps to get started:

### 1. Install Prerequisites
Before you start, make sure you have installed:
- **[Ollama](https://ollama.com/)** (The engine that runs the AI locally)
- **[Node.js](https://nodejs.org/)** (v18.0 or higher)
- **[Python](https://www.python.org/downloads/)** (v3.10 or higher)

### 2. Download the AI Model
Open your terminal or command prompt and run this command. This will download the specific AI brain (Gemma 3:4B) that ZenGuard uses.
```bash
ollama pull gemma3:4b
```

### 3. Start the Project

First, clone (download) the repository to your computer:
```bash
git clone https://github.com/useriswild7099/ZENGUARD.AI.git
cd ZENGUARD.AI
```

You need to open **two separate terminal windows**.

**Terminal 1: Start the Backend (The Brain)**
```bash
cd backend

# Create a virtual environment (keeps things clean)
python -m venv venv

# Activate it (Run ONE of the following based on your OS)
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt

# Start the server!
uvicorn main:app --port 8000 --reload
```

**Terminal 2: Start the Frontend (The Interface)**
```bash
cd frontend

# Install the required Node packages
npm install

# Start the website!
npm run dev
```

That's it! 🎉 Now open your browser and go to `http://localhost:3500` to start chatting with your private companions.

---

## 📂 Project Architecture

```bash
├── backend/
│   ├── models/       # Pydantic data schemas
│   ├── routers/      # API endpoints (Sentiment, Chat)
│   ├── services/     # NLP Engine, Ollama Client
│   ├── tools/        # Verification & Audit utilities
│   └── prompts.py    # Global Persona Architecture
├── frontend/
│   ├── src/app/      # Next.js layouts & pages
│   ├── src/comp/     # React visuals & interaction
│   └── src/lib/      # API & Privacy orchestration
├── research/         # Design docs & research materials
└── PERSONA_REGISTRY.md # Detailed mapping of all 57 personalities
```

---

## 📑 Documentation
For a deep dive into the AI's cognitive design, see:
- [PERSONA_REGISTRY.md](./PERSONA_REGISTRY.md) - Behavioral logic for every companion.
- [RESEARCH](./research/) - Core design principles and feature research.

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with focus on student well-being and digital sovereignty.*
