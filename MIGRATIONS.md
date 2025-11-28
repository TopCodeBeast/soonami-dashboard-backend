# Database Migrations Guide

This project uses TypeORM migrations to manage database schema changes.

## Migration Commands

### Run Migrations
```bash
npm run migration:run
```
This will execute all pending migrations.

### Generate a New Migration
```bash
npm run migration:generate src/migrations/YourMigrationName
```
This will generate a migration based on entity changes.

### Create an Empty Migration
```bash
npm run migration:create src/migrations/YourMigrationName
```
This creates an empty migration file for manual SQL.

### Revert Last Migration
```bash
npm run migration:revert
```
This will revert the last executed migration.

### Show Migration Status
```bash
npm run migration:show
```
This shows which migrations have been run.

## Auto-Run Migrations on Startup

To automatically run migrations when the app starts, set the environment variable:
```env
RUN_MIGRATIONS=true
```

## Important Notes

1. **Never use `synchronize: true` in production** - It's disabled in this project
2. **Always test migrations** in development before running in production
3. **Backup your database** before running migrations in production
4. Migrations are stored in `src/migrations/` directory
5. Compiled migrations are in `dist/src/migrations/` after building

## Current Migrations

- `1699999999999-RemovePasswordColumn.ts` - Removes the password column from users table (no longer needed for email verification login)

## Migration Workflow

1. Make changes to entities
2. Generate migration: `npm run migration:generate src/migrations/YourMigrationName`
3. Review the generated migration file
4. Test in development: `npm run migration:run`
5. Commit the migration file
6. Deploy and run migrations in production

