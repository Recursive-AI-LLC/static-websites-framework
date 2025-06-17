## Tech Stack

This is a static website framework built on Vite, Tailwind CSS, and Alpine JS, leveraging Handlebars for templating. 

## File Structure:

 - src/
	- components/
		- Place all components in this directory.
	- css/
		- style.css - imports tailwindcss. Also, place default styles here
		- place additional stylesheets in this directory
	- data/
		- global.json - default site properties
		- [page].json - page properties for the [page].html webpage
	- js/
		- main.js - the default javascript module for the Alpine app.
	- pages/
		- The directory where you'll put all the individual pages for the website.


## Pages

Each page of the website needs its own .html file in the src/pages/ directory.
Example home.html
```html
<div class="min-h-screen flex flex-col">
    {{> header title="Welcome to Our Website" }}

    <main class="flex-grow container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>
		
		<div class="mt-4">
			{{> button
			text=buttonText
			type="primary"
            onClick="alert('Button clicked!')"
			}}
		</div>
    </main>

    {{> footer }}
</div>
```

During the build process, each page's content will be embedded within the following template:
```javascript
  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${metaTags}
    ${assetPaths.css ? `<link rel="stylesheet" href="${assetPaths.css}">` : ''}
    <style>
        /* Prevent flash of unstyled content */
        [x-cloak] { display: none !important; }
    </style>
</head>
<body>
    <div id="app">
        ${content}
    </div>
    ${assetPaths.js ? `<script type="module" src="${assetPaths.js}"></script>` : ''}
</body>
</html>`;
```


## Data

A src/data/global.json data file contains the default properties of the website. The global.json file MUST exist and MUST have all of the properties that are in the example below.
Then, each page of the website MUST have a corresponding JSON file in the src/data/ directory. 

```json
Example global.json
{
  "siteName": "My Template Site",
  "description": "A modern website built with Alpine.js, Tailwind CSS, and Vite",
  "author": "Your Name",
  "baseUrl": "https://example.com",
  "defaultImage": "/assets/og-image.jpg"
}
```

Example home.json
```json
{
  "title": "Home",
  "description": "Welcome to our modern website built with Alpine.js, Tailwind CSS, and Vite. Fast, responsive, and SEO-friendly.",
  "keywords": "Alpine.js, Tailwind CSS, Vite, modern web development, responsive design",
  "url": "/",
  "buttonText": "Hello World!"
}
```

Properties of the page data json:
 - title: (required) used for page title and sitemap - defaults to global siteName
 - description: (required) used for meta description tag / open graph / twitter / sitemap
 - url: (required) canonical url / open graph
 - keywords: (optional) meta keywords tag
 - image: (optional) open graph image - defaults to global defaultImage
	
You can pass in any additional data needed into the page data json. 
		
		
## Components

Components go in the src/components/ directory.
Any content that is repeated often should be a component.
Navigation, header, and footer are very often components for webpages.

**Example button component:**
```html
<button class="px-4 py-2 rounded transition-colors" :class="{ 
  'bg-blue-600 hover:bg-blue-700 text-white': '{{ type }}' === 'primary',
  'bg-gray-200 hover:bg-gray-300 text-gray-800': '{{ type }}' === 'secondary'
}">
    {{ text }}
</button>
```

**Example button component usage:**
```html
<div class="mt-4">
	{{> button
	text="Test Button"
	type="primary"
	onClick="alert('Button clicked!')"
	}}
</div>
```

**Example footer component:**
```html
<footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-4">
        <p>© 2025 Your Company. All rights reserved.</p>
    </div>
</footer>
```