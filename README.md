# GMU DAEN Capstone Project - GitHub Repository Structure

## Overview

This repository provides a standardized directory structure for **George Mason University (GMU) College of Engineering and Computing (CEC) Data Analytics Engineering (DAEN) Program Capstone Projects**. This structure has been designed to accommodate the typical requirements of DAEN capstone projects, which are generally Python-based, include graphical user interfaces (GUIs), utilize Docker containerization, and require comprehensive testing and documentation.

---

## Important Notice

**This directory structure represents a commonly used and recommended organization for capstone projects. However, it is not mandatory.** Each project team has the full authority and flexibility to:

- Modify this structure to better fit their project's specific needs
- Add or remove folders as required
- Reorganize the hierarchy
- Choose not to use this structure at all

The goal is to provide a solid starting point and best practices, while recognizing that every project is unique and may have different requirements.

---

## Directory Structure

```
.
├── .github/                    # GitHub-specific configurations
│   ├── workflows/              # GitHub Actions CI/CD workflows
│   ├── ISSUE_TEMPLATE/         # Templates for GitHub issues
│   └── PULL_REQUEST_TEMPLATE/  # Templates for pull requests
├── config/                     # Configuration files
│   ├── development/            # Development environment configs
│   ├── production/             # Production environment configs
│   └── testing/                # Testing environment configs
├── data/                       # Data files (excluded from git by default)
│   ├── raw/                    # Original, immutable data
│   ├── processed/              # Cleaned and transformed data
│   ├── external/               # Data from external sources
│   └── interim/                # Intermediate transformed data
├── deployment/                 # Deployment configurations
│   ├── kubernetes/             # Kubernetes manifests (if applicable)
│   └── terraform/              # Infrastructure as Code (if applicable)
├── docker/                     # Docker-related files
│   ├── app/                    # Application container configs
│   ├── database/               # Database container configs
│   └── nginx/                  # Web server/reverse proxy configs
├── docs/                       # Project documentation
│   ├── user_guide/             # End-user documentation
│   ├── technical/              # Technical documentation
│   ├── api/                    # API documentation
│   └── images/                 # Images, diagrams, and screenshots
├── logs/                       # Application logs (excluded from git)
├── notebooks/                  # Jupyter notebooks
│   ├── exploratory/            # Exploratory data analysis (EDA)
│   └── reports/                # Analysis reports and visualizations
├── scripts/                    # Utility scripts
│   ├── deployment/             # Deployment automation scripts
│   ├── data_processing/        # Data ETL/processing scripts
│   └── utilities/              # General utility scripts
├── src/                        # Source code
│   ├── api/                    # API endpoints and routes
│   ├── gui/                    # GUI components and interfaces
│   ├── models/                 # Data models and ML models
│   ├── utils/                  # Utility functions and helpers
│   └── database/               # Database connection and ORM models
├── tests/                      # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
├── .gitignore                  # Git ignore file
├── LICENSE                     # Project license
├── README.md                   # This file
├── requirements.txt            # Python dependencies
├── setup.py                    # Package installation script (optional)
└── docker-compose.yml          # Docker Compose configuration
```

---

## Detailed Directory Descriptions

### `.github/`
**Purpose:** Contains GitHub-specific configurations and automation.

- **`workflows/`**: GitHub Actions YAML files for CI/CD pipelines, automated testing, deployment, and other workflow automation.
- **`ISSUE_TEMPLATE/`**: Templates to standardize how team members and stakeholders create issues (e.g., bug reports, feature requests).
- **`PULL_REQUEST_TEMPLATE/`**: Templates to ensure pull requests contain necessary information for code review.

**Common Use Cases:**
- Automated testing on push/pull requests
- Automated deployment to staging/production
- Code quality checks and linting

---

### `config/`
**Purpose:** Stores configuration files for different environments.

- **`development/`**: Configuration files specific to local development environments (database connections, API keys for dev services, debug settings).
- **`production/`**: Production-ready configurations (optimized settings, production database connections, error handling).
- **`testing/`**: Configurations for testing environments (test databases, mock services, test API keys).

