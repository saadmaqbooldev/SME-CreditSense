FROM python:3.14-slim

WORKDIR /app

COPY pyproject.toml requirements.txt README.md alembic.ini ./

# Dependencies install before the source is copied, so editing anything under src/ --
# a frontend tweak especially -- reuses the cached pip layer instead of re-downloading
# ~400 MB of wheels on every rebuild.
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
ENV PYTHONPATH=/app/src

CMD ["uvicorn", "creditsense.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
