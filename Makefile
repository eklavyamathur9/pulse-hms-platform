.PHONY: help lint lint-fix test build clean compose-up compose-down security-scan dev seed setup freeze

help:
	@echo "Pulse HMS - Development Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  lint           Run ruff (backend) and eslint (frontend)"
	@echo "  lint-fix       Auto-fix lint issues"
	@echo "  test           Run backend pytest suite"
	@echo "  build          Build frontend for production + backend compile check"
	@echo "  clean          Remove __pycache__, .pytest_cache, build artifacts"
	@echo "  compose-up     Start Docker Compose (backend + frontend + db)"
	@echo "  compose-down   Stop Docker Compose"
	@echo "  security-scan  Run ruff security checks"
	@echo "  setup          Full local dev setup (deps, DB, seed)"
	@echo "  dev            Start backend + frontend for local development"
	@echo "  seed           Seed the database with demo data"
	@echo "  freeze         Generate requirements-lock.txt from current env"

lint:
	cd backend && python -m ruff check . && python -m ruff format --check .
	cd frontend && npm run lint

lint-fix:
	cd backend && python -m ruff check --fix . && python -m ruff format .
	cd frontend && npx eslint --fix src/

test:
	cd backend && python -m pytest -q tests/

build:
	cd frontend && npm run build
	cd backend && python -m py_compile app.py auth_routes.py hospital_routes.py models.py patient_routes.py seed.py auth_utils.py config.py validation.py services/*.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist/
	rm -rf .ruff_cache/
	rm -rf *.egg-info/

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down

security-scan:
	cd backend && python -m ruff check --select S .

setup:
	cd backend && pip install -r requirements.txt
	cd backend && flask --app app.py db -d migrations upgrade 2>/dev/null || true
	cd backend && python seed.py 2>/dev/null || true
	cd frontend && npm install

dev:
	@echo "Starting backend..."
	cd backend && python app.py &
	@echo "Starting frontend..."
	cd frontend && npm run dev

seed:
	cd backend && python seed.py

freeze:
	cd backend && pip freeze > requirements-lock.txt
	@echo "Generated backend/requirements-lock.txt"

.PHONY: help lint lint-fix test build clean compose-up compose-down security-scan dev seed setup freeze
