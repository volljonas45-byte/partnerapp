require('dotenv').config();
const app = require('./src/app');
const { migrate } = require('./src/db/migrate');

const PORT = process.env.PORT || 3001;

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Invoice API running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to run database migration, aborting startup:', err);
    process.exit(1);
  });
