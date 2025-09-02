# copilot-instructions.md

## General Style
- Use modern JavaScript (ES6+).
- Use `import`/`export` syntax. Do not use `require` or `module.exports`.
- Prefer concise and clean code, with clear structure over clever one-liners.

## Project Structure
- Entry point of the app is `server.js`, not `index.js`.
- Follow MVC architecture.
- Directory structure includes:
  - `public/` for static assets.
  - `views/` with subfolder `includes/` for handlebars partials (e.g., header, footer).
  - `controllers/` for controller or middleware logic.
  - `routers/` for route definitions.
  - `models/` for Sequelize models (one model per file).
  - `models.js` to import all other models, define associations, `sync` using `{alter: JSON.parse(process.env.SYNCMODELS)}`, and export all as `Models`.
  - `config/` for configuration files (e.g., handlebars.js, database.js, security.js).

## Backend
- Use `express` and `express-handlebars`.
- Use `helmet`, `compression`, or other middlewares only if needed.
- Avoid over-engineering and unnecessary abstraction.

## Database
- Use `Sequelize` with `PostgreSQL`.
- Define each model in a separate file in the `models/` folder.
- Relationships and `sequelize.sync()` logic go into `models.js` not into each model file.
- Export a unified `Models` object from `models.js` (e.g., `Models.User`, `Models.Department`).

## Frontend
- Use `Adminator` that uses `Bootstrap 5`.
- Use `Alpine.js` only when interactivity is needed. Avoid heavy JS frameworks like React.
- Keep frontend logic simple and enhance progressively only when necessary.

## Naming Conventions
- Use `camelCase` for variables and functions.
- Use `PascalCase` for class names and Sequelize models.
- Use `snake_case` for PostgreSQL table and column names if applicable, but map them using Sequelize's field options.

## Comments & Documentation
- Use `JSDoc` comments for all exported functions, classes, and objects.
- For internal-only functions, use a short inline comment to describe the purpose.
- Prefer self-documenting code over verbose comments.
- Do not overcomment obvious logic.

## Don'ts
- Don't use `require`.
- Don't use frontend frameworks (React, Vue, etc.).
- Don't define model relationships inside individual model files.
- Don't add routes or controller logic directly inside `server.js` for large apps.

