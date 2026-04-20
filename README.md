# PromptLab: Advanced Prompt Engineering Environment

PromptLab is a specialized full-stack application designed rapidly for AI engineers, data scientists, and prompt designers to build, test, evaluate, and sweep LLM prompts. 

---

## Screenshots & Interface

<details>
<summary>Click to expand application visuals</summary>

*(Note to maintainer: please drop the relevant image files into `frontend/img/`)*

`![Landing Page View](./frontend/img/screenshot_landing.png)`  
`![Playground Editor](./frontend/img/screenshot_playground.png)`  
`![Parameter Sweep Tool](./frontend/img/screenshot_sweep.png)`

</details>

---

## 🛠️ Setup Instructions

### Prerequisites
- **Python 3.10+**
- **Groq API Key**: Go to [Groq Console](https://console.groq.com/) to retrieve one.

### 1. Backend Initialization
The backend relies on Flask and standard routing. 
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
Inside the `/backend` folder, duplicate `.env.example` as `.env` and paste in your Groq API credentials:
```env
GROQ_API_KEY=your_groq_api_key_here
FLASK_PORT=5000
```
*Note: SQLite databases will implicitly structure themselves upon your first runtime.*

### 3. Execution
Run both the Python Flask Application and the static UI server simultaneously:

**Terminal 1 (Backend API):**
```bash
cd backend
python app.py
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
python -m http.server 8080
```
Now, simply pop open `http://localhost:8080` in your web browser. 

---

## 🏛️ Architecture Overview

The application features a decoupled Client/Server architecture built for robust API isolation.

- **Frontend (Vanilla HTML/CSS/JS)**:
    - **Single Page Application**: Uses Javascript DOM manipulation for zero-latency screen transitions wrapped inside a central `#app-wrapper`.
    - **API Services**: `api.js` encapsulates API calls, streaming mechanisms, and route bindings.
    - **Dynamic Look & Feel**: The UI utilizes CSS Custom Properties (Variables) over an HSL grid applying structural glassmorphism and modern gradient lighting techniques.
- **Backend (Python / Flask)**:
    - **Service Model Architecture**: Separates Blueprint mapping (`/routes`) from Inference handling (`/services/llm_service.py`), keeping code lightweight.
    - **Persistence DB**: Uses SQLAlchemy mapping to `models/database.py` referencing standard local `playground.db` endpoints.

---

## 🧠 Supported Prompt Techniques

The system provides built-in boilerplate templates instructing models natively using:

1. **Zero-Shot**: Direct execution devoid of examples.
2. **Few-Shot**: Establishing structured patterns via sample pairs.
3. **Chain-of-Thought**: Instructing the model to reason stepwise (e.g., "Think step-by-step").
4. **Role-Based**: Force-assigning behavioral conditions and domain expertise.
5. **Output Format Control**: Constraining the returned schema (like requesting strict JSON).
6. **Negative Prompting**: Explicit instruction sets determining what *not* to generate.
7. **Self-Consistency**: Multi-layered sampling rules for logical certainty.

---

## 📡 API Documentation

PromptLab's Flask API handles traffic efficiently across modular blueprint routing.

### Core Inference Routes (`/routes/generate.py`)
- **`POST /api/generate`**: Standard prompt synthesis firing standard single payload parameters (temperature, Top-P, context).
- **`POST /api/compare`**: Runs two asynchronous generations (A vs. B config splits) and returns multi-dimensional responses mapping tokens to differing inference models.
- **`POST /api/sweep`**: A brute-force payload loop. Synthesizes dozens of background context payloads looping varying parameter arrays (e.g., Temperature 0.1 through 0.9). 

### Persistence Routes (`/routes/history` & `/routes/prompts`)
- **`GET /api/prompts`**: Returns stored Library prompt objects alongside their optimized configurations.
- **`POST /api/prompts/save`**: Commits a custom playground iteration into the internal Database.
- **`GET /api/history`**: Retrieves prior generation states based on `session_id` tokens.
- **`POST /api/history/rate`**: Allows user feedback updates on specific generation history IDs (e.g., scoring logic quality).
- **`GET /api/health`**: Simple status ping verifying Flask heartbeat.
