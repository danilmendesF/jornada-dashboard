const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(/<\/section>\s*<!-- Active Filters Container -->\s*<div class="active-filters-container" id="activeFiltersContainer" style="display: none;"><\/div>/, '      <!-- Active Filters Container -->\n      <div class="active-filters-container" id="activeFiltersContainer" style="display: none;"></div>\n    </section>');
fs.writeFileSync('index.html', c);
