# Recommended Default Handlebars Helpers for RSWF

This document provides a comprehensive analysis and implementation guide for additional Handlebars helpers that should be included by default in the Recursive Static Website Framework (RSWF).

## Current State Analysis

### Existing Helpers
The framework currently includes three basic helpers:
- `add(a, b)` - Add two numbers together
- `eq(a, b)` - Compare two values for equality  
- `contains(str, substring)` - Check if string contains substring

### Identified Gaps
- No comparison operators beyond equality (gt, lt, gte, lte, ne)
- No logical operators (and, or, not)
- No string manipulation helpers (uppercase, lowercase, capitalize, truncate)
- No array/collection helpers (length, first, last, join)
- No math helpers beyond addition (subtract, multiply, divide, round)
- No URL/web helpers (slugify, url building)
- No date formatting helpers
- No debugging helpers

## Recommended Helpers by Priority

### HIGH PRIORITY - Logic & Comparison Helpers

These helpers are essential for conditional logic in templates and should be implemented first.

#### Comparison Operators
```javascript
// Greater than
Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});
// Usage: {{#if (gt value 5)}}Greater than 5{{/if}}

// Less than  
Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});
// Usage: {{#if (lt value 10)}}Less than 10{{/if}}

// Greater than or equal
Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});
// Usage: {{#if (gte value 5)}}5 or more{{/if}}

// Less than or equal
Handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});
// Usage: {{#if (lte value 10)}}10 or less{{/if}}

// Not equal
Handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});
// Usage: {{#if (ne status 'active')}}Not active{{/if}}
```

#### Logical Operators
```javascript
// Logical AND
Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});
// Usage: {{#if (and user.active user.verified)}}Show content{{/if}}

// Logical OR
Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});
// Usage: {{#if (or user.admin user.moderator)}}Show admin{{/if}}

// Logical NOT
Handlebars.registerHelper('not', function(a) {
  return !a;
});
// Usage: {{#if (not user.banned)}}Show content{{/if}}
```

### HIGH PRIORITY - String Manipulation Helpers

Essential for content formatting and display.

```javascript
// Convert to uppercase
Handlebars.registerHelper('uppercase', function(str) {
  return str ? str.toString().toUpperCase() : '';
});
// Usage: {{uppercase title}}

// Convert to lowercase
Handlebars.registerHelper('lowercase', function(str) {
  return str ? str.toString().toLowerCase() : '';
});
// Usage: {{lowercase email}}

// Capitalize first letter
Handlebars.registerHelper('capitalize', function(str) {
  if (!str) return '';
  const s = str.toString();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
});
// Usage: {{capitalize name}}

// Truncate string with ellipsis
Handlebars.registerHelper('truncate', function(str, length) {
  if (!str) return '';
  const s = str.toString();
  return s.length > length ? s.substring(0, length) + '...' : s;
});
// Usage: {{truncate description 100}}
```

### HIGH PRIORITY - Array & Collection Helpers

Essential for working with lists and collections.

```javascript
// Get array/object length
Handlebars.registerHelper('length', function(obj) {
  if (!obj) return 0;
  return obj.length || Object.keys(obj).length || 0;
});
// Usage: {{length items}} items

// Join array elements
Handlebars.registerHelper('join', function(arr, separator) {
  return arr && arr.join ? arr.join(separator || ', ') : '';
});
// Usage: {{join tags ', '}}
```

### HIGH PRIORITY - URL & Web Helpers

Critical for static site generation and SEO.

```javascript
// Convert string to URL slug
Handlebars.registerHelper('slugify', function(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
});
// Usage: {{slugify title}}

// Build URL with base URL
Handlebars.registerHelper('url', function(path, options) {
  const baseUrl = (options && options.data && options.data.root && options.data.root.baseUrl) || '';
  return baseUrl + (path || '');
});
// Usage: {{url '/about'}}
```

### HIGH PRIORITY - Date Formatting

Essential for displaying dates consistently.

```javascript
// Format date (basic implementation without external dependencies)
Handlebars.registerHelper('formatDate', function(date, format) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  
  const fmt = format || 'YYYY-MM-DD';
  return fmt
    .replace('YYYY', d.getFullYear())
    .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(d.getDate()).padStart(2, '0'));
});
// Usage: {{formatDate date 'YYYY-MM-DD'}}
```

### MEDIUM PRIORITY - Additional String Helpers