**Common Use Cases:**
- Database connection strings
- API endpoints and keys
- Feature flags
- Logging levels
- Application settings (e.g., JSON, YAML, TOML files)

**Security Note:** Never commit sensitive credentials. Use environment variables or secret management tools.

---

### `data/`
**Purpose:** Stores all data files used by the project. This folder is typically excluded from version control via `.gitignore` due to file size and sensitivity.

- **`raw/`**: Original, unmodified data exactly as received from the source. This data should be treated as immutable.
- **`processed/`**: Data that has been cleaned, normalized, or transformed and is ready for analysis or model training.
- **`external/`**: Data obtained from external sources or third-party APIs.
- **`interim/`**: Intermediate data that has been partially processed but requires further transformation.

**Best Practices:**
- Document data sources and collection methods
- Include data dictionaries or schemas
- Consider using DVC (Data Version Control) for large datasets
- Store large files in cloud storage (S3, Azure Blob, etc.) and reference them

---

### `deployment/`
**Purpose:** Contains infrastructure and deployment configurations.

- **`kubernetes/`**: Kubernetes manifests for container orchestration (deployments, services, ingress, configmaps, secrets).
- **`terraform/`**: Infrastructure as Code (IaC) files for provisioning cloud resources (AWS, Azure, GCP).

**Common Use Cases:**
- Automated infrastructure provisioning
- Scaling configurations
- Load balancer setup
- Cloud resource management

---

### `docker/`
**Purpose:** Contains all Docker-related configurations for containerizing the application.

- **`app/`**: Dockerfiles and configs for the main application container.
- **`database/`**: Dockerfiles and initialization scripts for database containers.
- **`nginx/`**: Configuration files for NGINX web server or reverse proxy.

**Common Files:**
- `Dockerfile`: Instructions for building Docker images
- `.dockerignore`: Files to exclude from Docker context
- Initialization scripts and startup commands

---

### `docs/`
**Purpose:** Comprehensive project documentation for various audiences.

- **`user_guide/`**: Documentation for end-users on how to use the application (installation, features, tutorials).
- **`technical/`**: Technical documentation for developers (architecture, design decisions, system diagrams).
- **`api/`**: API documentation (endpoints, request/response formats, authentication).
- **`images/`**: Supporting visual materials (screenshots, architecture diagrams, flowcharts, wireframes).

**Recommended Tools:**
- Markdown files for simple documentation
- Sphinx or MkDocs for generating documentation websites
- Swagger/OpenAPI for API documentation
- Draw.io or Lucidchart for diagrams

---

### `logs/`
**Purpose:** Stores application logs generated during runtime.

**Best Practices:**
- Exclude from version control (add to `.gitignore`)
- Implement log rotation to manage disk space
- Use structured logging (JSON format)
- Consider centralized logging solutions (ELK stack, CloudWatch, etc.)

---

### `notebooks/`
**Purpose:** Contains Jupyter notebooks for data analysis and experimentation.

- **`exploratory/`**: Notebooks for exploratory data analysis (EDA), data visualization, and initial investigations.
- **`reports/`**: Polished notebooks that serve as reports or presentations of findings.

**Best Practices:**
- Use clear naming conventions with dates or version numbers
- Clean notebooks before committing (clear outputs if they contain sensitive data)
- Consider using nbconvert to export to HTML/PDF for sharing

---

### `scripts/`
**Purpose:** Standalone scripts for various automation tasks.

- **`deployment/`**: Scripts to automate deployment processes (build, test, deploy pipelines).
- **`data_processing/`**: ETL (Extract, Transform, Load) scripts, data cleaning, and preprocessing scripts.
- **`utilities/`**: General-purpose utility scripts (database backups, report generation, monitoring).

**Common Scripts:**
- Database migration scripts
- Data seeding scripts
- Backup and restore scripts
- Environment setup scripts

---

### `src/`
**Purpose:** The main source code directory containing all application code.

