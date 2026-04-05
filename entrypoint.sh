#!/bin/bash
set -e

# Configuration
# Load .env variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="./backups"
DB_CONTAINER="insmanag_db"
# Use DB_NAME from .env, fallback to 'postgres' if not set
TARGET_DB=${DB_NAME:-postgres}
# If you are running this on the host, you might need to ensure the DB container is actually named this.
# Also, we assume 'docker compose' commands work here (user has docker installed).

echo "=========================================="
echo "      InsManag Startup & Restore          "
echo "=========================================="

echo "Step 1: Checking for backups in $BACKUP_DIR..."

# Find latest database dump (sort by time, take top 1)
LATEST_DB_DUMP=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -n1)
LATEST_MEDIA_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -n1)

if [ -z "$LATEST_DB_DUMP" ]; then
    echo "Warning: No database dump found ending in .dump"
else
    echo "Found database dump: $LATEST_DB_DUMP"
fi

if [ -z "$LATEST_MEDIA_BACKUP" ]; then
    echo "Warning: No media backup found ending in .tar.gz"
else
    echo "Found media backup: $LATEST_MEDIA_BACKUP"
fi

echo "Step 2: Starting Database Service..."
docker compose up -d db

echo "Step 3: Waiting for Database to be ready..."
# Loop until pg_isready returns 0 inside the container
# We use 'postgres' user to check readiness
MAX_RETRIES=30
COUNT=0
until docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
    echo "Waiting for postgres... ($COUNT/$MAX_RETRIES)"
    sleep 2
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "Error: Database failed to become ready in time."
        exit 1
    fi
done
echo "Database is ready!"

echo "Step 4: Performing Restore (if backups exist)..."

if [ -n "$LATEST_DB_DUMP" ]; then
    echo "Restoring database from $LATEST_DB_DUMP..."
    
    # Copy dump to container to avoid pipe issues
    DUMP_FILENAME=$(basename "$LATEST_DB_DUMP")
    docker cp "$LATEST_DB_DUMP" "$DB_CONTAINER:/tmp/$DUMP_FILENAME"
    
    # Try pg_restore first (for custom format)
    echo "Attempting restore with pg_restore..."
    if docker exec "$DB_CONTAINER" pg_restore -U postgres -d "$TARGET_DB" --clean --if-exists --no-owner --role=postgres "/tmp/$DUMP_FILENAME"; then
        echo "Restore successful via pg_restore."
    else
        echo "pg_restore failed (run manually to see full error). Trying psql as fallback..."
        # Fallback to psql (for plain text sql dumps)
        if docker exec "$DB_CONTAINER" psql -U postgres -d "$TARGET_DB" -f "/tmp/$DUMP_FILENAME"; then
             echo "Restore successful via psql."
        else
             echo "Restore failed. Please check the backup file and database logs."
             # Don't exit 1, maybe allow startup anyway? 
             # Or better, stop? Let's stop to be safe.
             exit 1
        fi
    fi
    
    # Cleanup temp file
    docker exec "$DB_CONTAINER" rm "/tmp/$DUMP_FILENAME"
    
else
    echo "No database backup to restore."
fi

if [ -n "$LATEST_MEDIA_BACKUP" ]; then
    echo "Restoring media files from $LATEST_MEDIA_BACKUP..."
    
    # Start a temporary container with the media volume mounted
    # We mount the backup directory read-only to the temp container
    # We use tar to extract.
    
    # Check if we can find the volume name.
    # Docker Compose usually names it project_volume.
    # We can inspect the 'api' container to find the exact mount if needed, 
    # but 'docker volume ls' is easier if we know the project name.
    # The docker-compose.yml defines 'media_volume'.
    
    # Let's try to just run a container that mounts the volume named 'insmanag_media_volume' 
    # (assuming directory name 'insmanag' + '_media_volume').
    # A safer way is using 'volumes-from' if we had a running service, but 'api' isn't up.
    # We can use the 'db' container as a helper? No, it doesn't have the volume.
    
    # Correct approach: Start a temp container with the named volume.
    # We need the correct volume name.
    PROJECT_NAME="insmanag" 
    # Note: If valid docker compose project name differs, this might fail.
    # Let's use `docker compose run` which is context-aware!
    
    # We can define a simplified one-off command using docker compose directly
    # But `docker compose run` starts a service defined in yaml.
    # We can run `api` with a custom command?
    # Yes, but that might start deps.
    
    # Best way: Use 'docker run' with the volume name found via 'docker compose config'
    # Actually, we can use `docker compose run --rm --entrypoint ... api ...`
    
    # Let's stick to the previous method but use `docker compose run`?
    # Or just `tar` into the volume path if it's local? No, it's a docker volume.
    
    # Let's assume the volume name 'insmanag_media_volume' based on 'docker volume ls' output usually.
    # Better: get it from docker compose.
    # MEDIA_VOL logic removed as it caused crash (api service not running) and is unused.
    
    # Since api isn't running, `docker compose ps` might be empty.
    # We started `db`.
    
    # Let's just use `docker compose run` to extract handling volume mapping automatically.
    # We mount the backup file as a volume to the run command.
    BACKUP_ABS_PATH=$(realpath "$LATEST_MEDIA_BACKUP")
    
    echo "Extracting media using docker compose run..."
    docker compose run --rm -v "$BACKUP_ABS_PATH":/backup.tar.gz --entrypoint sh api -c "cd /app/media && tar -xzf /backup.tar.gz"
    
    echo "Media restore complete."
fi

echo "Step 5: Starting remaining services..."
docker compose up -d

echo "=========================================="
echo "      Startup Complete!                   "
echo "=========================================="