```javascript
// Replace text in string
Handlebars.registerHelper('replace', function(str, find, replace) {
  if (!str) return '';
  return str.toString().replace(new RegExp(find, 'g'), replace);
});
// Usage: {{replace text 'old' 'new'}}

// Trim whitespace
Handlebars.registerHelper('trim', function(str) {
  return str ? str.toString().trim() : '';
});
// Usage: {{trim text}}
```

### MEDIUM PRIORITY - Additional Array Helpers

```javascript
// Get first item from array
Handlebars.registerHelper('first', function(arr) {
  return arr && arr.length ? arr[0] : null;
});
// Usage: {{first items}}

// Get last item from array
Handlebars.registerHelper('last', function(arr) {
  return arr && arr.length ? arr[arr.length - 1] : null;
});
// Usage: {{last items}}

// Get subset of array
Handlebars.registerHelper('slice', function(arr, start, end) {
  return arr && arr.slice ? arr.slice(start, end) : [];
});
// Usage: {{#each (slice items 0 3)}}{{name}}{{/each}}
```

### MEDIUM PRIORITY - Math Helpers

```javascript
// Subtract numbers
Handlebars.registerHelper('subtract', function(a, b) {
  return (parseFloat(a) || 0) - (parseFloat(b) || 0);
});
// Usage: {{subtract total discount}}

// Multiply numbers
Handlebars.registerHelper('multiply', function(a, b) {
  return (parseFloat(a) || 0) * (parseFloat(b) || 0);
});
// Usage: {{multiply price quantity}}

// Divide numbers
Handlebars.registerHelper('divide', function(a, b) {
  const divisor = parseFloat(b);
  return divisor !== 0 ? (parseFloat(a) || 0) / divisor : 0;
});
// Usage: {{divide total count}}

// Round to decimal places
Handlebars.registerHelper('round', function(num, decimals) {
  const factor = Math.pow(10, decimals || 0);
  return Math.round((parseFloat(num) || 0) * factor) / factor;
});
// Usage: {{round price 2}}
```

### MEDIUM PRIORITY - Additional Date Helpers

```javascript
// Get current date/time
Handlebars.registerHelper('now', function() {
  return new Date();
});
// Usage: {{formatDate now 'YYYY-MM-DD'}}
```

### LOW PRIORITY - Development Helpers

```javascript
// Debug helper for development
Handlebars.registerHelper('debug', function(value) {
  console.log('DEBUG:', value);
  return '';
});
// Usage: {{debug someValue}}

// Convert object to JSON string
Handlebars.registerHelper('json', function(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch(e) {
    return '';
  }
});
// Usage: {{json data}}
```

## Implementation Strategy

### Phase 1: Core Logic & Comparison (Immediate)
Implement all comparison operators (gt, lt, gte, lte, ne) and logical operators (and, or, not) as these are fundamental for template logic.

### Phase 2: Essential Formatting (High Priority)
Add string manipulation (uppercase, lowercase, capitalize, truncate), array helpers (length, join), and URL helpers (slugify, url).

### Phase 3: Enhanced Functionality (Medium Priority)
Add remaining string helpers, array helpers, math helpers, and date helpers.

### Phase 4: Development Tools (Low Priority)
Add debugging and development helpers.

## Implementation Requirements

### Dual Environment Consistency
ALL helpers must be implemented identically in both:
- `scripts/build-static.js` registerHelpers() function (around line 73)
- `src/js/dev/template-engine.js` registerHelpers() function (around line 10)

### Testing Protocol
After implementing any helper:
1. Test with `npm run dev` (development environment)
2. Test with `npm run build` (production environment)
3. Verify identical output in both environments
4. Update helper inventory in data object
5. Update README.md with usage examples if user-facing

### Documentation Updates
- Update README.md with new helper usage examples
- Add helpers to the knowledge base
- Document any breaking changes or special considerations

## Benefits for AI Agents

These helpers will significantly enhance the framework's capabilities for AI agents building websites:

1. **Conditional Logic**: Complex template logic without JavaScript
2. **Content Formatting**: Professional text display and formatting
3. **Data Manipulation**: Easy array and object handling
4. **SEO Enhancement**: Clean URLs and proper date formatting
5. **Development Efficiency**: Debugging tools and utilities
6. **User Experience**: Better content presentation and navigation

## Conclusion

Implementing these helpers will transform RSWF from a basic templating framework into a powerful, AI-friendly website generation tool while maintaining the core principles of simplicity and dual-environment consistency.