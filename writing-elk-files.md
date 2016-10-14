# Writing Elk files
Elk files can be as simple or complex as needed and should seem familiar to those with an understanding of HTML. The result of compiling all Elk examples in these pages can be viewed by choosing "HTML" in the top right.

## Statements
All elk files are made up of sequential **statements**. A statement can be one of the following.

{% method -%}
* Tag
    * A plain tag similar to those in HTML. It is reccommended that you start all Elk files with an "html" tag along with "head" and "body" if necessary.
{% sample lang="elk" -%}
```elk
html: head: title: "A page title"
```

{% sample lang="html" -%}
```html
<html>
  <head>
    <title>A page title</title>
  </head>
</html>
```
{% endmethod %}
{% method -%}
    * A tag can have a class, id and attributes too.
{% sample lang="elk" -%}
```elk
html: body: div.someClass#someID [attribute: "value"]
```
{% sample lang="html" -%}
```html
<html>
  <body>
    <div class="someClass" id="someID" attribute="value"></div>
  </body>
</html>
```
{% endmethod %}
{% method -%}
    * Tags can contain a block other more statements. A block of a single statement is preceeded by a colon and a block of multiple statements is surrounded by braces. These form the content of the HTML tag.
{% sample lang="elk" -%}
```elk
html: body: h1: "A header in the body"
```
```elk
html: body {
    h1: "A header in the body"
    h2: "Another header in the body"
}
```
{% sample lang="html" -%}
```html
<html>
 <body>
   <h1>A header in the body</h1>
 </body>
</html>
```
```html
<html>
  <body>
    <h1>A header in the body</h1>
    <h2>Another header in the body</h1>
  </body>
</html>
```
{% endmethod %}


