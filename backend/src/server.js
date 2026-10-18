const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');

db.get();
seedIfEmpty();

createApp().listen(config.port, () => {
  console.log(`API ESG-FIEMS ouvindo em http://localhost:${config.port}`);
});
