const fs = require('fs');
let c = fs.readFileSync('style.css', 'utf8');
c = c.replace(/\.active-filters-container\s*\{[^}]+\}/, .active-filters-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 0.5rem 0 0 0;
  max-width: 1600px;
  margin: 0 auto;
  justify-content: center;
});
fs.writeFileSync('style.css', c);