- **`api/`**: RESTful API endpoints, route definitions, request handlers (e.g., Flask routes, FastAPI endpoints).
- **`gui/`**: Graphical user interface components (e.g., Tkinter, PyQt, Streamlit, or web frontend code).
- **`models/`**:
  - Data models (classes representing business entities)
  - Machine learning models (trained models, model architectures)
  - Database ORM models (SQLAlchemy, Django ORM)
- **`utils/`**: Reusable utility functions and helper modules (data validation, formatters, converters).
- **`database/`**: Database connection management, query builders, database initialization scripts.

**Organization Tips:**
- Follow Python package structure with `__init__.py` files
- Keep modules focused and single-purpose
- Use clear, descriptive naming conventions

---

### `tests/`
**Purpose:** All testing code to ensure application quality and reliability.

- **`unit/`**: Unit tests that test individual functions or methods in isolation. Should be fast and numerous.
- **`integration/`**: Integration tests that verify multiple components work together correctly (e.g., API + Database).
- **`e2e/`**: End-to-end tests that simulate real user scenarios and test the entire application flow.

**Testing Frameworks:**
- `pytest`: Most popular Python testing framework
- `unittest`: Built-in Python testing framework
- `selenium`: For GUI and web application testing
- `pytest-cov`: For code coverage reports

**Best Practices:**
- Aim for high test coverage (>80%)
- Write tests before or alongside feature development (TDD)
- Use fixtures and mocks to isolate tests
- Run tests automatically in CI/CD pipeline

---

## Root-Level Files

### `.gitignore`
Specifies files and directories that Git should ignore (e.g., `__pycache__/`, `*.pyc`, `data/`, `logs/`, `.env`, virtual environments).

### `LICENSE`
Specifies the legal license for the project (e.g., MIT, Apache 2.0, GPL). Consult with your advisor or university about appropriate licensing.

### `README.md`
This file. Provides an overview of the project, setup instructions, and directory structure documentation.

### `requirements.txt`
Lists all Python package dependencies with version numbers. Used with `pip install -r requirements.txt`.

Alternative: `pyproject.toml` for modern Python projects using Poetry or similar tools.

### `setup.py`
Makes the project installable as a Python package. Useful for larger projects and for enabling `pip install -e .` for development.

### `docker-compose.yml`
Defines multi-container Docker applications, making it easy to spin up the entire application stack (app, database, cache, etc.) with a single command.

---

## Getting Started

### Prerequisites
- Python 3.8+ (verify with your project requirements)
- Docker and Docker Compose
- Git
- Virtual environment tool (venv, conda, or virtualenv)

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run with Docker (if applicable):**
   ```bash
   docker-compose up --build
   ```

6. **Run tests:**
   ```bash
   pytest tests/
   ```

---

## Development Workflow

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally:**
   - Write code in the `src/` directory
   - Add tests in the `tests/` directory
   - Update documentation as needed

3. **Run tests and linting:**
   ```bash
   pytest tests/
   flake8 src/
   black src/  # Code formatting
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

5. **Create a pull request:**
   - Use the pull request template
   - Request review from team members
   - Address feedback and merge

---

## Contributing

Please follow these guidelines:
- Follow PEP 8 style guidelines for Python code
- Write meaningful commit messages
- Add tests for new features
- Update documentation for significant changes
- Review and test before submitting pull requests

---

## Team Customization

This structure is a **starting template**. Your team should:
- Evaluate which folders are relevant to your specific project
- Add additional folders as needed for your use case
- Remove unused folders to keep the repository clean
- Update this README to reflect your actual structure
- Document any deviations from this standard structure

---

## Support and Resources

- **GMU DAEN Program:** https://analyticsengineering.gmu.edu/
- **Git Documentation:** https://git-scm.com/doc
- **Docker Documentation:** https://docs.docker.com/
- **Python Best Practices:** https://docs.python-guide.org/

---

## License

[Specify your project license here]

---

## Contact

For questions about this structure or the DAEN Capstone program, contact:
- Project Team: [Team Email/Contact]
- Faculty Advisor: [Advisor Name and Email]
- Program Coordinator: [Coordinator Contact]

---

**Last Updated:** January 2026

