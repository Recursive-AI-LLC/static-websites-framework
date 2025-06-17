# Handlebars Looping Capabilities Analysis for RSWF

This document provides a comprehensive analysis of Handlebars looping capabilities and recommendations for enhancing the Recursive Static Website Framework (RSWF) with additional looping helpers.

## Current Built-in Looping Features

Handlebars provides several built-in looping constructs:

### #each Helper
The primary iteration helper that works with arrays and objects:

```handlebars
{{#each items}}
  <div>{{this}}</div>
{{/each}}
```

### Context Variables
- `@index` - Current loop index (0-based)
- `@key` - Current key name for object iteration
- `@first` - Boolean, true for first iteration
- `@last` - Boolean, true for last iteration
- `@../index` - Access parent loop index in nested loops

### Example Usage
```handlebars
{{#each people}}
  <div class="person {{#if @first}}first{{/if}} {{#if @last}}last{{/if}}">
    {{@index}}: {{name}}
  </div>
{{/each}}
```

### Empty Block Support
```handlebars
{{#each items}}
  <div>{{this}}</div>
{{else}}
  <div>No items found</div>
{{/each}}
```

## Identified Looping Gaps

The current Handlebars implementation lacks several important looping patterns commonly needed in static site generation:

1. **Range Iteration** - No way to iterate from 1 to N
2. **Repeat Helper** - No way to repeat a block N times
3. **Array Chunking** - No way to split arrays into groups
4. **Filtering During Iteration** - No way to filter while looping
5. **Pagination Support** - No built-in pagination helpers
6. **Array Slicing** - Limited array subset capabilities
7. **Reverse Iteration** - No built-in reverse helper
8. **Advanced Array Manipulation** - Limited data organization options

## Common Looping Patterns in Static Sites

Based on research of popular static site generators and template systems, these patterns are frequently needed:

- **Pagination** for long lists of posts/items
- **Chunking** arrays into columns (e.g., 3-column layouts)
- **Filtering** arrays while iterating (active items, categories)
- **Range-based loops** for numbered lists, pagination controls
- **Repeat blocks** for creating grids, placeholders
- **Array slicing** for "first N", "last N", "middle" sections
- **Reverse iteration** for chronological displays
- **Nested loops** with proper context management

## Recommended Looping Helpers

### HIGH PRIORITY

#### 1. range - Numeric Range Iteration
```javascript
Handlebars.registerHelper('range', function(start, end, options) {
  const arr = [];
  for(let i = start; i <= end; i++) {
    arr.push(i);
  }
  return options.fn ? arr.map(i => options.fn(i)).join('') : arr;
});
```

**Usage:**
```handlebars
{{#range 1 5}}
  <div>Item {{this}}</div>
{{/range}}
<!-- Outputs: Item 1, Item 2, Item 3, Item 4, Item 5 -->

<!-- For pagination controls -->
{{#range 1 totalPages}}
  <a href="/page/{{this}}" {{#if (eq this currentPage)}}class="active"{{/if}}>{{this}}</a>
{{/range}}
```

#### 2. times - Repeat Block N Times
```javascript
Handlebars.registerHelper('times', function(n, options) {
  let result = '';
  for(let i = 0; i < n; i++) {
    result += options.fn({
      index: i,
      first: i === 0,
      last: i === n-1
    });
  }
  return result;
});
```

**Usage:**
```handlebars
{{#times 3}}
  <div class="column {{#if first}}first{{/if}} {{#if last}}last{{/if}}">
    Column {{add @index 1}}
  </div>
{{/times}}

<!-- For creating placeholder content -->
{{#times 6}}
  <div class="skeleton-card"></div>
{{/times}}
```

#### 3. chunk - Array Chunking
```javascript
Handlebars.registerHelper('chunk', function(arr, size) {
  if (!arr || !arr.length) return [];
  const chunks = [];
  for(let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
});
```

**Usage:**
```handlebars
<!-- Create 3-column layout -->
{{#each (chunk items 3)}}
  <div class="row">
    {{#each this}}
      <div class="col">{{name}}</div>
    {{/each}}
  </div>
{{/each}}

<!-- Create card grid -->
{{#each (chunk products 4)}}
  <div class="product-row">
    {{#each this}}
      <div class="product-card">{{title}}</div>
    {{/each}}
  </div>
{{/each}}
```

### MEDIUM PRIORITY

#### 4. group - Group by Property
```javascript
Handlebars.registerHelper('group', function(arr, prop) {
  if (!arr) return {};
  return arr.reduce((groups, item) => {
    const key = item[prop] || 'undefined';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
});
```

**Usage:**
```handlebars
{{#each (group posts 'category')}}
  <h2>{{@key}}</h2>
  {{#each this}}
    <article>{{title}}</article>
  {{/each}}
{{/each}}
```

#### 5. filter - Filter During Iteration
```javascript
Handlebars.registerHelper('filter', function(arr, prop, value) {
  if (!arr) return [];
  return arr.filter(item => item[prop] === value);
});
```

