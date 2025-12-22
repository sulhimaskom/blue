# 🤖 Automated GitHub Repository Template

> Template repository with AI agent workflows running 24/7.

---

## 🚀 Quick Start

### 1. Use This Template
```bash
# Clone or "Use this template" on GitHub
git clone https://github.com/{{OWNER}}/{{REPO}}.git
cd {{REPO}}
```

### 2. Configure Blueprint
Edit `docs/architecture/blueprint.md` with your project specs, or use the prompt generator:

```bash
# Open docs/prompt.md
# Copy prompt, fill placeholders, paste to AI
# Copy result to docs/architecture/blueprint.md
```

### 3. Setup GitHub Secrets
In repository Settings → Secrets → Actions, add:

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | GitHub Personal Access Token (repo scope) |
| `IFLOW_API_KEY` | API key for OpenCode AI |

### 4. Enable Workflows
```bash
# Push to dev branch to trigger workflows
git checkout -b dev
git push -u origin dev
```

---

## 📁 Structure

```
.
├── .github/
│   ├── workflows/
│   │   ├── init.yml            # Auto-initialize repo
│   │   ├── ci-check.yml        # CI validation
│   │   ├── oc analyzer.yml     # Code analysis agent
│   │   ├── oc standarizer.yml  # Code improvement agent
│   │   └── oc smart-ci.yml     # Auto-fix CI failures
│   └── branch protection rules.json
├── docs/
│   ├── architecture/
│   │   ├── blueprint.md        # 📌 MAIN CONFIG FILE
│   │   └── roadmap.md          # Development timeline
│   ├── deployment/
│   │   └── SETUP.md            # Deployment guide
│   ├── prompt.md               # Blueprint generator prompt
│   ├── task.md                 # Task checklist
│   ├── bug.md                  # Bug tracker
│   ├── evaluasi.md             # Code evaluation report
│   └── README.md               # Docs index
├── AGENTS.md                   # 📌 AI AGENT RULES
├── LICENSE                     # License file
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## 🔄 Workflow Cycle

```
     ┌─────────────────────────────────────────┐
     │                                         │
     ▼                                         │
┌─────────┐    ┌──────────────┐    ┌──────────┐
│ Analyzer │───▶│ Standarizer  │───▶│ CI Check │
└─────────┘    └──────────────┘    └──────────┘
     │                                    │
     │         ┌────────────┐             │
     │         │ Smart CI   │◀────────────┘
     │         │ (auto-fix) │         (on failure)
     │         └────────────┘
     │                │
     └────────────────┘
```

**Analyzer** → Evaluates code, updates docs/evaluasi.md  
**Standarizer** → Picks task, implements improvements  
**CI Check** → Validates lint/test/build  
**Smart CI** → Auto-fixes failures  

---

## 📋 Key Files

| File | Purpose |
|------|---------|
| `docs/architecture/blueprint.md` | **Configure your project here** |
| `AGENTS.md` | Rules that AI agents must follow |
| `docs/prompt.md` | Prompt to generate blueprint |
| `docs/task.md` | Track progress |
| `docs/evaluasi.md` | Code quality report |

---

## ⚙️ Configuration

### Branch Protection
Import `.github/branch protection rules.json` via GitHub API or configure manually:
- Require PR before merge
- Require status checks (CI Check)
- No force push

### Workflow Triggers
| Workflow | Trigger |
|----------|---------|
| `init` | Push to `main` when blueprint changes |
| `oc analyzer` | Push to `dev`, Manual |
| `oc standarizer` | After analyzer completes |
| `ci-check` | Pull requests to `dev`/`main` |
| `oc smart-ci` | After standarizer, or CI failure |

---

## 📝 License

MIT License - See LICENSE file

---

**Template by {{AUTHOR}}**
