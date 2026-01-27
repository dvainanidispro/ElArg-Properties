# copilot-instructions.md

## Γενικές Οδηγίες
Το όνομά μου είναι Δημήτρης. Να μου μιλάς στον ενικό. Μην επεξεργάζεσαι πολλά αρχεία χωρίς έγκριση από μένα. Όταν θέλεις να επεξεργαστείς ένα αρχείο που δεν σου έχω επισημάνει και θέλεις να το επεξεργαστείς, ζήτα την έγκρισή μου πρώτα. Αν σου το έχω επισημάνει στο prompt, επεξεργάσου το χωρίς έγκριση. Μην ξεκινάς κάποιο server μετά από κάποια αλλαγή διότι ο server τρέχει τοπικά στον υπολογιστή μου - Ζήτησέ μου να ελέγξω εγώ αν κάτι δουλεύει ή όχι. Μην υλοποιήσεις κώδικα για testing.

## General Style
- Use modern JavaScript (ES6+).
- Use `import`/`export` syntax. Do not use `require` or `module.exports`.
- Prefer concise and clean code, with clear structure over clever one-liners.

## Project Structure
- Entry point of the app is `server.js`, not `index.js`.
- Follow MVC architecture.
- Directory structure includes:
  - `public/` for static assets.
  - `views/` with subfolder `partials/` for handlebars partials (e.g., header, footer) and `layouts/` for main layout files.
  - `routes/` for route definitions. Prefer one router file per resource (e.g., users.js, departments.js). Prefer writing the logic in routes instead of controllers unless the logic is too complex.
  - `controllers/` for middleware logic. Write controller logic here only if it is too complex to be handled in routes.
  - `models/` for Sequelize models (one model per file). Use `models/models.js` to import all other models, define associations, `sync` using `{alter: JSON.parse(process.env.SYNCMODELS)}`, and export all as `Models`.
  - `config/` for configuration files (e.g., handlebars.js, database.js, security.js, mail.js, .env).
  - `services/` for scripts that run tasks, for example cron jobs, using `npm run <script>` commands. For a job, create a separate file (in `services` or `controllers`) with the function and import it into the script file. The script file should only execute the function. So, the function can be reused elsewhere if needed.
  - `storage/` for uploaded files if needed.
  - `public/storage/` for serving publicly available uploaded files if needed.



## Backend
- Use `express` and `express-handlebars`. The handlebar helpers are defined in `config/handlebars.js`. 
- Avoid over-engineering and unnecessary abstraction.

## Database
- Use `Sequelize` with `PostgreSQL`.
- Define each model in a separate file in the `models/` folder.
- Relationships and `sequelize.sync()` logic go into `models.js` not into each model file.
- Export a unified `Models` object from `models.js` (e.g., `Models.User`, `Models.Department`).

## Frontend
- Use `Adminator` that uses `Bootstrap 5`.
- Use `Alpine.js` only when interactivity is needed. Do not use heavy JS frameworks like React.
- Avoid inline CSS. Use external CSS files in `public/css/`. Prefer element classes from Adminator and Bootstrap, if possible.
- Prefer reusing the same custom CSS classes for similar elements. Do not create multiple similar classes for different elements; If needed (different margin for example), modify them with additional utility classes .
- You can use inline JavaScript in <script type="module"> tags within Handlebars views, at the end of the view file, if the logic is applied only to a specific view.
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