**Usage:**
```handlebars
{{#each (filter posts 'published' true)}}
  <article>{{title}}</article>
{{/each}}

{{#each (filter products 'featured' true)}}
  <div class="featured-product">{{name}}</div>
{{/each}}
```

#### 6. reverse - Reverse Array
```javascript
Handlebars.registerHelper('reverse', function(arr) {
  return arr && arr.slice ? arr.slice().reverse() : [];
});
```

**Usage:**
```handlebars
<!-- Show newest posts first -->
{{#each (reverse posts)}}
  <article>{{title}} - {{date}}</article>
{{/each}}
```

#### 7. limit - Limit Array Size
```javascript
Handlebars.registerHelper('limit', function(arr, count) {
  return arr && arr.slice ? arr.slice(0, count) : [];
});
```

**Usage:**
```handlebars
<!-- Show only first 5 items -->
{{#each (limit items 5)}}
  <div>{{name}}</div>
{{/each}}

<!-- Recent posts preview -->
{{#each (limit posts 3)}}
  <article class="recent-post">{{title}}</article>
{{/each}}
```

#### 8. offset - Skip First N Items
```javascript
Handlebars.registerHelper('offset', function(arr, count) {
  return arr && arr.slice ? arr.slice(count) : [];
});
```

**Usage:**
```handlebars
<!-- Skip first 3 items -->
{{#each (offset items 3)}}
  <div>{{name}}</div>
{{/each}}

<!-- Pagination: skip items from previous pages -->
{{#each (offset (limit allPosts 10) skipCount)}}
  <article>{{title}}</article>
{{/each}}
```

### LOW PRIORITY (Advanced)

#### 9. paginate - Advanced Pagination
```javascript
Handlebars.registerHelper('paginate', function(arr, perPage, currentPage, options) {
  if (!arr) return '';
  const total = arr.length;
  const pages = Math.ceil(total / perPage);
  const start = (currentPage - 1) * perPage;
  const items = arr.slice(start, start + perPage);
  
  const context = {
    items,
    pagination: {
      currentPage,
      totalPages: pages,
      totalItems: total,
      hasNext: currentPage < pages,
      hasPrev: currentPage > 1,
      nextPage: currentPage + 1,
      prevPage: currentPage - 1
    }
  };
  
  return options.fn(context);
});
```

**Usage:**
```handlebars
{{#paginate allPosts 10 currentPage}}
  {{#each items}}
    <article>{{title}}</article>
  {{/each}}
  
  <nav class="pagination">
    {{#if pagination.hasPrev}}
      <a href="?page={{pagination.prevPage}}">Previous</a>
    {{/if}}
    
    <span>Page {{pagination.currentPage}} of {{pagination.totalPages}}</span>
    
    {{#if pagination.hasNext}}
      <a href="?page={{pagination.nextPage}}">Next</a>
    {{/if}}
  </nav>
{{/paginate}}
```

## Implementation Strategy

### Phase 1: Essential Looping (Immediate)
Implement the three highest-priority helpers:
1. `range` - for numeric iteration
2. `times` - for repeating blocks
3. `chunk` - for array chunking

### Phase 2: Array Manipulation (High Priority)
Add array manipulation helpers:
4. `group` - for grouping by property
5. `filter` - for filtering during iteration
6. `reverse` - for reverse iteration
7. `limit` - for limiting array size
8. `offset` - for skipping items

### Phase 3: Advanced Features (Medium Priority)
Add advanced pagination and complex iteration patterns:
9. `paginate` - for comprehensive pagination

## Benefits for AI Agents

These looping helpers will significantly enhance RSWF's capabilities for AI agents:

1. **Grid Layouts**: Easy creation of responsive grids with `chunk`
2. **Pagination**: Professional pagination with `paginate`, `limit`, `offset`
3. **Data Organization**: Logical grouping with `group` and `filter`
4. **Dynamic Content**: Flexible content generation with `range` and `times`
5. **Performance**: Efficient data handling without preprocessing
6. **User Experience**: Better content organization and navigation

## Implementation Requirements

### Dual Environment Consistency
ALL helpers must be implemented identically in both:
- `scripts/build-static.js` registerHelpers() function (around line 73)
- `src/js/dev/template-engine.js` registerHelpers() function (around line 10)

### Testing Protocol
1. Test with `npm run dev` (development environment)
2. Test with `npm run build` (production environment)  
3. Verify identical output in both environments
4. Create test cases for edge cases (empty arrays, invalid inputs)
5. Document usage examples

### Documentation Updates
- Update README.md with new helper usage examples
- Add helpers to the knowledge base
- Create comprehensive examples for common use cases
- Document performance considerations

## Conclusion

Adding these looping helpers will transform RSWF from a basic templating framework into a powerful, comprehensive website generation tool. The helpers are designed to be:

- **Intuitive** - Follow Handlebars conventions
- **Flexible** - Support multiple use cases
- **Performant** - Efficient implementations
- **Consistent** - Work identically in both environments
- **AI-Friendly** - Easy for AI agents to understand and use

This enhancement will make RSWF significantly more capable for building complex, data-driven websites while maintaining its core principles of simplicity and reliability.